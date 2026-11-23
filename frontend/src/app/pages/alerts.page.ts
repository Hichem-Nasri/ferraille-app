import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { TranslatePipe } from '../core/i18n';
import { ListingSummary, SavedSearch } from '../core/models';
import { NotifService } from '../core/notif.service';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';
import { ListingCardComponent } from '../shared/listing-card.component';

@Component({
  selector: 'fr-alerts-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, IconComponent, ListingCardComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <div class="stack">
        <h1 class="h1">{{ 'Mes alertes' | t }}</h1>
        <span class="muted">Dès qu'une pièce correspondant à une alerte est publiée, un compteur apparaît ici et dans le menu.</span>
      </div>
      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">{{ 'Chargement…' | t }}</div>
      } @else if (alerts().length === 0) {
        <div class="empty card">{{ 'Aucune alerte. Crée-en une depuis la recherche.' | t }}<br><a routerLink="/">Rechercher une pièce</a></div>
      } @else {
        @for (a of alerts(); track a.id) {
          <section class="card card-pad stack alert">
            <div class="row between">
              <button type="button" class="row title" (click)="toggle(a)">
                <fr-icon name="bell" [size]="18" />
                <span>{{ a.label }}</span>
                @if (a.newCount > 0) { <span class="count">{{ a.newCount }} {{ 'nouvelle(s)' | t }}</span> }
              </button>
              <button type="button" class="icon-btn" (click)="remove(a)" [attr.aria-label]="'Supprimer' | t"><fr-icon name="close" [size]="18" /></button>
            </div>
            @if (open() === a.id) {
              @if (results().length === 0) {
                <span class="muted small">Aucune pièce pour le moment. On te prévient ici dès qu'il y en a une.</span>
              } @else {
                <div class="listing-grid">
                  @for (l of results(); track l.id) { <fr-listing-card [listing]="l" /> }
                </div>
              }
            }
          </section>
        }
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 26px; margin: 0; }
    .alert { gap: 12px; }
    .title { border: 0; background: none; cursor: pointer; gap: 8px; font-weight: 700; font-size: 15px; color: var(--ink); padding: 0; text-align: start; flex-wrap: wrap; }
    .count { background: var(--danger); color: var(--white); border-radius: 999px; font-size: 12px; padding: 2px 8px; }
  `,
})
export class AlertsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notif = inject(NotifService);

  readonly alerts = signal<SavedSearch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly open = signal<number | null>(null);
  readonly results = signal<ListingSummary[]>([]);

  ngOnInit(): void {
    this.api.alerts().subscribe({
      next: (list) => {
        this.alerts.set(list);
        this.loading.set(false);
        const first = list.find((a) => a.newCount > 0);
        if (first) {
          this.toggle(first);
        }
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  toggle(a: SavedSearch): void {
    if (this.open() === a.id) {
      this.open.set(null);
      return;
    }
    this.open.set(a.id);
    this.results.set([]);
    this.api
      .searchListings({ q: a.q, category: a.category ?? undefined, make: a.make, model: a.model, year: a.year ?? undefined, city: a.city, size: 12 })
      .subscribe({ next: (p) => this.results.set(p.content), error: () => undefined });
    if (a.newCount > 0) {
      this.api.alertSeen(a.id).subscribe({
        next: () => {
          this.alerts.update((list) => list.map((x) => (x.id === a.id ? { ...x, newCount: 0 } : x)));
          this.notif.refresh(true);
        },
        error: () => undefined,
      });
    }
  }

  remove(a: SavedSearch): void {
    this.api.deleteAlert(a.id).subscribe({
      next: () => {
        this.alerts.update((list) => list.filter((x) => x.id !== a.id));
        this.notif.refresh(true);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
