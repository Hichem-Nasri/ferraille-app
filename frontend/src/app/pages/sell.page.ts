import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DinarPipe } from '../core/dinar.pipe';
import { CATEGORIES, CITIES, CONDITIONS, MAKES } from '../core/labels';
import { Category, PartCondition, SellerQuote, VehicleFit } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-sell-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DinarPipe, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="page" (ngSubmit)="submit()" #f="ngForm">
      <div class="row between">
        <a class="icon-btn" routerLink="/" aria-label="Fermer"><fr-icon name="close" /></a>
        <h1 class="heading">Vendre une pièce</h1>
        <span class="muted step">{{ progress() }}/4</span>
      </div>
      <div class="progress">
        @for (i of [1, 2, 3, 4]; track i) { <span [class.on]="i <= progress()"></span> }
      </div>

      <section class="stack gap10">
        <div class="row between">
          <h2 class="section-title">Photos</h2>
          <span class="muted small">{{ photos().length }} / 8 · la 1re est la couverture</span>
        </div>
        <div class="photos">
          @for (p of photos(); track p; let i = $index) {
            <div class="photo" [class.cover]="i === 0">
              <img [src]="p" alt="">
              <button type="button" class="remove" (click)="removePhoto(i)" [attr.aria-label]="'Retirer la photo ' + (i + 1)">
                <fr-icon name="close" [size]="14" [stroke]="3" />
              </button>
            </div>
          }
          @if (photos().length < 8) {
            <label class="photo add" [class.busy]="uploading()">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" (change)="upload($event)">
              <fr-icon name="camera" [size]="22" />
              <span class="small">{{ uploading() ? 'Envoi…' : 'Ajouter' }}</span>
            </label>
          }
        </div>
      </section>

      <div class="field">
        <label for="title">Titre de l'annonce</label>
        <input id="title" class="input" name="title" [(ngModel)]="title" required maxlength="140"
               placeholder="Ex. Phare avant gauche LED — 208">
      </div>

      <div class="field">
        <span class="label">Catégorie</span>
        <div class="cats">
          @for (c of categories; track c.value) {
            <button type="button" class="chip" [class.chip-dark]="category() === c.value" (click)="category.set(c.value)">
              <fr-part-icon [name]="c.icon" [size]="16" [stroke]="4" />{{ c.label }}
            </button>
          }
        </div>
      </div>

      <div class="field">
        <span class="label">Véhicules compatibles</span>
        <div class="cats">
          @for (fit of fits(); track fit; let i = $index) {
            <span class="chip chip-dark">
              {{ fitLabel(fit) }}
              <button type="button" class="chip-x" (click)="removeFit(i)" [attr.aria-label]="'Retirer ' + fitLabel(fit)">
                <fr-icon name="close" [size]="14" [stroke]="2.6" />
              </button>
            </span>
          }
          @if (!fitFormOpen()) {
            <button type="button" class="chip chip-dashed" (click)="fitFormOpen.set(true)">
              <fr-icon name="plus" [size]="14" [stroke]="2.6" />Ajouter un modèle
            </button>
          }
        </div>
        @if (fitFormOpen()) {
          <div class="card card-pad fit-form">
            <div class="grid-2">
              <select class="input" name="fitMake" [(ngModel)]="fitMake" aria-label="Marque">
                <option value="" disabled>Marque</option>
                @for (m of makes; track m) { <option [value]="m">{{ m }}</option> }
              </select>
              <input class="input" name="fitModel" [(ngModel)]="fitModel" placeholder="Modèle" aria-label="Modèle">
              <input class="input" type="number" name="fitFrom" [(ngModel)]="fitFrom" placeholder="Année début" aria-label="Année de début">
              <input class="input" type="number" name="fitTo" [(ngModel)]="fitTo" placeholder="Année fin" aria-label="Année de fin">
            </div>
            <div class="row">
              <button type="button" class="btn btn-ghost grow" (click)="fitFormOpen.set(false)">Annuler</button>
              <button type="button" class="btn btn-primary grow" (click)="addFit()" [disabled]="!fitMake || !fitModel.trim()">Ajouter</button>
            </div>
          </div>
        }
        <span class="muted small row hint"><fr-icon name="search" [size]="14" />Ajoute la réf. OEM : les acheteurs la cherchent souvent.</span>
      </div>

      <div class="field">
        <label for="oem">Réf. constructeur (optionnel)</label>
        <input id="oem" class="input" name="oem" [(ngModel)]="oemReference" maxlength="60">
      </div>

      <div class="field">
        <span class="label">État de la pièce</span>
        <div class="segmented">
          @for (c of conditions; track c.value) {
            <button type="button" [class.active]="condition() === c.value" (click)="condition.set(c.value)">{{ c.label }}</button>
          }
        </div>
      </div>

      <div class="field">
        <label for="desc">Description</label>
        <textarea id="desc" class="input" name="description" [(ngModel)]="description" maxlength="4000"
                  placeholder="Kilométrage, défauts éventuels, garantie…"></textarea>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="price">Ton prix</label>
          <div class="price-input">
            <input id="price" type="number" name="price" min="1" step="1" [(ngModel)]="price" (ngModelChange)="onPrice($event)" required>
            <span>DT</span>
          </div>
        </div>
        <div class="field">
          <label for="city">Ville</label>
          <select id="city" class="input" name="city" [(ngModel)]="city" required>
            @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
      </div>
      <label class="row check">
        <input type="checkbox" name="negotiable" [(ngModel)]="negotiable">
        <span>Prix négociable</span>
      </label>

      @if (quote(); as q) {
        <div class="dark-card stack quote">
          <div class="row between line"><span>Prix de vente</span><span>{{ q.price | dinar: true }}</span></div>
          <div class="row between line"><span>Commission Ferraille ({{ percent(q.commissionRate) }} %)</span><span>− {{ q.commission | dinar: true }}</span></div>
          <div class="sep"></div>
          <div class="row between"><span class="strong">Tu recevras</span><span class="price net">{{ q.sellerNet | dinar }}</span></div>
          <span class="line small">Livraison payée par l'acheteur. Le coursier passe récupérer le colis chez toi.</span>
        </div>
      }

      @if (error()) { <div class="error">{{ error() }}</div> }

      <div class="bottom-bar">
        <button type="submit" class="btn btn-lime grow" [disabled]="f.invalid || !ready() || saving()">
          {{ saving() ? 'Publication…' : "Publier l'annonce" }}
          <fr-icon name="arrow-right" [size]="18" [stroke]="2.4" />
        </button>
      </div>
    </form>
  `,
  styles: `
    .heading { font-size: 17px; font-weight: 600; }
    .step { width: 44px; text-align: right; font-weight: 600; }
    .progress { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .progress span { height: 5px; border-radius: 3px; background: #d5ded3; }
    .progress span.on { background: var(--green); }
    .gap10 { gap: 10px; }
    .photos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .photo { aspect-ratio: 1; border-radius: 14px; overflow: hidden; position: relative; background: var(--green-soft); }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .photo.cover { outline: 2px solid var(--green); outline-offset: -2px; }
    .remove { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; border: 0; background: rgba(11, 31, 23, 0.7); color: var(--white); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
    .add { border: 1.5px dashed #9fb3a6; background: transparent; color: var(--green); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; font-weight: 600; }
    .add.busy { opacity: 0.6; pointer-events: none; }
    .cats { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip-x { border: 0; background: none; color: var(--lime); padding: 0; display: inline-flex; cursor: pointer; }
    .fit-form { display: flex; flex-direction: column; gap: 10px; }
    .hint { gap: 6px; }
    .price-input { height: 50px; padding: 0 14px; border-radius: 14px; background: var(--white); border: 1.5px solid var(--green); display: flex; align-items: center; gap: 8px; }
    .price-input input { border: 0; outline: none; flex: 1; min-width: 0; font-family: var(--display); font-size: 22px; font-weight: 700; background: transparent; }
    .price-input span { font-weight: 700; color: var(--muted); }
    .check { gap: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .check input { width: 20px; height: 20px; accent-color: var(--green); }
    .quote { gap: 10px; }
    .line { font-size: 13px; color: #c9d8cf; }
    .sep { height: 1px; background: rgba(255, 255, 255, 0.14); }
    .strong { font-size: 14px; font-weight: 600; }
    .net { font-size: 22px; color: var(--lime); }
  `,
})
export class SellPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = CATEGORIES;
  readonly conditions = CONDITIONS;
  readonly cities = CITIES;
  readonly makes = MAKES;

  readonly photos = signal<string[]>([]);
  readonly category = signal<Category | null>(null);
  readonly condition = signal<PartCondition>('TRES_BON');
  readonly fits = signal<VehicleFit[]>([]);
  readonly fitFormOpen = signal(false);
  readonly quote = signal<SellerQuote | null>(null);
  readonly uploading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private readonly priceValue = signal<number | null>(null);

  readonly ready = computed(() => this.photos().length > 0 && this.category() !== null && this.fits().length > 0);
  readonly progress = computed(() => {
    let step = 1;
    if (this.photos().length > 0) step++;
    if (this.category() && this.fits().length > 0) step++;
    if ((this.priceValue() ?? 0) > 0) step++;
    return step;
  });

  title = '';
  description = '';
  oemReference = '';
  price: number | null = null;
  city = 'Tunis';
  negotiable = true;
  fitMake = '';
  fitModel = '';
  fitFrom: number | null = null;
  fitTo: number | null = null;

  private readonly prices = new Subject<number>();

  ngOnInit(): void {
    const userCity = this.auth.user()?.city;
    if (userCity && CITIES.includes(userCity)) {
      this.city = userCity;
    }
    this.prices
      .pipe(
        debounceTime(300),
        switchMap((p) => this.api.sellerQuote(p).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => this.quote.set(q));
  }

  onPrice(value: number | null): void {
    this.priceValue.set(value);
    if (value && value > 0) {
      this.prices.next(value);
    } else {
      this.quote.set(null);
    }
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 8 - this.photos().length);
    input.value = '';
    if (!files.length) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    this.api.uploadPhotos(files).subscribe({
      next: (urls) => {
        this.photos.set([...this.photos(), ...urls]);
        this.uploading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.uploading.set(false);
      },
    });
  }

  removePhoto(index: number): void {
    this.photos.set(this.photos().filter((_, i) => i !== index));
  }

  addFit(): void {
    this.fits.set([
      ...this.fits(),
      { make: this.fitMake, model: this.fitModel.trim(), yearFrom: this.fitFrom, yearTo: this.fitTo },
    ]);
    this.fitMake = '';
    this.fitModel = '';
    this.fitFrom = null;
    this.fitTo = null;
    this.fitFormOpen.set(false);
  }

  removeFit(index: number): void {
    this.fits.set(this.fits().filter((_, i) => i !== index));
  }

  percent(rate: number): number {
    return Math.round(rate * 1000) / 10;
  }

  fitLabel(f: VehicleFit): string {
    const years = f.yearFrom || f.yearTo ? ` · ${f.yearFrom ?? '…'}–${f.yearTo ?? '…'}` : '';
    return `${f.make} ${f.model}${years}`;
  }

  submit(): void {
    const category = this.category();
    if (!category || !this.price) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .createListing({
        title: this.title,
        description: this.description || undefined,
        category,
        condition: this.condition(),
        price: this.price,
        negotiable: this.negotiable,
        city: this.city,
        oemReference: this.oemReference || undefined,
        photos: this.photos(),
        fits: this.fits(),
      })
      .subscribe({
        next: (l) => this.router.navigate(['/piece', l.id, l.slug]),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.saving.set(false);
        },
      });
  }
}
