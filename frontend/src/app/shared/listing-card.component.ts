import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DinarPipe } from '../core/dinar.pipe';
import { categoryMeta } from '../core/labels';
import { ListingSummary } from '../core/models';
import { PartIconComponent } from './part-icon.component';

@Component({
  selector: 'fr-listing-card',
  standalone: true,
  imports: [RouterLink, DinarPipe, PartIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="card listing" [routerLink]="['/piece', listing.id]">
      <div class="thumb" [style.background]="meta().tint" [style.color]="meta().tone">
        @if (listing.coverPhoto) {
          <img [src]="listing.coverPhoto" [alt]="listing.title" loading="lazy">
        } @else {
          <fr-part-icon [name]="meta().icon" [size]="64" />
        }
        @if (listing.sellerType === 'PRO') {
          <span class="badge pro">PRO</span>
        }
      </div>
      <div class="body">
        <span class="price">{{ listing.price | dinar }}</span>
        <span class="title">{{ listing.title }}</span>
        <span class="meta">{{ subtitle() }}</span>
      </div>
    </a>
  `,
  styles: `
    .listing { display: flex; flex-direction: column; overflow: hidden; color: var(--ink); font-weight: 400; }
    .thumb { height: 128px; position: relative; display: flex; align-items: center; justify-content: center; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .pro { position: absolute; top: 10px; left: 10px; }
    .body { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
    .price { font-size: 18px; }
    .title { font-size: 13px; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class ListingCardComponent {
  private readonly data = signal<ListingSummary | null>(null);

  @Input({ required: true })
  set listing(value: ListingSummary) {
    this.data.set(value);
  }
  get listing(): ListingSummary {
    return this.data()!;
  }

  readonly meta = computed(() => categoryMeta(this.data()!.category));
  readonly subtitle = computed(() => {
    const l = this.data()!;
    return [l.fitsLabel, l.city].filter(Boolean).join(' · ');
  });
}
