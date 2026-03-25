# Chiino — Site vitrine & back-office

Site de tatouage avec boutique en ligne, réservation et back-office.

## Lancer en local

```bash
npm install
npm start
```

Ouvre : http://localhost:4242

## Variables d'environnement

Crée un fichier `.env` à la racine :

```env
ADMIN_PASSWORD=ton-mot-de-passe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_URL=http://localhost:4242

# Notifications SMS (Free Mobile)
FREE_MOBILE_USER=
FREE_MOBILE_PASS=

# Notifications SMS (Twilio — optionnel)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_TO_NUMBER=

# Envoi fournisseur (dropshipping)
# true = simulation locale, false = appel API réel fournisseur
SUPPLIER_SIMULATION=true

# Token API fournisseur TAT-EU
TAT_EU_API_KEY=

# Endpoint de dispatch TAT-EU (obligatoire si SUPPLIER_SIMULATION=false)
SUPPLIER_DISPATCH_URL_TAT_EU=

# Flux actuel: envoi manuel des commandes depuis le back-office
# Le webhook Stripe enregistre la commande, puis le propriétaire clique
# sur "Envoyer a TAT-EU" dans le module Commandes.
```

## Déploiement (Fly.io)

```bash
fly deploy
```

## Synchroniser les donnees local <-> Fly

Les fichiers de `data/` sont ignores par git et, en production, ils vivent sur le volume Fly monte sur `/app/data`.
Un `fly deploy` met a jour le code, mais pas automatiquement ces donnees.

### 1) Sauvegarder la prod avant toute synchro

```bash
npm run data:fly:backup
```

Les backups sont ecrits dans `backup/fly-data-YYYYMMDD-HHMMSS`.

### 2) Envoyer les donnees locales vers la prod

```bash
npm run data:fly:sync
```

Cela envoie (si presents en local):
- `data/products.json`
- `data/realisations.json`
- `data/schedule.json`
- `data/orders.json`
- `data/webhook-events.json`

### 3) Verifier en production

1. Ouvrir le site prod et faire un hard refresh (`Cmd+Shift+R`).
2. Se connecter au back-office prod et verifier produits/planning/commandes.

### Utilisation avancee

Tu peux cibler une autre app Fly ou un autre dossier local:

```bash
./scripts/backup-data-from-fly.sh <app-name> <dossier-sortie>
./scripts/sync-data-to-fly.sh <app-name> <dossier-local-data>
```

## Structure du projet

```
public/      → fichiers servis au navigateur (HTML, CSS, JS, images)
data/        → données du back-office (ignoré par git)
server.js    → serveur Node.js / Express
Dockerfile   → image Docker pour Fly.io
fly.toml     → configuration Fly.io
```
