import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

// Load environment variables
dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'registrations.csv');
const XLSX_FILE = path.join(DATA_DIR, 'registrations.xlsx');

// Ensure data directory exists
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
 * Append registration to both CSV and formatted XLSX files
 */
export async function saveRegistrationToFile(reg) {
  ensureDataDir();

  // 1. Save / Append to CSV
  try {
    if (!fs.existsSync(CSV_FILE)) {
      fs.writeFileSync(
        CSV_FILE,
        'Timestamp,Registration ID,Full Name,Designation,Company Name,Mobile,WhatsApp,Email,LinkedIn URL\n',
        'utf8'
      );
    }
    const csvRow = [
      escapeCsvField(reg.timestamp),
      escapeCsvField(reg.regId),
      escapeCsvField(reg.fullName),
      escapeCsvField(reg.designation),
      escapeCsvField(reg.companyName),
      escapeCsvField(reg.mobile),
      escapeCsvField(reg.whatsApp || reg.mobile),
      escapeCsvField(reg.email),
      escapeCsvField(reg.linkedinUrl || '')
    ].join(',') + '\n';

    fs.appendFileSync(CSV_FILE, csvRow, 'utf8');
    console.log(`[Storage] Appended registration ${reg.regId} to CSV.`);
  } catch (err) {
    console.error('[Storage Error] Failed to write CSV:', err.message);
  }

  // 2. Save / Append to XLSX using ExcelJS
  try {
    const workbook = new ExcelJS.Workbook();
    let worksheet;

    if (fs.existsSync(XLSX_FILE)) {
      try {
        await workbook.xlsx.readFile(XLSX_FILE);
        worksheet = workbook.getWorksheet('Registrations') || workbook.worksheets[0];
      } catch (readErr) {
        console.warn('[Storage] Could not read existing XLSX, creating fresh workbook:', readErr.message);
        worksheet = null;
      }
    }

    if (!worksheet) {
      worksheet = workbook.addWorksheet('Registrations', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      worksheet.columns = [
        { header: 'Timestamp (BST / UTC)', key: 'timestamp', width: 24 },
        { header: 'Registration ID', key: 'regId', width: 20 },
        { header: 'Full Name', key: 'fullName', width: 26 },
        { header: 'Designation', key: 'designation', width: 26 },
        { header: 'Company / Organization', key: 'companyName', width: 28 },
        { header: 'Mobile Number', key: 'mobile', width: 20 },
        { header: 'WhatsApp Number', key: 'whatsApp', width: 20 },
        { header: 'Email Address', key: 'email', width: 32 },
        { header: 'LinkedIn Profile', key: 'linkedinUrl', width: 36 }
      ];

      // Format Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Deep Slate / Navy
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 28;
    }

    const newRow = worksheet.addRow({
      timestamp: reg.timestamp,
      regId: reg.regId,
      fullName: reg.fullName,
      designation: reg.designation,
      companyName: reg.companyName,
      mobile: reg.mobile,
      whatsApp: reg.whatsApp || reg.mobile,
      email: reg.email,
      linkedinUrl: reg.linkedinUrl || ''
    });

    newRow.font = { name: 'Calibri', size: 10 };
    newRow.alignment = { vertical: 'middle', horizontal: 'left' };
    newRow.height = 22;

    // Apply alternating zebra row colors
    const rowNumber = newRow.number;
    if (rowNumber % 2 === 0) {
      newRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
    }

    // Apply light border
    newRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    await workbook.xlsx.writeFile(XLSX_FILE);
    console.log(`[Storage] Saved registration ${reg.regId} to Excel (${XLSX_FILE}).`);
  } catch (err) {
    console.error('[Storage Error] Failed to write XLSX:', err.message);
  }
}

/**
 * Generate Executive HTML Thank You Email Template for Registered Delegate
 */
function buildDelegateThankYouEmail(reg) {
  const safeName = escapeHtml(reg.fullName);
  const safeDesignation = escapeHtml(reg.designation);
  const safeCompany = escapeHtml(reg.companyName);
  const safeMobile = escapeHtml(reg.mobile);
  const safeWhatsApp = escapeHtml(reg.whatsApp || reg.mobile);
  const safeEmail = escapeHtml(reg.email);
  const safeLinkedIn = escapeHtml(reg.linkedinUrl || 'Not provided');
  const safeRegId = escapeHtml(reg.regId);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI4BT Global Summit 2026 Registration Confirmation</title>
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
    .summit-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-left: 4px solid #38bdf8;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px;
    }
    .info-item {
      font-size: 13px;
      color: #cbd5e1;
      margin: 6px 0;
      display: flex;
      align-items: center;
    }
    .reg-details-table {
      width: 100%;
      margin: 24px 0;
      background: #09101f;
      border: 1px solid #1e293b;
      border-radius: 10px;
      overflow: hidden;
    }
    .reg-details-table td {
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 1px solid #1e293b;
    }
    .reg-details-table tr:last-child td {
      border-bottom: none;
    }
    .td-label {
      color: #64748b;
      width: 38%;
      font-weight: 600;
    }
    .td-val {
      color: #f1f5f9;
      font-weight: 600;
    }
    .highlight-box {
      background: rgba(245, 158, 11, 0.08);
      border: 1px dashed rgba(245, 158, 11, 0.4);
      border-radius: 10px;
      padding: 18px;
      margin: 24px 0;
    }
    .footer {
      background: #070c18;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #030712;">
  <div class="email-container">
    <!-- Header -->
    <div class="header-banner">
      <div class="badge">Official Confirmation</div>
      <h1 class="title">AI4BT Global Summit 2026</h1>
      <p class="subtitle">Next-Generation Artificial Intelligence &amp; Business Transformation</p>
    </div>

    <!-- Body -->
    <div class="content-body">
      <h2 class="greeting">Dear ${safeName},</h2>
      <p class="paragraph">
        Thank you for registering as an <strong>Executive Delegate</strong> for the <strong>AI4BT Global Summit 2026</strong>. Your seat has been successfully reserved in our executive delegation register.
      </p>

      <!-- Key Summit Schedule Card -->
      <div class="summit-card">
        <div class="card-title">🗓️ Summit Broadcast Schedule</div>
        <div class="info-item"><strong>📅 Dates:</strong>&nbsp;25, 26, &amp; 27 September 2026 (3-Day Executive Track)</div>
        <div class="info-item"><strong>⏰ Time:</strong>&nbsp;8:00 PM – 11:00 PM Bangladesh Time (BST) / 10:00 AM – 1:00 PM EDT</div>
        <div class="info-item"><strong>🌐 Access Mode:</strong>&nbsp;High-Definition Virtual Broadcast &amp; Interactive AI Labs</div>
      </div>

      <!-- Registration Credentials Table -->
      <table class="reg-details-table">
        <tr>
          <td class="td-label">Registration ID:</td>
          <td class="td-val" style="color: #fbbf24; font-family: monospace; font-size: 14px;">${safeRegId}</td>
        </tr>
        <tr>
          <td class="td-label">Full Name:</td>
          <td class="td-val">${safeName}</td>
        </tr>
        <tr>
          <td class="td-label">Designation:</td>
          <td class="td-val">${safeDesignation}</td>
        </tr>
        <tr>
          <td class="td-label">Organization:</td>
          <td class="td-val">${safeCompany}</td>
        </tr>
        <tr>
          <td class="td-label">Mobile / WhatsApp:</td>
          <td class="td-val">${safeMobile} ${safeWhatsApp && safeWhatsApp !== safeMobile ? '(' + safeWhatsApp + ')' : ''}</td>
        </tr>
        <tr>
          <td class="td-label">Registered Email:</td>
          <td class="td-val">${safeEmail}</td>
        </tr>
        ${reg.linkedinUrl ? `
        <tr>
          <td class="td-label">LinkedIn:</td>
          <td class="td-val"><a href="${safeLinkedIn}" style="color: #38bdf8; text-decoration: none;">${safeLinkedIn}</a></td>
        </tr>` : ''}
      </table>

      <!-- What to Expect -->
      <div class="highlight-box">
        <h4 style="margin: 0 0 8px; color: #fbbf24; font-size: 14px;">What Happens Next?</h4>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          • <strong>Access Credentials:</strong> Your private livestream portal credentials and interactive lab access keys will be delivered to this email address 48 hours prior to Day 1.<br>
          • <strong>Summit Materials:</strong> Executive briefings, speaker slides, and resource toolkits will be accessible through the delegate portal during the summit.
        </p>
      </div>

      <p class="paragraph" style="margin-bottom: 0;">
        We look forward to welcoming you to three days of groundbreaking insights, real-world case studies, and high-impact enterprise AI strategies.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 8px;"><strong>AI4BT Executive Council &amp; Secretariat</strong></p>
      <p style="margin: 0 0 8px;">Dhaka, Bangladesh • Global Secretariat</p>
      <p style="margin: 0;">
        Direct inquiries: <a href="mailto:notifications@ai4bt.com">notifications@ai4bt.com</a> | 
        <a href="mailto:hello@sadiqalam.com">hello@sadiqalam.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Admin Notification Email Template
 */
function buildAdminNotificationEmail(reg) {
  const safeName = escapeHtml(reg.fullName);
  const safeDesignation = escapeHtml(reg.designation);
  const safeCompany = escapeHtml(reg.companyName);
  const safeMobile = escapeHtml(reg.mobile);
  const safeWhatsApp = escapeHtml(reg.whatsApp || reg.mobile);
  const safeEmail = escapeHtml(reg.email);
  const safeLinkedIn = escapeHtml(reg.linkedinUrl || 'Not provided');
  const safeRegId = escapeHtml(reg.regId);

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
    .label { font-weight: 600; color: #64748b; width: 35%; }
    .value { font-weight: 600; color: #0f172a; }
    .footer { background: #f8fafc; padding: 16px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>🎉 New Delegate Registration Received</h2>
      <p>AI4BT Global Summit 2026 Executive Portal</p>
    </div>
    <div class="body">
      <p style="margin-top: 0; font-size: 14px;">A new delegate has registered for the AI4BT Global Summit 2026 and has been automatically appended to the server's <strong>registrations.xlsx</strong> database.</p>
      <table>
        <tr><td class="label">Reg ID:</td><td class="value" style="color: #d97706; font-family: monospace;">${safeRegId}</td></tr>
        <tr><td class="label">Full Name:</td><td class="value">${safeName}</td></tr>
        <tr><td class="label">Designation:</td><td class="value">${safeDesignation}</td></tr>
        <tr><td class="label">Company:</td><td class="value">${safeCompany}</td></tr>
        <tr><td class="label">Email:</td><td class="value"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td class="label">Mobile:</td><td class="value">${safeMobile}</td></tr>
        <tr><td class="label">WhatsApp:</td><td class="value">${safeWhatsApp}</td></tr>
        <tr><td class="label">LinkedIn:</td><td class="value"><a href="${safeLinkedIn}">${safeLinkedIn}</a></td></tr>
        <tr><td class="label">Timestamp:</td><td class="value">${escapeHtml(reg.timestamp)}</td></tr>
      </table>
    </div>
    <div class="footer">
      Automated Registration Dispatch • Database: <code>data/registrations.xlsx</code> &amp; <code>data/registrations.csv</code>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Primary handler for processing a registration submission
 */
export async function handleRegistration(data) {
  const {
    fullName = '',
    designation = '',
    companyName = '',
    mobile = '',
    whatsApp = '',
    email = '',
    linkedinUrl = ''
  } = data;

  // Validation
  if (!fullName.trim() || !designation.trim() || !companyName.trim() || !mobile.trim() || !email.trim()) {
    throw new Error('Please fill in all required fields (Full Name, Designation, Company, Mobile, Email).');
  }

  const timestamp = new Date().toISOString();
  const regId = `AI4BT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const registrationRecord = {
    timestamp,
    regId,
    fullName: fullName.trim(),
    designation: designation.trim(),
    companyName: companyName.trim(),
    mobile: mobile.trim(),
    whatsApp: whatsApp.trim() || mobile.trim(),
    email: email.trim(),
    linkedinUrl: linkedinUrl.trim()
  };

  // 1. Save to Excel (.xlsx) and CSV
  await saveRegistrationToFile(registrationRecord);

  // 2. Email dispatch via SMTP
  let emailSent = false;
  let adminEmailSent = false;

  // Host configuration: Use configured host or fallback to direct mail server host if apex domain is Cloudflare-proxied
  const smtpHost = process.env.SMTP_HOST || 'server903.web-hosting.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || 'notifications@ai4bt.com';
  const smtpPass = process.env.SMTP_PASS || 'mR(Btx*7p6h%2ldy';
  const smtpFrom = process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>';
  
  const notifyEmail = process.env.NOTIFY_EMAIL || 'notifications@ai4bt.com';
  const adminCc = ['hello@sadiqalam.com', 'mahmud@ai4bt.com'];

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

    // 2a. Send Thank You confirmation email to the delegate, CC to hello@sadiqalam.com and mahmud@ai4bt.com
    const delegateMailOptions = {
      from: smtpFrom,
      to: registrationRecord.email,
      cc: adminCc,
      subject: `Registration Confirmed: AI4BT Global Summit 2026 [Ref: ${regId}]`,
      html: buildDelegateThankYouEmail(registrationRecord)
    };

    const delegateResult = await transporter.sendMail(delegateMailOptions);
    emailSent = true;
    console.log(`[SMTP] Thank You email sent to ${registrationRecord.email} (CC: ${adminCc.join(', ')}), MessageID: ${delegateResult.messageId}`);

    // 2b. Send Admin Notification email to notifications@ai4bt.com, CC to hello@sadiqalam.com and mahmud@ai4bt.com
    if (notifyEmail) {
      const adminMailOptions = {
        from: smtpFrom,
        to: notifyEmail,
        cc: adminCc,
        subject: `[New Registration] ${registrationRecord.fullName} (${registrationRecord.companyName}) [${regId}]`,
        html: buildAdminNotificationEmail(registrationRecord)
      };

      const adminResult = await transporter.sendMail(adminMailOptions);
      adminEmailSent = true;
      console.log(`[SMTP] Admin notification sent to ${notifyEmail} (CC: ${adminCc.join(', ')}), MessageID: ${adminResult.messageId}`);
    }

  } catch (mailError) {
    console.error('[SMTP Error] Email dispatch failed:', mailError.message);
  }

  return {
    success: true,
    message: 'Registration successfully received, saved to server Excel database, and confirmation email dispatched.',
    regId,
    xlsxSaved: true,
    emailSent,
    adminEmailSent,
    delegate: {
      regId,
      fullName: registrationRecord.fullName,
      designation: registrationRecord.designation,
      companyName: registrationRecord.companyName,
      email: registrationRecord.email
    }
  };
}

/**
 * Default export for Vercel Serverless Function & Node.js HTTP handlers
 */
export default async function handler(req, res) {
  // Support downloading XLSX via GET /api/register?export=xlsx or /api/download-registrations
  if (req.method === 'GET') {
    if (fs.existsSync(XLSX_FILE)) {
      const stat = fs.statSync(XLSX_FILE);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'attachment; filename="ai4bt_global_summit_registrations.xlsx"');
      const readStream = fs.createReadStream(XLSX_FILE);
      return readStream.pipe(res);
    } else {
      return res.status(404).json({ success: false, error: 'No registrations file found yet.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleRegistration(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Registration API Error]:', error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
}
