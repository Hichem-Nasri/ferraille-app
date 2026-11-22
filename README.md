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

Ouvre http://localhost. Avec `DEMO_DATA=true`, trois comptes de démo sont créés (mot de passe `demo12345`) :

- `casse@demo.ferraille.tn` — casse pro
- `karim@demo.ferraille.tn` — vendeur particulier
- `sami@demo.ferraille.tn` — acheteur

### Sans Docker

```bash
# API (PostgreSQL local requis)
cd backend && mvn spring-boot:run

# Web (proxy /api vers :8080)
cd frontend && npm install && npm start
```

## Déploiement sur un VPS

1. **Serveur** : Ubuntu 22.04+ avec Docker et le plugin Compose.
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo mkdir -p /opt/ferraille && sudo chown $USER /opt/ferraille
   ```
2. **DNS** : un enregistrement A de ton domaine vers l'IP du VPS (Caddy obtient le certificat HTTPS tout seul).
3. **Fichier `.env`** sur le serveur : copie `.env.example` dans `/opt/ferraille/.env` et remplis les vraies valeurs. Il ne quitte jamais le serveur.
4. **Secrets GitHub** (Settings → Secrets and variables → Actions) :
   - `VPS_HOST` — IP ou domaine du serveur
   - `VPS_USER` — utilisateur SSH (membre du groupe `docker`)
   - `VPS_SSH_KEY` — clé privée SSH
   - `VPS_PORT` — optionnel, 22 par défaut
5. **Push sur `main`** : le workflow *Build & Deploy* lance les tests, construit les images, les pousse sur GHCR puis fait `docker compose pull && up -d` sur le serveur.

Sans les secrets VPS, le workflow construit et publie quand même les images, puis s'arrête avant le déploiement.

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
