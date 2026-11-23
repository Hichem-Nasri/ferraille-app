import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AlertCounts } from './models';

@Injectable({ providedIn: 'root' })
export class NotifService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private lastFetch = 0;

  readonly counts = signal<AlertCounts>({ newListings: 0, matchingRequests: 0 });
  readonly total = computed(() => this.counts().newListings + this.counts().matchingRequests);

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.refresh());
    effect(() => {
      if (!this.auth.isLoggedIn()) {
        this.counts.set({ newListings: 0, matchingRequests: 0 });
        this.lastFetch = 0;
      }
    }, { allowSignalWrites: true });
  }

  refresh(force = false): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    const now = Date.now();
    if (!force && now - this.lastFetch < 60_000) {
      return;
    }
    this.lastFetch = now;
    this.api.alertCounts().subscribe({ next: (c) => this.counts.set(c), error: () => undefined });
  }
}
