import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getBroadcastHtml() {
  const templatePath = path.resolve(process.cwd(), 'welcome-email-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Update greeting as requested: "Dear Participants of AI4BT Global Summit 2026,"
  html = html.replace(
    /<h2 style="[^"]*">[^<]*<\/h2>/,
    `<h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Dear Participants of AI4BT Global Summit 2026,</h2>`
  );

  // Update sign-off as requested: "AI4BT Global Summit Organizing Team"
  html = html.replace(
    /<span style="color: #f59e0b;">The AI4BT Global Summit Team<\/span>/,
    `<span style="color: #f59e0b; font-weight: bold;">AI4BT Global Summit Organizing Team</span>`
  );

  return html;
}

function parseCsvEmails(csvPath) {
  const content = fs.readFileSync(path.resolve(process.cwd(), csvPath), 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  const emails = [];
  const seen = new Set();
  const invalid = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    if (parts.length >= 2) {
      let rawEmail = parts.slice(1).join(',').trim();
      // Clean possible spaces in email
      let email = rawEmail.replace(/\s+/g, '').toLowerCase();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && emailRegex.test(email)) {
        if (!seen.has(email)) {
          seen.add(email);
          emails.push(email);
        }
      } else {
        invalid.push(rawEmail);
      }
    }
  }

  return { emails, invalid };
}

async function sendBroadcast() {
  const csvFile = 'data/participants_bulk.csv';
  const { emails, invalid } = parseCsvEmails(csvFile);

  console.log(`====================================================`);
  console.log(`🚀 AI4BT Global Summit 2026 - Batched Broadcast Dispatcher`);
  console.log(`====================================================`);
  console.log(`📋 Total Unique Valid BCC Recipients: ${emails.length}`);
  if (invalid.length > 0) {
    console.log(`⚠️ Invalid email strings found & skipped:`, invalid);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'server903.web-hosting.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'notifications@ai4bt.com',
      pass: process.env.SMTP_PASS || 't*E7LEiU-*+]-dgs'
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 30000
  });

  const htmlContent = getBroadcastHtml();
  const BATCH_SIZE = 30; // 30 recipients per batch to respect SMTP server limits
  const DELAY_MS = 5000;  // 5 seconds between batches

  const totalBatches = Math.ceil(emails.length / BATCH_SIZE);
  console.log(`📦 Dividing into ${totalBatches} batches of up to ${BATCH_SIZE} BCC recipients each.`);
  console.log(`⏱️ 5-second interval between batches.\n`);

  let sentRecipientsCount = 0;

  for (let b = 0; b < totalBatches; b++) {
    const batchRecipients = emails.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchNum = b + 1;

    console.log(`📤 Dispatching Batch [${batchNum}/${totalBatches}] (${batchRecipients.length} BCC recipients)...`);

    const mailOptions = {
      from: 'AI4BT Global Summit 2026 <notifications@ai4bt.com>',
      to: 'admin@ai4bt.com',
      replyTo: 'notifications@ai4bt.com',
      cc: ['mahmud@ai4bt.com', 'sadiq@ai4bt.com'],
      bcc: batchRecipients,
      subject: 'Welcome to AI4BT Global Summit 2026 – Zoom Access & Official WhatsApp Group',
      html: htmlContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      sentRecipientsCount += batchRecipients.length;
      console.log(`   ✅ Batch [${batchNum}/${totalBatches}] sent successfully! MessageID: ${info.messageId}`);
    } catch (err) {
      console.error(`   ❌ Failed to send Batch [${batchNum}/${totalBatches}]:`, err.message);
    }

    if (b < totalBatches - 1) {
      console.log(`   ⏳ Waiting ${DELAY_MS / 1000}s before next batch...\n`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n====================================================`);
  console.log(`📊 BROADCAST COMPLETE`);
  console.log(`====================================================`);
  console.log(`Total Recipients Emailed : ${sentRecipientsCount}/${emails.length}`);
  console.log(`====================================================`);
}

sendBroadcast().catch(err => {
  console.error('❌ Fatal error during broadcast:', err);
  process.exit(1);
});
