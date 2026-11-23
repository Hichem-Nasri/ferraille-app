import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { phoneLink, whatsappLink } from '../core/contact';
import { TranslatePipe } from '../core/i18n';
import { ListingSummary, Review, SellerProfile } from '../core/models';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { slugify } from '../core/slug';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';
import { ListingCardComponent } from '../shared/listing-card.component';

@Component({
  selector: 'fr-seller-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, IconComponent, ListingCardComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (seller(); as s) {
        <section class="dark-card hero">
          <div class="row who">
            @if (s.avatarUrl) { <img class="avatar" [src]="s.avatarUrl" alt="" width="72" height="72"> }
            @else { <span class="avatar initials">{{ initials(s.displayName) }}</span> }
            <div class="stack grow">
              <h1 class="name">{{ s.displayName }}</h1>
              <span class="sub">{{ (s.sellerType === 'PRO' ? 'Casse / professionnel' : 'Particulier') | t }}@if (s.city) { · {{ s.city }} }
                · {{ s.listingsCount }} {{ 'annonces' | t }}</span>
              <span class="row tags">
                @if (s.verified) { <span class="badge ok">✓ {{ 'Casse vérifiée' | t }}</span> }
                @if (s.rating) { <span class="badge">★ {{ s.rating }} · {{ s.reviewsCount }} {{ 'avis' | t }}</span> }
              </span>
            </div>
          </div>
          @if (s.bio) { <p class="bio">{{ s.bio }}</p> }
          <div class="info">
            @if (s.address) { <span><fr-icon name="pin" [size]="16" /> {{ s.address }}</span> }
            @if (s.openingHours) { <span>{{ 'Horaires' | t }} : {{ s.openingHours }}</span> }
          </div>
          <div class="row actions">
            @if (s.whatsapp || s.phone) {
              <a class="btn contact whatsapp grow" [href]="wa(s)" target="_blank" rel="noopener" (click)="contacted.set(true)">WhatsApp</a>
            }
            @if (s.facebookUrl) {
              <a class="btn btn-lime icon-only" [href]="s.facebookUrl" target="_blank" rel="noopener" aria-label="Messenger" (click)="contacted.set(true)"><fr-icon name="chat" [size]="20" /></a>
            }
            @if (s.phone) {
              <a class="btn btn-lime icon-only" [href]="tel(s.phone)" [attr.aria-label]="'Appeler' | t" (click)="contacted.set(true)"><fr-icon name="phone" [size]="20" /></a>
            }
            @if (s.address || s.sellerType === 'PRO') {
              <a class="btn btn-lime icon-only" [href]="maps(s)" target="_blank" rel="noopener" [attr.aria-label]="'Itinéraire' | t"><fr-icon name="pin" [size]="20" /></a>
            }
          </div>
          @if (isAdmin()) {
            <button type="button" class="btn btn-ghost admin" (click)="toggleVerified(s)">{{ s.verified ? 'Retirer le badge vérifié' : 'Marquer comme casse vérifiée' }}</button>
          }
        </section>

        <section class="stack gap">
          <h2 class="section-title">{{ 'Pièces en vente' | t }} ({{ total() }})</h2>
          @if (listings().length === 0) {
            <div class="empty card">Aucune pièce en ligne pour le moment.</div>
          } @else {
            <div class="listing-grid">
              @for (l of listings(); track l.id) { <fr-listing-card [listing]="l" /> }
            </div>
            @if (hasMore()) {
              <button type="button" class="btn btn-ghost btn-block" (click)="more()">{{ 'Voir plus' | t }}</button>
            }
          }
        </section>

        <section class="stack gap">
          <h2 class="section-title">{{ 'Avis des clients' | t }}</h2>
          @if (canReview()) {
            <form class="card card-pad stack review-form" [class.highlight]="contacted()" (ngSubmit)="sendReview(s)">
              <span class="strong">{{ contacted() ? 'Tu as contacté ce vendeur ? Dis-nous comment ça s’est passé.' : ('Laisser un avis' | t) }}</span>
              <div class="stars" role="radiogroup" aria-label="Note">
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <button type="button" class="star" [class.on]="n <= rating" (click)="rating = n" [attr.aria-label]="n + ' sur 5'" [attr.aria-checked]="rating === n" role="radio">★</button>
                }
              </div>
              <textarea class="input" name="comment" [(ngModel)]="comment" maxlength="500" rows="2" [placeholder]="'Ton commentaire (facultatif)' | t"></textarea>
              @if (reviewError()) { <div class="error">{{ reviewError() }}</div> }
              @if (reviewDone()) { <div class="success">{{ 'Merci pour ton avis !' | t }}</div> }
              <button type="submit" class="btn btn-primary" [disabled]="!rating || sending()">{{ 'Envoyer' | t }}</button>
            </form>
          } @else if (!auth.isLoggedIn()) {
            <a class="muted small" routerLink="/connexion" [queryParams]="{ retour: path() }">Connecte-toi pour laisser un avis.</a>
          }
          @if (reviews().length === 0) {
            <div class="muted">{{ 'Aucun avis pour le moment.' | t }}</div>
          } @else {
            <div class="card list">
              @for (r of reviews(); track r.id) {
                <div class="stack review">
                  <span class="row between"><span class="strong">{{ r.authorName }}</span><span class="gold">{{ stars(r.rating) }}</span></span>
                  @if (r.comment) { <span class="small">{{ r.comment }}</span> }
                  <span class="muted small">{{ r.createdAt | date: 'd MMM y' }}</span>
                </div>
              }
            </div>
          }
        </section>
      } @else if (!error()) {
        <div class="empty">{{ 'Chargement…' | t }}</div>
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .hero { display: flex; flex-direction: column; gap: 14px; }
    .who { gap: 14px; align-items: center; }
    .avatar { width: 72px; height: 72px; border-radius: 20px; object-fit: cover; flex-shrink: 0; }
    .initials { background: var(--lime); color: var(--forest); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px; }
    .name { margin: 0; font-size: 24px; color: var(--white); }
    .sub { color: #c9d8cf; font-size: 13px; }
    .tags { gap: 6px; margin-top: 6px; flex-wrap: wrap; }
    .badge { background: rgba(255, 255, 255, 0.12); color: var(--white); }
    .badge.ok { background: var(--lime); color: var(--forest); }
    .bio { margin: 0; color: #e2ece6; font-size: 14px; line-height: 1.5; white-space: pre-line; }
    .info { display: flex; flex-direction: column; gap: 6px; color: #c9d8cf; font-size: 13px; }
    .info span { display: inline-flex; align-items: center; gap: 6px; }
    .actions { gap: 8px; }
    .contact.whatsapp { background: #25d366; color: var(--white); border: 0; }
    .icon-only { width: 48px; padding: 0; flex-shrink: 0; }
    .admin { background: transparent; color: var(--white); border-color: rgba(255, 255, 255, 0.4); }
    .gap { gap: 12px; }
    .review-form { gap: 10px; }
    .review-form.highlight { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
    .stars { display: flex; gap: 4px; }
    .star { border: 0; background: none; font-size: 30px; line-height: 1; color: #d5ddd7; cursor: pointer; padding: 2px; }
    .star.on, .gold { color: #e0a800; }
    .list { overflow: hidden; }
    .review { padding: 12px 14px; gap: 4px; border-bottom: 1px solid var(--line-soft); }
    .review:last-child { border-bottom: 0; }
    .strong { font-weight: 700; }
    .success { color: var(--green); font-weight: 600; font-size: 14px; }
  `,
})
export class SellerPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  readonly seller = signal<SellerProfile | null>(null);
  readonly listings = signal<ListingSummary[]>([]);
  readonly total = signal(0);
  readonly reviews = signal<Review[]>([]);
  readonly error = signal<string | null>(null);
  readonly contacted = signal(false);
  readonly sending = signal(false);
  readonly reviewError = signal<string | null>(null);
  readonly reviewDone = signal(false);
  private readonly page = signal(0);
  private readonly totalPages = signal(0);
  readonly hasMore = computed(() => this.page() + 1 < this.totalPages());
  readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');
  readonly canReview = computed(() => this.auth.isLoggedIn() && this.auth.user()?.id !== this.seller()?.id);
  readonly path = computed(() => {
    const s = this.seller();
    return s ? `/casse/${s.id}/${slugify(s.displayName)}` : '/casses';
  });

  rating = 0;
  comment = '';
  private sellerId = 0;

  @Input()
  set id(value: string) {
    this.sellerId = Number(value);
  }

  ngOnInit(): void {
    if (!Number.isFinite(this.sellerId) || this.sellerId <= 0) {
      this.router.navigateByUrl('/casses');
      return;
    }
    this.api.seller(this.sellerId).subscribe({
      next: (s) => {
        this.seller.set(s);
        this.updateSeo(s);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.loadListings(0);
    this.api.reviews(this.sellerId).subscribe({ next: (r) => this.reviews.set(r), error: () => undefined });
  }

  more(): void {
    this.loadListings(this.page() + 1);
  }

  private loadListings(page: number): void {
    this.api.searchListings({ sellerId: this.sellerId, page, size: 24 }).subscribe({
      next: (p) => {
        this.listings.set(page === 0 ? p.content : [...this.listings(), ...p.content]);
        this.total.set(p.totalElements);
        this.page.set(p.page);
        this.totalPages.set(p.totalPages);
      },
      error: () => undefined,
    });
  }

  private updateSeo(s: SellerProfile): void {
    const where = s.city ? ` à ${s.city}` : ' en Tunisie';
    const kind = s.sellerType === 'PRO' ? 'Casse auto' : 'Vendeur';
    this.seo.set({
      title: `${s.displayName} — ${kind}${where}, pièces d'occasion | ${SITE_NAME}`,
      description: `${s.displayName} : ${s.listingsCount} pièce(s) auto d'occasion en ligne${where}. ${s.address ? 'Adresse : ' + s.address + '. ' : ''}Contact direct par WhatsApp.`,
      path: `/casse/${s.id}/${slugify(s.displayName)}`,
      noindex: s.listingsCount === 0,
      jsonLd: [
        {
          '@type': s.sellerType === 'PRO' ? 'AutoPartsStore' : 'Person',
          name: s.displayName,
          url: `${this.seo.origin}/casse/${s.id}/${slugify(s.displayName)}`,
          ...(s.address ? { address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressCountry: 'TN' } } : {}),
          ...(s.openingHours && s.sellerType === 'PRO' ? { openingHours: s.openingHours } : {}),
          ...(s.rating && s.reviewsCount > 0 && s.sellerType === 'PRO'
            ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: s.reviewsCount } }
            : {}),
        },
      ],
    });
  }

  sendReview(s: SellerProfile): void {
    this.sending.set(true);
    this.reviewError.set(null);
    this.api.review(s.id, this.rating, this.comment.trim()).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.reviewDone.set(true);
        this.reviews.update((list) => [r, ...list.filter((x) => x.id !== r.id)]);
      },
      error: (e) => {
        this.sending.set(false);
        this.reviewError.set(errorMessage(e));
      },
    });
  }

  toggleVerified(s: SellerProfile): void {
    this.api.adminToggleVerified(s.id).subscribe({
      next: (r) => this.seller.set({ ...s, verified: r.verified }),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }

  stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  wa(s: SellerProfile): string {
    return whatsappLink(s.whatsapp || s.phone || '', `Bonjour ${s.displayName}, je vous ai trouvé sur Ferraille. Je cherche une pièce :`);
  }

  tel(phone: string): string {
    return phoneLink(phone);
  }

  maps(s: SellerProfile): string {
    const q = [s.displayName, s.address, s.city, 'Tunisie'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
}
