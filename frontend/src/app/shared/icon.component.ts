import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'fr-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: inline-flex; line-height: 0; }'],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         [attr.stroke-width]="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name) {
        @case ('search') { <svg:circle cx="11" cy="11" r="7"/><svg:path d="m20 20-3.5-3.5"/> }
        @case ('bell') { <svg:path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><svg:path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/> }
        @case ('home') { <svg:path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/> }
        @case ('plus') { <svg:path d="M12 5v14M5 12h14"/> }
        @case ('chat') { <svg:path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/> }
        @case ('user') { <svg:circle cx="12" cy="8" r="4"/><svg:path d="M4 21a8 8 0 0 1 16 0"/> }
        @case ('heart') { <svg:path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/> }
        @case ('pin') { <svg:path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><svg:circle cx="12" cy="10" r="2.5"/> }
        @case ('truck') { <svg:path d="M3 6h11v10H3z"/><svg:path d="M14 9h4l3 3v4h-7"/><svg:circle cx="7" cy="18" r="2"/><svg:circle cx="17" cy="18" r="2"/> }
        @case ('mail') { <svg:rect x="3" y="5" width="18" height="14" rx="2"/><svg:path d="m3 7 9 6 9-6"/> }
        @case ('shield') { <svg:path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><svg:path d="m9 12 2 2 4-4"/> }
        @case ('filter') { <svg:path d="M4 6h16M7 12h10M10 18h4"/> }
        @case ('chevron-down') { <svg:path d="m6 9 6 6 6-6"/> }
        @case ('chevron-left') { <svg:path d="m15 18-6-6 6-6"/> }
        @case ('chevron-right') { <svg:path d="m9 18 6-6-6-6"/> }
        @case ('check') { <svg:path d="M20 6 9 17l-5-5"/> }
        @case ('check-circle') { <svg:circle cx="12" cy="12" r="10"/><svg:path d="m8 12 3 3 5-6"/> }
        @case ('camera') { <svg:path d="M4 8h3l2-3h6l2 3h3v11H4z"/><svg:circle cx="12" cy="13" r="3.5"/> }
        @case ('wallet') { <svg:path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><svg:path d="M3 7V6a2 2 0 0 1 2-2h11"/><svg:circle cx="16.5" cy="13.5" r="1.2"/> }
        @case ('car') { <svg:path d="M5 13l1.6-4.6A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.4L19 13"/><svg:path d="M3 13h18v4H3z"/><svg:circle cx="7" cy="17.5" r="1.5"/><svg:circle cx="17" cy="17.5" r="1.5"/> }
        @case ('share') { <svg:circle cx="18" cy="5" r="3"/><svg:circle cx="6" cy="12" r="3"/><svg:circle cx="18" cy="19" r="3"/><svg:path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/> }
        @case ('close') { <svg:path d="M6 6l12 12M18 6 6 18"/> }
        @case ('lock') { <svg:rect x="4" y="10" width="16" height="11" rx="2"/><svg:path d="M8 10V7a4 4 0 0 1 8 0v3"/> }
        @case ('card') { <svg:rect x="2" y="5" width="20" height="14" rx="2"/><svg:path d="M2 10h20"/> }
        @case ('phone') { <svg:rect x="6" y="2" width="12" height="20" rx="2"/><svg:path d="M11 18h2"/> }
        @case ('cash') { <svg:rect x="2" y="6" width="20" height="12" rx="2"/><svg:circle cx="12" cy="12" r="2.5"/> }
        @case ('arrow-right') { <svg:path d="M5 12h14M13 6l6 6-6 6"/> }
        @case ('arrow-down') { <svg:path d="M12 5v14M5 12l7 7 7-7"/> }
        @case ('logout') { <svg:path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><svg:path d="m16 17 5-5-5-5M21 12H9"/> }
        @case ('box') { <svg:path d="M21 8 12 3 3 8v8l9 5 9-5z"/><svg:path d="M3 8l9 5 9-5M12 13v8"/> }
        @case ('list') { <svg:path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/> }
        @case ('alert') { <svg:circle cx="12" cy="12" r="10"/><svg:path d="M12 8v4M12 16h.01"/> }
        @default { <svg:circle cx="12" cy="12" r="3"/> }
      }
    </svg>
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 20;
  @Input() stroke = 2;
}
