const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing
app.use(helmet({
  contentSecurityPolicy: false // allow inline styles in our single HTML
}));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Rate limit form submissions
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { ok: false, error: 'Слишком много заявок. Попробуйте позже.' }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Form endpoint
app.post('/api/submit', formLimiter, async (req, res) => {
  try {
    const {
      parentName = '',
      childAge = '',
      phone = '',
      email = '',
      comment = '',
      subject = 'Заявка с сайта Паланте'
    } = req.body;

    // Basic validation
    if (!parentName.trim() || !childAge.trim() || !phone.trim() || !email.trim()) {
      return res.status(400).json({ ok: false, error: 'Заполните обязательные поля' });
    }

    // Honeypot (bots fill hidden field)
    if (req.body.website) {
      return res.status(200).json({ ok: true }); // silent success for bots
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.yandex.ru',
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== 'false', // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verify connection only in development if needed
    // await transporter.verify();

    const textBody = [
      `Тема: ${subject}`,
      '',
      `Имя родителей: ${parentName}`,
      `Возраст ребёнка: ${childAge}`,
      `Телефон: ${phone}`,
      `Почта: ${email}`,
      `Комментарий: ${comment || '—'}`,
      '',
      `---`,
      `Отправлено с сайта Паланте`
    ].join('\n');

    const htmlBody = `
      <h2 style="font-family: sans-serif;">${escapeHtml(subject)}</h2>
      <table style="font-family: sans-serif; border-collapse: collapse; width: 100%; max-width: 480px;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Имя родителей</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(parentName)}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Возраст ребёнка</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(childAge)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Телефон</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Почта</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Комментарий</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(comment || '—')}</td></tr>
      </table>
      <p style="font-family: sans-serif; color: #999; font-size: 12px; margin-top: 24px;">Отправлено с сайта Паланте</p>
    `;

    await transporter.sendMail({
      from: `"Паланте" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO || process.env.SMTP_USER,
      replyTo: email,
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    return res.status(500).json({ ok: false, error: 'Не удалось отправить. Попробуйте позже или напишите на почту.' });
  }
});

// Fallback to index.html for SPA-like routing (not really needed)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Palante listening on port ${PORT}`);
});
