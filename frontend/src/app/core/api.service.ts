import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Carrier,
  CarrierOption,
  CheckoutQuote,
  CreateOrderRequest,
  ListingDetail,
  ListingFilter,
  ListingRequest,
  ListingSummary,
  OrderDetail,
  OrderSummary,
  Page,
  PaymentMethod,
  PayoutMethod,
  SellerQuote,
  WalletSummary,
  WalletTransaction,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  searchListings(filter: ListingFilter): Observable<Page<ListingSummary>> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Page<ListingSummary>>('/api/listings', { params });
  }

  listing(id: number): Observable<ListingDetail> {
    return this.http.get<ListingDetail>(`/api/listings/${id}`);
  }

  myListings(): Observable<Page<ListingSummary>> {
    return this.http.get<Page<ListingSummary>>('/api/listings/mine');
  }

  createListing(request: ListingRequest): Observable<ListingDetail> {
    return this.http.post<ListingDetail>('/api/listings', request);
  }

  archiveListing(id: number): Observable<void> {
    return this.http.delete<void>(`/api/listings/${id}`);
  }

  uploadPhotos(files: File[]): Observable<string[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return this.http.post<{ urls: string[] }>('/api/uploads', form).pipe(map((r) => r.urls));
  }

  shippingOptions(): Observable<CarrierOption[]> {
    return this.http.get<CarrierOption[]>('/api/shipping/options');
  }

  sellerQuote(price: number): Observable<SellerQuote> {
    return this.http.get<SellerQuote>('/api/pricing/seller', { params: { price } });
  }

  checkoutQuote(listingId: number, carrier: Carrier, paymentMethod: PaymentMethod): Observable<CheckoutQuote> {
    return this.http.get<CheckoutQuote>('/api/pricing/checkout', { params: { listingId, carrier, paymentMethod } });
  }

  createOrder(request: CreateOrderRequest): Observable<OrderDetail> {
    return this.http.post<OrderDetail>('/api/orders', request);
  }

  orders(role: 'buyer' | 'seller'): Observable<Page<OrderSummary>> {
    return this.http.get<Page<OrderSummary>>('/api/orders', { params: { role } });
  }

  order(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`/api/orders/${id}`);
  }

  orderAction(id: number, action: 'ship' | 'confirm' | 'cancel'): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(`/api/orders/${id}/${action}`, {});
  }

  dispute(id: number, reason: string): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(`/api/orders/${id}/dispute`, { reason });
  }

  wallet(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>('/api/wallet');
  }

  requestPayout(amount: number, method: PayoutMethod, destination: string): Observable<WalletTransaction> {
    return this.http.post<WalletTransaction>('/api/wallet/payouts', { amount, method, destination });
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Connexion impossible. Vérifie ta connexion internet.';
    }
    const body = error.error as { message?: string; fields?: Record<string, string> } | null;
    if (body?.fields) {
      const first = Object.values(body.fields)[0];
      if (first) {
        return `${body.message ?? 'Erreur'} : ${first}`;
      }
    }
    if (body?.message) {
      return body.message;
    }
  }
  return 'Une erreur est survenue. Réessaie.';
}
