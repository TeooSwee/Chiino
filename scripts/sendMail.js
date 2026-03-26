// Script utilitaire pour l'envoi d'emails avec nodemailer
const nodemailer = require('nodemailer');

// À personnaliser avec tes infos SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true pour 465, false pour les autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Envoie un email
 * @param {Object} options
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet
 * @param {string} options.text - Texte brut
 * @param {string} [options.html] - HTML (optionnel)
 * @param {Array} [options.attachments] - Pièces jointes (optionnel)
 */
async function sendMail({ to, subject, text, html, attachments }) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@chiino.fr',
    to,
    subject,
    text,
    html,
    attachments
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
