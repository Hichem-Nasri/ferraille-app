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
  { path: 'vendre/lot', data: { title: 'Publication express', noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/sell-batch.page').then((m) => m.SellBatchPage) },
  { path: 'pieces-auto/:marque/:modele', loadComponent: () => import('./pages/vehicle.page').then((m) => m.VehiclePage) },
  { path: 'pieces-auto/:marque', loadComponent: () => import('./pages/vehicle.page').then((m) => m.VehiclePage) },
  { path: 'demandes', loadComponent: () => import('./pages/requests.page').then((m) => m.RequestsPage) },
  { path: 'casses', loadComponent: () => import('./pages/casses.page').then((m) => m.CassesPage) },
  { path: 'casses/:ville', loadComponent: () => import('./pages/casses.page').then((m) => m.CassesPage) },
  { path: 'casse/:id/:slug', loadComponent: () => import('./pages/seller.page').then((m) => m.SellerPage) },
  { path: 'casse/:id', loadComponent: () => import('./pages/seller.page').then((m) => m.SellerPage) },
  { path: 'alertes', data: { title: 'Mes alertes', noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/alerts.page').then((m) => m.AlertsPage) },
  { path: 'mes-annonces', data: { title: "Mes annonces", noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/my-listings.page').then((m) => m.MyListingsPage) },
  { path: 'portefeuille', redirectTo: 'profil' },
  { path: 'commandes', redirectTo: 'mes-annonces' },
  { path: 'profil', data: { title: 'Mon profil', noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage) },
  { path: 'admin', data: { title: 'Administration', noindex: true }, canActivate: [authGuard], loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage) },
  { path: 'confidentialite', data: { title: 'Politique de confidentialité' }, loadComponent: () => import('./pages/legal.page').then((m) => m.PrivacyPage) },
  { path: 'suppression-donnees', data: { title: 'Suppression de tes données' }, loadComponent: () => import('./pages/legal.page').then((m) => m.DataDeletionPage) },
  { path: '**', redirectTo: '' },
];
