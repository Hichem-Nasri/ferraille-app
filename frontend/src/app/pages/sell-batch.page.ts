import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n';
import { CATEGORIES, CITIES, CONDITIONS, MAKES, categoryMeta } from '../core/labels';
import { Category, ListingRequest, PartCondition } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

interface Row {
  key: number;
  photo: string | null;
  uploading: boolean;
  part: string;
  category: Category | null;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  price: number | null;
}

let nextKey = 1;

function emptyRow(previous?: Row): Row {
  return {
    key: nextKey++,
    photo: null,
    uploading: false,
    part: '',
    category: previous?.category ?? null,
    make: previous?.make ?? '',
    model: previous?.model ?? '',
    yearFrom: previous?.yearFrom ?? null,
    yearTo: previous?.yearTo ?? null,
    price: null,
  };
}

@Component({
  selector: 'fr-sell-batch-page',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <div class="stack">
        <h1 class="h1">{{ 'Publication express' | t }}</h1>
        <span class="muted">Jusqu'à 10 pièces d'un coup : une photo, le nom de la pièce, le véhicule. Le titre se remplit tout seul.
          <a routerLink="/vendre">Annonce détaillée</a></span>
      </div>

      @if (!auth.user()?.hasContact) {
        <div class="card card-pad warn">Ajoute d'abord ton numéro WhatsApp dans <a routerLink="/profil" [queryParams]="{ retour: '/vendre/lot' }">ton profil</a> pour que les acheteurs puissent te joindre.</div>
      }

      <div class="card card-pad grid-3 common">
        <div class="field">
          <label for="bcity">{{ 'Ville' | t }}</label>
          <select id="bcity" class="input" [(ngModel)]="city" name="city">
            @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
        <div class="field">
          <label for="bcond">{{ 'État' | t }}</label>
          <select id="bcond" class="input" [(ngModel)]="condition" name="condition">
            @for (c of conditions; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
          </select>
        </div>
        <label class="row check"><input type="checkbox" [(ngModel)]="negotiable" name="negotiable"> Prix négociable</label>
      </div>

      @for (r of rows(); track r.key; let i = $index) {
        <div class="card card-pad row-card">
          <label class="photo" [class.has]="r.photo">
            @if (r.photo) { <img [src]="r.photo" alt=""> }
            @else if (r.uploading) { <span class="small">…</span> }
            @else { <fr-icon name="camera" [size]="26" /> }
            <input type="file" accept="image/*" (change)="upload(r, $event)" hidden>
          </label>
          <div class="fields">
            <input class="input wide-field" [(ngModel)]="r.part" [name]="'part' + r.key" maxlength="80" placeholder="Pièce : phare avant gauche, démarreur…" aria-label="Nom de la pièce">
            <select class="input" [(ngModel)]="r.category" [name]="'cat' + r.key" [attr.aria-label]="'Catégorie' | t">
              <option [ngValue]="null" disabled>{{ 'Catégorie' | t }}</option>
              @for (c of categories; track c.value) { <option [ngValue]="c.value">{{ c.label }}</option> }
            </select>
            <select class="input" [(ngModel)]="r.make" [name]="'make' + r.key" [attr.aria-label]="'Marque' | t">
              <option value="" disabled>{{ 'Marque' | t }}</option>
              @for (m of makes; track m) { <option [value]="m">{{ m }}</option> }
            </select>
            <input class="input" [(ngModel)]="r.model" [name]="'model' + r.key" maxlength="60" [placeholder]="'Modèle' | t" [attr.aria-label]="'Modèle' | t">
            <input class="input" type="number" [(ngModel)]="r.yearFrom" [name]="'yf' + r.key" min="1950" [max]="maxYear" placeholder="Année de" aria-label="Année de">
            <input class="input" type="number" [(ngModel)]="r.yearTo" [name]="'yt' + r.key" min="1950" [max]="maxYear" placeholder="à" aria-label="Année à">
            <input class="input" type="number" [(ngModel)]="r.price" [name]="'price' + r.key" min="0" [placeholder]="'Prix (DT)' | t" [attr.aria-label]="'Prix (DT)' | t">
            <span class="muted small wide-field">{{ title(r) || '—' }}</span>
          </div>
          @if (rows().length > 1) {
            <button type="button" class="icon-btn remove" (click)="remove(i)" aria-label="Retirer la ligne"><fr-icon name="close" [size]="16" /></button>
          }
        </div>
      }

      <div class="row actions">
        @if (rows().length < 10) {
          <button type="button" class="btn btn-ghost grow" (click)="add()"><fr-icon name="plus" [size]="18" />{{ 'Ajouter une ligne' | t }}</button>
        }
        <button type="button" class="btn btn-primary grow" (click)="publish()" [disabled]="saving() || !auth.user()?.hasContact || readyCount() === 0">
          {{ 'Tout publier' | t }} ({{ readyCount() }})
        </button>
      </div>
      <span class="muted small">Une ligne est publiée si elle a une photo, une catégorie, une marque et un modèle.</span>
      @if (error()) { <div class="error">{{ error() }}</div> }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 26px; margin: 0; }
    .warn { background: var(--warn-soft); border-color: #f0dc9a; color: var(--warn); }
    .common { align-items: end; }
    .grid-3 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .check { gap: 8px; font-weight: 600; font-size: 14px; height: 48px; }
    .row-card { display: flex; gap: 12px; align-items: flex-start; position: relative; }
    .photo { width: 84px; height: 84px; border-radius: 14px; border: 1.5px dashed #9fb3a6; display: flex; align-items: center; justify-content: center; color: var(--green); cursor: pointer; flex-shrink: 0; overflow: hidden; }
    .photo.has { border-style: solid; border-color: var(--line); }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .fields { flex: 1; min-width: 0; display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fields .input { height: 42px; font-size: 14px; }
    .wide-field { grid-column: 1 / -1; }
    @media (min-width: 900px) { .fields { grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 0.8fr 0.8fr 1fr; } .wide-field:first-child { grid-column: 1 / -1; } }
    .remove { position: absolute; top: 6px; inset-inline-end: 6px; width: 30px; height: 30px; }
    .actions { gap: 10px; }
  `,
})
export class SellBatchPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;
  readonly conditions = CONDITIONS;
  readonly cities = CITIES;
  readonly makes = MAKES;
  readonly maxYear = new Date().getFullYear() + 1;

  readonly rows = signal<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  city = 'Tunis';
  condition: PartCondition = 'BON';
  negotiable = true;

  ngOnInit(): void {
    const userCity = this.auth.user()?.city;
    if (userCity && CITIES.includes(userCity)) {
      this.city = userCity;
    }
  }

  readyCount(): number {
    return this.rows().filter((r) => this.ready(r)).length;
  }

  add(): void {
    const list = this.rows();
    this.rows.set([...list, emptyRow(list[list.length - 1])]);
  }

  remove(index: number): void {
    this.rows.set(this.rows().filter((_, i) => i !== index));
  }

  upload(row: Row, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.patch(row, { uploading: true });
    this.api.uploadPhotos([file]).subscribe({
      next: (urls) => this.patch(row, { photo: urls[0] ?? null, uploading: false }),
      error: (e) => {
        this.patch(row, { uploading: false });
        this.error.set(errorMessage(e));
      },
    });
  }

  title(r: Row): string {
    const part = r.part.trim() || (r.category ? categoryMeta(r.category).label : '');
    const vehicle = [r.make, r.model.trim()].filter(Boolean).join(' ');
    const years = r.yearFrom && r.yearTo ? ` ${r.yearFrom}-${r.yearTo}` : r.yearFrom ? ` ${r.yearFrom}` : '';
    return [part, vehicle].filter(Boolean).join(' ') + (vehicle ? years : '');
  }

  publish(): void {
    const ready = this.rows().filter((r) => this.ready(r));
    const bad = ready.find((r) => !this.yearsOk(r));
    if (bad) {
      this.error.set(`Années invalides pour « ${this.title(bad)} ».`);
      return;
    }
    const requests: ListingRequest[] = ready.map((r) => ({
      title: this.title(r).slice(0, 140),
      category: r.category!,
      condition: this.condition,
      price: r.price && r.price >= 5 ? r.price : null,
      negotiable: this.negotiable,
      city: this.city,
      photos: [r.photo!],
      fits: [{ make: r.make, model: r.model.trim(), yearFrom: r.yearFrom, yearTo: r.yearTo }],
    }));
    this.saving.set(true);
    this.error.set(null);
    this.api.createListingsBulk(requests).subscribe({
      next: () => this.router.navigate(['/mes-annonces']),
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }

  private ready(r: Row): boolean {
    return !!r.photo && !!r.category && !!r.make && r.model.trim().length > 0;
  }

  private yearsOk(r: Row): boolean {
    const ok = (y: number | null) => y === null || (y >= 1950 && y <= this.maxYear);
    return ok(r.yearFrom) && ok(r.yearTo) && (r.yearFrom === null || r.yearTo === null || r.yearFrom <= r.yearTo);
  }

  private patch(row: Row, changes: Partial<Row>): void {
    this.rows.update((list) => list.map((r) => (r.key === row.key ? Object.assign(r, changes) : r)));
  }
}
