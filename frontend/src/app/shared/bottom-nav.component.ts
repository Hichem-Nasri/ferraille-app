import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from './icon.component';
import { TranslatePipe } from '../core/i18n';
import { NotifService } from '../core/notif.service';

@Component({
  selector: 'fr-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Navigation principale">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
        <fr-icon name="home" [size]="24" />{{ 'Accueil' | t }}
      </a>
      <a routerLink="/demandes" routerLinkActive="active" class="rel">
        <fr-icon name="list" [size]="24" />{{ 'Demandes' | t }}
        @if (notif.counts().matchingRequests) { <span class="dot">{{ notif.counts().matchingRequests }}</span> }
      </a>
      <a routerLink="/vendre" class="sell" aria-label="Vendre une pièce">
        <fr-icon name="plus" [size]="26" [stroke]="2.6" />
      </a>
      <a routerLink="/casses" routerLinkActive="active">
        <fr-icon name="pin" [size]="24" />{{ 'Casses' | t }}
      </a>
      <a routerLink="/profil" routerLinkActive="active" class="rel">
        <fr-icon name="user" [size]="24" />{{ 'Profil' | t }}
        @if (notif.counts().newListings + notif.messages()) { <span class="dot">{{ notif.counts().newListings + notif.messages() }}</span> }
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
      width: 64px; display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: var(--muted); font-size: 11px; font-weight: 600;
    }
    .rel { position: relative; }
    .dot { position: absolute; top: -4px; right: 12px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--danger); color: var(--white); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    a.active { color: var(--green); font-weight: 700; }
    .sell {
      width: 56px; height: 56px; margin-top: -26px; border-radius: 20px; background: var(--lime);
      color: var(--forest); justify-content: center; box-shadow: 0 8px 20px rgba(14, 59, 46, 0.25);
    }
  `,
})
export class BottomNavComponent {
  readonly notif = inject(NotifService);
}
