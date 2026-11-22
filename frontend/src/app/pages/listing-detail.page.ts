import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DinarPipe } from '../core/dinar.pipe';
import { GarageService } from '../core/garage.service';
import { categoryMeta, conditionLabel } from '../core/labels';
import { CarrierOption, ListingDetail } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-listing-detail-page',
  standalone: true,
  imports: [RouterLink, DinarPipe, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="page"><div class="error">{{ error() }}</div><a routerLink="/">Retour à l'accueil</a></div>
    } @else if (listing(); as l) {
      <div class="hero" [style.background]="meta().tint" [style.color]="meta().tone">
        @if (l.photos.length) {
          <img [src]="l.photos[photoIndex()]" [alt]="l.title">
        } @else {
          <fr-part-icon [name]="meta().icon" [size]="180" [stroke]="1.6" />
        }
        <div class="hero-actions row between">
          <button type="button" class="icon-btn" aria-label="Retour" (click)="back()"><fr-icon name="chevron-left" /></button>
          <button type="button" class="icon-btn" aria-label="Partager" (click)="share(l)"><fr-icon name="share" [size]="19" /></button>
        </div>
        @if (l.photos.length > 1) {
          <div class="dots">
            @for (p of l.photos; track $index) {
              <button type="button" [class.on]="$index === photoIndex()" (click)="photoIndex.set($index)"
                      [attr.aria-label]="'Photo ' + ($index + 1)"></button>
            }
          </div>
        }
      </div>

      <div class="sheet page">
        <div class="stack gap8">
          <div class="row tags">
            <span class="chip chip-dark small-chip">{{ condition() }}</span>
            <span class="chip small-chip">{{ meta().label }}</span>
          </div>
          <h1 class="title">{{ l.title }}</h1>
          <div class="row price-row">
            <span class="price big">{{ l.price | dinar }}</span>
            @if (l.negotiable) { <span class="muted">Prix négociable</span> }
          </div>
        </div>

        @if (compatibility(); as c) {
          <div class="notice" [class.warn]="!c.ok">
            <fr-icon [name]="c.ok ? 'check-circle' : 'alert'" [size]="22" />
            <span class="strong">{{ c.text }}</span>
          </div>
        }

        <div class="grid-3">
          @for (f of l.fits.slice(0, 3); track $index) {
            <div class="card spec">
              <span class="muted small">{{ f.make }}</span>
              <span class="spec-value">{{ f.model }}</span>
              <span class="muted small">{{ years(f.yearFrom, f.yearTo) }}</span>
            </div>
          }
        </div>
        @if (l.oemReference) {
          <span class="muted">Réf. constructeur : <strong>{{ l.oemReference }}</strong></span>
        }

        @if (l.description) {
          <p class="description">{{ l.description }}</p>
        }

        <div class="card card-pad row">
          <div class="avatar">{{ initials(l.seller.displayName) }}</div>
          <div class="stack grow">
            <span class="row seller-name">
              {{ l.seller.displayName }}
              @if (l.seller.verified) { <span class="verified"><fr-icon name="check" [size]="11" [stroke]="3.5" /></span> }
            </span>
            <span class="muted small">
              {{ l.seller.sellerType === 'PRO' ? 'Professionnel' : 'Particulier' }} · {{ l.seller.salesCount }} vente{{ l.seller.salesCount > 1 ? 's' : '' }} · {{ l.city }}
            </span>
          </div>
        </div>

        <section class="stack gap8">
          <h2 class="section-title">Livraison partout en Tunisie</h2>
          <div class="card carriers">
            @for (o of carriers(); track o.carrier) {
              <div class="row carrier">
                <span class="carrier-icon" [class.aramex]="o.carrier === 'ARAMEX'">
                  <fr-icon [name]="o.carrier === 'ARAMEX' ? 'truck' : 'mail'" />
                </span>
                <span class="stack grow">
                  <span class="strong">{{ o.label }}</span>
                  <span class="muted small">{{ o.minDays }}–{{ o.maxDays }} jours ouvrés</span>
                </span>
                <span class="strong">{{ o.fee | dinar }}</span>
              </div>
            }
          </div>
        </section>

        <div class="row protect">
          <fr-icon name="shield" class="green" />
          <span class="muted"><strong class="ink">Protection Ferraille</strong> — ton argent est bloqué jusqu'à ce que tu confirmes que la pièce est conforme.</span>
        </div>
      </div>

      <div class="bottom-bar">
        @if (isOwner()) {
          <a class="btn btn-ghost grow" routerLink="/mes-annonces">C'est ton annonce</a>
        } @else if (l.status !== 'ACTIVE') {
          <button type="button" class="btn btn-ghost grow" disabled>{{ l.status === 'SOLD' ? 'Déjà vendue' : 'Réservée' }}</button>
        } @else {
          <button type="button" class="btn btn-primary grow" (click)="buy(l)">
            Acheter <span class="lime">· {{ l.price | dinar }}</span>
          </button>
        }
      </div>
    } @else {
      <div class="page"><div class="empty">Chargement…</div></div>
    }
  `,
  styles: `
    .hero { height: 330px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .hero img { width: 100%; height: 100%; object-fit: cover; }
    .hero-actions { position: absolute; top: 20px; left: 20px; right: 20px; }
    .hero-actions .icon-btn { border: 0; }
    .dots { position: absolute; bottom: 40px; display: flex; gap: 6px; }
    .dots button { width: 8px; height: 8px; padding: 0; border: 0; border-radius: 4px; background: rgba(14, 59, 46, 0.3); cursor: pointer; }
    .dots button.on { width: 20px; background: var(--forest); }
    .sheet { margin-top: -24px; position: relative; background: var(--ground); border-radius: 28px 28px 0 0; padding-top: 22px; }
    .gap8 { gap: 8px; }
    .tags { gap: 6px; }
    .small-chip { height: 28px; font-size: 12px; cursor: default; }
    .title { font-size: 24px; line-height: 1.2; }
    .price-row { align-items: baseline; }
    .big { font-size: 30px; color: var(--green); }
    .strong { font-size: 14px; font-weight: 600; }
    .notice.warn { background: var(--warn-soft); color: var(--warn); }
    .spec { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; border-radius: 14px; }
    .spec-value { font-size: 14px; font-weight: 600; }
    .description { margin: 0; font-size: 14px; line-height: 1.55; color: var(--ink-2); white-space: pre-line; }
    .avatar { width: 48px; height: 48px; border-radius: 14px; background: var(--forest); color: var(--lime); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 18px; flex-shrink: 0; }
    .seller-name { gap: 6px; font-size: 15px; font-weight: 700; }
    .verified { width: 18px; height: 18px; border-radius: 50%; background: var(--green); color: var(--white); display: inline-flex; align-items: center; justify-content: center; }
    .carriers { overflow: hidden; }
    .carrier { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
    .carrier:last-child { border-bottom: 0; }
    .carrier-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .carrier-icon.aramex { background: var(--danger-soft); color: var(--danger); }
    .protect { align-items: flex-start; }
    .green { color: var(--green); }
    .ink { color: var(--ink); }
    .lime { color: var(--lime); }
  `,
})
export class ListingDetailPage implements OnInit {
  @Input() id!: string;

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly garage = inject(GarageService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly listing = signal<ListingDetail | null>(null);
  readonly carriers = signal<CarrierOption[]>([]);
  readonly error = signal<string | null>(null);
  readonly photoIndex = signal(0);

  readonly meta = computed(() => categoryMeta(this.listing()!.category));
  readonly condition = computed(() => conditionLabel(this.listing()!.condition));
  readonly isOwner = computed(() => this.auth.user()?.id === this.listing()?.seller.id);

  readonly compatibility = computed(() => {
    const v = this.garage.vehicle();
    const l = this.listing();
    if (!v || !l) {
      return null;
    }
    const ok = l.fits.some(
      (f) =>
        f.make.toLowerCase() === v.make.toLowerCase() &&
        f.model.toLowerCase() === v.model.toLowerCase() &&
        (!v.year || ((!f.yearFrom || f.yearFrom <= v.year) && (!f.yearTo || f.yearTo >= v.year))),
    );
    const label = this.garage.label(v);
    return { ok, text: ok ? `Compatible avec ta ${label}` : `Non indiquée compatible avec ta ${label}` };
  });

  ngOnInit(): void {
    this.api.listing(Number(this.id)).subscribe({
      next: (l) => this.listing.set(l),
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.api.shippingOptions().subscribe((o) => this.carriers.set(o));
  }

  years(from?: number | null, to?: number | null): string {
    if (!from && !to) {
      return 'Toutes années';
    }
    return `${from ?? '…'}–${to ?? '…'}`;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  }

  back(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

  share(l: ListingDetail): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: l.title, url }).catch(() => undefined);
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  buy(l: ListingDetail): void {
    this.router.navigate(['/acheter', l.id]);
  }
}
