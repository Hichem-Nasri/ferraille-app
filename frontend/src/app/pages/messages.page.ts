import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { phoneLink, whatsappLink } from '../core/contact';
import { TranslatePipe } from '../core/i18n';
import { InboxMessage } from '../core/models';
import { NotifService } from '../core/notif.service';
import { BottomNavComponent } from '../shared/bottom-nav.component';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'fr-messages-page',
  standalone: true,
  imports: [RouterLink, DatePipe, TranslatePipe, IconComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page wide">
      <div class="stack">
        <h1 class="h1">{{ 'Messages' | t }}</h1>
        <span class="muted">Les acheteurs qui t'écrivent depuis tes annonces. Réponds-leur sur WhatsApp ou par téléphone.</span>
      </div>
      @if (error()) { <div class="error">{{ error() }}</div> }
      @if (loading()) {
        <div class="empty">{{ 'Chargement…' | t }}</div>
      } @else if (messages().length === 0) {
        <div class="empty card">Aucun message pour le moment.<br><a routerLink="/mes-annonces">Voir mes annonces</a></div>
      } @else {
        @for (m of messages(); track m.id) {
          <article class="card card-pad stack msg" [class.unread]="!m.read">
            <div class="row between wrap">
              <span class="strong">{{ m.senderName }}</span>
              <span class="muted small">{{ m.createdAt | date: 'd MMM, HH:mm' }}</span>
            </div>
            <a class="small" [routerLink]="['/piece', m.listingId, m.listingSlug]">{{ m.listingTitle }}</a>
            <p class="body">{{ m.body }}</p>
            <div class="row actions">
              <a class="btn whatsapp grow" [href]="reply(m)" target="_blank" rel="noopener" (click)="markRead(m)">
                <fr-icon name="chat" [size]="18" />Répondre sur WhatsApp
              </a>
              <a class="btn btn-ghost" [href]="call(m.senderPhone)" (click)="markRead(m)" aria-label="Appeler">
                <fr-icon name="phone" [size]="18" />{{ m.senderPhone }}
              </a>
            </div>
          </article>
        }
      }
    </div>
    <fr-bottom-nav />
  `,
  styles: `
    .h1 { font-size: 26px; margin: 0; }
    .msg { gap: 8px; }
    .msg.unread { border-left: 4px solid var(--green); }
    .wrap { flex-wrap: wrap; gap: 6px; }
    .body { margin: 0; white-space: pre-wrap; }
    .actions { gap: 8px; flex-wrap: wrap; }
    .whatsapp { background: #25d366; color: #fff; }
  `,
})
export class MessagesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notif = inject(NotifService);

  readonly messages = signal<InboxMessage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.inbox().subscribe({
      next: (list) => {
        this.messages.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  reply(m: InboxMessage): string {
    return whatsappLink(m.senderPhone, `Bonjour ${m.senderName}, je vous réponds à propos de « ${m.listingTitle} » sur Ferraille.`);
  }

  call(phone: string): string {
    return phoneLink(phone);
  }

  markRead(m: InboxMessage): void {
    if (m.read) {
      return;
    }
    this.api.markMessageRead(m.id).subscribe({
      next: () => {
        this.messages.update((list) => list.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
        this.notif.messages.update((n) => Math.max(0, n - 1));
      },
      error: () => undefined,
    });
  }
}
