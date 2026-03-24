# Chiino V2 Checkout (Stripe)

## 1) Install

```bash
npm install
```

## 2) Configure env

Copy `.env.example` to `.env` and set your Stripe test keys:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` (optional for local testing)

To receive owner notifications by SMS with Twilio, set:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (fallback)
- `TWILIO_TO_NUMBER`
- `TWILIO_ALPHA_SENDER_ID` (optional, ex: `CHIINO`)
- `TWILIO_MESSAGING_SERVICE_SID` (optional)

Recommended to display brand name instead of phone number:

1. Set `TWILIO_ALPHA_SENDER_ID=CHIINO`
2. If supported in your destination country/operator, SMS sender appears as `CHIINO`
3. If not supported, server automatically falls back to `TWILIO_FROM_NUMBER`

You can also use a Twilio Messaging Service (`TWILIO_MESSAGING_SERVICE_SID`) if you manage sender IDs there.

If you do not have a Twilio account and you are a Free Mobile customer, you can use Free Mobile SMS API instead:

- `FREE_MOBILE_USER`
- `FREE_MOBILE_PASS`

In that case, Twilio variables can stay empty.

## 3) Run server

```bash
npm start
```

Open:

- http://localhost:4242/index.html

## 4) Test flow

1. Add products to cart
2. Click `Passer commande auto`
3. Stripe Checkout opens
4. On success, return to `?checkout=success`

## 5) Optional webhook test

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:4242/api/webhook
```

Then copy webhook secret into `.env`.

## 6) Notifications sent to owner

If Twilio is configured, the owner gets an SMS when:

1. A contact message is sent from `contact.html`
2. A reservation request is created (`create-deposit-session`)
3. A Stripe checkout is completed (shop purchase or reservation deposit)

If Twilio is not configured but Free Mobile credentials are set, the same notifications are sent through Free Mobile.
