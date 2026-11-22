import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="icon-btn" routerLink="/" aria-label="Retour"><fr-icon name="chevron-left" /></a>
      <div class="stack">
        <h1 class="h1">Content de te revoir</h1>
        <span class="muted">Connecte-toi pour acheter, vendre et suivre tes commandes.</span>
      </div>
      <form class="stack form" (ngSubmit)="submit()" #f="ngForm">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email">
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="current-password">
        </div>
        @if (error()) { <div class="error">{{ error() }}</div> }
        <button type="submit" class="btn btn-primary btn-block" [disabled]="f.invalid || loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
      <span class="muted center">Pas encore de compte ? <a routerLink="/inscription" [queryParams]="{ retour: retour }">Créer un compte</a></span>
    </div>
  `,
  styles: `
    .h1 { font-size: 28px; margin-bottom: 6px; }
    .form { gap: 14px; }
    .center { text-align: center; }
  `,
})
export class LoginPage {
  @Input() retour?: string;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl(safeReturn(this.retour)),
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
}

export function safeReturn(url?: string): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
