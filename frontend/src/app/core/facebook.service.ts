import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

interface FacebookAuthResponse {
  accessToken: string;
}

interface FacebookLoginResponse {
  status: string;
  authResponse?: FacebookAuthResponse;
}

interface FacebookSdk {
  init(params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }): void;
  login(callback: (response: FacebookLoginResponse) => void, options?: { scope: string }): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

@Injectable({ providedIn: 'root' })
export class FacebookService {
  private readonly document = inject(DOCUMENT);
  private ready: Promise<FacebookSdk> | null = null;

  load(appId: string): Promise<FacebookSdk> {
    if (this.ready) {
      return this.ready;
    }
    this.ready = new Promise<FacebookSdk>((resolve, reject) => {
      const win = this.document.defaultView as Window;
      win.fbAsyncInit = () => {
        win.FB!.init({ appId, cookie: false, xfbml: false, version: 'v19.0' });
        resolve(win.FB!);
      };
      const script = this.document.createElement('script');
      script.src = 'https://connect.facebook.net/fr_FR/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onerror = () => {
        this.ready = null;
        reject(new Error('Impossible de charger Facebook. Vérifie ta connexion ou désactive le bloqueur de publicités.'));
      };
      this.document.body.appendChild(script);
    });
    return this.ready;
  }

  async login(appId: string): Promise<string> {
    const sdk = await this.load(appId);
    return new Promise<string>((resolve, reject) => {
      sdk.login(
        (response) => {
          if (response.status === 'connected' && response.authResponse?.accessToken) {
            resolve(response.authResponse.accessToken);
          } else {
            reject(new Error('Connexion Facebook annulée.'));
          }
        },
        { scope: 'public_profile,email' },
      );
    });
  }
}
