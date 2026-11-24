import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { phoneLink, whatsappLink } from '../core/contact';
import { TranslatePipe } from '../core/i18n';
import { CATEGORIES, CITIES, MAKES, categoryMeta } from '../core/labels';
import { Category, PartRequest } from '../core/models';
import { NotifService } from '../core/notif.service';
import { SITE_NAME, SeoService } from '../core/seo.service';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

type Tab = 'all' | 'forme' | 'mine';

@Component({
  selector: 'fr-requests-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <div class="row between head">
        <div class="stack">
          <h1 class="h1">{{ 'Demandes de pièces' | t }}</h1>
          <span class="muted">Les acheteurs décrivent la pièce qu'ils cherchent. Les casses qui l'ont les contactent.</span>
        </div>
        <button type="button" class="btn btn-lime" (click)="openForm()"><fr-icon name="plus" [size]="18" [stroke]="2.6" />{{ 'Je cherche une pièce' | t }}</button>
      </div>

      @if (formOpen()) {
        <form class="card card-pad stack form" (ngSubmit)="submit()">
          <div class="grid-2">
            <div class="field">
              <label for="rmake">{{ 'Marque' | t }}</label>
              <select id="rmake" class="input" name="make" [(ngModel)]="make" required>
                <option value="" disabled>{{ 'Choisir' | t }}</option>
                @for (m of makes; track m) { <option [value]="m">{{ m }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="rmodel">{{ 'Modèle' | t }}</label>
              <input id="rmodel" class="input" name="model" [(ngModel)]="model" required maxlength="60" placeholder="208, Clio 4…">
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="ryear">{{ 'Année' | t }}</label>
              <input id="ryear" class="input" type="number" name="year" [(ngModel)]="year" min="1950" [max]="maxYear" placeholder="2016">
            </div>
            <div class="field">
              <label for="rcat">{{ 'Catégorie' | t }}</label>
              <select id="rcat" class="input" name="category" [(ngModel)]="category">
                <option [ngValue]="null">—</option>
                @for (c of categories; track c.value) { <option [ngValue]="c.value">{{ c.label }}</option> }
              </select>
            </div>
          </div>
          <div class="field">
            <label for="rdesc">{{ 'Décris la pièce' | t }}</label>
            <textarea id="rdesc" class="input" name="description" [(ngModel)]="description" required minlength="5" maxlength="500" rows="3"
                      placeholder="Ex. : phare avant gauche, référence 9678…, même cassé du côté fixation c'est OK"></textarea>
          </div>
          <div class="field">
            <label for="rcity">{{ 'Ville' | t }}</label>
            <select id="rcity" class="input" name="city" [(ngModel)]="city">
              <option value="">—</option>
              @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
          @if (formError()) { <div class="error">{{ formError() }}</div> }
          <div class="row">
            <button type="button" class="btn btn-ghost grow" (click)="formOpen.set(false)">Annuler</button>
            <button type="submit" class="btn btn-primary grow" [disabled]="sending() || !make || !model.trim() || description.trim().length < 5">{{ 'Publier' | t }}</button>
          </div>
        </form>
      }

      <div class="segmented tabs">
        <button type="button" [class.active]="tab() === 'all'" (click)="select('all')">{{ 'Toutes' | t }}</button>
        @if (auth.isLoggedIn()) {
          <button type="button" [class.active]="tab() === 'forme'" (click)="select('forme')">{{ 'Pour mes marques' | t }}
            @if (notif.counts().matchingRequests) { ({{ notif.counts().matchingRequests }}) }</button>
          <button type="button" [class.active]="tab() === 'mine'" (click)="select('mine')">{{ 'Mes demandes' | t }}</button>
        }
      </div>

      @if (tab() === 'all') {
        <div class="row filters">
          <select class="input" [(ngModel)]="filterMake" (ngModelChange)="load()" aria-label="Filtrer par marque">
            <option value="">{{ 'Marque' | t }} : {{ 'Toutes' | t }}</option>
            @for (m of makes; track m) { <option [value]="m">{{ m }}</option> }
          </select>
          <select class="input" [(ngModel)]="filterCity" (ngModelChange)="load()" aria-label="Filtrer par ville">
            <option value="">{{ 'Toutes les villes' | t }}</option>
            @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
      }
      @if (tab() === 'forme') {
        <p class="muted small">Demandes pour les marques que tu as déjà en vente. Publie plus de pièces pour en recevoir davantage.</p>
      }

      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">{{ 'Chargement…' | t }}</div>
      } @else if (items().length === 0) {
        <div class="empty card">{{ 'Aucune demande ouverte.' | t }}</div>
      } @else {
        <div class="grid">
          @for (r of items(); track r.id) {
            <article class="card card-pad stack req" [class.closed]="r.status === 'CLOSED'">
              <div class="row between">
                <span class="vehicle">{{ r.make }} {{ r.model }}@if (r.year) { · {{ r.year }} }</span>
                @if (r.category) { <span class="chip small-chip">{{ catLabel(r.category) }}</span> }
              </div>
              <p class="desc">{{ r.description }}</p>
              <a class="share-link small" [href]="shareRequest(r)" target="_blank" rel="noopener">Partager sur WhatsApp pour l'aider →</a>
              <span class="muted small">{{ r.author.displayName }}@if (r.city) { · {{ r.city }} } · {{ r.createdAt | date: 'd MMM' }}@if (r.status === 'CLOSED') { · fermée }</span>
              @if (r.mine) {
                @if (r.status === 'OPEN') {
                  <button type="button" class="btn btn-ghost" (click)="close(r)">{{ 'Fermer' | t }} (pièce trouvée)</button>
                }
              } @else {
                <div class="row actions">
                  @if (r.author.whatsapp || r.author.phone) {
                    <a class="btn contact whatsapp grow" [href]="wa(r)" target="_blank" rel="noopener">{{ 'Je l’ai' | t }} · WhatsApp</a>
                  }
                  @if (r.author.facebookUrl) {
                    <a class="btn btn-ghost icon-only" [href]="r.author.facebookUrl" target="_blank" rel="noopener" aria-label="Messenger"><fr-icon name="chat" [size]="20" /></a>
                  }
                  @if (r.author.phone) {
                    <a class="btn btn-ghost icon-only" [href]="tel(r.author.phone)" aria-label="Appeler"><fr-icon name="phone" [size]="20" /></a>
                  }
                </div>
                @if (auth.isLoggedIn() && auth.user()?.role === 'ADMIN') {
                  <button type="button" class="link danger" (click)="close(r)">Fermer (admin)</button>
                }
              }
            </article>
          }
        </div>
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .head { gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .h1 { font-size: 26px; margin: 0; }
    .form { gap: 12px; }
    .tabs { max-width: 560px; }
    .filters { gap: 10px; }
    .filters .input { flex: 1; min-width: 0; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .req { gap: 8px; }
    .req.closed { opacity: 0.6; }
    .vehicle { font-family: var(--display); font-weight: 700; font-size: 17px; }
    .desc { margin: 0; font-size: 14px; line-height: 1.45; white-space: pre-line; }
    .small-chip { height: 26px; font-size: 12px; cursor: default; }
    .actions { gap: 8px; }
    .contact.whatsapp { background: #25d366; color: var(--white); border: 0; }
    .icon-only { width: 48px; padding: 0; flex-shrink: 0; }
    .link { border: 0; background: none; cursor: pointer; font-weight: 600; font-size: 13px; padding: 4px 0; text-align: start; }
    .danger { color: var(--danger); }
    .share-link { color: var(--green); font-weight: 600; }
  `,
})
export class RequestsPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly notif = inject(NotifService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly makes = MAKES;
  readonly cities = CITIES;
  readonly categories = CATEGORIES;
  readonly maxYear = new Date().getFullYear() + 1;

  readonly tab = signal<Tab>('all');
  readonly items = signal<PartRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly formError = signal<string | null>(null);
  readonly sending = signal(false);

  filterMake = '';
  filterCity = '';
  make = '';
  model = '';
  year: number | null = null;
  category: Category | null = null;
  description = '';
  city = '';

  ngOnInit(): void {
    this.seo.set({
      title: `Demandes de pièces auto d'occasion en Tunisie | ${SITE_NAME}`,
      description: "Tu cherches une pièce auto d'occasion introuvable ? Publie une demande gratuite : les casses de Tunisie qui l'ont te contactent sur WhatsApp.",
      path: '/demandes',
    });
    this.city = this.auth.user()?.city ?? '';
    this.load();
  }

  select(tab: Tab): void {
    this.tab.set(tab);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const done = (list: PartRequest[]) => {
      this.items.set(list);
      this.loading.set(false);
    };
    const fail = (e: unknown) => {
      this.error.set(errorMessage(e));
      this.loading.set(false);
    };
    if (this.tab() === 'forme') {
      this.api.requestsForMe().subscribe({ next: done, error: fail });
    } else if (this.tab() === 'mine') {
      this.api.myRequests().subscribe({ next: (p) => done(p.content), error: fail });
    } else {
      this.api.requests({ make: this.filterMake, city: this.filterCity, page: 0 }).subscribe({ next: (p) => done(p.content), error: fail });
    }
  }

  openForm(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/connexion'], { queryParams: { retour: '/demandes' } });
      return;
    }
    this.formOpen.set(true);
  }

  submit(): void {
    this.sending.set(true);
    this.formError.set(null);
    this.api
      .createRequest({
        make: this.make,
        model: this.model.trim(),
        year: this.year,
        category: this.category,
        description: this.description.trim(),
        city: this.city || undefined,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.formOpen.set(false);
          this.model = '';
          this.description = '';
          this.year = null;
          this.category = null;
          this.select('mine');
        },
        error: (e) => {
          this.sending.set(false);
          this.formError.set(errorMessage(e));
        },
      });
  }

  close(r: PartRequest): void {
    this.api.closeRequest(r.id).subscribe({
      next: () => this.items.update((list) => list.map((x) => (x.id === r.id ? { ...x, status: 'CLOSED' as const } : x))),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  catLabel(c: Category): string {
    return categoryMeta(c).label;
  }

  wa(r: PartRequest): string {
    const number = r.author.whatsapp || r.author.phone || '';
    return whatsappLink(number, `Bonjour, j'ai vu votre demande sur Ferraille : ${r.make} ${r.model}${r.year ? ' ' + r.year : ''} — « ${r.description} ». J'ai peut-être la pièce.`);
  }

  shareRequest(r: PartRequest): string {
    const text = `Quelqu'un cherche : ${r.make} ${r.model}${r.year ? ' ' + r.year : ''} — ${r.description}. Tu l'as ? Réponds-lui ici 👇\n${location.origin}/demandes?src=partage-demande`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  tel(phone: string): string {
    return phoneLink(phone);
  }
}
