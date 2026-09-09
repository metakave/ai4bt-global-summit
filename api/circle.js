import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'summit_circle.csv');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Save / Append email to summit_circle.csv
 */
export async function saveCircleMemberToFile(email) {
  ensureDataDir();
  const timestamp = new Date().toISOString();

  try {
    if (!fs.existsSync(CSV_FILE)) {
      fs.writeFileSync(
        CSV_FILE,
        'Timestamp,Email,Status\n',
        'utf8'
      );
    }
    const csvRow = [
      escapeCsvField(timestamp),
      escapeCsvField(email),
      escapeCsvField('Active')
    ].join(',') + '\n';

    fs.appendFileSync(CSV_FILE, csvRow, 'utf8');
    console.log(`[Summit Circle] Appended ${email} to CSV.`);
  } catch (err) {
    console.error('[Summit Circle Storage Error] Failed to write CSV:', err.message);
  }
}

/**
 * Generate Executive Thank You Email Template for Summit Circle Member
 */
function buildCircleThankYouEmail(email) {
  const safeEmail = escapeHtml(email);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the AI4BT Summit Circle</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .email-container {
      max-width: 640px;
      margin: 0 auto;
      background-color: #0b1324;
      border: 1px solid #1e293b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .header-banner {
      background: linear-gradient(135deg, #091122 0%, #0d1b38 50%, #172554 100%);
      padding: 40px 32px 30px;
      text-align: center;
      border-bottom: 2px solid #f59e0b;
      position: relative;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #f59e0b;
      border-radius: 9999px;
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .title {
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 8px 0;
      line-height: 1.25;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
      font-weight: 400;
    }
    .content-body {
      padding: 32px 32px 24px;
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.7;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    .perks-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .perks-title {
      color: #fbbf24;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .perk-item {
      display: flex;
      margin-bottom: 12px;
      font-size: 13px;
      line-height: 1.5;
      color: #e2e8f0;
    }
    .perk-bullet {
      color: #f59e0b;
      margin-right: 10px;
      font-weight: bold;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000000 !important;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      text-decoration: none;
      border-radius: 8px;
      margin: 16px 0;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    }
    .footer {
      background-color: #060b16;
      border-top: 1px solid #1e293b;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="email-container">
      
      <!-- Banner Header -->
      <div class="header-banner">
        <div class="badge">AI4BT Summit Circle • Exclusive Access</div>
        <h1 class="title">Welcome to the Summit Circle</h1>
        <p class="subtitle">AI4BT Global Summit 2026 • 25–27 September 2026</p>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        <p class="greeting">Welcome to the Inner Network,</p>
        <p class="paragraph">
          Thank you for joining the <strong>AI4BT Summit Circle</strong> with your email <code>${safeEmail}</code>. You are now connected to an elite network of global transformation pioneers, enterprise leaders, and researchers driving South Asia's AI-native revolution.
        </p>

        <!-- What You Will Receive -->
        <div class="perks-card">
          <div class="perks-title">Your Summit Circle Privileges:</div>
          <div class="perk-item">
            <span class="perk-bullet">✓</span>
            <span><strong>Exclusive Recorded Video Sessions:</strong> Full access to keynote sessions, breakout discussions, and agentic ERP demonstrations.</span>
          </div>
          <div class="perk-item">
            <span class="perk-bullet">✓</span>
            <span><strong>Executive Research &amp; Whitepapers:</strong> Direct access to the <em>AI4BT Enterprise Readiness Pulse</em> and strategic frameworks.</span>
          </div>
          <div class="perk-item">
            <span class="perk-bullet">✓</span>
            <span><strong>Industry Insights:</strong> Periodic high-impact analysis and practical AI blueprints authored by summit keynotes and partners.</span>
          </div>
          <div class="perk-item">
            <span class="perk-bullet">✓</span>
            <span><strong>Priority Invitations:</strong> Advanced access to future AI4BT executive roundtables and mastermind sessions.</span>
          </div>
        </div>

        <p class="paragraph">
          If you have not yet registered as a live delegate for the summit proceedings (25–27 September 2026), you can secure your executive seat below:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://www.ai4btglobalsummit.com/register" class="cta-button" target="_blank">
            Register to the Summit →
          </a>
        </div>

        <p class="paragraph" style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
          Warm regards,<br>
          <strong style="color: #ffffff;">AI4BT Executive Council &amp; Secretariat</strong><br>
          <span style="font-size: 12px;">Connecting Global AI Pioneers to Bangladesh Enterprise Transformation</span>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 8px;">
          <strong>AI4BT Global Summit 2026</strong> • Official Summit Portal
        </p>
        <p style="margin: 0 0 8px;">
          Direct Inquiries: <a href="mailto:contact@ai4bt.com">contact@ai4bt.com</a> | 
          <a href="mailto:notifications@ai4bt.com">notifications@ai4bt.com</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #475569;">
          You received this email because you subscribed to the AI4BT Summit Circle at ai4btglobalsummit.com.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Main handler to process Summit Circle email submission
 */
export async function handleCircleJoin(data) {
  const { email } = data || {};

  if (!email || !email.trim() || !email.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Save to CSV
  await saveCircleMemberToFile(cleanEmail);

  // 2. Email dispatch via SMTP
  let emailSent = false;

  const smtpHost = process.env.SMTP_HOST || 'server903.web-hosting.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || 'notifications@ai4bt.com';
  const smtpPass = process.env.SMTP_PASS || 'mR(Btx*7p6h%2ldy';
  const smtpFrom = process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>';
  
  const adminBcc = ['hello@sadiqalam.com', 'mahmud@ai4bt.com'];

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost === 'ai4bt.com' ? 'server903.web-hosting.com' : smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000
    });

    // Send Thank You confirmation email to the subscriber with BCC to admin team
    const mailOptions = {
      from: smtpFrom,
      to: cleanEmail,
      bcc: adminBcc,
      subject: `Welcome to the AI4BT Summit Circle — Exclusive Access & Executive Insights`,
      html: buildCircleThankYouEmail(cleanEmail)
    };

    const result = await transporter.sendMail(mailOptions);
    emailSent = true;
    console.log(`[Summit Circle SMTP] Confirmation email sent to ${cleanEmail} (BCC: ${adminBcc.join(', ')}), MessageID: ${result.messageId}`);
  } catch (mailError) {
    console.error('[Summit Circle SMTP Error] Email dispatch failed:', mailError.message);
  }

  return {
    success: true,
    message: 'Thank you for joining the Summit Circle! Your confirmation briefing has been sent to your inbox.',
    email: cleanEmail,
    emailSent
  };
}

/**
 * Default export for Vercel Serverless Function & Node.js HTTP handlers
 */
export default async function handler(req, res) {
  // Support downloading CSV via GET /api/circle
  if (req.method === 'GET') {
    if (fs.existsSync(CSV_FILE)) {
      const stat = fs.statSync(CSV_FILE);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="ai4bt_summit_circle.csv"');
      const readStream = fs.createReadStream(CSV_FILE);
      return readStream.pipe(res);
    } else {
      return res.status(404).json({ success: false, error: 'No summit circle members file found yet.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleCircleJoin(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Summit Circle API Error]:', error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
}
