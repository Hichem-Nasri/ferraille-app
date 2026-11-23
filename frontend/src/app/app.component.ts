import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SITE_NAME, SeoService } from './core/seo.service';
import { TopNavComponent } from './shared/top-nav.component';

@Component({
  selector: 'fr-root',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent],
  template: `<div class="app-shell"><fr-top-nav /><router-outlet /></div>`,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly http = inject(HttpClient);
  private firstVisit = true;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => {
        this.trackVisit(event.urlAfterRedirects);
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

  private trackVisit(url: string): void {
    const path = url.split(/[?#]/)[0];
    if (path.startsWith('/admin')) {
      return;
    }
    const referrer = this.firstVisit ? document.referrer : '';
    this.firstVisit = false;
    this.http.post('/api/visits', { path, referrer }).subscribe({ error: () => undefined });
  }
}
