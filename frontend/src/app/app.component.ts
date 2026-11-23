import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
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
  private readonly auth = inject(AuthService);
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
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1].split('#')[0] : '');
    const src = params.get('src') ?? params.get('utm_source');
    if (src) {
      sessionStorage.setItem('ferraille.src', src);
    }
    if (this.auth.user()?.role === 'ADMIN') {
      localStorage.setItem('ferraille.noTrack', '1');
    }
    if (path.startsWith('/admin') || localStorage.getItem('ferraille.noTrack') === '1') {
      return;
    }
    const referrer = this.firstVisit ? document.referrer : '';
    this.firstVisit = false;
    const source = sessionStorage.getItem('ferraille.src') ?? undefined;
    this.http.post('/api/visits', { path, referrer, source }).subscribe({ error: () => undefined });
  }
}
