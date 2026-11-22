import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, map, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { GarageService } from '../core/garage.service';
import { CATEGORIES, MAKES } from '../core/labels';
import { Category, ListingFilter, ListingSummary } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';
import { ListingCardComponent } from '../shared/listing-card.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-home-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, PartIconComponent, ListingCardComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="row between">
        <div class="row brand">
          <div class="logo"><fr-part-icon name="gear" [size]="22" [stroke]="5" /></div>
          <div class="stack">
            <span class="wordmark">ferraille</span>
            <span class="muted small">Pièces auto d'occasion · Tunisie</span>
          </div>
        </div>
        @if (auth.isLoggedIn()) {
          <a class="icon-btn" routerLink="/commandes" aria-label="Mes commandes"><fr-icon name="bell" /></a>
        } @else {
          <a class="btn btn-ghost login" routerLink="/connexion">Connexion</a>
        }
      </header>

      <form class="row" (ngSubmit)="search()">
        <label class="search">
          <fr-icon name="search" />
          <input type="search" name="q" [(ngModel)]="query" (ngModelChange)="search()"
                 placeholder="Phare 208, jante 16″, démarreur…" aria-label="Rechercher une pièce">
        </label>
        <button type="button" class="icon-btn filter" aria-label="Changer de véhicule" (click)="garageOpen.set(true)">
          <fr-icon name="filter" />
        </button>
      </form>

      <div class="card card-pad row">
        <div class="garage-icon"><fr-icon name="car" [size]="22" /></div>
        <div class="stack grow">
          <span class="eyebrow">Mon garage</span>
          <span class="garage-label">{{ garage.vehicle() ? garage.label() : 'Ajoute ta voiture pour filtrer' }}</span>
        </div>
        <button type="button" class="link" (click)="garageOpen.set(true)">{{ garage.vehicle() ? 'Changer' : 'Ajouter' }}</button>
      </div>

      @if (garageOpen()) {
        <form class="card card-pad garage-form" (ngSubmit)="saveGarage()">
          <div class="grid-2">
            <div class="field">
              <label for="make">Marque</label>
              <select id="make" class="input" name="make" [(ngModel)]="draftMake" required>
                <option value="" disabled>Choisir</option>
                @for (m of makes; track m) { <option [value]="m">{{ m }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="model">Modèle</label>
              <input id="model" class="input" name="model" [(ngModel)]="draftModel" placeholder="208, Clio 4…" required>
            </div>
          </div>
          <div class="field">
            <label for="year">Année</label>
            <input id="year" class="input" type="number" name="year" [(ngModel)]="draftYear" min="1970" max="2100" placeholder="2017">
          </div>
          <div class="row">
            @if (garage.vehicle()) {
              <button type="button" class="btn btn-ghost grow" (click)="clearGarage()">Retirer</button>
            }
            <button type="submit" class="btn btn-primary grow" [disabled]="!draftMake || !draftModel">Enregistrer</button>
          </div>
        </form>
      }

      <section class="stack gap">
        <h2 class="section-title">Catégories</h2>
        <div class="categories">
          @for (c of categories; track c.value) {
            <button type="button" class="category" [class.active]="category() === c.value" (click)="toggleCategory(c.value)">
              <span class="cat-icon"><fr-part-icon [name]="c.icon" [size]="28" [stroke]="3.5" /></span>
              <span>{{ c.label }}</span>
            </button>
          }
        </div>
      </section>

      <div class="dark-card row banner">
        <div class="ring"></div>
        <div class="stack grow">
          <span class="banner-title">Une pièce qui dort dans ton garage ?</span>
          <span class="banner-text">Publie en 2 minutes. Aramex ou La Poste vient la récupérer chez toi.</span>
        </div>
        <a class="btn btn-lime sell" routerLink="/vendre">Vendre</a>
      </div>

      <section class="stack gap">
        <div class="row between">
          <h2 class="section-title">{{ sectionTitle() }}</h2>
          <span class="muted">{{ total() }} pièce{{ total() > 1 ? 's' : '' }}</span>
        </div>
        @if (loading() && listings().length === 0) {
          <div class="empty">Chargement…</div>
        } @else if (listings().length === 0) {
          <div class="empty card">Aucune pièce trouvée pour le moment.</div>
        } @else {
          <div class="grid-2">
            @for (l of listings(); track l.id) { <fr-listing-card [listing]="l" /> }
          </div>
          @if (hasMore()) {
            <button type="button" class="btn btn-ghost btn-block" (click)="loadMore()" [disabled]="loading()">Voir plus</button>
          }
        }
      </section>
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .brand { gap: 10px; }
    .logo { width: 38px; height: 38px; border-radius: 12px; background: var(--forest); color: var(--lime); display: flex; align-items: center; justify-content: center; }
    .wordmark { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.5px; line-height: 1; }
    .login { height: 44px; font-size: 14px; }
    .search { flex: 1; height: 52px; border-radius: 16px; background: var(--white); border: 1px solid var(--line); display: flex; align-items: center; gap: 10px; padding: 0 16px; color: var(--muted); }
    .search input { border: 0; outline: none; flex: 1; font-size: 15px; font-family: inherit; color: var(--ink); background: transparent; min-width: 0; }
    .filter { width: 52px; height: 52px; border-radius: 16px; background: var(--forest); color: var(--white); border: 0; }
    .garage-icon { width: 40px; height: 40px; border-radius: 12px; background: var(--green-soft); color: var(--green); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: var(--muted); }
    .garage-label { font-size: 14px; font-weight: 600; }
    .link { border: 0; background: none; color: var(--green); font-weight: 600; font-size: 13px; cursor: pointer; padding: 8px; }
    .garage-form { display: flex; flex-direction: column; gap: 12px; }
    .gap { gap: 12px; }
    .categories { display: flex; gap: 10px; overflow-x: auto; margin-right: -20px; padding-right: 20px; scrollbar-width: none; }
    .category { border: 0; background: none; padding: 0; width: 74px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--ink); }
    .cat-icon { width: 64px; height: 64px; border-radius: 20px; background: var(--white); border: 1px solid var(--line); color: var(--green); display: flex; align-items: center; justify-content: center; }
    .category.active .cat-icon { background: var(--forest); border-color: var(--forest); color: var(--lime); }
    .banner { gap: 14px; }
    .ring { position: absolute; right: -30px; top: -30px; width: 140px; height: 140px; border-radius: 50%; border: 18px solid rgba(198, 243, 107, 0.14); }
    .banner-title { font-family: var(--display); font-size: 19px; font-weight: 700; line-height: 1.2; position: relative; }
    .banner-text { font-size: 13px; color: #c9d8cf; line-height: 1.4; position: relative; }
    .sell { height: 44px; position: relative; flex-shrink: 0; }
  `,
})
export class HomePage implements OnInit {
  readonly auth = inject(AuthService);
  readonly garage = inject(GarageService);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = CATEGORIES;
  readonly makes = MAKES;

  readonly listings = signal<ListingSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly category = signal<Category | null>(null);
  readonly garageOpen = signal(false);
  private readonly page = signal(0);
  private readonly totalPages = signal(0);
  readonly hasMore = computed(() => this.page() + 1 < this.totalPages());

  readonly sectionTitle = computed(() => {
    const v = this.garage.vehicle();
    return v ? `Compatibles avec ta ${v.model}` : 'Dernières pièces';
  });

  query = '';
  draftMake = '';
  draftModel = '';
  draftYear: number | null = null;

  private readonly searches = new Subject<{ filter: ListingFilter; append: boolean }>();

  ngOnInit(): void {
    const v = this.garage.vehicle();
    this.draftMake = v?.make ?? '';
    this.draftModel = v?.model ?? '';
    this.draftYear = v?.year ?? null;

    this.searches
      .pipe(
        debounceTime(250),
        switchMap(({ filter, append }) => {
          this.loading.set(true);
          return this.api.searchListings(filter).pipe(
            map((page) => ({ page, append })),
            catchError(() => {
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ page, append }) => {
          this.listings.set(append ? [...this.listings(), ...page.content] : page.content);
          this.total.set(page.totalElements);
          this.page.set(page.page);
          this.totalPages.set(page.totalPages);
          this.loading.set(false);
        },
      });
    this.search();
  }

  search(): void {
    this.searches.next({ filter: this.filter(0), append: false });
  }

  loadMore(): void {
    this.searches.next({ filter: this.filter(this.page() + 1), append: true });
  }

  toggleCategory(value: Category): void {
    this.category.set(this.category() === value ? null : value);
    this.search();
  }

  saveGarage(): void {
    this.garage.set({ make: this.draftMake, model: this.draftModel.trim(), year: this.draftYear ?? undefined });
    this.garageOpen.set(false);
    this.search();
  }

  clearGarage(): void {
    this.garage.set(null);
    this.draftMake = '';
    this.draftModel = '';
    this.draftYear = null;
    this.garageOpen.set(false);
    this.search();
  }

  private filter(page: number): ListingFilter {
    const v = this.garage.vehicle();
    return {
      q: this.query.trim() || undefined,
      category: this.category() ?? undefined,
      make: v?.make,
      model: v?.model,
      year: v?.year,
      page,
      size: 20,
    };
  }
}
