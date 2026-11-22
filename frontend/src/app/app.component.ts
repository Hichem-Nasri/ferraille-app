import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SITE_NAME, SeoService } from './core/seo.service';

@Component({
  selector: 'fr-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="app-shell"><router-outlet /></div>`,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        const title = route.data['title'] as string | undefined;
        if (title) {
          this.seo.set({ title: `${title} | ${SITE_NAME}`, noindex: route.data['noindex'] === true });
        }
      });
  }
}
