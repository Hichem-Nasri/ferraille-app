import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AlertCounts,
  CasseCard,
  PartRequest,
  PartRequestCreate,
  Review,
  SavedSearch,
  SavedSearchCreate,
  SellerProfile,
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
  SellerType,
  User,
  WalletSummary,
  WalletTransaction,
} from './models';

export interface ProfileUpdate {
  fullName: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  city?: string;
  sellerType: SellerType;
  shopName?: string;
  address?: string;
  openingHours?: string;
  bio?: string;
}

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

  markSold(id: number, viaFerraille: boolean | null): Observable<void> {
    return this.http.post<void>(`/api/listings/${id}/sold`, { viaFerraille });
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

  createListingsBulk(listings: ListingRequest[]): Observable<ListingDetail[]> {
    return this.http.post<ListingDetail[]>('/api/listings/bulk', { listings });
  }

  requests(filter: { make?: string; model?: string; city?: string; page?: number } = {}): Observable<Page<PartRequest>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<Page<PartRequest>>('/api/requests', { params });
  }

  requestsForMe(): Observable<PartRequest[]> {
    return this.http.get<PartRequest[]>('/api/requests/for-me');
  }

  myRequests(): Observable<Page<PartRequest>> {
    return this.http.get<Page<PartRequest>>('/api/requests/mine');
  }

  createRequest(body: PartRequestCreate): Observable<PartRequest> {
    return this.http.post<PartRequest>('/api/requests', body);
  }

  closeRequest(id: number): Observable<void> {
    return this.http.post<void>(`/api/requests/${id}/close`, {});
  }

  seller(id: number): Observable<SellerProfile> {
    return this.http.get<SellerProfile>(`/api/sellers/${id}`);
  }

  reviews(sellerId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`/api/sellers/${sellerId}/reviews`);
  }

  review(sellerId: number, rating: number, comment: string): Observable<Review> {
    return this.http.post<Review>(`/api/sellers/${sellerId}/reviews`, { rating, comment });
  }

  casses(city?: string): Observable<CasseCard[]> {
    const params = city ? new HttpParams().set('city', city) : undefined;
    return this.http.get<CasseCard[]>('/api/casses', { params });
  }

  alerts(): Observable<SavedSearch[]> {
    return this.http.get<SavedSearch[]>('/api/alerts');
  }

  alertCounts(): Observable<AlertCounts> {
    return this.http.get<AlertCounts>('/api/alerts/count');
  }

  createAlert(body: SavedSearchCreate): Observable<SavedSearch> {
    return this.http.post<SavedSearch>('/api/alerts', body);
  }

  alertSeen(id: number): Observable<void> {
    return this.http.post<void>(`/api/alerts/${id}/seen`, {});
  }

  deleteAlert(id: number): Observable<void> {
    return this.http.delete<void>(`/api/alerts/${id}`);
  }

  adminToggleVerified(userId: number): Observable<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>(`/api/admin/users/${userId}/verified`, {});
  }

  adminToggleFeatured(listingId: number): Observable<{ featured: boolean }> {
    return this.http.post<{ featured: boolean }>(`/api/admin/listings/${listingId}/featured`, {});
  }

  adminArchive(listingId: number): Observable<void> {
    return this.http.post<void>(`/api/admin/listings/${listingId}/archive`, {});
  }

  recordContact(id: number): Observable<void> {
    return this.http.post<void>(`/api/listings/${id}/contact`, {});
  }

  paymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>('/api/pricing/payment-methods');
  }

  deliveryStatus(id: number, status: 'IN_TRANSIT' | 'DELIVERED'): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(`/api/orders/${id}/delivery-status`, { status });
  }

  updateProfile(profile: ProfileUpdate): Observable<User> {
    return this.http.put<User>('/api/me', profile);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>('/api/me/password', { currentPassword, newPassword });
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
