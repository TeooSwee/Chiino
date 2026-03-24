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
```

## Déploiement (Fly.io)

```bash
fly deploy
```

## Structure du projet

```
public/      → fichiers servis au navigateur (HTML, CSS, JS, images)
data/        → données du back-office (ignoré par git)
server.js    → serveur Node.js / Express
Dockerfile   → image Docker pour Fly.io
fly.toml     → configuration Fly.io
```
