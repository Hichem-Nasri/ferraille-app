import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'piece/:id', loadComponent: () => import('./pages/listing-detail.page').then((m) => m.ListingDetailPage) },
  { path: 'connexion', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
  { path: 'inscription', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage) },
  { path: 'vendre', canActivate: [authGuard], loadComponent: () => import('./pages/sell.page').then((m) => m.SellPage) },
  { path: 'acheter/:id', canActivate: [authGuard], loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage) },
  { path: 'commandes', canActivate: [authGuard], loadComponent: () => import('./pages/orders.page').then((m) => m.OrdersPage) },
  { path: 'commandes/:id', canActivate: [authGuard], loadComponent: () => import('./pages/order.page').then((m) => m.OrderPage) },
  { path: 'mes-annonces', canActivate: [authGuard], loadComponent: () => import('./pages/my-listings.page').then((m) => m.MyListingsPage) },
  { path: 'portefeuille', canActivate: [authGuard], loadComponent: () => import('./pages/wallet.page').then((m) => m.WalletPage) },
  { path: '**', redirectTo: '' },
];
