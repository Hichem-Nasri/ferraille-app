import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent } from './icon.component';
import { PartIconComponent } from './part-icon.component';

@Component({
  selector: 'fr-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="inner">
        <a class="brand" routerLink="/" aria-label="Ferraille, accueil">
          <span class="logo"><fr-part-icon name="gear" [size]="22" [stroke]="5" /></span>
          <span class="wordmark">ferraille</span>
        </a>
        <nav aria-label="Navigation principale">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Pièces</a>
          @if (groupUrl()) {
            <a [href]="groupUrl()" target="_blank" rel="noopener">Groupe Facebook</a>
          }
          @if (auth.isLoggedIn()) {
            <a routerLink="/mes-annonces" routerLinkActive="active">Mes annonces</a>
            <a routerLink="/profil" routerLinkActive="active" class="profile">
              @if (auth.user()?.avatarUrl) {
                <img class="mini-avatar" [src]="auth.user()?.avatarUrl" alt="" width="24" height="24">
              } @else {
                <fr-icon name="user" [size]="18" />
              }
              {{ auth.user()?.displayName }}
            </a>
          } @else {
            <a routerLink="/connexion" routerLinkActive="active">Connexion</a>
          }
          <a class="btn btn-lime sell" routerLink="/vendre"><fr-icon name="plus" [size]="18" [stroke]="2.6" />Vendre une pièce</a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    :host { display: none; }
    @media (min-width: 900px) { :host { display: block; position: sticky; top: 0; z-index: 30; } }
    .bar { background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
    .inner { max-width: 1240px; margin: 0 auto; padding: 0 32px; height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--ink); }
    .logo { width: 38px; height: 38px; border-radius: 12px; background: var(--forest); color: var(--lime); display: flex; align-items: center; justify-content: center; }
    .wordmark { font-family: var(--display); font-weight: 700; font-size: 22px; letter-spacing: -0.5px; }
    nav { display: flex; align-items: center; gap: 6px; }
    nav a:not(.btn) { padding: 10px 14px; border-radius: 12px; color: var(--ink-2); font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    nav a:not(.btn):hover { background: var(--ground); color: var(--ink); }
    nav a.active { color: var(--green); background: var(--green-soft); }
    .sell { height: 44px; font-size: 14px; margin-left: 8px; }
    .mini-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
  `,
})
export class TopNavComponent {
  readonly auth = inject(AuthService);
  readonly groupUrl = signal<string | null>(null);

  constructor() {
    this.auth.config().subscribe({ next: (c) => this.groupUrl.set(c.facebookGroupUrl ?? null), error: () => undefined });
  }
}
