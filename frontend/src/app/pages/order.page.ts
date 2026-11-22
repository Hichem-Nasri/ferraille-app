import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService, errorMessage } from '../core/api.service';
import { DinarPipe } from '../core/dinar.pipe';
import { ORDER_STATUS_LABELS, PAYMENT_LABELS } from '../core/labels';
import { OrderDetail, OrderStatus } from '../core/models';
import { IconComponent } from '../shared/icon.component';

interface Step {
  label: string;
  detail?: string;
  state: 'done' | 'current' | 'todo';
}

type ActionKey = 'ship' | 'confirm' | 'cancel' | 'dispute' | 'transit' | 'delivered';

const FLOW: OrderStatus[] = ['PAID', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];

@Component({
  selector: 'fr-order-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DinarPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (order(); as o) {
      <div class="hero">
        <div class="row between">
          <a class="icon-btn ghost" routerLink="/commandes" aria-label="Retour"><fr-icon name="chevron-left" /></a>
          <span class="ref">Commande #{{ o.reference }}</span>
          <span class="spacer"></span>
        </div>
        <div class="stack">
          <span class="eyebrow">{{ statusLabel(o.status) }}</span>
          <span class="headline">{{ headline() }}</span>
        </div>
        <div class="row route">
          <span class="stack"><strong>{{ o.sellerCity }}</strong><span class="sub">Vendeur</span></span>
          <div class="track grow">
            <div class="dash"></div>
            <div class="fill" [style.width.%]="progress()"></div>
            <div class="truck" [style.left]="'calc(' + progress() + '% - 14px)'"><fr-icon name="truck" [size]="16" [stroke]="2.2" /></div>
          </div>
          <span class="stack end"><strong>{{ o.shipCity }}</strong><span class="sub">{{ o.viewerIsBuyer ? 'Chez toi' : 'Acheteur' }}</span></span>
        </div>
      </div>

      <div class="page">
        <div class="card timeline">
          @for (s of steps(); track $index; let last = $last) {
            <div class="row step">
              <div class="rail">
                <span class="dot" [class]="s.state">
                  @if (s.state === 'done') { <fr-icon name="check" [size]="13" [stroke]="3" /> }
                </span>
                @if (!last) { <span class="bar" [class.done]="s.state === 'done'"></span> }
              </div>
              <div class="stack step-body">
                <span class="step-label" [class.dim]="s.state === 'todo'">{{ s.label }}</span>
                @if (s.detail) { <span class="muted small">{{ s.detail }}</span> }
              </div>
            </div>
          }
        </div>

        @if (o.trackingNumber) {
          <div class="card card-pad row">
            <fr-icon [name]="o.carrier === 'ARAMEX' ? 'truck' : 'mail'" class="green" />
            <span class="stack grow">
              <span class="strong">{{ o.carrierLabel }}</span>
              <span class="muted small">Suivi : {{ o.trackingNumber }}</span>
            </span>
          </div>
        }

        @if (o.viewerIsBuyer && ['PAID', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)) {
          <div class="notice">
            <fr-icon name="shield" [size]="22" />
            @if (o.paymentMethod === 'A_LA_LIVRAISON') {
              <span>Tu paieras <strong>{{ o.total | dinar }}</strong> en espèces au livreur. Vérifie la pièce avant de confirmer la réception.</span>
            } @else {
              <span>Tes <strong>{{ o.total | dinar }}</strong> sont protégés par Ferraille. Si la pièce n'est pas conforme, tu es remboursé.</span>
            }
          </div>
        }

        @if (o.viewerIsSeller && o.status === 'PAID') {
          <div class="notice warn">
            <fr-icon name="box" [size]="22" />
            <span>Emballe bien la pièce puis clique sur « Expédier ». {{ o.carrierLabel }} viendra la récupérer à {{ o.sellerCity }}.</span>
          </div>
        }

        <div class="card card-pad stack summary">
          <div class="summary-line"><span>Pièce</span><span>{{ o.itemPrice | dinar: true }}</span></div>
          <div class="summary-line"><span>Livraison</span><span>{{ o.shippingFee | dinar: true }}</span></div>
          <div class="summary-line"><span>Protection acheteur</span><span>{{ o.protectionFee | dinar: true }}</span></div>
          @if (o.codFee > 0) { <div class="summary-line"><span>Paiement à la livraison</span><span>{{ o.codFee | dinar: true }}</span></div> }
          <div class="divider"></div>
          <div class="summary-line strong"><span>Total payé · {{ paymentLabel(o) }}</span><span>{{ o.total | dinar: true }}</span></div>
          @if (o.viewerIsSeller && o.sellerNet !== undefined) {
            <div class="summary-line"><span>Commission Ferraille</span><span>− {{ o.commission | dinar: true }}</span></div>
            <div class="summary-line strong green"><span>Tu reçois</span><span>{{ o.sellerNet | dinar: true }}</span></div>
          }
        </div>

        @if (o.shipAddress) {
          <div class="card card-pad stack">
            <span class="muted small">Livraison à</span>
            <span class="strong">{{ o.shipFullName }} · {{ o.shipPhone }}</span>
            <span class="muted">{{ o.shipAddress }}, {{ o.shipCity }} {{ o.shipPostalCode }}</span>
          </div>
        }

        @if (disputeOpen()) {
          <div class="card card-pad stack gap10">
            <label class="strong" for="reason">Quel est le problème ?</label>
            <input id="reason" class="input" [(ngModel)]="reason" maxlength="140" placeholder="Pièce différente des photos, cassée…">
            <div class="row">
              <button type="button" class="btn btn-ghost grow" (click)="disputeOpen.set(false)">Annuler</button>
              <button type="button" class="btn btn-primary grow" [disabled]="!reason.trim() || busy()" (click)="dispute()">Envoyer</button>
            </div>
          </div>
        }

        @if (error()) { <div class="error">{{ error() }}</div> }
      </div>

      @if (actions(); as a) {
        @if (a.length) {
          <div class="bottom-bar">
            @for (action of a; track action.key) {
              <button type="button" class="btn grow" [class]="action.style" [disabled]="busy()" (click)="run(action.key)">{{ action.label }}</button>
            }
          </div>
        }
      }
    } @else if (error()) {
      <div class="page"><div class="error">{{ error() }}</div><a routerLink="/commandes">Mes commandes</a></div>
    } @else {
      <div class="page"><div class="empty">Chargement…</div></div>
    }
  `,
  styles: `
    .hero { background: var(--forest); color: var(--white); padding: 20px 20px 28px; display: flex; flex-direction: column; gap: 20px; border-radius: 0 0 28px 28px; }
    .ghost { background: rgba(255, 255, 255, 0.1); border: 0; color: var(--white); }
    .ref { font-size: 13px; color: #c9d8cf; }
    .spacer { width: 44px; }
    .eyebrow { font-size: 13px; font-weight: 600; color: var(--lime); text-transform: uppercase; letter-spacing: 0.8px; }
    .headline { font-family: var(--display); font-size: 26px; font-weight: 700; line-height: 1.15; }
    .route { gap: 10px; }
    .route strong { font-size: 15px; }
    .sub { font-size: 11px; color: #c9d8cf; }
    .end { align-items: flex-end; }
    .track { position: relative; height: 28px; display: flex; align-items: center; }
    .dash { position: absolute; left: 0; right: 0; height: 2px; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0 6px, transparent 6px 12px); }
    .fill { position: absolute; left: 0; height: 3px; border-radius: 2px; background: var(--lime); transition: width 0.4s ease; }
    .truck { position: absolute; width: 28px; height: 28px; border-radius: 50%; background: var(--lime); color: var(--forest); display: flex; align-items: center; justify-content: center; transition: left 0.4s ease; }
    .page { padding-top: 20px; }
    .timeline { padding: 18px 16px; }
    .step { align-items: stretch; gap: 14px; }
    .rail { display: flex; flex-direction: column; align-items: center; }
    .dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-sizing: border-box; }
    .dot.done { background: var(--green); color: var(--white); }
    .dot.current { background: var(--lime); border: 5px solid var(--green); }
    .dot.todo { border: 2px solid #c5d1c7; }
    .bar { width: 2px; flex: 1; min-height: 26px; background: #d5ded3; }
    .bar.done { background: var(--green); }
    .step-body { padding-bottom: 14px; gap: 2px; }
    .step-label { font-size: 14px; font-weight: 600; }
    .step-label.dim { color: var(--muted); }
    .strong { font-size: 14px; font-weight: 600; }
    .green { color: var(--green); }
    .summary { gap: 8px; }
    .summary-line.strong { color: var(--ink); font-weight: 700; }
    .summary-line.green { color: var(--green); }
    .notice.warn { background: var(--warn-soft); color: var(--warn); }
    .gap10 { gap: 10px; }
  `,
})
export class OrderPage implements OnInit {
  @Input() id!: string;

  private readonly api = inject(ApiService);
  private readonly datePipe = new DatePipe('fr');

  readonly order = signal<OrderDetail | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly disputeOpen = signal(false);
  reason = '';

  readonly progress = computed(() => {
    const status = this.order()?.status;
    switch (status) {
      case 'PAID':
        return 8;
      case 'SHIPPED':
        return 35;
      case 'IN_TRANSIT':
        return 62;
      case 'DELIVERED':
      case 'COMPLETED':
        return 100;
      default:
        return 0;
    }
  });

  readonly headline = computed(() => {
    const o = this.order();
    if (!o) {
      return '';
    }
    const buyer = o.viewerIsBuyer;
    switch (o.status) {
      case 'PAID':
        return buyer ? 'Commande confirmée, le vendeur prépare ton colis' : 'Une pièce à expédier !';
      case 'SHIPPED':
        return `Colis pris en charge par ${o.carrierLabel}`;
      case 'IN_TRANSIT':
        return `En route vers ${o.shipCity}`;
      case 'DELIVERED':
        return buyer ? 'Colis livré. Tout est conforme ?' : "Colis livré, en attente de confirmation";
      case 'COMPLETED':
        return buyer ? 'Commande terminée' : 'Vente terminée, argent disponible';
      case 'DISPUTED':
        return "Litige en cours d'examen";
      case 'REFUNDED':
        return 'Commande remboursée';
      case 'CANCELLED':
        return 'Commande annulée';
    }
  });

  readonly steps = computed<Step[]>(() => {
    const o = this.order();
    if (!o) {
      return [];
    }
    const done: Step[] = o.events.map((e) => ({
      label: e.label,
      detail: [this.datePipe.transform(e.createdAt, "EEE d MMM · HH:mm"), e.location].filter(Boolean).join(' · '),
      state: 'done',
    }));
    const index = FLOW.indexOf(o.status);
    if (index === -1) {
      return done;
    }
    const upcoming: Record<OrderStatus, string> = {
      PAID: 'Paiement reçu',
      SHIPPED: `Remise à ${o.carrierLabel}`,
      IN_TRANSIT: `En route vers ${o.shipCity}`,
      DELIVERED: 'Livraison',
      COMPLETED: o.viewerIsSeller ? 'Confirmation · tu es payé' : 'Tu confirmes · vendeur payé',
      DISPUTED: '',
      REFUNDED: '',
      CANCELLED: '',
    };
    const todo: Step[] = FLOW.slice(index + 1).map((s) => ({ label: upcoming[s], state: 'todo' }));
    if (done.length) {
      done[done.length - 1] = { ...done[done.length - 1], state: o.status === 'COMPLETED' ? 'done' : 'current' };
    }
    if (o.status === 'DELIVERED' && o.autoConfirmAt && todo.length) {
      todo[0] = { ...todo[0], detail: `Automatique le ${this.datePipe.transform(o.autoConfirmAt, 'd MMM · HH:mm')}` };
    }
    return [...done, ...todo];
  });

  readonly actions = computed(() => {
    const o = this.order();
    if (!o) {
      return [];
    }
    const list: { key: ActionKey; label: string; style: string }[] = [];
    if (o.viewerIsSeller && o.status === 'PAID') {
      list.push({ key: 'cancel', label: 'Annuler', style: 'btn-ghost' });
      list.push({ key: 'ship', label: 'Expédier', style: 'btn-primary' });
    }
    if (o.viewerIsSeller && o.status === 'SHIPPED') {
      list.push({ key: 'transit', label: 'Marquer en transit', style: 'btn-ghost' });
    }
    if (o.viewerIsSeller && ['SHIPPED', 'IN_TRANSIT'].includes(o.status)) {
      list.push({ key: 'delivered', label: 'Marquer livrée', style: 'btn-primary' });
    }
    if (o.viewerIsBuyer && o.status === 'PAID') {
      list.push({ key: 'cancel', label: 'Annuler la commande', style: 'btn-ghost' });
    }
    if (o.viewerIsBuyer && ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)) {
      list.push({ key: 'dispute', label: 'Signaler un problème', style: 'btn-ghost' });
      list.push({ key: 'confirm', label: 'Confirmer la réception', style: 'btn-primary' });
    }
    return list;
  });

  ngOnInit(): void {
    this.api.order(Number(this.id)).subscribe({
      next: (o) => this.order.set(o),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  paymentLabel(o: OrderDetail): string {
    return PAYMENT_LABELS[o.paymentMethod];
  }

  run(key: ActionKey): void {
    if (key === 'transit' || key === 'delivered') {
      this.execute(this.api.deliveryStatus(Number(this.id), key === 'transit' ? 'IN_TRANSIT' : 'DELIVERED'));
      return;
    }
    if (key === 'dispute') {
      this.disputeOpen.set(true);
      return;
    }
    if (key === 'cancel' && !confirm('Annuler cette commande ? L\'acheteur sera remboursé.')) {
      return;
    }
    this.execute(this.api.orderAction(Number(this.id), key));
  }

  dispute(): void {
    this.execute(this.api.dispute(Number(this.id), this.reason.trim()));
    this.disputeOpen.set(false);
  }

  private execute(request: Observable<OrderDetail>): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (o) => {
        this.order.set(o);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
