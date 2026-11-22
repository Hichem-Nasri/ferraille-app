import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'fr-part-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: inline-flex; line-height: 0; }'],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 64 64" fill="none" stroke="currentColor"
         [attr.stroke-width]="stroke" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name) {
        @case ('engine') { <svg:rect x="10" y="20" width="40" height="26" rx="3"/><svg:path d="M50 28h6v10h-6M18 20v-6h16v6M18 46v6M42 46v6"/> }
        @case ('headlight') { <svg:path d="M8 40c0-12 10-22 26-22h18c4 0 6 3 6 7v8c0 4-2 7-6 7z"/><svg:circle cx="40" cy="31" r="6"/><svg:path d="M14 40h20"/> }
        @case ('wheel') { <svg:circle cx="32" cy="32" r="24"/><svg:circle cx="32" cy="32" r="16"/><svg:circle cx="32" cy="32" r="4"/><svg:path d="M32 16v12M32 36v12M16 32h12M36 32h12"/> }
        @case ('door') { <svg:path d="M14 10h26l12 14v30H14z"/><svg:path d="M14 26h38M38 36h8"/> }
        @case ('bolt') { <svg:path d="M36 6 16 36h14l-4 22 22-32H34z"/> }
        @case ('disc') { <svg:circle cx="32" cy="32" r="22"/><svg:circle cx="32" cy="32" r="8"/><svg:path d="M50 18c4 4 6 9 6 14"/> }
        @case ('gear') { <svg:circle cx="32" cy="32" r="18"/><svg:circle cx="32" cy="32" r="8"/><svg:path d="M32 6v8M32 50v8M6 32h8M50 32h8"/> }
        @case ('seat') { <svg:path d="M22 8h14l-2 30H22z"/><svg:path d="M16 40h30l4 12H14z"/> }
        @default { <svg:path d="M56 20 32 8 8 20v24l24 12 24-12z"/><svg:path d="M8 20l24 12 24-12M32 32v24"/> }
      }
    </svg>
  `,
})
export class PartIconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 48;
  @Input() stroke = 2.5;
}
