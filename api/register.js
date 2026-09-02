import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function escapeCsvField(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

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

  // Basic validation
  if (!fullName.trim() || !designation.trim() || !companyName.trim() || !mobile.trim() || !email.trim()) {
    throw new Error('Please fill in all required fields (Full Name, Designation, Company, Mobile, Email).');
  }

  const timestamp = new Date().toISOString();
  const csvRow = [
    escapeCsvField(timestamp),
    escapeCsvField(fullName.trim()),
    escapeCsvField(designation.trim()),
    escapeCsvField(companyName.trim()),
    escapeCsvField(mobile.trim()),
    escapeCsvField(whatsApp.trim() || mobile.trim()),
    escapeCsvField(email.trim()),
    escapeCsvField(linkedinUrl.trim())
  ].join(',') + '\n';

  // 1. Populate CSV file locally
  let csvSaved = false;
  const possiblePaths = [
    path.resolve(process.cwd(), 'data/registrations.csv'),
    path.resolve(process.cwd(), 'registrations.csv'),
    '/tmp/registrations.csv'
  ];

  for (const targetPath of possiblePaths) {
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(
          targetPath,
          'Timestamp,Full Name,Designation,Company Name,Mobile,WhatsApp,Email,LinkedIn URL\n'
        );
      }
      fs.appendFileSync(targetPath, csvRow);
      csvSaved = true;
      console.log(`[Registration] Appended submission to CSV at: ${targetPath}`);
      break;
    } catch (err) {
      console.warn(`[Registration] Could not write to ${targetPath}:`, err.message);
    }
  }

  // 2. Email dispatch via SMTP (if configured)
  let emailSent = false;
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpFrom = process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <no-reply@ai4bt-summit.com>';
  const notifyEmail = process.env.NOTIFY_EMAIL || '';

  if (smtpHost && smtpUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      // Confirmation email to the delegate
      const delegateMailOptions = {
        from: smtpFrom,
        to: email.trim(),
        subject: `Registration Confirmed: AI4BT Global Summit 2026`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #050A14; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
            <h2 style="color: #f59e0b; margin-top: 0;">AI4BT Global Summit 2026</h2>
            <p style="font-size: 16px; line-height: 1.6;">Dear <strong>${escapeHtml(fullName)}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">
              Thank you for registering as an Executive Delegate for the <strong>AI4BT Global Summit 2026</strong>.
            </p>
            
            <div style="background-color: #0e1726; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <h4 style="margin: 0 0 10px; color: #ffffff;">Summit Details:</h4>
              <p style="margin: 4px 0; color: #a1a1aa; font-size: 13px;">📅 <strong>Dates:</strong> 25, 26, &amp; 27 September 2026</p>
              <p style="margin: 4px 0; color: #a1a1aa; font-size: 13px;">⏰ <strong>Time:</strong> 8:00 PM – 11:00 PM Bangladesh Time (BST)</p>
              <p style="margin: 4px 0; color: #a1a1aa; font-size: 13px;">🌐 <strong>Format:</strong> Fully Online (Executive Broadcast &amp; Interactive Labs)</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; color: #e4e4e7;">
              <tr><td style="padding: 6px 0; color: #a1a1aa;">Designation:</td><td><strong>${escapeHtml(designation)}</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #a1a1aa;">Company:</td><td><strong>${escapeHtml(companyName)}</strong></td></tr>
              <tr><td style="padding: 6px 0; color: #a1a1aa;">Mobile / WhatsApp:</td><td><strong>${escapeHtml(mobile)} / ${escapeHtml(whatsApp || mobile)}</strong></td></tr>
              ${linkedinUrl ? `<tr><td style="padding: 6px 0; color: #a1a1aa;">LinkedIn:</td><td><a href="${escapeHtml(linkedinUrl)}" style="color: #38bdf8;">${escapeHtml(linkedinUrl)}</a></td></tr>` : ''}
            </table>

            <hr style="border: none; border-top: 1px solid #27272a; margin: 25px 0;">
            <p style="font-size: 12px; color: #71717a; margin-bottom: 0;">
              AI4BT Executive Council • Dhaka, Bangladesh &amp; Global Secretariat.<br>
              Direct broadcast access links will be delivered to this email address prior to Day 1.
            </p>
          </div>
        `
      };

      await transporter.sendMail(delegateMailOptions);
      emailSent = true;
      console.log(`[Registration] Confirmation email sent successfully to ${email}`);

      // Optional organizer notification email
      if (notifyEmail) {
        await transporter.sendMail({
          from: smtpFrom,
          to: notifyEmail,
          subject: `New Delegate Registration: ${fullName} (${companyName})`,
          text: `New Registration:\n\nName: ${fullName}\nDesignation: ${designation}\nCompany: ${companyName}\nEmail: ${email}\nMobile: ${mobile}\nWhatsApp: ${whatsApp || mobile}\nLinkedIn: ${linkedinUrl}\nTimestamp: ${timestamp}`
        });
      }
    } catch (mailError) {
      console.error('[Registration] SMTP email dispatch failed:', mailError.message);
    }
  } else {
    console.log('[Registration] SMTP credentials empty. Email dispatch skipped as requested. Ready for SMTP configuration.');
  }

  return {
    success: true,
    message: 'Registration successfully received and confirmed.',
    csvSaved,
    emailSent,
    delegate: {
      fullName,
      designation,
      companyName,
      email
    }
  };
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

// Default export for Vercel Serverless Function (Node.js)
export default async function handler(req, res) {
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
