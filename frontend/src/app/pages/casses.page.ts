import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { phoneLink, whatsappLink } from '../core/contact';
import { TranslatePipe } from '../core/i18n';
import { CITIES } from '../core/labels';
import { CasseCard } from '../core/models';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { slugify } from '../core/slug';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-casses-page',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <div class="stack">
        <h1 class="h1">{{ heading() }}</h1>
        <span class="muted">Casses et professionnels de la pièce auto d'occasion, avec leurs pièces en ligne.</span>
      </div>

      <div class="cities">
        <a class="chip" [class.chip-dark]="!city()" routerLink="/casses">{{ 'Toutes les villes' | t }}</a>
        @for (c of cities; track c) {
          <a class="chip" [class.chip-dark]="city() === c" [routerLink]="['/casses', slug(c)]">{{ c }}</a>
        }
      </div>

      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">{{ 'Chargement…' | t }}</div>
      } @else if (casses().length === 0) {
        <div class="empty card">{{ 'Aucune casse dans cette ville pour le moment.' | t }}<br>
          <a routerLink="/profil">Tu as une casse ? Passe ton profil en « Casse / Pro » et publie tes pièces.</a></div>
      } @else {
        <div class="grid">
          @for (c of casses(); track c.id) {
            <article class="card card-pad stack casse">
              <a class="row who" [routerLink]="['/casse', c.id, slug(c.displayName)]">
                @if (c.avatarUrl) { <img class="avatar" [src]="c.avatarUrl" alt="" width="52" height="52"> }
                @else { <span class="avatar initials">{{ initials(c.displayName) }}</span> }
                <span class="stack grow">
                  <span class="name">{{ c.displayName }}
                    @if (c.verified) { <span class="badge ok">✓ {{ 'Vérifiée' | t }}</span> }
                  </span>
                  <span class="muted small">{{ c.city || '—' }} · {{ c.listingsCount }} {{ 'annonces' | t }}
                    @if (c.rating) { · ★ {{ c.rating }} ({{ c.reviewsCount }}) }</span>
                </span>
              </a>
              @if (c.address) { <span class="small"><fr-icon name="pin" [size]="14" /> {{ c.address }}</span> }
              @if (c.openingHours) { <span class="small muted">{{ 'Horaires' | t }} : {{ c.openingHours }}</span> }
              <div class="row actions">
                @if (c.whatsapp || c.phone) {
                  <a class="btn contact whatsapp grow" [href]="wa(c)" target="_blank" rel="noopener">WhatsApp</a>
                }
                @if (c.phone) {
                  <a class="btn btn-ghost icon-only" [href]="tel(c.phone)" [attr.aria-label]="'Appeler' | t"><fr-icon name="phone" [size]="20" /></a>
                }
                <a class="btn btn-ghost icon-only" [href]="maps(c)" target="_blank" rel="noopener" [attr.aria-label]="'Itinéraire' | t"><fr-icon name="pin" [size]="20" /></a>
              </div>
              <a class="btn btn-primary" [routerLink]="['/casse', c.id, slug(c.displayName)]">{{ 'Voir la casse' | t }}</a>
            </article>
          }
        </div>
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 26px; margin: 0; }
    .cities { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
    .cities .chip { flex-shrink: 0; }
    @media (min-width: 900px) { .cities { flex-wrap: wrap; overflow: visible; } }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .casse { gap: 10px; }
    .who { gap: 12px; color: var(--ink); font-weight: 400; }
    .avatar { width: 52px; height: 52px; border-radius: 16px; object-fit: cover; flex-shrink: 0; }
    .initials { background: var(--forest); color: var(--lime); display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .name { font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .badge.ok { background: var(--green-soft); color: var(--green); }
    .actions { gap: 8px; }
    .contact.whatsapp { background: #25d366; color: var(--white); border: 0; }
    .icon-only { width: 48px; padding: 0; flex-shrink: 0; }
  `,
})
export class CassesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly cities = CITIES;
  readonly casses = signal<CasseCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly city = signal<string | null>(null);
  readonly heading = signal("Casses auto en Tunisie");
  private initialized = false;

  @Input()
  set ville(value: string | undefined) {
    this.city.set(CITIES.find((c) => slugify(c) === value) ?? null);
    if (this.initialized) {
      this.load();
    }
  }

  ngOnInit(): void {
    this.initialized = true;
    this.load();
  }

  load(): void {
    const city = this.city();
    this.heading.set(city ? `Casses auto à ${city}` : 'Casses auto en Tunisie');
    this.seo.set({
      title: city ? `Casses auto à ${city} — pièces d'occasion | ${SITE_NAME}` : `Casses auto en Tunisie — pièces d'occasion par ville | ${SITE_NAME}`,
      description: city
        ? `Trouve une casse auto à ${city} : pièces d'occasion en ligne, adresse, horaires et contact WhatsApp direct.`
        : "Annuaire des casses auto en Tunisie par gouvernorat : pièces d'occasion en ligne, adresse, horaires et contact WhatsApp direct.",
      path: city ? `/casses/${slugify(city)}` : '/casses',
    });
    this.loading.set(true);
    this.api.casses(city ?? undefined).subscribe({
      next: (list) => {
        this.casses.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  slug(text: string): string {
    return slugify(text);
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }

  wa(c: CasseCard): string {
    return whatsappLink(c.whatsapp || c.phone || '', 'Bonjour, je vous ai trouvé sur Ferraille. Je cherche une pièce :');
  }

  tel(phone: string): string {
    return phoneLink(phone);
  }

  maps(c: CasseCard): string {
    const q = [c.displayName, c.address, c.city, 'Tunisie'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
}
