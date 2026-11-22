import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { DinarPipe } from '../core/dinar.pipe';
import { CITIES, categoryMeta } from '../core/labels';
import { Carrier, CarrierOption, CheckoutQuote, ListingDetail, PaymentMethod } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-checkout-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DinarPipe, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="page" (ngSubmit)="pay()" #f="ngForm">
      <div class="row">
        <a class="icon-btn" [routerLink]="['/piece', id]" aria-label="Retour"><fr-icon name="chevron-left" /></a>
        <h1 class="heading">Finaliser l'achat</h1>
      </div>

      @if (listing(); as l) {
        <div class="card row item">
          <div class="thumb" [style.background]="meta().tint" [style.color]="meta().tone">
            @if (l.photos.length) { <img [src]="l.photos[0]" alt=""> } @else { <fr-part-icon [name]="meta().icon" [size]="36" [stroke]="3" /> }
          </div>
          <div class="stack grow">
            <span class="strong">{{ l.title }}</span>
            <span class="muted small">{{ l.seller.displayName }} · {{ l.city }}</span>
          </div>
          <span class="price">{{ l.price | dinar }}</span>
        </div>
      }

      <fieldset class="stack gap10">
        <legend class="section-title">Mode de livraison</legend>
        @for (o of carriers(); track o.carrier) {
          <label class="card row option" [class.selected]="carrier() === o.carrier">
            <input type="radio" name="carrier" [value]="o.carrier" [checked]="carrier() === o.carrier" (change)="selectCarrier(o.carrier)">
            <span class="carrier-icon" [class.aramex]="o.carrier === 'ARAMEX'">
              <fr-icon [name]="o.carrier === 'ARAMEX' ? 'truck' : 'mail'" />
            </span>
            <span class="stack grow">
              <span class="strong">{{ o.label }}</span>
              <span class="muted small">{{ o.minDays }}–{{ o.maxDays }} jours ouvrés</span>
            </span>
            <span class="strong">{{ o.fee | dinar }}</span>
          </label>
        }
      </fieldset>

      <fieldset class="stack gap10">
        <legend class="section-title">Adresse de livraison</legend>
        <div class="field">
          <label for="fullName">Nom complet</label>
          <input id="fullName" class="input" name="fullName" [(ngModel)]="fullName" required autocomplete="name">
        </div>
        <div class="field">
          <label for="phone">Téléphone</label>
          <input id="phone" class="input" type="tel" name="phone" [(ngModel)]="phone" required pattern="^[+0-9 ]{8,20}$" autocomplete="tel">
        </div>
        <div class="field">
          <label for="address">Adresse</label>
          <input id="address" class="input" name="address" [(ngModel)]="address" required autocomplete="street-address">
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="city">Ville</label>
            <select id="city" class="input" name="city" [(ngModel)]="city" required>
              @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="postal">Code postal</label>
            <input id="postal" class="input" name="postalCode" [(ngModel)]="postalCode" inputmode="numeric" maxlength="10">
          </div>
        </div>
      </fieldset>

      <fieldset class="stack gap10">
        <legend class="section-title">Paiement</legend>
        <div class="grid-3">
          @for (m of methods; track m.value) {
            <label class="method" [class.selected]="paymentMethod() === m.value" [class.disabled]="!isEnabled(m.value)">
              <input type="radio" name="payment" class="sr-only" [value]="m.value" [checked]="paymentMethod() === m.value"
                     [disabled]="!isEnabled(m.value)" (change)="selectMethod(m.value)">
              <fr-icon [name]="m.icon" />
              {{ m.label }}
              @if (!isEnabled(m.value)) { <span class="soon">Bientôt</span> }
            </label>
          }
        </div>
        @if (paymentMethod() === 'A_LA_LIVRAISON') {
          <span class="muted small">Tu paies en espèces au livreur. Vérifie la pièce à la réception avant de confirmer.</span>
        }
      </fieldset>

      @if (quote(); as q) {
        <div class="card card-pad stack summary">
          <div class="summary-line"><span>Pièce</span><span>{{ q.itemPrice | dinar: true }}</span></div>
          <div class="summary-line"><span>Livraison</span><span>{{ q.shippingFee | dinar: true }}</span></div>
          <div class="summary-line"><span class="row gap6">Protection acheteur <fr-icon name="shield" [size]="14" class="green" /></span><span>{{ q.protectionFee | dinar: true }}</span></div>
          @if (q.codFee > 0) {
            <div class="summary-line"><span>Frais paiement à la livraison</span><span>{{ q.codFee | dinar: true }}</span></div>
          }
          <div class="divider"></div>
          <div class="row between"><span class="total-label">Total</span><span class="price total">{{ q.total | dinar }}</span></div>
        </div>
      }

      @if (paymentMethod() !== 'A_LA_LIVRAISON') {
        <div class="notice">
          <fr-icon name="alert" [size]="18" />
          <span>Le paiement en ligne est en mode test : aucune somme n'est débitée pour l'instant.</span>
        </div>
      }

      @if (error()) { <div class="error">{{ error() }}</div> }

      <div class="bottom-bar column">
        <button type="submit" class="btn btn-primary btn-block" [disabled]="f.invalid || !quote() || paying()">
          <fr-icon name="lock" [size]="18" class="lime" />
          {{ paying() ? 'Paiement…' : payLabel() }}
        </button>
        <span class="muted small center">Le vendeur est payé uniquement après ta confirmation.</span>
      </div>
    </form>
  `,
  styles: `
    .heading { font-size: 19px; font-weight: 600; }
    .item { padding: 12px; }
    .thumb { width: 60px; height: 60px; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .strong { font-size: 14px; font-weight: 600; }
    fieldset { border: 0; margin: 0; padding: 0; }
    legend { padding: 0; margin-bottom: 10px; }
    .gap10 { gap: 10px; }
    .gap6 { gap: 6px; }
    .option { padding: 14px; cursor: pointer; border-radius: 18px; }
    .option.selected { border: 2px solid var(--green); }
    .option input { width: 20px; height: 20px; margin: 0; accent-color: var(--green); }
    .carrier-icon { width: 40px; height: 40px; border-radius: 12px; background: var(--warn-soft); color: var(--warn); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .carrier-icon.aramex { background: var(--danger-soft); color: var(--danger); }
    .method { height: 64px; border-radius: 14px; background: var(--white); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--green); position: relative; }
    .method.selected { background: var(--forest); border-color: var(--forest); color: var(--white); }
    .method.selected fr-icon { color: var(--lime); }
    .method.disabled { opacity: 0.5; cursor: not-allowed; border-style: dashed; }
    .soon { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
    .summary { gap: 8px; padding: 16px; }
    .total-label { font-size: 15px; font-weight: 700; }
    .total { font-size: 22px; }
    .green { color: var(--green); }
    .lime { color: var(--lime); }
    .column { flex-direction: column; }
    .center { text-align: center; }
    .page { padding-bottom: 150px; }
  `,
})
export class CheckoutPage implements OnInit {
  @Input() id!: string;

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cities = CITIES;
  readonly methods: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CARTE', label: 'Carte', icon: 'card' },
    { value: 'D17', label: 'D17', icon: 'phone' },
    { value: 'A_LA_LIVRAISON', label: 'À la livraison', icon: 'cash' },
  ];

  readonly listing = signal<ListingDetail | null>(null);
  readonly carriers = signal<CarrierOption[]>([]);
  readonly carrier = signal<Carrier>('ARAMEX');
  readonly paymentMethod = signal<PaymentMethod>('A_LA_LIVRAISON');
  readonly enabledMethods = signal<PaymentMethod[]>(['A_LA_LIVRAISON']);
  readonly quote = signal<CheckoutQuote | null>(null);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);

  readonly meta = computed(() => categoryMeta(this.listing()!.category));
  readonly payLabel = computed(() => {
    const q = this.quote();
    if (!q) {
      return 'Payer';
    }
    const total = `${Number(q.total).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} DT`;
    return this.paymentMethod() === 'A_LA_LIVRAISON' ? `Commander · ${total}` : `Payer ${total}`;
  });

  fullName = '';
  phone = '';
  address = '';
  city = 'Tunis';
  postalCode = '';

  ngOnInit(): void {
    const user = this.auth.user();
    this.fullName = user?.fullName ?? '';
    this.phone = user?.phone ?? '';
    if (user?.city && CITIES.includes(user.city)) {
      this.city = user.city;
    }
    this.api.listing(Number(this.id)).subscribe({
      next: (l) => {
        this.listing.set(l);
        if (l.status !== 'ACTIVE') {
          this.error.set("Cette pièce n'est plus disponible.");
        }
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
    this.api.paymentMethods().subscribe((methods) => {
      if (methods.length) {
        this.enabledMethods.set(methods);
        if (!methods.includes(this.paymentMethod())) {
          this.selectMethod(methods[0]);
        }
      }
    });
    this.api.shippingOptions().subscribe((options) => {
      this.carriers.set(options);
      if (options.length && !options.some((o) => o.carrier === this.carrier())) {
        this.carrier.set(options[0].carrier);
      }
      this.refreshQuote();
    });
  }

  selectCarrier(carrier: Carrier): void {
    this.carrier.set(carrier);
    this.refreshQuote();
  }

  isEnabled(method: PaymentMethod): boolean {
    return this.enabledMethods().includes(method);
  }

  selectMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
    this.refreshQuote();
  }

  pay(): void {
    this.paying.set(true);
    this.error.set(null);
    this.api
      .createOrder({
        listingId: Number(this.id),
        carrier: this.carrier(),
        paymentMethod: this.paymentMethod(),
        fullName: this.fullName,
        phone: this.phone,
        address: this.address,
        city: this.city,
        postalCode: this.postalCode || undefined,
      })
      .subscribe({
        next: (order) => this.router.navigate(['/commandes', order.id]),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.paying.set(false);
        },
      });
  }

  private refreshQuote(): void {
    this.api.checkoutQuote(Number(this.id), this.carrier(), this.paymentMethod()).subscribe({
      next: (q) => this.quote.set(q),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
