import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { errorMessage } from '../core/api.service';

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
  createdAt: string;
}

@Component({
  selector: 'fr-admin-page',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <h1 class="h1">Administration</h1>
      @if (error()) { <div class="error">{{ error() }}</div> }
      <div class="stats">
        <div class="card stat"><span class="value">{{ realUsers().length }}</span><span class="muted small">Inscrits réels</span></div>
        <div class="card stat"><span class="value">{{ todayCount() }}</span><span class="muted small">Aujourd'hui</span></div>
        <div class="card stat"><span class="value">{{ facebookCount() }}</span><span class="muted small">Via Facebook</span></div>
        <div class="card stat"><span class="value">{{ sellersCount() }}</span><span class="muted small">Avec annonces</span></div>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>Inscrit le</th><th>Nom</th><th>E-mail</th><th>WhatsApp / tél.</th><th>Ville</th><th>Type</th><th>Annonces</th></tr>
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
                <td>{{ u.activeListings }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Aucun inscrit pour le moment.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <span class="muted small">Les comptes de démo (&#64;demo.ferraille.tn) et les comptes supprimés sont masqués.</span>
    </div>
  `,
  styles: `
    .h1 { font-size: 28px; }
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

  readonly users = signal<AdminUser[]>([]);
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

  ngOnInit(): void {
    this.http.get<AdminUser[]>('/api/admin/users').subscribe({
      next: (u) => this.users.set(u),
      error: (e) =>
        this.error.set(
          e?.status === 403 ? "Accès réservé à l'administrateur. Déconnecte-toi puis reconnecte-toi." : errorMessage(e),
        ),
    });
  }
}
