import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { DinarPipe } from '../core/dinar.pipe';
import { ORDER_STATUS_LABELS } from '../core/labels';
import { OrderStatus, OrderSummary } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-orders-page',
  standalone: true,
  imports: [RouterLink, DatePipe, DinarPipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1 class="h1">Commandes</h1>
      <div class="segmented" role="tablist">
        <button type="button" role="tab" [class.active]="role() === 'buyer'" [attr.aria-selected]="role() === 'buyer'" (click)="load('buyer')">Mes achats</button>
        <button type="button" role="tab" [class.active]="role() === 'seller'" [attr.aria-selected]="role() === 'seller'" (click)="load('seller')">Mes ventes</button>
      </div>
      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">Chargement…</div>
      } @else if (orders().length === 0) {
        <div class="empty card">
          {{ role() === 'buyer' ? "Tu n'as encore rien acheté." : "Aucune vente pour l'instant." }}
          <br><a [routerLink]="role() === 'buyer' ? '/' : '/vendre'">{{ role() === 'buyer' ? 'Trouver une pièce' : 'Publier une pièce' }}</a>
        </div>
      } @else {
        <div class="card list">
          @for (o of orders(); track o.id) {
            <a class="row item" [routerLink]="['/commandes', o.id]">
              <span class="icon" [class]="tone(o.status)"><fr-icon [name]="o.carrier === 'ARAMEX' ? 'truck' : 'mail'" /></span>
              <span class="stack grow">
                <span class="title">{{ o.listingTitle }}</span>
                <span class="muted small">#{{ o.reference }} · {{ o.counterpart }} · {{ o.createdAt | date: 'd MMM' }}</span>
              </span>
              <span class="stack end">
                <span class="amount">{{ (role() === 'seller' ? o.sellerNet : o.total) | dinar }}</span>
                <span class="status" [class]="tone(o.status)">{{ label(o.status) }}</span>
              </span>
            </a>
          }
        </div>
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 26px; }
    .list { overflow: hidden; }
    .item { padding: 14px; border-bottom: 1px solid var(--line-soft); color: var(--ink); font-weight: 400; }
    .item:last-child { border-bottom: 0; }
    .icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .end { align-items: flex-end; }
    .amount { font-size: 14px; font-weight: 700; }
    .status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; }
    .todo { background: var(--warn-soft); color: var(--warn); }
    .moving { background: var(--green-soft); color: var(--green-dark); }
    .done { background: #e8ece7; color: var(--ink-2); }
    .bad { background: var(--danger-soft); color: var(--danger); }
  `,
})
export class OrdersPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly role = signal<'buyer' | 'seller'>('buyer');
  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load('buyer');
  }

  load(role: 'buyer' | 'seller'): void {
    this.role.set(role);
    this.loading.set(true);
    this.error.set(null);
    this.api.orders(role).subscribe({
      next: (page) => {
        this.orders.set(page.content);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  label(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  tone(status: OrderStatus): string {
    switch (status) {
      case 'PAID':
        return 'todo';
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'DELIVERED':
        return 'moving';
      case 'DISPUTED':
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bad';
      default:
        return 'done';
    }
  }
}
