import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CITIES } from '../core/labels';
import { SellerType } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { safeReturn } from './login.page';

@Component({
  selector: 'fr-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="icon-btn" routerLink="/connexion" aria-label="Retour"><fr-icon name="chevron-left" /></a>
      <div class="stack">
        <h1 class="h1">Créer un compte</h1>
        <span class="muted">Gratuit. Tu paies une commission uniquement quand tu vends.</span>
      </div>
      <form class="stack form" (ngSubmit)="submit()" #f="ngForm">
        <div class="segmented" role="group" aria-label="Type de compte">
          <button type="button" [class.active]="sellerType === 'PARTICULIER'" (click)="sellerType = 'PARTICULIER'">Particulier</button>
          <button type="button" [class.active]="sellerType === 'PRO'" (click)="sellerType = 'PRO'">Casse / Pro</button>
        </div>
        @if (sellerType === 'PRO') {
          <div class="field">
            <label for="shop">Nom de la casse</label>
            <input id="shop" class="input" name="shopName" [(ngModel)]="shopName" required>
          </div>
        }
        <div class="field">
          <label for="name">Nom complet</label>
          <input id="name" class="input" name="fullName" [(ngModel)]="fullName" required autocomplete="name">
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required email autocomplete="email">
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="phone">Téléphone</label>
            <input id="phone" class="input" type="tel" name="phone" [(ngModel)]="phone" placeholder="+216" autocomplete="tel">
          </div>
          <div class="field">
            <label for="city">Ville</label>
            <select id="city" class="input" name="city" [(ngModel)]="city">
              @for (c of cities; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password">
          <span class="muted small">8 caractères minimum</span>
        </div>
        @if (error()) { <div class="error">{{ error() }}</div> }
        <button type="submit" class="btn btn-primary btn-block" [disabled]="f.invalid || loading()">
          {{ loading() ? 'Création…' : 'Créer mon compte' }}
        </button>
      </form>
    </div>
  `,
  styles: `
    .h1 { font-size: 28px; margin-bottom: 6px; }
    .form { gap: 14px; }
  `,
})
export class RegisterPage {
  @Input() retour?: string;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cities = CITIES;
  sellerType: SellerType = 'PARTICULIER';
  shopName = '';
  fullName = '';
  email = '';
  phone = '';
  city = 'Tunis';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .register({
        fullName: this.fullName,
        email: this.email,
        phone: this.phone || undefined,
        password: this.password,
        city: this.city,
        sellerType: this.sellerType,
        shopName: this.sellerType === 'PRO' ? this.shopName : undefined,
      })
      .subscribe({
        next: () => this.router.navigateByUrl(safeReturn(this.retour)),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
  }
}
