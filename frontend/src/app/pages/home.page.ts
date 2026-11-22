import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, map, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { GarageService } from '../core/garage.service';
import { CATEGORIES, MAKES, categoryBySlug } from '../core/labels';
import { DEFAULT_DESCRIPTION, SITE_NAME, SeoService } from '../core/seo.service';
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
    <div class="page wide">
      <header class="row between home-header">
        <div class="row brand">
          <div class="logo mobile-only"><fr-part-icon name="gear" [size]="22" [stroke]="5" /></div>
          <div class="stack">
            <span class="wordmark mobile-only">ferraille</span>
            <h1 class="tagline">{{ heading() }}</h1>
          </div>
        </div>
        @if (auth.isLoggedIn()) {
          <a class="icon-btn mobile-only" routerLink="/profil" aria-label="Mon profil"><fr-icon name="user" /></a>
        } @else {
          <a class="btn btn-ghost login mobile-only" routerLink="/connexion">Connexion</a>
        }
      </header>

      <div class="search-zone">
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
            <a class="category" [class.active]="category() === c.value"
               [routerLink]="category() === c.value ? '/' : ['/pieces', c.slug]"
               [attr.aria-current]="category() === c.value ? 'page' : null">
              <span class="cat-icon"><fr-part-icon [name]="c.icon" [size]="28" [stroke]="3.5" /></span>
              <span>{{ c.label }}</span>
            </a>
          }
        </div>
      </section>

      <div class="dark-card row banner">
        <div class="ring"></div>
        <div class="stack grow">
          <span class="banner-title">Une pièce qui dort dans ton garage ?</span>
          <span class="banner-text">Publie gratuitement en 2 minutes. Les acheteurs te contactent directement sur WhatsApp.</span>
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
          <div class="listing-grid">
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
    .tagline { margin: 2px 0 0; font-family: var(--font); font-size: 12px; font-weight: 500; letter-spacing: 0; color: var(--muted); }
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
    .category { border: 0; background: none; padding: 0; text-decoration: none; width: 74px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--ink); }
    .cat-icon { width: 64px; height: 64px; border-radius: 20px; background: var(--white); border: 1px solid var(--line); color: var(--green); display: flex; align-items: center; justify-content: center; }
    .category.active .cat-icon { background: var(--forest); border-color: var(--forest); color: var(--lime); }
    .banner { gap: 14px; }
    .ring { position: absolute; right: -30px; top: -30px; width: 140px; height: 140px; border-radius: 50%; border: 18px solid rgba(198, 243, 107, 0.14); }
    .banner-title { font-family: var(--display); font-size: 19px; font-weight: 700; line-height: 1.2; position: relative; }
    .banner-text { font-size: 13px; color: #c9d8cf; line-height: 1.4; position: relative; }
    .sell { height: 44px; position: relative; flex-shrink: 0; }
    .search-zone { display: flex; flex-direction: column; gap: 18px; }
    @media (min-width: 900px) {
      .home-header { padding-top: 8px; }
      .tagline { font-family: var(--display); font-size: 34px; font-weight: 700; letter-spacing: -0.8px; color: var(--ink); margin: 0; }
      .search-zone { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
      .search-zone .card { padding: 0 16px; }
      .categories { flex-wrap: wrap; overflow: visible; margin-right: 0; padding-right: 0; gap: 12px; }
      .category { width: 104px; }
      .cat-icon { width: 72px; height: 72px; }
      .banner { padding: 28px 32px; }
      .banner-title { font-size: 24px; }
      .banner-text { font-size: 15px; }
    }
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
    const meta = CATEGORIES.find((c) => c.value === this.category());
    if (v) {
      return `${meta ? meta.label + ' compatibles' : 'Compatibles'} avec ta ${v.model}`;
    }
    return meta ? `${meta.label} d'occasion` : 'Dernières pièces';
  });

  readonly heading = computed(() => {
    const meta = CATEGORIES.find((c) => c.value === this.category());
    return meta ? `Pièces ${meta.seo} d'occasion en Tunisie` : "Pièces auto d'occasion en Tunisie";
  });

  private readonly seo = inject(SeoService);
  private initialized = false;

  @Input()
  set q(value: string | undefined) {
    this.query = value ?? '';
    if (this.initialized) {
      this.search();
    }
  }

  @Input()
  set categorie(value: string | undefined) {
    this.category.set(categoryBySlug(value)?.value ?? null);
    if (this.initialized) {
      this.updateSeo();
      this.search();
    }
  }

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
    this.initialized = true;
    this.updateSeo();
    this.search();
  }

  private updateSeo(): void {
    const meta = CATEGORIES.find((c) => c.value === this.category());
    if (meta) {
      this.seo.set({
        title: `Pièces ${meta.seo} d'occasion en Tunisie | ${SITE_NAME}`,
        description: `Pièces ${meta.seo} d'occasion à vendre en Tunisie, par des particuliers et des casses. Annonces gratuites, contact direct avec le vendeur par WhatsApp.`,
        path: `/pieces/${meta.slug}`,
        jsonLd: [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${this.seo.origin}/` },
              { '@type': 'ListItem', position: 2, name: meta.label, item: `${this.seo.origin}/pieces/${meta.slug}` },
            ],
          },
        ],
      });
      return;
    }
    this.seo.set({
      title: `${SITE_NAME} — Pièces auto d'occasion en Tunisie | Achat & vente`,
      description: DEFAULT_DESCRIPTION,
      path: '/',
      noindex: this.query.trim().length > 0,
      jsonLd: [
        {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: `${this.seo.origin}/`,
          inLanguage: 'fr-TN',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${this.seo.origin}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        { '@type': 'Organization', name: SITE_NAME, url: `${this.seo.origin}/`, logo: `${this.seo.origin}/icon-512.png`, areaServed: 'TN' },
      ],
    });
  }

  search(): void {
    this.searches.next({ filter: this.filter(0), append: false });
  }

  loadMore(): void {
    this.searches.next({ filter: this.filter(this.page() + 1), append: true });
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
