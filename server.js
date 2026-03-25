const path = require('path');
const fs = require('fs');
const express = require('express');
const dotenv = require('dotenv');
const Stripe = require('stripe');
const twilio = require('twilio');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4242);
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${port}`;
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminPassword) console.warn('[admin] ADMIN_PASSWORD non défini — accès back-office désactivé.');

const secretKey = process.env.STRIPE_SECRET_KEY || '';
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const twilioAccountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
const twilioAuthToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
const twilioFromNumber = String(process.env.TWILIO_FROM_NUMBER || '').trim();
const twilioToNumber = String(process.env.TWILIO_TO_NUMBER || '').trim();
const twilioMessagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
const twilioAlphaSenderId = String(process.env.TWILIO_ALPHA_SENDER_ID || '').trim();
const freeMobileUser = String(process.env.FREE_MOBILE_USER || '').trim();
const freeMobilePass = String(process.env.FREE_MOBILE_PASS || '').trim();
const smsSimulationEnabled = String(process.env.SMS_SIMULATION || '').trim().toLowerCase() === 'true';

const stripe = secretKey ? new Stripe(secretKey) : null;
let twilioClient = null;
let twilioClientDisabled = false;

const dataDir = path.join(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const realisationsFile = path.join(dataDir, 'realisations.json');
const scheduleFile = path.join(dataDir, 'schedule.json');
const ordersFile = path.join(dataDir, 'orders.json');
const webhookEventsFile = path.join(dataDir, 'webhook-events.json');
const legacyAdminDataFile = path.join(dataDir, 'admin-content.json');

let scheduleBookingLock = false;
async function withScheduleLock(fn) {
  while (scheduleBookingLock) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  scheduleBookingLock = true;
  try { return await fn(); } finally { scheduleBookingLock = false; }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJsonFileSafe(filePath, defaults) {
  try {
    if (!fs.existsSync(filePath)) return { ...defaults };
    return { ...defaults, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    return { ...defaults };
  }
}

function migrateFromLegacyIfNeeded() {
  if (!fs.existsSync(legacyAdminDataFile)) return;
  if (fs.existsSync(productsFile) || fs.existsSync(realisationsFile) || fs.existsSync(scheduleFile)) return;
  try {
    const old = JSON.parse(fs.readFileSync(legacyAdminDataFile, 'utf8'));
    fs.writeFileSync(productsFile, JSON.stringify({
      customProducts: asArray(old.customProducts),
      hiddenDefaultProducts: asArray(old.hiddenDefaultProducts),
      defaultProductOverrides: (old.defaultProductOverrides && typeof old.defaultProductOverrides === 'object') ? old.defaultProductOverrides : {},
      featuredProducts: asArray(old.featuredProducts)
    }, null, 2), 'utf8');
    fs.writeFileSync(realisationsFile, JSON.stringify({
      customRealisations: asArray(old.customRealisations),
      hiddenDefaultRealisations: asArray(old.hiddenDefaultRealisations),
      defaultRealisationOverrides: (old.defaultRealisationOverrides && typeof old.defaultRealisationOverrides === 'object') ? old.defaultRealisationOverrides : {},
      featuredRealisations: asArray(old.featuredRealisations)
    }, null, 2), 'utf8');
    fs.writeFileSync(scheduleFile, JSON.stringify({
      scheduleEntries: asArray(old.scheduleEntries)
    }, null, 2), 'utf8');
    console.log('[data] Migration admin-content.json → 3 fichiers effectuée.');
  } catch (error) {
    console.error('[data] Échec migration:', error.message);
  }
}

function readAdminContent() {
  ensureDataDir();
  migrateFromLegacyIfNeeded();
  const products = readJsonFileSafe(productsFile, { customProducts: [], hiddenDefaultProducts: [], defaultProductOverrides: {}, featuredProducts: [] });
  const reals = readJsonFileSafe(realisationsFile, { customRealisations: [], hiddenDefaultRealisations: [], defaultRealisationOverrides: {}, featuredRealisations: [] });
  const schedule = readJsonFileSafe(scheduleFile, { scheduleEntries: [] });
  return {
    customProducts: asArray(products.customProducts),
    customRealisations: asArray(reals.customRealisations),
    hiddenDefaultProducts: asArray(products.hiddenDefaultProducts),
    hiddenDefaultRealisations: asArray(reals.hiddenDefaultRealisations),
    defaultProductOverrides: (products.defaultProductOverrides && typeof products.defaultProductOverrides === 'object') ? products.defaultProductOverrides : {},
    defaultRealisationOverrides: (reals.defaultRealisationOverrides && typeof reals.defaultRealisationOverrides === 'object') ? reals.defaultRealisationOverrides : {},
    featuredProducts: asArray(products.featuredProducts),
    featuredRealisations: asArray(reals.featuredRealisations),
    scheduleEntries: asArray(schedule.scheduleEntries)
  };
}

function writeAdminContent(content) {
  ensureDataDir();
  fs.writeFileSync(productsFile, JSON.stringify({
    customProducts: asArray(content.customProducts),
    hiddenDefaultProducts: asArray(content.hiddenDefaultProducts),
    defaultProductOverrides: (content.defaultProductOverrides && typeof content.defaultProductOverrides === 'object') ? content.defaultProductOverrides : {},
    featuredProducts: asArray(content.featuredProducts)
  }, null, 2), 'utf8');
  fs.writeFileSync(realisationsFile, JSON.stringify({
    customRealisations: asArray(content.customRealisations),
    hiddenDefaultRealisations: asArray(content.hiddenDefaultRealisations),
    defaultRealisationOverrides: (content.defaultRealisationOverrides && typeof content.defaultRealisationOverrides === 'object') ? content.defaultRealisationOverrides : {},
    featuredRealisations: asArray(content.featuredRealisations)
  }, null, 2), 'utf8');
  fs.writeFileSync(scheduleFile, JSON.stringify({
    scheduleEntries: asArray(content.scheduleEntries)
  }, null, 2), 'utf8');
  return {
    customProducts: asArray(content.customProducts),
    customRealisations: asArray(content.customRealisations),
    hiddenDefaultProducts: asArray(content.hiddenDefaultProducts),
    hiddenDefaultRealisations: asArray(content.hiddenDefaultRealisations),
    defaultProductOverrides: (content.defaultProductOverrides && typeof content.defaultProductOverrides === 'object') ? content.defaultProductOverrides : {},
    defaultRealisationOverrides: (content.defaultRealisationOverrides && typeof content.defaultRealisationOverrides === 'object') ? content.defaultRealisationOverrides : {},
    featuredProducts: asArray(content.featuredProducts),
    featuredRealisations: asArray(content.featuredRealisations),
    scheduleEntries: asArray(content.scheduleEntries)
  };
}

function readOrdersData() {
  ensureDataDir();
  const parsed = readJsonFileSafe(ordersFile, { orders: [] });
  return { orders: asArray(parsed.orders) };
}

function writeOrdersData(data) {
  ensureDataDir();
  const payload = { orders: asArray(data?.orders) };
  fs.writeFileSync(ordersFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function readWebhookEventsData() {
  ensureDataDir();
  const parsed = readJsonFileSafe(webhookEventsFile, { processedEventIds: [] });
  return {
    processedEventIds: asArray(parsed.processedEventIds)
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  };
}

function writeWebhookEventsData(data) {
  ensureDataDir();
  const uniqueIds = Array.from(new Set(
    asArray(data?.processedEventIds)
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));
  const payload = {
    processedEventIds: uniqueIds.slice(-5000)
  };
  fs.writeFileSync(webhookEventsFile, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

function normalizeOrderStatus(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'paid' || key === 'paye' || key === 'payee') return 'paid';
  if (key === 'processing' || key === 'preparation') return 'processing';
  if (key === 'fulfilled' || key === 'expediee' || key === 'expedie') return 'fulfilled';
  if (key === 'delivered' || key === 'livree' || key === 'livre') return 'delivered';
  if (key === 'refunded' || key === 'remboursee' || key === 'rembourse') return 'refunded';
  if (key === 'canceled' || key === 'cancelled' || key === 'annulee' || key === 'annule') return 'canceled';
  return 'paid';
}

function upsertShopOrderFromSession(session, metadata, itemsLabel) {
  const store = readOrdersData();
  const nowIso = new Date().toISOString();
  const stripeSessionId = String(session.id || '').trim();
  if (!stripeSessionId) return null;

  const index = store.orders.findIndex((order) => String(order.stripeSessionId || '') === stripeSessionId);
  const order = {
    id: index >= 0 ? String(store.orders[index].id || ('ord-' + Date.now().toString(36))) : ('ord-' + Date.now().toString(36)),
    orderRef: String(metadata.orderRef || '').trim() || ('CMD-' + Date.now().toString(36).toUpperCase()),
    stripeSessionId,
    status: normalizeOrderStatus(index >= 0 ? store.orders[index].status : 'paid'),
    customerName: String(session.customer_details?.name || metadata.clientName || '').trim() || 'Non renseigne',
    customerEmail: String(session.customer_details?.email || '').trim(),
    amountTotal: Number(session.amount_total || 0),
    currency: String(session.currency || 'eur').trim().toLowerCase(),
    itemsLabel: String(itemsLabel || metadata.items || '').trim(),
    suppliers: String(metadata.suppliers || '').trim(),
    shippingSummary: String(metadata.shippingSummary || '').trim(),
    trackingNumber: index >= 0 ? String(store.orders[index].trackingNumber || '').trim() : '',
    adminNote: index >= 0 ? String(store.orders[index].adminNote || '').trim() : '',
    createdAt: index >= 0 ? String(store.orders[index].createdAt || nowIso) : nowIso,
    updatedAt: nowIso
  };

  if (index >= 0) {
    store.orders[index] = { ...store.orders[index], ...order };
  } else {
    store.orders.push(order);
  }

  writeOrdersData(store);
  return order;
}

function requireAdmin(req, res, next) {
  const password = String(req.headers['x-admin-password'] || '');
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function nextWeekday(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2);
  if (day === 0) date.setDate(date.getDate() + 1);
  return date;
}

function extractScheduleFromAvailability(rawAvailability) {
  const availability = String(rawAvailability || '').trim();
  const base = nextWeekday(new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)));

  let date = toDateString(base);
  let time = '10:00';

  if (availability) {
    const isoDate = availability.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDate) {
      date = isoDate[1];
    } else {
      const frDate = availability.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
      if (frDate) {
        const day = Number(frDate[1]);
        const month = Number(frDate[2]);
        const year = Number(frDate[3].length === 2 ? `20${frDate[3]}` : frDate[3]);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
          date = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }

    const timeMatch = availability.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
    if (timeMatch) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
  }

  return { date, time };
}

function normalizeSlotDate(value) {
  const date = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function normalizeSlotTime(value) {
  const time = String(value || '').trim();
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeScheduleStatus(status) {
  const key = String(status || 'en-attente').trim().toLowerCase();
  if (key === 'refuse' || key === 'annule') return 'refuse';
  if (key === 'confirme') return 'confirme';
  if (key === 'termine') return 'termine';
  return 'en-attente';
}

function isSlotOccupied(scheduleEntries, date, time) {
  return asArray(scheduleEntries).some((entry) => {
    const entryDate = normalizeSlotDate(entry.date);
    const entryTime = normalizeSlotTime(entry.time);
    const entryStatus = normalizeScheduleStatus(entry.status);
    return entryDate === date && entryTime === time && entryStatus !== 'refuse';
  });
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function sanitizeReservationImages(images) {
  return asArray(images)
    .slice(0, 4)
    .map((image) => ({
      name: String(image?.name || 'image').slice(0, 120),
      type: String(image?.type || 'image/*').slice(0, 80),
      dataUrl: String(image?.dataUrl || '')
    }))
    .filter((image) => image.dataUrl.startsWith('data:image/') && image.dataUrl.length <= MAX_IMAGE_BYTES * 1.4);
}

function normalizeReservationPeriod(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === 'matin') return 'matin';
  if (key === 'apres-midi' || key === 'après-midi') return 'apres-midi';
  if (key === 'soiree' || key === 'soirée') return 'soiree';
  return '';
}

function getTimeFromPeriod(period) {
  if (period === 'matin') return '09:00';
  if (period === 'apres-midi') return '14:00';
  if (period === 'soiree') return '18:00';
  return '';
}

function isDateAtLeast48h(value) {
  const dateKey = normalizeSlotDate(value);
  if (!dateKey) return false;

  const selected = new Date(dateKey + 'T00:00:00');
  const min = new Date();
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + 2);
  return selected.getTime() >= min.getTime();
}

function formatAmount(amount, currency) {
  if (!Number.isFinite(Number(amount))) return '-';
  const amountNumber = Number(amount) / 100;
  const currencyCode = String(currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode
    }).format(amountNumber);
  } catch (error) {
    return `${amountNumber.toFixed(2)} ${currencyCode}`;
  }
}

function getTwilioClient() {
  if (twilioClientDisabled) return null;
  if (twilioClient) return twilioClient;

  const hasSender = Boolean(twilioMessagingServiceSid || twilioAlphaSenderId || twilioFromNumber);
  if (!twilioAccountSid || !twilioAuthToken || !twilioToNumber || !hasSender) {
    twilioClientDisabled = true;
    console.warn('[notify] Twilio non configuré: notifications SMS désactivées.');
    return null;
  }

  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  return twilioClient;
}

function hasFreeMobileConfig() {
  return Boolean(freeMobileUser && freeMobilePass);
}

function buildNotificationText(subject, lines) {
  const textLines = asArray(lines)
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  return [subject].concat(textLines).join('\n');
}

function normalizeAlphaSenderId(value) {
  const cleaned = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11);
  return cleaned;
}

async function sendOwnerSmsNotification(subject, lines) {
  const body = buildNotificationText(subject, lines).slice(0, 1500);

  if (smsSimulationEnabled) {
    console.log('[notify] SMS simulation active:', body.replace(/\n/g, ' | '));
    return true;
  }

  const client = getTwilioClient();
  if (client && twilioToNumber) {
    try {
      const alphaSender = normalizeAlphaSenderId(twilioAlphaSenderId);
      const messagePayload = {
        to: twilioToNumber,
        body
      };

      if (twilioMessagingServiceSid) {
        messagePayload.messagingServiceSid = twilioMessagingServiceSid;
      } else if (alphaSender) {
        messagePayload.from = alphaSender;
      } else {
        messagePayload.from = twilioFromNumber;
      }

      try {
        await client.messages.create(messagePayload);
      } catch (error) {
        // Certains pays/opérateurs refusent l'expéditeur alphanumérique.
        if (alphaSender && twilioFromNumber && !twilioMessagingServiceSid) {
          await client.messages.create({
            to: twilioToNumber,
            body,
            from: twilioFromNumber
          });
        } else {
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('[notify] échec envoi SMS Twilio:', error.message || error);
    }
  }

  if (hasFreeMobileConfig()) {
    try {
      const query = new URLSearchParams({
        user: freeMobileUser,
        pass: freeMobilePass,
        msg: body.slice(0, 480)
      });
      const response = await fetch(`https://smsapi.free-mobile.fr/sendmsg?${query.toString()}`);

      if (response.ok) {
        return true;
      }

      const reason = await response.text().catch(() => '');
      console.error('[notify] échec envoi SMS Free Mobile:', response.status, reason);
      return false;
    } catch (error) {
      console.error('[notify] échec envoi SMS Free Mobile:', error.message || error);
      return false;
    }
  }

  return false;
}

async function sendOwnerNotification(subject, lines) {
  const textLines = asArray(lines)
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  const smsSent = await sendOwnerSmsNotification(subject, textLines);

  if (!smsSent) {
    console.log('[notify] notification SMS non envoyée (aucun fournisseur configuré):', subject, textLines.join(' | '));
  }

  return smsSent;

}

const catalog = {
  'FLASH-GEO-V3': { name: 'Crème réparatrice', amount: 2800, currency: 'eur', supplier: 'Printify', shipping: '5-7 jours ouvres' },
  'SOIN-GEL-50': { name: 'Gel cicatrisant', amount: 2200, currency: 'eur', supplier: 'BigBuy', shipping: '3-5 jours ouvres' },
  'FLASH-SERPENTS': { name: 'Flash Tattoo', amount: 1500, currency: 'eur', supplier: 'Printify', shipping: '5-7 jours ouvres' },
  'NOTEBOOK-CHIINO': { name: 'Carnet de croquis - Chiino', amount: 1200, currency: 'eur', supplier: 'Printful', shipping: '4-7 jours ouvres' },
  'TSHIRT-CHIINO': { name: 'T-shirt - Logo Chiino', amount: 3600, currency: 'eur', supplier: 'Printful', shipping: '5-10 jours ouvres' }
};

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !webhookSecret) {
    return res.status(400).send('Stripe webhook not configured');
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  const webhookStore = readWebhookEventsData();
  const eventId = String(event.id || '').trim();
  if (eventId && webhookStore.processedEventIds.includes(eventId)) {
    return res.json({ received: true, duplicate: true });
  }

  try {

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[stripe] checkout.session.completed', session.id);

      const metadata = session.metadata || {};
      const orderType = String(metadata.orderType || '').trim();
      const amountLabel = formatAmount(session.amount_total, session.currency);
      const customerName = String(session.customer_details?.name || metadata.clientName || '').trim() || 'Non renseigné';
      const customerEmail = String(session.customer_details?.email || '').trim() || 'Non renseigné';

      if (orderType === 'shop') {
        let itemsLabel = String(metadata.items || '').trim();
        if (!itemsLabel && stripe) {
          try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
            itemsLabel = asArray(lineItems.data)
              .map((item) => {
                const qty = Number(item.quantity || 1);
                const label = String(item.description || 'Produit').trim();
                return `${label} x${qty}`;
              })
              .join(', ');
          } catch (error) {
            // Si Stripe refuse le détail des lignes, on envoie quand même la notification.
          }
        }

        upsertShopOrderFromSession(session, metadata, itemsLabel);

        await sendOwnerNotification('Nouvel achat boutique', [
          `Session: ${session.id}`,
          `Montant: ${amountLabel}`,
          `Client: ${customerName}`,
          `Email Stripe: ${customerEmail}`,
          `Produits: ${itemsLabel || 'Non disponible'}`,
          `Fournisseurs: ${String(metadata.suppliers || '').trim() || 'Non disponible'}`,
          `Delais expedition: ${String(metadata.shippingSummary || '').trim() || 'Non disponible'}`
        ]);
      }

      if (orderType === 'reservation_deposit') {
        await sendOwnerNotification('Acompte réservation payé', [
          `Session: ${session.id}`,
          `Montant: ${amountLabel}`,
          `Client: ${customerName}`,
          `Téléphone: ${String(metadata.clientPhone || '').trim() || 'Non renseigné'}`,
          `Jour: ${String(metadata.selectedDate || '').trim() || 'Non renseigné'}`,
          `Moment: ${String(metadata.selectedPeriod || '').trim() || 'Non renseigné'}`,
          `Réservation: ${String(metadata.reservationId || '').trim() || 'Non renseigné'}`
        ]);
      }
    }

    if (eventId) {
      webhookStore.processedEventIds.push(eventId);
      writeWebhookEventsData(webhookStore);
    }
  } catch (error) {
    return res.status(500).send(`Webhook processing error: ${error.message || 'unknown-error'}`);
  }

  return res.json({ received: true });
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

app.use('/api/admin/login', loginLimiter);
app.use('/api/contact-message', publicLimiter);
app.use('/api/create-deposit-session', publicLimiter);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/public-config', (req, res) => {
  res.json({ publishableKey });
});

app.post('/api/contact-message', async (req, res) => {
  const body = req.body || {};
  const prenom = String(body.prenom || '').trim();
  const telephone = String(body.telephone || '').trim();
  const sujet = String(body.sujet || '').trim();
  const message = String(body.message || '').trim();

  if (!prenom || !telephone || !sujet || !message) {
    return res.status(400).json({ error: 'Prénom, téléphone, sujet et message sont requis.' });
  }
  if (prenom.length > 100 || telephone.length > 30 || sujet.length > 200 || message.length > 3000) {
    return res.status(400).json({ error: 'Un ou plusieurs champs dépassent la longueur maximale autorisée.' });
  }

  await sendOwnerNotification('Nouveau message contact', [
    `Prénom: ${prenom}`,
    `Téléphone: ${telephone}`,
    `Sujet: ${sujet}`,
    'Message:',
    message
  ]);

  return res.json({ ok: true });
});

app.post('/api/admin/test-sms', requireAdmin, async (req, res) => {
  const customMessage = String(req.body?.message || '').trim();
  const now = new Date().toISOString();
  const sent = await sendOwnerNotification('Test notification Chiino', [
    customMessage || 'Ceci est un SMS de test.',
    `Heure: ${now}`
  ]);

  if (!sent) {
    return res.status(500).json({
      ok: false,
      error: 'Envoi SMS impossible. Vérifie la configuration du fournisseur SMS dans .env.'
    });
  }

  return res.json({ ok: true, message: 'SMS de test envoyé.' });
});

app.get('/api/public-schedule-availability', (req, res) => {
  const content = readAdminContent();
  const occupiedSlots = asArray(content.scheduleEntries)
    .map((entry) => ({
      date: normalizeSlotDate(entry.date),
      time: normalizeSlotTime(entry.time),
      status: normalizeScheduleStatus(entry.status)
    }))
    .filter((entry) => entry.date && entry.time && entry.status !== 'refuse')
    .map((entry) => ({ date: entry.date, time: entry.time }));

  return res.json({ occupiedSlots });
});

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Mot de passe invalide' });
  }
  return res.json({ ok: true });
});

app.get('/api/admin/content', requireAdmin, (_req, res) => {
  return res.json(readAdminContent());
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const data = readOrdersData();
  const orders = data.orders
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return res.json({ orders });
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const id = String(req.params.id || '').trim();
  const body = req.body || {};
  const status = normalizeOrderStatus(body.status);
  const trackingNumber = String(body.trackingNumber || '').trim();
  const adminNote = String(body.adminNote || '').trim();

  const data = readOrdersData();
  const index = data.orders.findIndex((order) => String(order.id || '') === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  const previous = data.orders[index];
  data.orders[index] = {
    ...previous,
    status,
    trackingNumber,
    adminNote,
    updatedAt: new Date().toISOString()
  };

  writeOrdersData(data);
  return res.json({ order: data.orders[index] });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const price = Number(body.price);
  if (!name || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Nom et prix valides requis' });
  }

  const content = readAdminContent();
  const product = {
    id: 'prod-' + Date.now().toString(36),
    sku: String(body.sku || 'CUSTOM-' + Date.now().toString(36)),
    supplier: String(body.supplier || 'Partenaire'),
    shipping: String(body.shipping || '5-10 jours ouvres'),
    name,
    shortDesc: String(body.shortDesc || '').trim(),
    details: String(body.details || name).trim(),
    price,
    oldPrice: Number.isFinite(Number(body.oldPrice)) && Number(body.oldPrice) > 0 ? Number(body.oldPrice) : null,
    category: String(body.category || 'modeles').trim(),
    badge: String(body.badge || '').trim(),
    optionLabel: String(body.optionLabel || '').trim(),
    options: String(body.options || '').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  content.customProducts.push(product);
  return res.json(writeAdminContent(content));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const content = readAdminContent();
  content.customProducts = content.customProducts.filter((item) => item.id !== id);
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const price = Number(body.price);
  if (!name || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Nom et prix valides requis' });
  }

  const content = readAdminContent();
  const index = content.customProducts.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Produit introuvable' });
  }

  const previous = content.customProducts[index];
  content.customProducts[index] = {
    ...previous,
    supplier: String(body.supplier || previous.supplier || 'Partenaire'),
    shipping: String(body.shipping || previous.shipping || '5-10 jours ouvres'),
    name,
    shortDesc: String(body.shortDesc || '').trim(),
    details: String(body.details || name).trim(),
    price,
    oldPrice: Number.isFinite(Number(body.oldPrice)) && Number(body.oldPrice) > 0 ? Number(body.oldPrice) : null,
    category: String(body.category || 'modeles').trim(),
    badge: String(body.badge || '').trim(),
    optionLabel: String(body.optionLabel || '').trim(),
    options: String(body.options || '').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  return res.json(writeAdminContent(content));
});

app.post('/api/admin/realisations', requireAdmin, (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Titre requis' });
  }

  const content = readAdminContent();
  const realisation = {
    id: 'real-' + Date.now().toString(36),
    title,
    style: String(body.style || 'Flash custom').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  content.customRealisations.push(realisation);
  return res.json(writeAdminContent(content));
});

app.delete('/api/admin/realisations/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const content = readAdminContent();
  content.customRealisations = content.customRealisations.filter((item) => item.id !== id);
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/realisations/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Titre requis' });
  }

  const content = readAdminContent();
  const index = content.customRealisations.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Réalisation introuvable' });
  }

  const previous = content.customRealisations[index];
  content.customRealisations[index] = {
    ...previous,
    title,
    style: String(body.style || 'Flash custom').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  return res.json(writeAdminContent(content));
});

app.post('/api/admin/default-products/:id/toggle', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const content = readAdminContent();
  const exists = content.hiddenDefaultProducts.includes(id);
  content.hiddenDefaultProducts = exists
    ? content.hiddenDefaultProducts.filter((value) => value !== id)
    : content.hiddenDefaultProducts.concat(id);
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/default-products/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  const content = readAdminContent();

  content.defaultProductOverrides[id] = {
    name: String(body.name || '').trim(),
    supplier: String(body.supplier || '').trim(),
    shipping: String(body.shipping || '').trim(),
    shortDesc: String(body.shortDesc || '').trim(),
    details: String(body.details || '').trim(),
    price: Number.isFinite(Number(body.price)) ? Number(body.price) : null,
    oldPrice: Number.isFinite(Number(body.oldPrice)) ? Number(body.oldPrice) : null,
    category: String(body.category || '').trim(),
    badge: String(body.badge || '').trim(),
    optionLabel: String(body.optionLabel || '').trim(),
    options: String(body.options || '').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  return res.json(writeAdminContent(content));
});

app.post('/api/admin/default-realisations/:id/toggle', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const content = readAdminContent();
  const exists = content.hiddenDefaultRealisations.includes(id);
  content.hiddenDefaultRealisations = exists
    ? content.hiddenDefaultRealisations.filter((value) => value !== id)
    : content.hiddenDefaultRealisations.concat(id);
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/default-realisations/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  const content = readAdminContent();

  content.defaultRealisationOverrides[id] = {
    title: String(body.title || '').trim(),
    style: String(body.style || '').trim(),
    imageSrc: String(body.imageSrc || '').trim()
  };

  return res.json(writeAdminContent(content));
});

app.post('/api/admin/default-products/restore-all', requireAdmin, (req, res) => {
  const content = readAdminContent();
  content.hiddenDefaultProducts = [];
  return res.json(writeAdminContent(content));
});

app.post('/api/admin/default-realisations/restore-all', requireAdmin, (req, res) => {
  const content = readAdminContent();
  content.hiddenDefaultRealisations = [];
  return res.json(writeAdminContent(content));
});

app.post('/api/admin/custom-products/clear', requireAdmin, (req, res) => {
  const content = readAdminContent();
  content.customProducts = [];
  return res.json(writeAdminContent(content));
});

app.post('/api/admin/custom-realisations/clear', requireAdmin, (req, res) => {
  const content = readAdminContent();
  content.customRealisations = [];
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/featured-realisations', requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const content = readAdminContent();
  content.featuredRealisations = ids
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, 8);
  return res.json(writeAdminContent(content));
});

app.put('/api/admin/featured-products', requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const content = readAdminContent();
  content.featuredProducts = ids
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return res.json(writeAdminContent(content));
});

app.post('/api/admin/schedule', requireAdmin, (req, res) => {
  const body = req.body || {};
  const clientName = String(body.clientName || '').trim();
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const durationMin = Math.max(30, Number(body.durationMin || 120));
  if (!clientName || !date || !time) {
    return res.status(400).json({ error: 'Client, date et heure requis' });
  }

  const content = readAdminContent();
  content.scheduleEntries.push({
    id: 'sch-' + Date.now().toString(36),
    clientName,
    date,
    time,
    durationMin: Number.isFinite(durationMin) ? durationMin : 120,
    note: String(body.note || '').trim(),
    status: String(body.status || 'en-attente').trim(),
    createdAt: new Date().toISOString()
  });

  return res.json(writeAdminContent(content));
});

app.put('/api/admin/schedule/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const body = req.body || {};
  const content = readAdminContent();
  const index = content.scheduleEntries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entrée planning introuvable' });
  }

  const prev = content.scheduleEntries[index];
  const durationMin = Math.max(30, Number(body.durationMin || prev.durationMin || 120));
  content.scheduleEntries[index] = {
    ...prev,
    clientName: String(body.clientName || prev.clientName || '').trim(),
    date: String(body.date || prev.date || '').trim(),
    time: String(body.time || prev.time || '').trim(),
    durationMin: Number.isFinite(durationMin) ? durationMin : (Number(prev.durationMin) || 120),
    note: String(body.note || '').trim(),
    status: String(body.status || prev.status || 'en-attente').trim()
  };

  return res.json(writeAdminContent(content));
});

app.delete('/api/admin/schedule/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id || '');
  const content = readAdminContent();
  content.scheduleEntries = content.scheduleEntries.filter((entry) => entry.id !== id);
  return res.json(writeAdminContent(content));
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe secret key is missing on server' });
  }

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const lineItems = [];
  const metadataItems = [];
  const metadataSuppliers = [];
  const metadataShipping = [];
  const orderRef = 'CMD-' + Date.now().toString(36).toUpperCase();

  for (const item of items) {
    const sku = String(item.sku || '').trim();
    const qty = Math.max(1, Math.min(20, Number(item.qty || 1)));
    const product = catalog[sku];

    if (!product) {
      return res.status(400).json({ error: `Unknown SKU: ${sku}` });
    }

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: product.currency,
        product_data: { name: product.name },
        unit_amount: product.amount
      }
    });

    metadataItems.push(`${product.name} x${qty}`);
    if (product.supplier) metadataSuppliers.push(product.supplier);
    if (product.shipping) metadataShipping.push(product.shipping);
  }

  const incomingSuppliers = String(req.body?.supplierSummary || '').trim();
  const incomingShippingSummary = String(req.body?.shippingSummary || '').trim();
  const computedSuppliers = Array.from(new Set(metadataSuppliers)).join(', ');
  const computedShipping = Array.from(new Set(metadataShipping)).join(', ');
  const metadataSuppliersLabel = (incomingSuppliers || computedSuppliers).slice(0, 500);
  const metadataShippingLabel = (incomingShippingSummary || computedShipping).slice(0, 500);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: {
        orderType: 'shop',
        orderRef,
        items: metadataItems.join(', ').slice(0, 500),
        suppliers: metadataSuppliersLabel,
        shippingSummary: metadataShippingLabel
      },
      success_url: `${publicUrl}/boutique.html?checkout=success`,
      cancel_url: `${publicUrl}/boutique.html?checkout=cancel`
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Stripe session creation failed' });
  }
});

app.post('/api/create-deposit-session', async (req, res) => {
  const customer = req.body?.customer || {};
  const projet = req.body?.projet || {};

  const reservationId = 'req-' + Date.now().toString(36);
  const nowIso = new Date().toISOString();
  const clientName = String((customer.prenom || '') + ' ' + (customer.nom || '')).trim();
  const email = String(customer.email || '').trim();
  const telephone = String(customer.telephone || '').trim();
  const style = String(projet.style || '').trim();
  const zone = String(projet.zone || '').trim();
  const disponibilites = String(projet.disponibilites || '').trim();
  const description = String(projet.description || '').trim();
  const selectedDate = normalizeSlotDate(projet.selectedDate);
  const selectedPeriod = normalizeReservationPeriod(projet.selectedPeriod);
  const selectedTime = getTimeFromPeriod(selectedPeriod);
  const images = sanitizeReservationImages(projet.images);

  if (!selectedDate || !selectedPeriod) {
    return res.status(400).json({ error: 'Jour et moment de la journée requis.' });
  }

  if (!isDateAtLeast48h(selectedDate)) {
    return res.status(400).json({ error: 'Le jour choisi doit être au minimum dans 48h.' });
  }

  try {
    const slot = { date: selectedDate, time: selectedTime || '10:00' };
    const periodLabel = selectedPeriod === 'matin' ? 'Matin' : (selectedPeriod === 'apres-midi' ? 'Après-midi' : 'Soirée');

    const booked = await withScheduleLock(() => {
      const content = readAdminContent();
      if (isSlotOccupied(content.scheduleEntries, slot.date, slot.time)) return false;
      content.scheduleEntries.push({
        id: 'sch-' + Date.now().toString(36),
        sourceReservationId: reservationId,
        autoGenerated: true,
        createdAt: nowIso,
        clientName: clientName || 'Client inconnu',
        date: slot.date,
        time: slot.time,
        durationMin: 120,
        status: 'en-attente',
        note: [
          style ? `Style: ${style}` : '',
          zone ? `Zone: ${zone}` : '',
          `Moment: ${periodLabel}`,
          disponibilites ? `Disponibilites: ${disponibilites}` : '',
          description ? `Projet: ${description}` : '',
          images.length ? `Images: ${images.length}` : ''
        ].filter(Boolean).join(' | '),
        attachments: images
      });
      writeAdminContent(content);
      return true;
    });

    if (!booked) {
      return res.status(409).json({ error: 'Le créneau sélectionné est déjà occupé. Merci d\'en choisir un autre.' });
    }

    await sendOwnerNotification('Nouvelle demande de réservation', [
      `Réservation: ${reservationId}`,
      `Client: ${clientName || 'Non renseigné'}`,
      `Téléphone: ${telephone || 'Non renseigné'}`,
      `Style: ${style || 'Non renseigné'}`,
      `Zone: ${zone || 'Non renseigné'}`,
      `Jour: ${selectedDate}`,
      `Moment: ${selectedPeriod}`,
      `Description: ${description || 'Non renseignée'}`,
      `Images: ${images.length}`
    ]);
  } catch (error) {
    // On continue sans bloquer le paiement si l'écriture planning échoue.
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe secret key is missing on server' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            product_data: { name: 'Acompte réservation tatouage' },
            unit_amount: 5000
          }
        }
      ],
      metadata: {
        orderType: 'reservation_deposit',
        reservationId,
        clientName: (clientName || '').slice(0, 100),
        clientPhone: (telephone || '').slice(0, 40),
        selectedDate,
        selectedPeriod
      },
      success_url: `${publicUrl}/reservation.html?deposit=success`,
      cancel_url: `${publicUrl}/reservation.html?deposit=cancel`
    });

    return res.json({ sessionId: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Stripe deposit session creation failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Chiino V2 server running on ${publicUrl}`);
});
