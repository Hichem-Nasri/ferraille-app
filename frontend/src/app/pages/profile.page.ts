import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CITIES } from '../core/labels';
import { SellerType } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-profile-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="row">
        <a class="icon-btn" routerLink="/portefeuille" aria-label="Retour"><fr-icon name="chevron-left" /></a>
        <h1 class="h1">Mon profil</h1>
      </div>

      <form class="card card-pad stack form" (ngSubmit)="saveProfile()" #pf="ngForm">
        <h2 class="section-title">Informations</h2>
        <div class="segmented" role="group" aria-label="Type de compte">
          <button type="button" [class.active]="sellerType === 'PARTICULIER'" (click)="sellerType = 'PARTICULIER'">Particulier</button>
          <button type="button" [class.active]="sellerType === 'PRO'" (click)="sellerType = 'PRO'">Casse / Pro</button>
        </div>
        @if (sellerType === 'PRO') {
          <div class="field">
            <label for="shop">Nom de la casse</label>
            <input id="shop" class="input" name="shopName" [(ngModel)]="shopName" required maxlength="120">
          </div>
        }
        <div class="field">
          <label for="name">Nom complet</label>
          <input id="name" class="input" name="fullName" [(ngModel)]="fullName" required maxlength="120" autocomplete="name">
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" [value]="email" disabled>
          <span class="muted small">L'email sert d'identifiant et ne peut pas être modifié.</span>
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
        @if (profileMessage()) { <div class="notice"><fr-icon name="check-circle" [size]="18" />{{ profileMessage() }}</div> }
        @if (profileError()) { <div class="error">{{ profileError() }}</div> }
        <button type="submit" class="btn btn-primary btn-block" [disabled]="pf.invalid || savingProfile()">
          {{ savingProfile() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </form>

      <form class="card card-pad stack form" (ngSubmit)="savePassword()" #pw="ngForm">
        <h2 class="section-title">Mot de passe</h2>
        <div class="field">
          <label for="current">Mot de passe actuel</label>
          <input id="current" class="input" type="password" name="current" [(ngModel)]="currentPassword" required autocomplete="current-password">
        </div>
        <div class="field">
          <label for="next">Nouveau mot de passe</label>
          <input id="next" class="input" type="password" name="next" [(ngModel)]="newPassword" required minlength="8" autocomplete="new-password">
          <span class="muted small">8 caractères minimum</span>
        </div>
        @if (passwordMessage()) { <div class="notice"><fr-icon name="check-circle" [size]="18" />{{ passwordMessage() }}</div> }
        @if (passwordError()) { <div class="error">{{ passwordError() }}</div> }
        <button type="submit" class="btn btn-ghost btn-block" [disabled]="pw.invalid || savingPassword()">Changer le mot de passe</button>
      </form>

      <button type="button" class="btn btn-ghost btn-block logout" (click)="logout()">
        <fr-icon name="logout" [size]="18" />Se déconnecter
      </button>
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 24px; }
    .form { gap: 14px; padding: 18px; }
    .logout { color: var(--danger); }
  `,
})
export class ProfilePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cities = CITIES;
  sellerType: SellerType = 'PARTICULIER';
  shopName = '';
  fullName = '';
  email = '';
  phone = '';
  city = 'Tunis';
  currentPassword = '';
  newPassword = '';

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly profileMessage = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.sellerType = user.sellerType;
      this.shopName = user.shopName ?? '';
      this.fullName = user.fullName;
      this.email = user.email;
      this.phone = user.phone ?? '';
      this.city = user.city ?? 'Tunis';
    }
  }

  saveProfile(): void {
    this.savingProfile.set(true);
    this.profileMessage.set(null);
    this.profileError.set(null);
    this.api
      .updateProfile({
        fullName: this.fullName,
        phone: this.phone || undefined,
        city: this.city,
        sellerType: this.sellerType,
        shopName: this.sellerType === 'PRO' ? this.shopName : undefined,
      })
      .subscribe({
        next: (user) => {
          this.auth.setUser(user);
          this.profileMessage.set('Profil mis à jour.');
          this.savingProfile.set(false);
        },
        error: (e) => {
          this.profileError.set(errorMessage(e));
          this.savingProfile.set(false);
        },
      });
  }

  savePassword(): void {
    this.savingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);
    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.currentPassword = '';
        this.newPassword = '';
        this.passwordMessage.set('Mot de passe modifié.');
        this.savingPassword.set(false);
      },
      error: (e) => {
        this.passwordError.set(errorMessage(e));
        this.savingPassword.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
