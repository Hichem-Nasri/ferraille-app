# Ferraille

Marketplace tunisienne de pièces auto d'occasion. Particuliers et casses publient leurs pièces, l'acheteur paie en ligne (ou à la livraison), Aramex ou La Poste récupère le colis chez le vendeur, et le vendeur est payé une fois la réception confirmée.

## Stack

| Partie | Techno |
| --- | --- |
| API | Spring Boot 3.3 · Java 21 · PostgreSQL 16 · Flyway · JWT |
| Web | Angular 17 (standalone, signals) · mobile first |
| Infra | Docker Compose · Caddy (HTTPS automatique) · GitHub Actions → GHCR → VPS |

## Fonctionnalités v1

- **Annonces** : photos (jusqu'à 8), catégorie, état, prix, ville, réf. OEM, véhicules compatibles (marque, modèle, années).
- **Recherche** : texte, catégorie et filtre « Mon garage » (ne montre que les pièces compatibles avec ta voiture).
- **Commande** : choix Aramex ou La Poste, paiement carte, D17 ou à la livraison, protection acheteur.
- **Suivi** : expédition par le vendeur, étapes de livraison, confirmation de réception, litige, annulation.
- **Portefeuille vendeur** : gains en attente / disponibles, commission déduite, demande de retrait (RIB ou D17).
- **Admin** (API) : mise à jour du statut de livraison, résolution des litiges, validation des retraits.
- Confirmation automatique 48 h après la livraison.

## Modèle économique (configurable dans `.env`)

| Élément | Valeur par défaut | Payé par |
| --- | --- | --- |
| Commission | 10 % du prix | vendeur |
| Protection acheteur | 4 DT | acheteur |
| Livraison Aramex | 8 DT | acheteur |
| Livraison La Poste | 7 DT | acheteur |
| Paiement à la livraison | +2 DT | acheteur |

## Ce qui est simulé pour l'instant

- **Paiement** : `SimulatedPaymentGateway` accepte tout. À remplacer par une implémentation de `PaymentGateway` (Konnect, Flouci, ClicToPay…).
- **Transporteurs** : `AramexShippingProvider` et `LaPosteShippingProvider` génèrent un numéro de suivi. À brancher sur les API des transporteurs une fois les contrats signés. Les statuts « en transit » et « livré » se mettent à jour via l'API admin en attendant les webhooks.

## Lancer en local

```bash
cp .env.example .env        # puis renseigne DB_PASSWORD et JWT_SECRET
# pour du local, mets DOMAIN=:80 et PUBLIC_URL=http://localhost
docker compose up --build
```

Ouvre http://localhost. Avec `DEMO_DATA=true`, la base est remplie au premier démarrage :

- `nasri.hichem.pro@gmail.com` — Hichem Nasri, particulier, 12 annonces avec photos. Mot de passe : la valeur de `OWNER_PASSWORD` (si elle est vide, un mot de passe provisoire est affiché dans les logs du backend).
- `casse@demo.ferraille.tn` — casse pro (mot de passe `demo12345`)
- `karim@demo.ferraille.tn` — vendeur particulier (mot de passe `demo12345`)
- `sami@demo.ferraille.tn` — acheteur (mot de passe `demo12345`)

Les photos des annonces de démo viennent de [Pexels](https://www.pexels.com/license/) (voir `PHOTO_CREDITS.md`). Ce sont des annonces d'exemple : passe `DEMO_DATA=false` et vide la base avant d'ouvrir le site au public.

### Sans Docker

```bash
# API (PostgreSQL local requis)
cd backend && mvn spring-boot:run

# Web (proxy /api vers :8080)
cd frontend && npm install && npm start
```

## Déploiement sur un VPS

Le déploiement cohabite avec d'autres applications : par défaut, Ferraille écoute uniquement sur le port **8090** (`WEB_PORT`) et ne touche pas aux ports 80/443.

1. **Serveur** : Docker et le plugin Compose installés (`docker compose version`). L'utilisateur SSH doit être dans le groupe `docker`.
2. **Secrets GitHub** (Settings → Secrets and variables → Actions → *Secrets*) :
   - `VPS_HOST` — IP du serveur (ex. `2.25.11.27`)
   - `VPS_USER` — utilisateur SSH
   - `VPS_PASSWORD` — mot de passe SSH, **ou** `VPS_SSH_KEY` — clé privée SSH (recommandé)
   - `VPS_PORT` — optionnel, 22 par défaut
   - `OWNER_PASSWORD` — mot de passe du compte Hichem Nasri (optionnel)
3. **Variables GitHub** optionnelles (onglet *Variables*) : `WEB_PORT` (8090), `PUBLIC_URL`, `DEPLOY_DIR` (`/opt/ferraille`), `ADMIN_EMAIL`.
4. **Push sur `main`** : tests, construction des images, publication sur GHCR puis `docker compose up -d` sur le serveur. Au premier déploiement, le fichier `.env` est créé sur le serveur avec un mot de passe de base de données et un secret JWT générés aléatoirement.

L'application est alors accessible sur `http://IP_DU_SERVEUR:8090`.

### Passer en production avec un domaine

Si un autre site occupe déjà 80/443, ajoute un bloc dans son reverse proxy (Nginx, Caddy…) qui renvoie ton domaine vers `127.0.0.1:8090`. Sur un serveur dédié, mets `COMPOSE_PROFILES=https` et `DOMAIN=ton-domaine.tn` dans `.env` : Caddy obtient alors le certificat HTTPS automatiquement. Dans les deux cas, mets `PUBLIC_URL=https://ton-domaine.tn`.

## SEO

- Les pages publiques (`/`, `/pieces/{catégorie}`, `/piece/{id}/{slug}`) sont **rendues côté serveur** : le HTML envoyé contient le titre, la description, les balises Open Graph et Twitter, l'URL canonique, les données structurées JSON-LD (`Product` + `Offer` en TND, `BreadcrumbList`, `ItemList`, `WebSite` avec `SearchAction`) et le contenu lisible (titre, prix, description, véhicules compatibles, liens internes). Google, Facebook et WhatsApp voient donc la page sans exécuter le JavaScript.
- Si le rendu serveur échoue, Nginx sert l'application Angular normalement.
- `sitemap.xml` (avec les images) et `robots.txt` sont générés dynamiquement. Les pages privées (compte, commandes, paiement) sont en `noindex`.
- URLs lisibles avec slug (`/piece/12/phare-avant-led-gauche`) et redirection 301 vers l'URL canonique.
- Pages catégories indexables (`/pieces/eclairage`, `/pieces/moteur`…), image de partage `og-image.png`, manifest et icônes.
- Après la mise en ligne avec un domaine : déclare le site et le sitemap dans Google Search Console.

## API principale

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/listings?q=&category=&make=&model=&year=&city=&sort=` | public |
| GET | `/api/listings/{id}` | public |
| POST/PUT/DELETE | `/api/listings`, `/api/listings/{id}` | vendeur |
| POST | `/api/uploads` (multipart `files`) | connecté |
| GET | `/api/shipping/options`, `/api/pricing/seller?price=`, `/api/pricing/checkout?listingId=&carrier=&paymentMethod=` | public |
| POST | `/api/orders` | acheteur |
| POST | `/api/orders/{id}/ship` | vendeur |
| POST | `/api/orders/{id}/confirm`, `/dispute`, `/cancel` | acheteur |
| GET | `/api/wallet`, POST `/api/wallet/payouts` | connecté |
| POST | `/api/admin/orders/{id}/delivery-status`, `/api/admin/orders/{id}/resolve`, `/api/admin/payouts/{id}/paid` | admin |
