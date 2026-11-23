import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { NotifService } from '../core/notif.service';
import { AuthService } from '../core/auth.service';
import { CITIES } from '../core/labels';
import { SellerType } from '../core/models';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { safeReturn } from './login.page';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-profile-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="row">
        @if (avatarUrl) {
          <img class="avatar" [src]="avatarUrl" alt="" width="52" height="52">
        } @else {
          <span class="avatar initial">{{ fullName.charAt(0) || '?' }}</span>
        }
        <div class="stack grow">
          <h1 class="h1">Mon profil</h1>
          @if (facebookLinked) { <span class="muted small">Connecté avec Facebook</span> }
        </div>
      </div>

      @if (bienvenue) {
        <div class="notice">
          <fr-icon name="chat" [size]="20" />
          <span><strong>Dernière étape :</strong> ajoute ton numéro WhatsApp (ou de téléphone) pour que les acheteurs puissent te contacter quand tu publies une pièce.</span>
        </div>
      }

      <nav class="shortcuts" aria-label="Raccourcis">
        <a class="chip" routerLink="/mes-annonces"><fr-icon name="list" [size]="16" />Mes annonces</a>
        <a class="chip" routerLink="/alertes"><fr-icon name="bell" [size]="16" />Mes alertes
          @if (notif.counts().newListings) { <span class="count">{{ notif.counts().newListings }}</span> }</a>
        <a class="chip" routerLink="/demandes"><fr-icon name="search" [size]="16" />Demandes
          @if (notif.counts().matchingRequests) { <span class="count">{{ notif.counts().matchingRequests }}</span> }</a>
        <a class="chip" routerLink="/vendre/lot"><fr-icon name="plus" [size]="16" />Publication express</a>
        @if (userId()) { <a class="chip" [routerLink]="['/casse', userId()]"><fr-icon name="home" [size]="16" />Ma vitrine</a> }
      </nav>

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
          <div class="field">
            <label for="address">Adresse de la casse</label>
            <input id="address" class="input" name="address" [(ngModel)]="address" maxlength="200" placeholder="Route de Gabès km 4, Sfax">
            <span class="muted small">Affichée sur ta vitrine avec un bouton « Itinéraire » Google Maps.</span>
          </div>
          <div class="field">
            <label for="hours">Horaires</label>
            <input id="hours" class="input" name="openingHours" [(ngModel)]="openingHours" maxlength="120" placeholder="Lun-Sam 8h-18h">
          </div>
          <div class="field">
            <label for="bio">Présentation</label>
            <textarea id="bio" class="input" name="bio" [(ngModel)]="bio" maxlength="500" rows="3" placeholder="Spécialiste Peugeot / Renault, livraison possible dans toute la Tunisie…"></textarea>
          </div>
        }
        <div class="field">
          <label for="name">Nom complet</label>
          <input id="name" class="input" name="fullName" [(ngModel)]="fullName" required maxlength="120" autocomplete="name">
        </div>
        @if (email) {
          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" [value]="email" disabled>
          </div>
        }
        <div class="field">
          <label for="whatsapp">Numéro WhatsApp</label>
          <input id="whatsapp" class="input" type="tel" name="whatsapp" [(ngModel)]="whatsapp" placeholder="+216 98 123 456"
                 pattern="^[+0-9 ]{8,20}$" autocomplete="tel">
          <span class="muted small">Les acheteurs t'écriront directement sur WhatsApp. Laisse vide si c'est le même que ton téléphone.</span>
        </div>
        <div class="field">
          <label for="fb">Lien Facebook ou Messenger (optionnel)</label>
          <input id="fb" class="input" type="url" name="facebookUrl" [(ngModel)]="facebookUrl"
                 placeholder="https://m.me/ton.profil ou https://facebook.com/ta.page">
          <span class="muted small">Affiche un bouton « Messenger » sur tes annonces. Pour le trouver : ouvre Messenger › ta photo › « Partager le lien de ton profil » (ou facebook.com › ton profil, copie l'adresse).</span>
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="phone">Téléphone (appels)</label>
            <input id="phone" class="input" type="tel" name="phone" [(ngModel)]="phone" placeholder="+216" pattern="^[+0-9 ]{8,20}$" autocomplete="tel">
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

      @if (hasPassword) {
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
      }

      @if (isAdmin) {
        <a class="btn btn-primary btn-block" routerLink="/admin">Administration · inscrits</a>
      }
      <button type="button" class="btn btn-ghost btn-block logout" (click)="logout()">
        <fr-icon name="logout" [size]="18" />Se déconnecter
      </button>
      <button type="button" class="link-danger" (click)="deleteAccount()">Supprimer mon compte et mes annonces</button>
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .shortcuts { display: flex; gap: 8px; flex-wrap: wrap; }
    .shortcuts .chip { color: var(--ink-2); }
    .count { background: var(--danger); color: var(--white); border-radius: 999px; font-size: 11px; padding: 1px 6px; }
    .h1 { font-size: 24px; }
    .form { gap: 14px; padding: 18px; }
    .logout { color: var(--ink-2); }
    .avatar { width: 52px; height: 52px; border-radius: 18px; object-fit: cover; flex-shrink: 0; }
    .initial { background: var(--lime); color: var(--forest); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 22px; text-transform: uppercase; }
    .link-danger { border: 0; background: none; color: var(--danger); font-size: 13px; font-weight: 600; cursor: pointer; padding: 8px; align-self: center; }
  `,
})
export class ProfilePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @Input() set bienvenue(value: string | undefined) {
    this.welcome = value === '1';
  }
  get bienvenue(): boolean {
    return this.welcome;
  }
  @Input() retour?: string;
  private welcome = false;

  readonly cities = CITIES;
  whatsapp = '';
  facebookUrl = '';
  avatarUrl: string | null = null;
  facebookLinked = false;
  hasPassword = false;
  isAdmin = false;
  sellerType: SellerType = 'PARTICULIER';
  shopName = '';
  address = '';
  openingHours = '';
  bio = '';
  readonly notif = inject(NotifService);
  readonly userId = computed(() => this.auth.user()?.id ?? null);
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
      this.address = user.address ?? '';
      this.openingHours = user.openingHours ?? '';
      this.bio = user.bio ?? '';
      this.fullName = user.fullName;
      this.email = user.email ?? '';
      this.phone = user.phone ?? '';
      this.whatsapp = user.whatsapp ?? '';
      this.facebookUrl = user.facebookUrl ?? '';
      this.avatarUrl = user.avatarUrl ?? null;
      this.facebookLinked = user.facebookLinked;
      this.hasPassword = user.hasPassword;
      this.isAdmin = user.role === 'ADMIN';
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
        whatsapp: this.whatsapp || undefined,
        facebookUrl: this.facebookUrl || undefined,
        city: this.city,
        sellerType: this.sellerType,
        shopName: this.sellerType === 'PRO' ? this.shopName : undefined,
        address: this.sellerType === 'PRO' ? this.address || undefined : undefined,
        openingHours: this.sellerType === 'PRO' ? this.openingHours || undefined : undefined,
        bio: this.bio || undefined,
      })
      .subscribe({
        next: (user) => {
          this.auth.setUser(user);
          this.profileMessage.set('Profil mis à jour.');
          this.savingProfile.set(false);
          if (this.welcome && user.hasContact) {
            this.router.navigateByUrl(this.retour && this.retour !== '/' ? safeReturn(this.retour) : '/vendre');
          }
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

  deleteAccount(): void {
    if (!confirm('Supprimer ton compte ? Toutes tes annonces seront retirées. Cette action est définitive.')) {
      return;
    }
    this.auth.deleteAccount().subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigateByUrl('/');
      },
      error: (e) => this.profileError.set(errorMessage(e)),
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
