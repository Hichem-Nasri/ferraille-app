import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'product';
  noindex?: boolean;
  jsonLd?: object[];
}

export const SITE_NAME = 'Ferraille';
export const DEFAULT_DESCRIPTION =
  "Pièces détachées auto d'occasion en Tunisie : moteurs, phares, jantes, carrosserie, alternateurs. Particuliers et casses, livraison Aramex et La Poste, paiement protégé.";

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  get origin(): string {
    return this.document.location?.origin ?? '';
  }

  set(data: SeoData): void {
    const description = truncate(data.description ?? DEFAULT_DESCRIPTION, 160);
    const url = this.origin + (data.path ?? this.document.location.pathname);
    const image = this.absolute(data.image ?? '/og-image.png');

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: data.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' });
    this.meta.updateTag({ property: 'og:type', content: data.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.setCanonical(data.noindex ? null : url);
    this.setJsonLd(data.jsonLd ?? []);
  }

  absolute(url: string): string {
    return /^https?:\/\//.test(url) ? url : this.origin + url;
  }

  private setCanonical(url: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(items: object[]): void {
    this.document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    items.forEach((item) => {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify({ '@context': 'https://schema.org', ...item });
      this.document.head.appendChild(script);
    });
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}
