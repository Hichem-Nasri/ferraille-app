import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FacebookService } from '../core/facebook.service';
import { AuthResponse } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { PartIconComponent } from '../shared/part-icon.component';

@Component({
  selector: 'fr-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="icon-btn" routerLink="/" aria-label="Retour"><fr-icon name="chevron-left" /></a>
      <div class="hero">
        <span class="logo"><fr-part-icon name="gear" [size]="34" [stroke]="5" /></span>
        <h1 class="h1">Bienvenue sur Ferraille</h1>
        <p class="muted lead">Publie tes pièces gratuitement. Les acheteurs te contactent directement sur WhatsApp ou Messenger.</p>
      </div>

      <button type="button" class="btn btn-block facebook" (click)="loginWithFacebook()" [disabled]="loading() || !facebookAppId()">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>
        {{ loading() ? 'Connexion…' : 'Continuer avec Facebook' }}
      </button>
      @if (configLoaded() && !facebookAppId()) {
        <div class="notice warn">La connexion Facebook sera disponible très bientôt. En attendant, utilise ton e-mail.</div>
      }
      <span class="muted small center">Nous ne publions jamais rien sur ton compte Facebook.</span>

      @if (error()) { <div class="error">{{ error() }}</div> }

      @if (!emailOpen()) {
        <button type="button" class="link center" (click)="emailOpen.set(true)">Se connecter avec un e-mail</button>
      } @else {
        <form class="card card-pad stack form" (ngSubmit)="submit()" #f="ngForm">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email">
          </div>
          <div class="field">
            <label for="password">Mot de passe</label>
            <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="f.invalid || loading()">Se connecter</button>
          <span class="muted small center">Pas de Facebook ? <a routerLink="/inscription" [queryParams]="{ retour: retour }">Créer un compte avec un e-mail</a></span>
        </form>
      }

      <span class="muted small center legal">En continuant, tu acceptes que ton nom et ta photo de profil soient affichés sur tes annonces. <a routerLink="/confidentialite">Confidentialité</a></span>
    </div>
  `,
  styles: `
    .hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 12px 0; }
    .logo { width: 64px; height: 64px; border-radius: 20px; background: var(--forest); color: var(--lime); display: flex; align-items: center; justify-content: center; }
    .h1 { font-size: 28px; }
    .lead { font-size: 15px; line-height: 1.5; margin: 0; max-width: 360px; }
    .facebook { background: #1877f2; color: #fff; height: 56px; font-size: 16px; }
    .facebook:hover { color: #fff; background: #166fe5; }
    .center { text-align: center; }
    .link { border: 0; background: none; color: var(--green); font-weight: 600; font-size: 14px; cursor: pointer; padding: 10px; }
    .form { gap: 14px; }
    .notice.warn { background: var(--warn-soft); color: var(--warn); }
    .legal { line-height: 1.5; }
  `,
})
export class LoginPage implements OnInit {
  @Input() retour?: string;

  private readonly auth = inject(AuthService);
  private readonly facebook = inject(FacebookService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly emailOpen = signal(false);
  readonly facebookAppId = signal<string | null>(null);
  readonly configLoaded = signal(false);

  ngOnInit(): void {
    this.auth.config().subscribe({
      next: (config) => {
        this.facebookAppId.set(config.facebookAppId ?? null);
        this.configLoaded.set(true);
        if (config.facebookAppId) {
          this.facebook.load(config.facebookAppId).catch(() => undefined);
        } else {
          this.emailOpen.set(true);
        }
      },
      error: () => {
        this.configLoaded.set(true);
        this.emailOpen.set(true);
      },
    });
  }

  async loginWithFacebook(): Promise<void> {
    const appId = this.facebookAppId();
    if (!appId) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    try {
      const token = await this.facebook.login(appId);
      this.auth.facebookLogin(token).subscribe({
        next: (r) => this.afterLogin(r),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.loading.set(false);
        },
      });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Connexion Facebook impossible.');
      this.loading.set(false);
    }
  }

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: (r) => this.afterLogin(r),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  private afterLogin(response: AuthResponse): void {
    if (!response.user.hasContact) {
      this.router.navigate(['/profil'], { queryParams: { bienvenue: 1, retour: safeReturn(this.retour) } });
      return;
    }
    this.router.navigateByUrl(safeReturn(this.retour));
  }
}

export function safeReturn(url?: string): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
