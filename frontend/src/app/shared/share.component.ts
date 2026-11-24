import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'fr-share',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="share">
      <a class="sbtn wa" [href]="whatsapp()" target="_blank" rel="noopener" aria-label="Partager sur WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.05 21.5a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42 2.52 0 4.88.98 6.66 2.76a9.36 9.36 0 0 1 2.76 6.67c0 5.2-4.23 9.42-9.42 9.42zm8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.08c0 2 .52 3.95 1.52 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47c6.25 0 11.33-5.08 11.33-11.33 0-3.03-1.18-5.87-3.32-8.01z"/></svg>
        WhatsApp
      </a>
      <a class="sbtn fb" [href]="facebook()" target="_blank" rel="noopener" aria-label="Partager sur Facebook">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21z"/></svg>
        Facebook
      </a>
      @if (canNativeShare) {
        <button type="button" class="sbtn" (click)="nativeShare()" aria-label="Plus d'options de partage"><fr-icon name="share" [size]="18" />Plus</button>
      }
      <button type="button" class="sbtn" (click)="copy()" aria-label="Copier le lien">
        <fr-icon [name]="copied() ? 'check' : 'link'" [size]="18" />{{ copied() ? 'Copié' : 'Lien' }}
      </button>
    </div>
  `,
  styles: `
    .share { display: flex; gap: 8px; flex-wrap: wrap; }
    .sbtn { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 12px; border: 1.5px solid var(--line); background: var(--white); color: var(--ink-2); font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: none; }
    .sbtn.wa { background: #25d366; border-color: #25d366; color: var(--white); }
    .sbtn.fb { background: #1877f2; border-color: #1877f2; color: var(--white); }
  `,
})
export class ShareComponent {
  @Input({ required: true }) url = '';
  @Input() text = '';
  @Input() src = 'partage';

  readonly copied = signal(false);
  readonly canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  private link(channel: string): string {
    const base = this.url.startsWith('http') ? this.url : `${location.origin}${this.url}`;
    return `${base}${base.includes('?') ? '&' : '?'}src=${this.src}-${channel}`;
  }

  whatsapp(): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.text}\n${this.link('wa')}`)}`;
  }

  facebook(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.link('fb'))}`;
  }

  nativeShare(): void {
    navigator.share({ text: this.text, url: this.link('app') }).catch(() => undefined);
  }

  copy(): void {
    navigator.clipboard?.writeText(this.link('lien')).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => undefined,
    );
  }
}
