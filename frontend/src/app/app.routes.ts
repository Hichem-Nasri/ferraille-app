import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'pieces/:categorie', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'piece/:id/:slug', loadComponent: () => import('./pages/listing-detail.page').then((m) => m.ListingDetailPage) },
  { path: 'piece/:id', loadComponent: () => import('./pages/listing-detail.page').then((m) => m.ListingDetailPage) },
  { path: 'connexion', data: { title: "Connexion", noindex: true }, loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
  { path: 'inscription', data: { title: "Créer un compte", noindex: true }, loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage) },
  { path: 'vendre', data: { title: "Vendre une pièce", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/sell.page').then((m) => m.SellPage) },
  { path: 'acheter/:id', data: { title: "Finaliser l'achat", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage) },
  { path: 'commandes', data: { title: "Mes commandes", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/orders.page').then((m) => m.OrdersPage) },
  { path: 'commandes/:id', data: { title: "Suivi de commande", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/order.page').then((m) => m.OrderPage) },
  { path: 'mes-annonces', data: { title: "Mes annonces", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/my-listings.page').then((m) => m.MyListingsPage) },
  { path: 'portefeuille', data: { title: "Mon portefeuille", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/wallet.page').then((m) => m.WalletPage) },
  { path: '**', redirectTo: '' },
];
