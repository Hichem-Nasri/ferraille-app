import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'fr-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="app-shell"><router-outlet /></div>`,
})
export class AppComponent {}
