import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DinarPipe } from '../core/dinar.pipe';
import { PayoutMethod, WalletSummary, WalletTransaction } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-wallet-page',
  standalone: true,
  imports: [FormsModule, DatePipe, DinarPipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (auth.user(); as u) {
        <div class="row">
          <div class="avatar">{{ initial() }}</div>
          <div class="stack grow">
            <span class="name">{{ u.displayName }}</span>
            <span class="muted small">{{ u.sellerType === 'PRO' ? 'Professionnel' : 'Particulier' }}{{ u.city ? ' · ' + u.city : '' }}</span>
          </div>
          <button type="button" class="icon-btn" aria-label="Se déconnecter" (click)="logout()"><fr-icon name="logout" /></button>
        </div>
      }

      <div class="dark-card stack balance">
        <div class="ring"></div>
        <span class="row label"><fr-icon name="wallet" [size]="16" />Solde disponible</span>
        <span class="amount">{{ (wallet()?.available ?? 0) | dinar: true }}</span>
        <div class="row actions">
          <button type="button" class="btn btn-lime grow" [disabled]="!canWithdraw()" (click)="payoutOpen.set(!payoutOpen())">Retirer</button>
          <div class="pending grow">
            <span class="small soft">En attente</span>
            <strong>{{ (wallet()?.pending ?? 0) | dinar }}</strong>
          </div>
        </div>
        <span class="small soft">Retrait par virement (RIB) ou D17 · minimum 20 DT</span>
      </div>

      @if (payoutOpen()) {
        <form class="card card-pad stack payout" (ngSubmit)="requestPayout()" #f="ngForm">
          <div class="segmented">
            <button type="button" [class.active]="method === 'D17'" (click)="method = 'D17'">D17</button>
            <button type="button" [class.active]="method === 'RIB'" (click)="method = 'RIB'">Virement (RIB)</button>
          </div>
          <div class="field">
            <label for="amount">Montant</label>
            <input id="amount" class="input" type="number" name="amount" [(ngModel)]="amount" min="20" [max]="wallet()?.available ?? 0" required>
          </div>
          <div class="field">
            <label for="dest">{{ method === 'D17' ? 'Numéro D17' : 'RIB (20 chiffres)' }}</label>
            <input id="dest" class="input" name="destination" [(ngModel)]="destination" required maxlength="60"
                   [attr.inputmode]="'numeric'">
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="f.invalid || busy()">Demander le retrait</button>
        </form>
      }

      @if (message()) { <div class="notice"><fr-icon name="check-circle" [size]="18" />{{ message() }}</div> }
      @if (error()) { <div class="error">{{ error() }}</div> }

      <div class="grid-3">
        <div class="card stat"><span class="stat-value">{{ wallet()?.salesCount ?? 0 }}</span><span class="muted small">Ventes</span></div>
        <div class="card stat"><span class="stat-value">{{ wallet()?.activeListings ?? 0 }}</span><span class="muted small">En ligne</span></div>
        <div class="card stat"><span class="stat-value">{{ views() }}</span><span class="muted small">Vues</span></div>
      </div>

      <section class="stack gap10">
        <h2 class="section-title">Derniers mouvements</h2>
        @if (!wallet()?.recent?.length) {
          <div class="empty card">Aucun mouvement pour l'instant.</div>
        } @else {
          <div class="card list">
            @for (t of wallet()!.recent; track t.id) {
              <div class="row item">
                <span class="tx-icon" [class.out]="t.type === 'PAYOUT'"><fr-icon [name]="t.type === 'PAYOUT' ? 'arrow-down' : 'box'" /></span>
                <span class="stack grow">
                  <span class="title">{{ t.label }}</span>
                  <span class="muted small">{{ statusText(t) }} · {{ t.createdAt | date: 'd MMM' }}</span>
                </span>
                <span class="stack end">
                  <span class="tx-amount" [class.positive]="t.type === 'SALE' && t.status === 'AVAILABLE'" [class.dim]="t.status === 'CANCELLED'">
                    {{ t.amount > 0 ? '+ ' : '− ' }}{{ abs(t.amount) | dinar }}
                  </span>
                  @if (t.commission > 0) { <span class="muted small">com. − {{ t.commission | dinar }}</span> }
                </span>
              </div>
            }
          </div>
        }
      </section>
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .avatar { width: 52px; height: 52px; border-radius: 18px; background: var(--lime); color: var(--forest); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 20px; flex-shrink: 0; }
    .name { font-family: var(--display); font-size: 19px; font-weight: 700; }
    .balance { gap: 16px; border-radius: 26px; }
    .ring { position: absolute; right: -40px; bottom: -60px; width: 180px; height: 180px; border-radius: 50%; border: 22px solid rgba(198, 243, 107, 0.12); }
    .label { gap: 8px; color: #c9d8cf; font-size: 13px; position: relative; }
    .amount { font-family: var(--display); font-size: 38px; font-weight: 700; letter-spacing: -1px; line-height: 1; position: relative; }
    .actions { position: relative; gap: 10px; }
    .actions .btn { height: 46px; }
    .pending { height: 46px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; }
    .soft { color: #c9d8cf; position: relative; }
    .payout { gap: 12px; }
    .stat { padding: 12px; display: flex; flex-direction: column; gap: 2px; border-radius: 16px; }
    .stat-value { font-family: var(--display); font-size: 22px; font-weight: 700; }
    .gap10 { gap: 10px; }
    .list { overflow: hidden; }
    .item { padding: 14px; border-bottom: 1px solid var(--line-soft); }
    .item:last-child { border-bottom: 0; }
    .tx-icon { width: 40px; height: 40px; border-radius: 12px; background: var(--green-soft); color: var(--green); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .tx-icon.out { background: var(--ground); color: var(--ink-2); }
    .title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .end { align-items: flex-end; }
    .tx-amount { font-size: 14px; font-weight: 700; color: var(--muted); }
    .tx-amount.positive { color: var(--green); }
    .tx-amount.dim { text-decoration: line-through; }
  `,
})
export class WalletPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly wallet = signal<WalletSummary | null>(null);
  readonly payoutOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly initial = computed(() => (this.auth.user()?.displayName ?? '?').charAt(0).toUpperCase());
  readonly canWithdraw = computed(() => (this.wallet()?.available ?? 0) >= 20);
  readonly views = computed(() => {
    const v = this.wallet()?.totalViews ?? 0;
    return v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')}k` : String(v);
  });

  method: PayoutMethod = 'D17';
  amount: number | null = null;
  destination = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.wallet().subscribe({
      next: (w) => this.wallet.set(w),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  requestPayout(): void {
    if (!this.amount) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.requestPayout(this.amount, this.method, this.destination).subscribe({
      next: () => {
        this.busy.set(false);
        this.payoutOpen.set(false);
        this.amount = null;
        this.destination = '';
        this.message.set('Demande de retrait envoyée. Virement sous 48 h.');
        this.refresh();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }

  statusText(t: WalletTransaction): string {
    if (t.type === 'PAYOUT') {
      return t.status === 'PAID' ? 'Retrait effectué' : 'Retrait en cours';
    }
    switch (t.status) {
      case 'PENDING':
        return 'En attente de livraison';
      case 'AVAILABLE':
        return 'Disponible';
      case 'CANCELLED':
        return 'Annulée';
      default:
        return '';
    }
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
