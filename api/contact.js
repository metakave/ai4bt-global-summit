import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

// Load environment variables
dotenv.config();

export function resolveDataDir() {
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return localDir;
  } catch (e) {
    const tmpDir = path.join('/tmp', 'ai4bt_data');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (_) {}
    }
    return tmpDir;
  }
}

export function getFilePath(filename) {
  return path.join(resolveDataDir(), filename);
}

const CONTACT_CSV = getFilePath('contact_inquiries.csv');
const CONTACT_XLSX = getFilePath('contact_inquiries.xlsx');

function ensureDataDir() {
  resolveDataDir();
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
 * Save / Append contact inquiry to CSV and XLSX files
 */
export async function saveContactToFile(inquiry) {
  ensureDataDir();

  // 1. Save / Append to CSV
  try {
    if (!fs.existsSync(CONTACT_CSV)) {
      fs.writeFileSync(
        CONTACT_CSV,
        'Timestamp,Inquiry ID,Full Name,Email,Phone,Address,Subject,Message\n',
        'utf8'
      );
    }
    const csvRow = [
      escapeCsvField(inquiry.timestamp),
      escapeCsvField(inquiry.inquiryId),
      escapeCsvField(inquiry.name),
      escapeCsvField(inquiry.email),
      escapeCsvField(inquiry.phone),
      escapeCsvField(inquiry.address),
      escapeCsvField(inquiry.subject),
      escapeCsvField(inquiry.message)
    ].join(',') + '\n';

    fs.appendFileSync(CONTACT_CSV, csvRow, 'utf8');
    console.log(`[Contact Storage] Appended inquiry ${inquiry.inquiryId} to CSV.`);
  } catch (err) {
    console.error('[Contact Storage Error] Failed to write CSV:', err.message);
  }

  // 2. Save / Append to XLSX using ExcelJS
  try {
    const workbook = new ExcelJS.Workbook();
    let worksheet;

    if (fs.existsSync(CONTACT_XLSX)) {
      try {
        await workbook.xlsx.readFile(CONTACT_XLSX);
        worksheet = workbook.getWorksheet('Contact Inquiries') || workbook.worksheets[0];
      } catch (readErr) {
        worksheet = null;
      }
    }

    if (!worksheet) {
      worksheet = workbook.addWorksheet('Contact Inquiries', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 22 },
        { header: 'Inquiry ID', key: 'inquiryId', width: 20 },
        { header: 'Full Name', key: 'name', width: 26 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Phone / Mobile', key: 'phone', width: 20 },
        { header: 'Physical Address', key: 'address', width: 32 },
        { header: 'Subject / Category', key: 'subject', width: 26 },
        { header: 'Message / Inquiry', key: 'message', width: 45 }
      ];

      // Format Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;
    }

    const newRow = worksheet.addRow({
      timestamp: inquiry.timestamp,
      inquiryId: inquiry.inquiryId,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      address: inquiry.address,
      subject: inquiry.subject,
      message: inquiry.message
    });

    const rowNumber = newRow.number;
    if (rowNumber % 2 === 0) {
      newRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
    }

    newRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    await workbook.xlsx.writeFile(CONTACT_XLSX);
    console.log(`[Contact Storage] Saved inquiry ${inquiry.inquiryId} to Excel (${CONTACT_XLSX}).`);
  } catch (err) {
    console.error('[Contact Storage Error] Failed to write XLSX:', err.message);
  }
}

/**
 * Generate User Confirmation Email Template
 */
function buildUserConfirmationEmail(inquiry) {
  const safeName = escapeHtml(inquiry.name);
  const safeEmail = escapeHtml(inquiry.email);
  const safePhone = escapeHtml(inquiry.phone);
  const safeAddress = escapeHtml(inquiry.address);
  const safeSubject = escapeHtml(inquiry.subject);
  const safeMessage = escapeHtml(inquiry.message).replace(/\n/g, '<br>');
  const safeInquiryId = escapeHtml(inquiry.inquiryId);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Contacting AI4BT Global Summit 2026</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #030712;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
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
    }
    .content-body {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 9999px;
      margin-bottom: 12px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px;
    }
    .paragraph {
      font-size: 14px;
      color: #cbd5e1;
      margin: 0 0 20px;
    }
    .card-box {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .detail-row {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
    }
    .detail-label {
      color: #94a3b8;
      width: 32%;
      font-weight: 600;
    }
    .detail-value {
      color: #f8fafc;
      font-weight: 500;
    }
    .btn-whatsapp {
      display: inline-block;
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      color: #ffffff !important;
      font-weight: 600;
      font-size: 13px;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      margin-top: 10px;
    }
    .footer {
      background-color: #050a14;
      padding: 28px 32px;
      text-align: center;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      color: #64748b;
    }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="email-container">
      
      <!-- Banner -->
      <div class="header-banner">
        <div class="badge">Inquiry Acknowledged</div>
        <h1 style="margin: 8px 0 0; font-size: 26px; color: #ffffff; font-weight: 800; letter-spacing: -0.02em;">
          AI4BT Global Summit 2026
        </h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #cbd5e1;">
          Enterprise AI Transformation &bull; Secretariat &amp; Advisory Council
        </p>
      </div>

      <!-- Content -->
      <div class="content-body">
        <div class="greeting">Dear ${safeName},</div>
        
        <p class="paragraph">
          Thank you for reaching out to the <strong>AI4BT Global Summit 2026 Executive Council</strong>. We have received your inquiry and our executive advisory team has logged your ticket under reference ID:
        </p>

        <div style="text-align: center; margin: 16px 0;">
          <span style="font-family: monospace; font-size: 16px; font-weight: bold; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; padding: 8px 18px; border-radius: 8px; display: inline-block;">
            ${safeInquiryId}
          </span>
        </div>

        <p class="paragraph">
          A designated council representative will review your message and respond within <strong>24 business hours</strong>.
        </p>

        <!-- Summary Card -->
        <div class="card-box">
          <div style="font-size: 12px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
            Inquiry Summary Details
          </div>
          <table style="width: 100%;">
            <tr class="detail-row">
              <td class="detail-label">Subject:</td>
              <td class="detail-value">${safeSubject}</td>
            </tr>
            <tr class="detail-row">
              <td class="detail-label">Contact Email:</td>
              <td class="detail-value">${safeEmail}</td>
            </tr>
            <tr class="detail-row">
              <td class="detail-label">Phone / Mobile:</td>
              <td class="detail-value">${safePhone}</td>
            </tr>
            <tr class="detail-row">
              <td class="detail-label">Address:</td>
              <td class="detail-value">${safeAddress}</td>
            </tr>
            <tr class="detail-row">
              <td class="detail-label" style="vertical-align: top; padding-top: 10px;">Your Message:</td>
              <td class="detail-value" style="padding-top: 10px; color: #cbd5e1; font-style: italic;">
                "${safeMessage}"
              </td>
            </tr>
          </table>
        </div>

        <!-- Direct WhatsApp Hotline -->
        <div style="text-align: center; margin: 28px 0 10px; padding: 20px; background: rgba(37, 211, 102, 0.08); border: 1px dashed rgba(37, 211, 102, 0.3); border-radius: 12px;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #86efac; font-weight: 600;">
            Need urgent assistance or executive summit consultation?
          </p>
          <a href="https://wa.me/8801718262645" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
            💬 Connect with Secretariat on WhatsApp (+880 1718-262645)
          </a>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin: 0 0 8px; color: #f8fafc; font-weight: bold;">
          AI4BT Global Summit 2026 Executive Secretariat
        </p>
        <p style="margin: 0 0 8px;">
          Dhaka, Bangladesh &bull; Global Advisory Nodes in USA &amp; UK
        </p>
        <p style="margin: 0;">
          Direct inquiries: <a href="mailto:contact@ai4bt.com">contact@ai4bt.com</a> | 
          <a href="mailto:notifications@ai4bt.com">notifications@ai4bt.com</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Admin Notification Email Template
 */
function buildAdminNotificationEmail(inquiry) {
  const safeName = escapeHtml(inquiry.name);
  const safeEmail = escapeHtml(inquiry.email);
  const safePhone = escapeHtml(inquiry.phone);
  const safeAddress = escapeHtml(inquiry.address);
  const safeSubject = escapeHtml(inquiry.subject);
  const safeMessage = escapeHtml(inquiry.message).replace(/\n/g, '<br>');
  const safeInquiryId = escapeHtml(inquiry.inquiryId);
  const safeTimestamp = escapeHtml(inquiry.timestamp);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 20px 24px; }
    .header h2 { margin: 0; font-size: 18px; color: #f59e0b; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .body { padding: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .label { font-weight: 600; color: #64748b; width: 32%; }
    .value { font-weight: 600; color: #0f172a; }
    .msg-box { margin-top: 16px; padding: 16px; background: #f1f5f9; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13px; line-height: 1.5; color: #334155; }
    .footer { background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>📬 New Contact Inquiry Received</h2>
      <p>AI4BT Global Summit 2026 Executive Portal</p>
    </div>
    <div class="body">
      <p style="margin-top: 0; font-size: 14px;">A new contact message has been submitted via the <strong>/contact</strong> page and recorded in <strong>contact_inquiries.csv</strong>.</p>
      <table>
        <tr><td class="label">Inquiry ID:</td><td class="value" style="color: #d97706; font-family: monospace;">${safeInquiryId}</td></tr>
        <tr><td class="label">Full Name:</td><td class="value">${safeName}</td></tr>
        <tr><td class="label">Email:</td><td class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td class="label">Phone / Mobile:</td><td class="value"><a href="tel:${safePhone}">${safePhone}</a></td></tr>
        <tr><td class="label">Address:</td><td class="value">${safeAddress}</td></tr>
        <tr><td class="label">Subject:</td><td class="value" style="color: #2563eb;">${safeSubject}</td></tr>
        <tr><td class="label">Timestamp:</td><td class="value">${safeTimestamp}</td></tr>
      </table>

      <div style="margin-top: 20px; font-weight: bold; font-size: 13px; color: #0f172a;">Message Content:</div>
      <div class="msg-box">
        ${safeMessage}
      </div>

      <div style="margin-top: 20px; text-align: center;">
        <a href="mailto:${safeEmail}?subject=Re:%20[${safeInquiryId}]%20${encodeURIComponent(inquiry.subject)}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
          ✉️ Reply to ${safeName}
        </a>
      </div>
    </div>
    <div class="footer">
      AI4BT Summit Secretariat Automated Routing System
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatch confirmation email to sender and admin notification to secretariat
 */
export async function sendContactEmails(inquiry) {
  let emailSent = false;
  let adminEmailSent = false;

  const smtpHost = process.env.SMTP_HOST || 'server903.web-hosting.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || 'notifications@ai4bt.com';
  const smtpPass = process.env.SMTP_PASS || 't*E7LEiU-*+]-dgs';
  const smtpFrom = process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>';
  
  const notifyEmail = process.env.NOTIFY_EMAIL || 'notifications@ai4bt.com';
  const adminCc = process.env.ADMIN_CC_EMAILS
    ? process.env.ADMIN_CC_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
    : ['hello@sadiqalam.com', 'mahmud@ai4bt.com'];

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

    // 1. Send confirmation to sender
    if (inquiry.email) {
      const userMailOptions = {
        from: smtpFrom,
        to: inquiry.email,
        cc: adminCc,
        subject: `Inquiry Received: AI4BT Global Summit 2026 [Ref: ${inquiry.inquiryId}]`,
        html: buildUserConfirmationEmail(inquiry)
      };

      const userResult = await transporter.sendMail(userMailOptions);
      emailSent = true;
      console.log(`[SMTP Contact] Confirmation sent to ${inquiry.email}, MessageID: ${userResult.messageId}`);
    }

    // 2. Send Admin Notification email
    if (notifyEmail) {
      const adminMailOptions = {
        from: smtpFrom,
        to: notifyEmail,
        cc: adminCc,
        subject: `[New Contact Inquiry] ${inquiry.name} - ${inquiry.subject} [Ref: ${inquiry.inquiryId}]`,
        html: buildAdminNotificationEmail(inquiry)
      };

      const adminResult = await transporter.sendMail(adminMailOptions);
      adminEmailSent = true;
      console.log(`[SMTP Contact] Admin notification sent to ${notifyEmail}, MessageID: ${adminResult.messageId}`);
    }

  } catch (mailError) {
    console.error('[SMTP Contact Error] Email dispatch failed:', mailError.message);
  }

  return { emailSent, adminEmailSent };
}

/**
 * Handle Contact Form submission
 */
export async function handleContactForm(data) {
  const {
    name = '',
    email = '',
    phone = '',
    address = '',
    subject = 'General Inquiry',
    message = ''
  } = data;

  if (!name.trim()) {
    throw new Error('Please enter your full name.');
  }
  if (!email.trim() || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!phone.trim()) {
    throw new Error('Please enter your contact phone / WhatsApp number.');
  }
  if (!address.trim()) {
    throw new Error('Please enter your address or location.');
  }
  if (!message.trim()) {
    throw new Error('Please enter your message or inquiry details.');
  }

  const timestamp = new Date().toISOString();
  const inquiryId = `AI4BT-CNT-${Math.floor(100000 + Math.random() * 900000)}`;

  const inquiryRecord = {
    timestamp,
    inquiryId,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    address: address.trim(),
    subject: subject.trim() || 'General Inquiry',
    message: message.trim()
  };

  // 1. Save to CSV and XLSX
  await saveContactToFile(inquiryRecord);

  // 2. Dispatch SMTP Emails
  const emailResult = await sendContactEmails(inquiryRecord);

  return {
    success: true,
    inquiryId,
    message: 'Thank you! Your inquiry has been received. Our executive team will get back to you shortly.',
    emailSent: emailResult.emailSent
  };
}
