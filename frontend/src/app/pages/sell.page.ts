import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CATEGORIES, CITIES, CONDITIONS, MAKES } from '../core/labels';
import { Category, PartCondition, User, VehicleFit } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-sell-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="page" (ngSubmit)="submit()" #f="ngForm">
      <div class="row between">
        <a class="icon-btn" routerLink="/" aria-label="Fermer"><fr-icon name="close" /></a>
        <h1 class="heading">Vendre une pièce</h1>
        <span class="muted step">{{ progress() }}/4</span>
      </div>
      <a class="express" routerLink="/vendre/lot">Plusieurs pièces ? Publication express →</a>
      <div class="progress">
        @for (i of [1, 2, 3, 4]; track i) { <span [class.on]="i <= progress()"></span> }
      </div>

      <section class="stack gap10">
        <div class="row between">
          <h2 class="section-title">Photos</h2>
          <span class="muted small">{{ photos().length }} / 8 · la 1re est la couverture</span>
        </div>
        <div class="notice small-notice">
          <fr-icon name="camera" [size]="16" />
          <span>Prends tes propres photos de la pièce. Les images copiées sur Internet font fuir les acheteurs.</span>
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
              <input class="input" type="number" name="fitFrom" [(ngModel)]="fitFrom" placeholder="Année début" aria-label="Année de début" min="1950" [max]="maxYear">
              <input class="input" type="number" name="fitTo" [(ngModel)]="fitTo" placeholder="Année fin" aria-label="Année de fin" min="1950" [max]="maxYear">
            </div>
            <span class="muted small">Laisse les années vides si la pièce va sur tous les modèles.</span>
            @if (!yearsValid()) { <span class="error">Années invalides (entre 1950 et {{ maxYear }}, début avant fin).</span> }
            <div class="row">
              <button type="button" class="btn btn-ghost grow" (click)="fitFormOpen.set(false)">Annuler</button>
              <button type="button" class="btn btn-primary grow" (click)="addFit()" [disabled]="!fitMake || !fitModel.trim() || !yearsValid()">Ajouter</button>
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
          <label for="price">Ton prix <span class="muted small">(facultatif)</span></label>
          <div class="price-input">
            <input id="price" type="number" name="price" min="0" step="1" [(ngModel)]="price" (ngModelChange)="onPrice($event)" placeholder="À discuter">
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

      @if (needsContact()) {
        <div class="card card-pad stack contact-box">
          <span class="strong">Comment les acheteurs te contactent ?</span>
          <div class="field">
            <label for="wa">Ton numéro WhatsApp</label>
            <input id="wa" class="input" type="tel" name="whatsapp" [(ngModel)]="whatsapp" required
                   pattern="^[+0-9 ]{8,20}$" placeholder="+216 98 123 456" autocomplete="tel">
          </div>
          <span class="muted small">Il s'affichera sur tes annonces. Tu pourras le modifier dans ton profil.</span>
        </div>
      } @else {
        <div class="notice">
          <fr-icon name="chat" [size]="18" />
          <span>Annonce <strong>gratuite</strong>. Les acheteurs te contacteront directement{{ contactLabel() }}.</span>
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

    @if (accountOpen()) {
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="acc-title">
        <form class="sheet stack" (ngSubmit)="accountSubmit()" #af="ngForm">
          <span id="acc-title" class="sheet-title">{{ accountMode() === 'register' ? 'Dernière étape : ton compte gratuit' : 'Connexion' }}</span>
          <span class="muted small">Ton annonce est prête. {{ accountMode() === 'register' ? 'Crée ton compte en 30 secondes pour la publier et la gérer ensuite.' : 'Connecte-toi pour la publier.' }}</span>
          @if (accountMode() === 'register') {
            <div class="field">
              <label for="acc-name">Ton nom (ou celui de ta casse)</label>
              <input id="acc-name" class="input" name="accName" [(ngModel)]="accName" required maxlength="120" autocomplete="name">
            </div>
          }
          <div class="field">
            <label for="acc-email">E-mail</label>
            <input id="acc-email" class="input" type="email" name="accEmail" [(ngModel)]="accEmail" required email autocomplete="email">
          </div>
          <div class="field">
            <label for="acc-pass">Mot de passe{{ accountMode() === 'register' ? ' (8 caractères min.)' : '' }}</label>
            <input id="acc-pass" class="input" type="password" name="accPassword" [(ngModel)]="accPassword" required minlength="8"
                   [attr.autocomplete]="accountMode() === 'register' ? 'new-password' : 'current-password'">
          </div>
          @if (accountMode() === 'register') {
            <label class="row check small"><input type="checkbox" name="accPro" [(ngModel)]="accPro"> Je suis une casse / un professionnel</label>
          }
          @if (accountError()) { <div class="error">{{ accountError() }}</div> }
          <button type="submit" class="btn btn-lime" [disabled]="af.invalid || saving()">
            {{ saving() ? 'Publication…' : (accountMode() === 'register' ? 'Créer mon compte et publier' : 'Me connecter et publier') }}
          </button>
          <button type="button" class="link" (click)="accountMode.set(accountMode() === 'register' ? 'login' : 'register')">
            {{ accountMode() === 'register' ? 'J’ai déjà un compte' : 'Créer un compte' }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="accountOpen.set(false)" [disabled]="saving()">Revenir à l'annonce</button>
        </form>
      </div>
    }
  `,
  styles: `
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 100; display: flex; align-items: flex-end; justify-content: center; }
    @media (min-width: 700px) { .overlay { align-items: center; } }
    .sheet { background: var(--white); width: 100%; max-width: 460px; border-radius: 24px 24px 0 0; padding: 22px 20px 28px; gap: 12px; max-height: 94vh; overflow-y: auto; }
    @media (min-width: 700px) { .sheet { border-radius: 24px; } }
    .sheet-title { font-family: var(--display); font-weight: 700; font-size: 21px; }
    .link { border: 0; background: none; color: var(--green); font-weight: 600; cursor: pointer; padding: 6px; }
    .check { gap: 8px; align-items: center; }
    .express { font-size: 13px; font-weight: 600; }
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
    .strong { font-size: 14px; font-weight: 600; }
    .contact-box { gap: 10px; }
  `,
})
export class SellPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;
  readonly conditions = CONDITIONS;
  readonly cities = CITIES;
  readonly makes = MAKES;

  readonly photos = signal<string[]>([]);
  readonly category = signal<Category | null>(null);
  readonly condition = signal<PartCondition>('TRES_BON');
  readonly fits = signal<VehicleFit[]>([]);
  readonly fitFormOpen = signal(false);
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

  whatsapp = '';
  readonly maxYear = new Date().getFullYear() + 1;

  yearsValid(): boolean {
    const ok = (y: number | null) => y === null || (y >= 1950 && y <= this.maxYear);
    return ok(this.fitFrom) && ok(this.fitTo) && (this.fitFrom === null || this.fitTo === null || this.fitFrom <= this.fitTo);
  }
  readonly needsContact = computed(() => !this.auth.user()?.hasContact);
  readonly contactLabel = computed(() => {
    const u = this.auth.user();
    if (u?.whatsapp) return ` sur WhatsApp (${u.whatsapp})`;
    if (u?.phone) return ` au ${u.phone}`;
    return '';
  });

  ngOnInit(): void {
    const userCity = this.auth.user()?.city;
    if (userCity && CITIES.includes(userCity)) {
      this.city = userCity;
    }
  }

  onPrice(value: number | null): void {
    this.priceValue.set(value);
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 8 - this.photos().length);
    input.value = '';
    if (!files.length) {
      return;
    }
    if (!this.auth.isLoggedIn()) {
      const previews = files.map((file) => {
        const url = URL.createObjectURL(file);
        this.pendingFiles.set(url, file);
        return url;
      });
      this.photos.set([...this.photos(), ...previews]);
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
    const url = this.photos()[index];
    if (url && this.pendingFiles.has(url)) {
      URL.revokeObjectURL(url);
      this.pendingFiles.delete(url);
    }
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

  fitLabel(f: VehicleFit): string {
    const years = f.yearFrom || f.yearTo ? ` · ${f.yearFrom ?? '…'}–${f.yearTo ?? '…'}` : '';
    return `${f.make} ${f.model}${years}`;
  }

  readonly accountOpen = signal(false);
  readonly accountMode = signal<'register' | 'login'>('register');
  readonly accountError = signal<string | null>(null);
  accName = '';
  accEmail = '';
  accPassword = '';
  accPro = false;
  private readonly pendingFiles = new Map<string, File>();

  submit(): void {
    if (!this.category()) {
      return;
    }
    if (!this.auth.isLoggedIn()) {
      this.accountError.set(null);
      this.accountOpen.set(true);
      return;
    }
    this.publish();
  }

  accountSubmit(): void {
    this.saving.set(true);
    this.accountError.set(null);
    const call =
      this.accountMode() === 'register'
        ? this.auth.register({
            fullName: this.accName.trim(),
            email: this.accEmail.trim(),
            password: this.accPassword,
            city: this.city,
            sellerType: this.accPro ? 'PRO' : 'PARTICULIER',
            shopName: this.accPro ? this.accName.trim() : undefined,
          })
        : this.auth.login(this.accEmail.trim(), this.accPassword);
    call.subscribe({
      next: () => {
        this.accountOpen.set(false);
        this.publish();
      },
      error: (e) => {
        this.saving.set(false);
        this.accountError.set(errorMessage(e));
      },
    });
  }

  private uploadPending(): Observable<string[]> {
    const current = this.photos();
    const files = current.map((url) => this.pendingFiles.get(url)).filter((f): f is File => !!f);
    if (!files.length) {
      return of(current);
    }
    return this.api.uploadPhotos(files).pipe(
      switchMap((urls) => {
        let k = 0;
        const merged = current.map((url) => (this.pendingFiles.has(url) ? urls[k++] ?? url : url));
        this.pendingFiles.forEach((_, url) => URL.revokeObjectURL(url));
        this.pendingFiles.clear();
        this.photos.set(merged);
        return of(merged);
      }),
    );
  }

  private publish(): void {
    const category = this.category();
    const price = this.price && this.price >= 5 ? this.price : null;
    if (!category) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.ensureContact()
      .pipe(switchMap(() => this.uploadPending()))
      .pipe(switchMap((photos) => this.api.createListing({
        title: this.title,
        description: this.description || undefined,
        category,
        condition: this.condition(),
        price,
        negotiable: this.negotiable,
        city: this.city,
        oemReference: this.oemReference || undefined,
        photos,
        fits: this.fits(),
      })))
      .subscribe({
        next: (l) => this.router.navigate(['/piece', l.id, l.slug]),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.saving.set(false);
        },
      });
  }

  private ensureContact(): Observable<User | null> {
    const user = this.auth.user();
    if (!user || user.hasContact) {
      return of(null);
    }
    return this.api
      .updateProfile({
        fullName: user.fullName,
        phone: user.phone,
        whatsapp: this.whatsapp.trim(),
        facebookUrl: user.facebookUrl,
        city: user.city ?? this.city,
        sellerType: user.sellerType,
        shopName: user.shopName,
      })
      .pipe(
        switchMap((updated) => {
          this.auth.setUser(updated);
          return of(updated);
        }),
      );
  }
}
