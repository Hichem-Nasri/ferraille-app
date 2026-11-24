export type Category =
  | 'MOTEUR'
  | 'CARROSSERIE'
  | 'ECLAIRAGE'
  | 'JANTES_PNEUS'
  | 'ELECTRICITE'
  | 'INTERIEUR'
  | 'FREINAGE'
  | 'TRANSMISSION'
  | 'AUTRE';

export type PartCondition = 'NEUF' | 'TRES_BON' | 'BON' | 'POUR_PIECES';
export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'SOLD' | 'ARCHIVED';
export type SellerType = 'PARTICULIER' | 'PRO';
export type Carrier = 'ARAMEX' | 'LA_POSTE';
export type PaymentMethod = 'CARTE' | 'D17' | 'A_LA_LIVRAISON';
export type OrderStatus =
  | 'PAID'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';
export type TxType = 'SALE' | 'PAYOUT';
export type TxStatus = 'PENDING' | 'AVAILABLE' | 'CANCELLED' | 'REQUESTED' | 'PAID';
export type PayoutMethod = 'RIB' | 'D17';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface User {
  id: number;
  fullName: string;
  displayName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  avatarUrl?: string;
  facebookLinked: boolean;
  hasPassword: boolean;
  hasContact: boolean;
  city?: string;
  role: 'USER' | 'ADMIN';
  sellerType: SellerType;
  shopName?: string;
  verified: boolean;
  address?: string;
  openingHours?: string;
  bio?: string;
}

export interface AuthConfig {
  facebookAppId?: string;
  facebookGroupUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VehicleFit {
  make: string;
  model: string;
  yearFrom?: number | null;
  yearTo?: number | null;
}

export interface ListingSummary {
  id: number;
  slug: string;
  title: string;
  price: number | null;
  category: Category;
  condition: PartCondition;
  city: string;
  coverPhoto?: string;
  sellerType: SellerType;
  fitsLabel?: string;
  status: ListingStatus;
  views: number;
  contactClicks: number;
  featured: boolean;
  sellerVerified: boolean;
  sellerId: number;
  createdAt: string;
}

export interface SellerSummary {
  id: number;
  displayName: string;
  sellerType: SellerType;
  verified: boolean;
  city?: string;
  listingsCount: number;
  avatarUrl?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  memberSince?: string;
}

export interface ListingDetail {
  id: number;
  slug: string;
  title: string;
  description?: string;
  price: number | null;
  negotiable: boolean;
  category: Category;
  condition: PartCondition;
  city: string;
  oemReference?: string;
  status: ListingStatus;
  views: number;
  photos: string[];
  fits: VehicleFit[];
  seller: SellerSummary;
  featured: boolean;
  createdAt: string;
}

export interface ListingRequest {
  title: string;
  description?: string;
  category: Category;
  condition: PartCondition;
  price: number | null;
  negotiable: boolean;
  city: string;
  oemReference?: string;
  photos: string[];
  fits: VehicleFit[];
}

export interface ListingFilter {
  q?: string;
  category?: Category;
  condition?: PartCondition;
  make?: string;
  model?: string;
  year?: number;
  city?: string;
  sellerId?: number;
  proOnly?: boolean;
  sort?: 'recent' | 'price_asc' | 'price_desc';
  page?: number;
  size?: number;
}

export interface CarrierOption {
  carrier: Carrier;
  label: string;
  fee: number;
  minDays: number;
  maxDays: number;
}

export interface SellerQuote {
  price: number;
  commissionRate: number;
  commission: number;
  sellerNet: number;
}

export interface CheckoutQuote {
  itemPrice: number;
  shippingFee: number;
  protectionFee: number;
  codFee: number;
  total: number;
  commission: number;
  sellerNet: number;
}

export interface CreateOrderRequest {
  listingId: number;
  carrier: Carrier;
  paymentMethod: PaymentMethod;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
}

export interface OrderEvent {
  status: OrderStatus;
  label: string;
  location?: string;
  createdAt: string;
}

export interface OrderSummary {
  id: number;
  reference: string;
  listingId: number;
  listingTitle: string;
  coverPhoto?: string;
  total: number;
  sellerNet: number;
  status: OrderStatus;
  carrier: Carrier;
  counterpart: string;
  createdAt: string;
}

export interface OrderDetail {
  id: number;
  reference: string;
  listingId: number;
  listingTitle: string;
  coverPhoto?: string;
  sellerName: string;
  sellerCity: string;
  buyerName: string;
  carrier: Carrier;
  carrierLabel: string;
  paymentMethod: PaymentMethod;
  itemPrice: number;
  shippingFee: number;
  protectionFee: number;
  codFee: number;
  total: number;
  commission?: number;
  sellerNet?: number;
  status: OrderStatus;
  trackingNumber?: string;
  shipFullName?: string;
  shipPhone?: string;
  shipAddress?: string;
  shipCity: string;
  shipPostalCode?: string;
  createdAt: string;
  deliveredAt?: string;
  autoConfirmAt?: string;
  viewerIsBuyer: boolean;
  viewerIsSeller: boolean;
  events: OrderEvent[];
}

export interface WalletTransaction {
  id: number;
  type: TxType;
  status: TxStatus;
  amount: number;
  commission: number;
  label: string;
  orderReference?: string;
  payoutMethod?: PayoutMethod;
  createdAt: string;
}

export interface WalletSummary {
  available: number;
  pending: number;
  salesCount: number;
  activeListings: number;
  totalViews: number;
  recent: WalletTransaction[];
}

export interface ApiError {
  status: number;
  message: string;
  fields?: Record<string, string>;
}

export interface PartRequest {
  id: number;
  make: string;
  model: string;
  year?: number | null;
  category?: Category | null;
  description: string;
  city?: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  author: { id: number; displayName: string; avatarUrl?: string; phone?: string; whatsapp?: string; facebookUrl?: string };
  mine: boolean;
}

export interface PartRequestCreate {
  make: string;
  model: string;
  year?: number | null;
  category?: Category | null;
  description: string;
  city?: string;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export interface SellerProfile {
  id: number;
  displayName: string;
  sellerType: SellerType;
  verified: boolean;
  city?: string;
  address?: string;
  openingHours?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  memberSince?: string;
  listingsCount: number;
  rating: number | null;
  reviewsCount: number;
}

export interface CasseCard {
  id: number;
  displayName: string;
  verified: boolean;
  city?: string;
  address?: string;
  openingHours?: string;
  avatarUrl?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  listingsCount: number;
  rating: number | null;
  reviewsCount: number;
}

export interface SavedSearch {
  id: number;
  label: string;
  q?: string;
  category?: Category | null;
  make?: string;
  model?: string;
  year?: number | null;
  city?: string;
  newCount: number;
  createdAt: string;
}

export interface SavedSearchCreate {
  q?: string;
  category?: Category | null;
  make?: string;
  model?: string;
  year?: number | null;
  city?: string;
}

export interface AlertCounts {
  newListings: number;
  matchingRequests: number;
}

export interface VehicleEntry {
  make: string;
  model: string | null;
  makeSlug: string;
  modelSlug: string | null;
  count: number;
}
