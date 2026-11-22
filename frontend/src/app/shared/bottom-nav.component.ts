import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from './icon.component';

@Component({
  selector: 'fr-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Navigation principale">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <fr-icon name="home" [size]="24" />Accueil
      </a>
      <a routerLink="/commandes" routerLinkActive="active">
        <fr-icon name="box" [size]="24" />Commandes
      </a>
      <a routerLink="/vendre" class="sell" aria-label="Vendre une pièce">
        <fr-icon name="plus" [size]="26" [stroke]="2.6" />
      </a>
      <a routerLink="/mes-annonces" routerLinkActive="active">
        <fr-icon name="list" [size]="24" />Annonces
      </a>
      <a routerLink="/portefeuille" routerLinkActive="active">
        <fr-icon name="user" [size]="24" />Profil
      </a>
    </nav>
  `,
  styles: `
    @media (min-width: 900px) { :host { display: none; } }
    nav {
      position: fixed; left: 50%; transform: translateX(-50%); bottom: 0; width: 100%;
      height: calc(78px + env(safe-area-inset-bottom)); background: var(--white); border-top: 1px solid var(--line);
      display: flex; align-items: flex-start; justify-content: space-around; padding-top: 10px; z-index: 20;
    }
    a {
      width: 68px; display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: var(--muted); font-size: 11px; font-weight: 600;
    }
    a.active { color: var(--green); font-weight: 700; }
    .sell {
      width: 56px; height: 56px; margin-top: -26px; border-radius: 20px; background: var(--lime);
      color: var(--forest); justify-content: center; box-shadow: 0 8px 20px rgba(14, 59, 46, 0.25);
    }
  `,
})
export class BottomNavComponent {}
