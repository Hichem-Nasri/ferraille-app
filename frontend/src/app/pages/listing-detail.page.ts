import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DinarPipe } from '../core/dinar.pipe';
import { GarageService } from '../core/garage.service';
import { categoryMeta, conditionLabel } from '../core/labels';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { phoneLink, whatsappLink } from '../core/contact';
import { ListingDetail } from '../core/models';
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
    }
    @if (listing(); as l) {
      <div class="detail">
      <div class="hero" [style.background]="meta().tint" [style.color]="meta().tone">
        @if (l.photos.length) {
          <img [src]="l.photos[photoIndex()]" [alt]="l.title + ' — photo ' + (photoIndex() + 1)" fetchpriority="high">
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
            <a class="chip small-chip" [routerLink]="['/pieces', meta().slug]">{{ meta().label }}</a>
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
          @if (l.seller.avatarUrl) {
            <img class="avatar photo" [src]="l.seller.avatarUrl" alt="" width="48" height="48">
          } @else {
            <div class="avatar">{{ initials(l.seller.displayName) }}</div>
          }
          <div class="stack grow">
            <span class="row seller-name">
              {{ l.seller.displayName }}
              @if (l.seller.verified) { <span class="verified"><fr-icon name="check" [size]="11" [stroke]="3.5" /></span> }
            </span>
            <span class="muted small">
              {{ l.seller.sellerType === 'PRO' ? 'Casse / professionnel' : 'Particulier' }} · {{ l.seller.listingsCount }} annonce{{ l.seller.listingsCount > 1 ? 's' : '' }} · {{ l.city }}
            </span>
          </div>
        </div>

        @if (!isOwner() && l.status === 'ACTIVE') {
          <section class="stack gap8">
            <h2 class="section-title">Contacter le vendeur</h2>
            <div class="contacts">
              @if (waNumber(l)) {
                <a class="btn contact whatsapp" [href]="whatsapp(l)" target="_blank" rel="noopener" (click)="track(l)">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.42 9.42zm8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8.01z"/></svg>
                  WhatsApp
                </a>
              }
              @if (l.seller.facebookUrl) {
                <a class="btn contact messenger" [href]="l.seller.facebookUrl" target="_blank" rel="noopener" (click)="track(l)">
                  <fr-icon name="chat" [size]="20" />Messenger
                </a>
              }
              @if (l.seller.phone) {
                <a class="btn contact call" [href]="call(l.seller.phone)" (click)="track(l)">
                  <fr-icon name="phone" [size]="20" />Appeler
                </a>
              }
            </div>
            @if (!l.seller.whatsapp && !l.seller.facebookUrl && !l.seller.phone) {
              <span class="muted">Ce vendeur n'a pas encore ajouté de moyen de contact.</span>
            }
          </section>
        }

        <div class="row protect">
          <fr-icon name="shield" class="green" />
          <span class="muted"><strong class="ink">Conseils :</strong> vérifie la pièce (référence, état) avant de payer, privilégie la remise en main propre ou le paiement à la livraison, et ne verse jamais d'acompte à un inconnu.</span>
        </div>
      </div>
      </div>

      @if (isOwner()) {
        <div class="bottom-bar wide">
          <a class="btn btn-ghost grow" routerLink="/mes-annonces">C'est ton annonce · {{ l.views }} vues</a>
        </div>
      } @else if (l.status === 'ACTIVE' && (waNumber(l) || l.seller.facebookUrl)) {
        <div class="bottom-bar wide mobile-only">
          @if (waNumber(l)) {
            <a class="btn contact whatsapp grow" [href]="whatsapp(l)" target="_blank" rel="noopener" (click)="track(l)">WhatsApp · {{ l.price | dinar }}</a>
          }
          @if (l.seller.facebookUrl) {
            <a class="btn contact messenger icon-only" [href]="l.seller.facebookUrl" target="_blank" rel="noopener" (click)="track(l)" aria-label="Écrire sur Messenger"><fr-icon name="chat" [size]="20" /></a>
          }
          @if (l.seller.phone) {
            <a class="btn btn-ghost icon-only" [href]="call(l.seller.phone)" (click)="track(l)" aria-label="Appeler le vendeur"><fr-icon name="phone" [size]="20" /></a>
          }
        </div>
      }
    } @else if (!error()) {
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
    .contacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
    .contact { color: #fff; }
    .contact:hover { color: #fff; }
    .whatsapp { background: #25d366; color: #fff; }
    .whatsapp:hover { background: #1ebe5b; }
    .messenger { background: #0084ff; }
    .messenger:hover { background: #0077e6; }
    .call { background: var(--forest); }
    .photo { object-fit: cover; padding: 0; }
    .icon-only { width: 54px; padding: 0; flex-shrink: 0; }
    .carrier { padding: 12px 14px; border-bottom: 1px solid var(--line-soft); }
    .carrier:last-child { border-bottom: 0; }
    .carrier-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .carrier-icon.aramex { background: var(--danger-soft); color: var(--danger); }
    .protect { align-items: flex-start; }
    .green { color: var(--green); }
    .ink { color: var(--ink); }
    .lime { color: var(--lime); }
    @media (min-width: 900px) {
      .detail { max-width: 1240px; margin: 0 auto; padding: 32px 32px 140px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 40px; align-items: start; }
      .hero { height: 560px; border-radius: 28px; position: sticky; top: 104px; }
      .sheet { margin: 0; border-radius: 0; padding: 0 0 40px; max-width: none; background: transparent; }
      .title { font-size: 32px; }
      .big { font-size: 36px; }
    }
  `,
})
export class ListingDetailPage implements OnInit {
  @Input() id!: string;
  @Input() slug?: string;

  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly garage = inject(GarageService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly listing = signal<ListingDetail | null>(null);
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
      next: (l) => {
        this.listing.set(l);
        if (this.slug !== l.slug) {
          this.location.replaceState(`/piece/${l.id}/${l.slug}`);
        }
        this.updateSeo(l);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.seo.set({ title: `Pièce introuvable | ${SITE_NAME}`, noindex: true });
      },
    });
  }

  private updateSeo(l: ListingDetail): void {
    const meta = categoryMeta(l.category);
    const path = `/piece/${l.id}/${l.slug}`;
    const price = Number(l.price).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    const fit = l.fits[0] ? ` — ${l.fits[0].make} ${l.fits[0].model}` : '';
    const vehicles = l.fits
      .slice(0, 3)
      .map((f) => `${f.make} ${f.model}`)
      .join(', ');
    const description =
      `${l.title} d'occasion, ${conditionLabel(l.condition).toLowerCase()}, ${price} DT à ${l.city}. ` +
      (vehicles ? `Compatible ${vehicles}. ` : '') +
      'Contacte directement le vendeur par WhatsApp ou téléphone.';
    const condition =
      l.condition === 'NEUF'
        ? 'https://schema.org/NewCondition'
        : l.condition === 'POUR_PIECES'
          ? 'https://schema.org/DamagedCondition'
          : 'https://schema.org/UsedCondition';
    this.seo.set({
      title: `${l.title}${fit} d'occasion | ${price} DT | ${SITE_NAME}`,
      description,
      path,
      image: l.photos[0],
      type: 'product',
      jsonLd: [
        {
          '@type': 'Product',
          name: l.title,
          url: this.seo.origin + path,
          sku: `FR-${l.id}`,
          ...(l.oemReference ? { mpn: l.oemReference } : {}),
          image: l.photos.map((p) => this.seo.absolute(p)),
          description: l.description || description,
          category: `Pièces auto > ${meta.label}`,
          itemCondition: condition,
          ...(l.fits[0] ? { brand: { '@type': 'Brand', name: l.fits[0].make } } : {}),
          offers: {
            '@type': 'Offer',
            url: this.seo.origin + path,
            price: Number(l.price).toFixed(3),
            priceCurrency: 'TND',
            itemCondition: condition,
            availability: l.status === 'ACTIVE' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
            areaServed: 'TN',
            seller: { '@type': l.seller.sellerType === 'PRO' ? 'Organization' : 'Person', name: l.seller.displayName },
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${this.seo.origin}/` },
            { '@type': 'ListItem', position: 2, name: meta.label, item: `${this.seo.origin}/pieces/${meta.slug}` },
            { '@type': 'ListItem', position: 3, name: l.title, item: this.seo.origin + path },
          ],
        },
      ],
    });
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

  whatsapp(l: ListingDetail): string {
    const url = `${this.seo.origin}/piece/${l.id}/${l.slug}`;
    return whatsappLink(this.waNumber(l) ?? '', `Bonjour, je suis intéressé par votre annonce « ${l.title} » sur Ferraille : ${url}`);
  }

  waNumber(l: ListingDetail): string | undefined {
    return l.seller.whatsapp || l.seller.phone || undefined;
  }

  call(phone: string): string {
    return phoneLink(phone);
  }

  track(l: ListingDetail): void {
    this.api.recordContact(l.id).subscribe({ error: () => undefined });
  }
}
