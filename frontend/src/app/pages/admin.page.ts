import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { errorMessage } from '../core/api.service';

interface VisitSummary {
  visitsToday: number;
  visitorsToday: number;
  visits7d: number;
  visitors7d: number;
  visits30d: number;
  visitors30d: number;
  visitsTotal: number;
  buyersToday: number;
  buyers7d: number;
  sources: { source: string; visitors: number; visits: number }[];
  daily: { day: string; visits: number; visitors: number }[];
  topPages: { path: string; visits: number }[];
  topReferrers: { source: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
}

interface AdminSeller {
  id: number;
  name: string;
  sellerType: string;
  verified: boolean;
  city?: string;
  demo: boolean;
  activeListings: number;
  soldListings: number;
  soldViaFerraille: number;
  views: number;
  contactClicks: number;
  lastListingAt?: string;
}

interface AdminUser {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  city?: string;
  sellerType: string;
  shopName?: string;
  role: string;
  facebook: boolean;
  activeListings: number;
  verified: boolean;
  createdAt: string;
}

@Component({
  selector: 'fr-admin-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <h1 class="h1">Administration</h1>
      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (visits(); as v) {
        <h2 class="section-title">Visites</h2>
        <div class="stats">
          <div class="card stat"><span class="value">{{ v.visitorsToday }}</span><span class="muted small">Visiteurs aujourd'hui</span><span class="muted small">{{ v.visitsToday }} pages vues</span></div>
          <div class="card stat"><span class="value">{{ v.visitors7d }}</span><span class="muted small">Visiteurs · 7 jours</span><span class="muted small">{{ v.visits7d }} pages vues</span></div>
          <div class="card stat"><span class="value">{{ v.visitors30d }}</span><span class="muted small">Visiteurs · 30 jours</span><span class="muted small">{{ v.visits30d }} pages vues</span></div>
          <div class="card stat"><span class="value">{{ v.buyersToday }}</span><span class="muted small">Acheteurs aujourd'hui</span><span class="muted small">{{ v.buyers7d }} sur 7 jours</span></div>
        </div>
        @if (v.daily.length) {
          <div class="card card-pad chart">
            <span class="muted small">Visiteurs par jour (30 jours)</span>
            <div class="bars">
              @for (d of v.daily; track d.day) {
                <div class="bar-col" [title]="d.day + ' : ' + d.visitors + ' visiteurs, ' + d.visits + ' pages'">
                  <span class="bar-value">{{ d.visitors }}</span>
                  <div class="bar" [style.height.%]="barHeight(d.visitors)"></div>
                  <span class="bar-label">{{ d.day.slice(8) }}</span>
                </div>
              }
            </div>
          </div>
        }
        <div class="grid-lists">
          <div class="card card-pad">
            <span class="list-title">Pages les plus vues</span>
            @for (p of v.topPages; track p.path) { <div class="line"><span class="ellipsis">{{ p.path }}</span><strong>{{ p.visits }}</strong></div> }
          </div>
          <div class="card card-pad">
            <span class="list-title">Campagnes (?src=…)</span>
            @for (s of v.sources; track s.source) { <div class="line"><span>{{ s.source }}</span><strong>{{ s.visitors }}</strong></div> }
            @empty { <span class="muted small">Ajoute ?src=fb, ?src=tiktok ou ?src=groupe à tes liens partagés.</span> }
            <span class="list-title spaced">Sites d'origine</span>
            @for (r of v.topReferrers; track r.source) { <div class="line"><span>{{ r.source }}</span><strong>{{ r.visitors }}</strong></div> }
            <span class="list-title spaced">Appareils</span>
            @for (d of v.devices; track d.device) { <div class="line"><span>{{ d.device }}</span><strong>{{ d.visitors }}</strong></div> }
          </div>
        </div>
        <h2 class="section-title">Vendeurs</h2>
      }
      <div class="stats">
        <div class="card stat"><span class="value">{{ sellerTotals().contacts }}</span><span class="muted small">Clics contact</span></div>
        <div class="card stat"><span class="value">{{ sellerTotals().views }}</span><span class="muted small">Vues annonces</span></div>
        <div class="card stat"><span class="value">{{ sellerTotals().sold }}</span><span class="muted small">Pièces vendues</span></div>
        <div class="card stat"><span class="value">{{ sellerTotals().via }}</span><span class="muted small">Vendues grâce à Ferraille</span></div>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>Vendeur</th><th>Ville</th><th>En ligne</th><th>Vues</th><th>Contacts</th><th>Vendues</th><th>Via Ferraille</th><th>Dernière annonce</th></tr>
          </thead>
          <tbody>
            @for (s of sellers(); track s.id) {
              <tr [class.demo]="s.demo">
                <td><a [routerLink]="['/casse', s.id]">{{ s.name }}</a>
                  @if (s.sellerType === 'PRO') { <span class="pill">PRO</span> }
                  @if (s.verified) { <span class="pill ok">✓</span> }
                  @if (s.demo) { <span class="pill">démo</span> }</td>
                <td>{{ s.city || '—' }}</td>
                <td>{{ s.activeListings }}</td>
                <td>{{ s.views }}</td>
                <td class="strong">{{ s.contactClicks }}</td>
                <td>{{ s.soldListings }}</td>
                <td>{{ s.soldViaFerraille }}</td>
                <td>{{ s.lastListingAt ? (s.lastListingAt | date: 'd MMM HH:mm') : '—' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="muted">Aucun vendeur pour le moment.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <p class="muted small">« Contacts » = clics sur WhatsApp, Messenger ou Appeler. « Via Ferraille » = le vendeur a indiqué que la vente s'est faite grâce au site.</p>

      <h2 class="section-title">Inscrits</h2>
      <div class="stats">
        <div class="card stat"><span class="value">{{ realUsers().length }}</span><span class="muted small">Inscrits réels</span></div>
        <div class="card stat"><span class="value">{{ todayCount() }}</span><span class="muted small">Aujourd'hui</span></div>
        <div class="card stat"><span class="value">{{ facebookCount() }}</span><span class="muted small">Via Facebook</span></div>
        <div class="card stat"><span class="value">{{ sellersCount() }}</span><span class="muted small">Avec annonces</span></div>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>Inscrit le</th><th>Nom</th><th>E-mail</th><th>WhatsApp / tél.</th><th>Ville</th><th>Type</th><th>Annonces</th><th>Vérifié</th></tr>
          </thead>
          <tbody>
            @for (u of realUsers(); track u.id) {
              <tr>
                <td>{{ u.createdAt | date: 'd MMM HH:mm' }}</td>
                <td>{{ u.shopName || u.fullName }} @if (u.facebook) { <span class="tag">FB</span> } @if (u.role === 'ADMIN') { <span class="tag">admin</span> }</td>
                <td>@if (u.email) { <a [href]="'mailto:' + u.email">{{ u.email }}</a> } @else { <span class="muted">—</span> }</td>
                <td>{{ u.whatsapp || u.phone || '—' }}</td>
                <td>{{ u.city || '—' }}</td>
                <td>{{ u.sellerType === 'PRO' ? 'Casse' : 'Particulier' }}</td>
                <td>@if (u.activeListings) { <a [routerLink]="['/casse', u.id]">{{ u.activeListings }}</a> } @else { 0 }</td>
                <td><button type="button" class="vbtn" [class.on]="u.verified" (click)="toggleVerified(u)">{{ u.verified ? '✓ Vérifié' : 'Vérifier' }}</button></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="muted">Aucun inscrit pour le moment.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <span class="muted small">Tes propres visites ne sont plus comptées sur les appareils où tu t'es connecté en admin. « Acheteurs » = visiteurs uniques de l'accueil, des catégories et des fiches pièces. </span>
      <span class="muted small">Les comptes de démo (&#64;demo.ferraille.tn) et les comptes supprimés sont masqués.</span>
    </div>
  `,
  styles: `
    tr.demo { opacity: 0.5; }
    .pill { display: inline-block; margin-inline-start: 4px; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--line-soft); color: var(--ink-2); }
    .pill.ok { background: var(--green-soft); color: var(--green); }
    .strong { font-weight: 700; }
    .vbtn { border: 1.5px solid var(--line); background: var(--white); border-radius: 8px; padding: 4px 8px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--ink-2); }
    .vbtn.on { background: var(--green-soft); border-color: var(--green); color: var(--green); }
    .h1 { font-size: 28px; }
    .chart { display: flex; flex-direction: column; gap: 10px; }
    .bars { display: flex; align-items: flex-end; gap: 4px; height: 160px; }
    .bar-col { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
    .bar { width: 100%; max-width: 28px; min-height: 2px; background: var(--green); border-radius: 6px 6px 0 0; }
    .bar-value { font-size: 10px; color: var(--muted); }
    .bar-label { font-size: 10px; color: var(--muted); }
    .grid-lists { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .list-title { display: block; font-weight: 700; font-size: 14px; margin-bottom: 8px; }
    .spaced { margin-top: 14px; }
    .line { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); font-size: 14px; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .stat { padding: 14px; display: flex; flex-direction: column; gap: 2px; border-radius: 16px; }
    .value { font-family: var(--display); font-size: 28px; font-weight: 700; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
    th { font-size: 12px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
    .tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; background: var(--green-soft); color: var(--green-dark); margin-left: 4px; }
  `,
})
export class AdminPage implements OnInit {
  private readonly http = inject(HttpClient);

  toggleVerified(u: AdminUser): void {
    this.http.post<{ verified: boolean }>(`/api/admin/users/${u.id}/verified`, {}).subscribe({
      next: (r) => this.users.update((list) => list.map((x) => (x.id === u.id ? { ...x, verified: r.verified } : x))),
      error: () => undefined,
    });
  }

  readonly users = signal<AdminUser[]>([]);
  readonly sellers = signal<AdminSeller[]>([]);
  readonly sellerTotals = computed(() =>
    this.sellers()
      .filter((s) => !s.demo)
      .reduce(
        (t, s) => ({ contacts: t.contacts + s.contactClicks, views: t.views + s.views, sold: t.sold + s.soldListings, via: t.via + s.soldViaFerraille }),
        { contacts: 0, views: 0, sold: 0, via: 0 },
      ),
  );
  readonly visits = signal<VisitSummary | null>(null);
  readonly error = signal<string | null>(null);

  readonly realUsers = computed(() =>
    this.users().filter((u) => !(u.email ?? '').endsWith('@demo.ferraille.tn') && u.fullName !== 'Compte supprimé'),
  );
  readonly todayCount = computed(() => {
    const today = new Date().toDateString();
    return this.realUsers().filter((u) => new Date(u.createdAt).toDateString() === today).length;
  });
  readonly facebookCount = computed(() => this.realUsers().filter((u) => u.facebook).length);
  readonly sellersCount = computed(() => this.realUsers().filter((u) => u.activeListings > 0).length);

  barHeight(value: number): number {
    const max = Math.max(1, ...(this.visits()?.daily ?? []).map((d) => d.visitors));
    return (value / max) * 85;
  }

  ngOnInit(): void {
    this.http.get<VisitSummary>('/api/admin/visits').subscribe({ next: (v) => this.visits.set(v), error: () => undefined });
    this.http.get<AdminSeller[]>('/api/admin/sellers').subscribe({ next: (s) => this.sellers.set(s), error: () => undefined });
    this.http.get<AdminUser[]>('/api/admin/users').subscribe({
      next: (u) => this.users.set(u),
      error: (e) =>
        this.error.set(
          e?.status === 403 ? "Accès réservé à l'administrateur. Déconnecte-toi puis reconnecte-toi." : errorMessage(e),
        ),
    });
  }
}
