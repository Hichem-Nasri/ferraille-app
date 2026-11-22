import { Category, OrderStatus, PartCondition, PaymentMethod } from './models';

export interface CategoryMeta {
  value: Category;
  label: string;
  icon: string;
  tint: string;
  tone: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { value: 'MOTEUR', label: 'Moteur', icon: 'engine', tint: '#F1ECE2', tone: '#7A5A1F' },
  { value: 'ECLAIRAGE', label: 'Éclairage', icon: 'headlight', tint: '#E3F3E8', tone: '#0F7A45' },
  { value: 'JANTES_PNEUS', label: 'Jantes', icon: 'wheel', tint: '#EDEFE4', tone: '#4D6B2B' },
  { value: 'CARROSSERIE', label: 'Carrosserie', icon: 'door', tint: '#E4EEF0', tone: '#2B5F6B' },
  { value: 'ELECTRICITE', label: 'Électricité', icon: 'bolt', tint: '#FFF6DB', tone: '#8A6100' },
  { value: 'FREINAGE', label: 'Freinage', icon: 'disc', tint: '#FDECEC', tone: '#A3352B' },
  { value: 'TRANSMISSION', label: 'Transmission', icon: 'gear', tint: '#EDE9F5', tone: '#5A4A8A' },
  { value: 'INTERIEUR', label: 'Intérieur', icon: 'seat', tint: '#F0EDE8', tone: '#6B5B45' },
  { value: 'AUTRE', label: 'Autre', icon: 'box', tint: '#ECEFEA', tone: '#3B4A43' },
];

export const CONDITIONS: { value: PartCondition; label: string }[] = [
  { value: 'NEUF', label: 'Neuf' },
  { value: 'TRES_BON', label: 'Très bon' },
  { value: 'BON', label: 'Bon' },
  { value: 'POUR_PIECES', label: 'Pour pièces' },
];

export const CITIES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Bizerte', 'Sousse', 'Monastir', 'Mahdia',
  'Sfax', 'Kairouan', 'Gabès', 'Médenine', 'Djerba', 'Gafsa', 'Kasserine', 'Sidi Bouzid', 'Béja',
  'Jendouba', 'Le Kef', 'Siliana', 'Zaghouan', 'Tozeur', 'Kébili', 'Tataouine',
];

export const MAKES = [
  'Peugeot', 'Renault', 'Citroën', 'Volkswagen', 'Kia', 'Hyundai', 'Fiat', 'Toyota', 'Dacia',
  'Seat', 'Skoda', 'Ford', 'Opel', 'Nissan', 'Suzuki', 'Chery', 'Isuzu', 'Mitsubishi', 'Mercedes', 'BMW', 'Audi',
];

export function categoryMeta(value: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function conditionLabel(value: PartCondition): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CARTE: 'Carte',
  D17: 'D17',
  A_LA_LIVRAISON: 'À la livraison',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PAID: 'À expédier',
  SHIPPED: 'Expédiée',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livrée',
  COMPLETED: 'Terminée',
  DISPUTED: 'Litige',
  REFUNDED: 'Remboursée',
  CANCELLED: 'Annulée',
};
