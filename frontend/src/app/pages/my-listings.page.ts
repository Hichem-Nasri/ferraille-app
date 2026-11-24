import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { DinarPipe } from '../core/dinar.pipe';
import { categoryMeta } from '../core/labels';
import { ListingStatus, ListingSummary } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-my-listings-page',
  standalone: true,
  imports: [RouterLink, DinarPipe, IconComponent, PartIconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="row between">
        <h1 class="h1">Mes annonces</h1>
        <a class="btn btn-lime add" routerLink="/vendre"><fr-icon name="plus" [size]="18" [stroke]="2.6" />Vendre</a>
      </div>
      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">Chargement…</div>
      } @else if (listings().length === 0) {
        <div class="empty card">Aucune annonce en ligne.<br><a routerLink="/vendre">Publier ma première pièce</a></div>
      } @else {
        <div class="card list">
          @for (l of listings(); track l.id) {
            <div class="row item">
              <a class="thumb" [routerLink]="['/piece', l.id, l.slug]" [style.background]="meta(l).tint" [style.color]="meta(l).tone">
                @if (l.coverPhoto) { <img [src]="l.coverPhoto" alt=""> } @else { <fr-part-icon [name]="meta(l).icon" [size]="28" [stroke]="3.5" /> }
              </a>
              <a class="stack grow info" [routerLink]="['/piece', l.id, l.slug]">
                <span class="title">{{ l.title }}</span>
                <span class="muted small">{{ l.price | dinar }} · {{ statusLabel(l.status) }} · {{ l.views }} vues · {{ l.contactClicks }} contact{{ l.contactClicks > 1 ? 's' : '' }}</span>
              </a>
              @if (l.status === 'ACTIVE') {
                <button type="button" class="btn btn-ghost sold-btn" (click)="asking.set(l.id)">Vendu</button>
                <button type="button" class="icon-btn" (click)="archive(l)" [attr.aria-label]="'Retirer ' + l.title">
                  <fr-icon name="close" [size]="18" />
                </button>
              }
            </div>
            @if (asking() === l.id) {
              <div class="ask">
                <span class="small strong">Bravo ! La vente s'est faite grâce à Ferraille ?</span>
                <div class="row ask-actions">
                  <button type="button" class="btn btn-primary" (click)="sold(l, true)">Oui, un client du site</button>
                  <button type="button" class="btn btn-ghost" (click)="sold(l, false)">Non, ailleurs</button>
                  <button type="button" class="btn btn-ghost" (click)="asking.set(null)">Annuler</button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .sold-btn { height: 36px; padding: 0 12px; font-size: 13px; flex-shrink: 0; }
    .ask { padding: 12px 14px; background: var(--green-soft); display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--line-soft); }
    .ask-actions { gap: 8px; flex-wrap: wrap; }
    .ask-actions .btn { height: 40px; font-size: 13px; }
    .strong { font-weight: 700; }
    .h1 { font-size: 26px; }
    .add { height: 44px; font-size: 14px; }
    .list { overflow: hidden; }
    .item { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
    .item:last-child { border-bottom: 0; }
    .thumb { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .info { color: var(--ink); font-weight: 400; }
    .title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class MyListingsPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly listings = signal<ListingSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.myListings().subscribe({
      next: (page) => {
        this.listings.set(page.content);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  meta(l: ListingSummary) {
    return categoryMeta(l.category);
  }

  statusLabel(status: ListingStatus): string {
    return { ACTIVE: 'En ligne', RESERVED: 'Commande en cours', SOLD: 'Vendue', ARCHIVED: 'Retirée' }[status];
  }

  readonly asking = signal<number | null>(null);

  sold(l: ListingSummary, viaFerraille: boolean): void {
    this.api.markSold(l.id, viaFerraille).subscribe({
      next: () => {
        this.asking.set(null);
        this.listings.set(this.listings().map((x) => (x.id === l.id ? { ...x, status: 'SOLD' as const } : x)));
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  archive(l: ListingSummary): void {
    if (!confirm(`Retirer « ${l.title} » ?`)) {
      return;
    }
    this.api.archiveListing(l.id).subscribe({
      next: () => this.listings.set(this.listings().filter((x) => x.id !== l.id)),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
