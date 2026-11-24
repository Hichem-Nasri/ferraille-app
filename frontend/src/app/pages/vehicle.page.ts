import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ListingSummary, VehicleEntry } from '../core/models';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { ListingCardComponent } from '../shared/listing-card.component';
import { ShareComponent } from '../shared/share.component';

@Component({
  selector: 'fr-vehicle-page',
  standalone: true,
  imports: [RouterLink, ListingCardComponent, BottomNavComponent, ShareComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <nav class="crumbs small" aria-label="Fil d'Ariane">
        <a routerLink="/">Accueil</a> ›
        @if (entry(); as e) {
          @if (e.model) { <a [routerLink]="['/pieces-auto', e.makeSlug]">{{ e.make }}</a> › <span>{{ e.model }}</span> }
          @else { <span>{{ e.make }}</span> }
        }
      </nav>
      @if (entry(); as e) {
        <div class="stack">
          <h1 class="h1">Pièces {{ label() }} d'occasion</h1>
          <span class="muted">{{ total() }} pièce{{ total() > 1 ? 's' : '' }} en ligne · contact direct avec le vendeur</span>
        </div>

        @if (related().length) {
          <div class="chips">
            @for (r of related(); track r.modelSlug) {
              <a class="chip" [routerLink]="['/pieces-auto', r.makeSlug, r.modelSlug]">{{ r.model }} <span class="muted">{{ r.count }}</span></a>
            }
          </div>
        }

        @if (listings().length === 0 && !loading()) {
          <div class="empty card">Aucune pièce en ligne pour le moment.</div>
        } @else {
          <div class="listing-grid">
            @for (l of listings(); track l.id) { <fr-listing-card [listing]="l" /> }
          </div>
          @if (hasMore()) {
            <button type="button" class="btn btn-ghost btn-block" (click)="more()" [disabled]="loading()">Voir plus</button>
          }
        }

        <section class="card card-pad stack helper">
          <span class="strong">Tu ne trouves pas la pièce pour ta {{ label() }} ?</span>
          <span class="muted small">Publie une demande : les vendeurs qui ont des pièces {{ e.make }} la voient et te contactent sur WhatsApp.</span>
          <div class="row actions">
            <a class="btn btn-primary" routerLink="/demandes">Publier une demande</a>
            <button type="button" class="btn btn-ghost" (click)="alert(e)" [disabled]="alertBusy()">Créer une alerte {{ label() }}</button>
          </div>
          @if (alertMessage()) { <span class="small ok">{{ alertMessage() }}</span> }
        </section>

        <section class="stack gap8">
          <span class="strong small">Partager cette page</span>
          <fr-share [url]="path()" [text]="'Pièces ' + label() + ' d’occasion en Tunisie 🔧'" src="modele" />
        </section>
      } @else if (notFound()) {
        <div class="empty card">Aucune pièce pour ce véhicule pour le moment.<br><a routerLink="/">Voir toutes les pièces</a></div>
      } @else {
        <div class="empty">Chargement…</div>
      }
      @if (error()) { <div class="error">{{ error() }}</div> }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .crumbs { color: var(--ink-3); display: flex; gap: 6px; flex-wrap: wrap; }
    .h1 { font-size: 26px; margin: 0; }
    .chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
    .chips .chip { flex-shrink: 0; gap: 6px; }
    @media (min-width: 900px) { .chips { flex-wrap: wrap; overflow: visible; } }
    .helper { gap: 8px; }
    .actions { gap: 8px; flex-wrap: wrap; }
    .strong { font-weight: 700; }
    .ok { color: var(--green); font-weight: 600; }
    .gap8 { gap: 8px; }
  `,
})
export class VehiclePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  private makeSlug = '';
  private modelSlug: string | null = null;
  private initialized = false;

  readonly all = signal<VehicleEntry[]>([]);
  readonly entry = signal<VehicleEntry | null>(null);
  readonly notFound = signal(false);
  readonly listings = signal<ListingSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly alertBusy = signal(false);
  readonly alertMessage = signal<string | null>(null);
  private readonly page = signal(0);
  private readonly totalPages = signal(0);
  readonly hasMore = computed(() => this.page() + 1 < this.totalPages());
  readonly label = computed(() => {
    const e = this.entry();
    return e ? (e.model ? `${e.make} ${e.model}` : e.make) : '';
  });
  readonly path = computed(() => {
    const e = this.entry();
    return e ? `/pieces-auto/${e.makeSlug}${e.modelSlug ? '/' + e.modelSlug : ''}` : '/';
  });
  readonly related = computed(() => {
    const e = this.entry();
    return e ? this.all().filter((v) => v.makeSlug === e.makeSlug && v.modelSlug && v.modelSlug !== e.modelSlug).slice(0, 30) : [];
  });

  @Input()
  set marque(value: string) {
    this.makeSlug = value;
    if (this.initialized) {
      this.resolve();
    }
  }

  @Input()
  set modele(value: string | undefined) {
    this.modelSlug = value ?? null;
    if (this.initialized) {
      this.resolve();
    }
  }

  ngOnInit(): void {
    this.initialized = true;
    this.api.vehicles().subscribe({
      next: (list) => {
        this.all.set(list);
        this.resolve();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private resolve(): void {
    const e = this.all().find((v) => v.makeSlug === this.makeSlug && (v.modelSlug ?? null) === this.modelSlug) ?? null;
    this.entry.set(e);
    this.notFound.set(!e && this.all().length > 0);
    this.alertMessage.set(null);
    if (!e) {
      return;
    }
    const label = e.model ? `${e.make} ${e.model}` : e.make;
    this.seo.set({
      title: `Pièces ${label} d'occasion en Tunisie | ${SITE_NAME}`,
      description: `Pièces détachées ${label} d'occasion à vendre en Tunisie : ${e.count} annonce(s) de casses et de particuliers. Contact direct sur WhatsApp.`,
      path: this.path(),
    });
    this.load(0);
  }

  more(): void {
    this.load(this.page() + 1);
  }

  private load(page: number): void {
    const e = this.entry();
    if (!e) {
      return;
    }
    this.loading.set(true);
    this.api.searchListings({ make: e.make, model: e.model ?? undefined, page, size: 24 }).subscribe({
      next: (p) => {
        this.listings.set(page === 0 ? p.content : [...this.listings(), ...p.content]);
        this.total.set(p.totalElements);
        this.page.set(p.page);
        this.totalPages.set(p.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  alert(e: VehicleEntry): void {
    if (!this.auth.isLoggedIn()) {
      this.alertMessage.set('Connecte-toi pour créer une alerte.');
      return;
    }
    this.alertBusy.set(true);
    this.api.createAlert({ make: e.make, model: e.model ?? undefined }).subscribe({
      next: () => {
        this.alertBusy.set(false);
        this.alertMessage.set('Alerte créée. Tu verras les nouvelles pièces dans « Alertes ».');
      },
      error: (err) => {
        this.alertBusy.set(false);
        this.alertMessage.set(errorMessage(err));
      },
    });
  }
}
