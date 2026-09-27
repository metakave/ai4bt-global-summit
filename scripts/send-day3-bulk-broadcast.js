import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvEmails(csvPath) {
  const content = fs.readFileSync(path.resolve(process.cwd(), csvPath), 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  const emails = [];
  const seen = new Set();
  const invalid = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = parseCsvLine(line);
    
    // Column index 4 is Email
    let rawEmail = columns[4] || '';
    let email = rawEmail.replace(/\s+/g, '').toLowerCase();

    // Fallback: If column 4 is somehow not an email, find any valid email in the row
    if (!emailRegex.test(email)) {
      const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) {
        email = match[0].toLowerCase();
      }
    }

    if (email && emailRegex.test(email)) {
      if (!seen.has(email)) {
        seen.add(email);
        emails.push(email);
      }
    } else {
      invalid.push({ lineIndex: i, content: line });
    }
  }

  return { emails, invalid };
}

async function sendBroadcast() {
  const csvFile = 'data/day3_broadcast_recipients.csv';
  const { emails, invalid } = parseCsvEmails(csvFile);

  console.log(`====================================================`);
  console.log(`🚀 AI4BT Global Summit 2026 - Day 3 Broadcast Dispatcher`);
  console.log(`====================================================`);
  console.log(`📋 Total Unique Valid BCC Recipients Extracted: ${emails.length}`);
  if (invalid.length > 0) {
    console.log(`⚠️ Invalid lines found:`, invalid);
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
    connectionTimeout: 30000,
    pool: true,
    maxConnections: 1,
    maxMessages: 100
  });

  const templatePath = path.resolve(process.cwd(), 'day-3-email-template.html');
  const htmlContent = fs.readFileSync(templatePath, 'utf8');

  const subject = '🎓 [Action Required] Claim Your Digital Certificate + Day 3 Grand Finale Live Access (7:45 PM BST) | AI4BT Global Summit 2026';
  const toAddress = 'contact@ai4bt.com';
  const ccAddresses = ['sadiq@ai4bt.com', 'hello@sadiqalam.com', 'mahmud@ai4bt.com'];

  const BATCH_SIZE = 25;  // 25 BCC recipients per batch for maximum deliverability & safety
  const DELAY_MS = 6000;  // 6 seconds delay between batches to protect SMTP server reputation

  const totalBatches = Math.ceil(emails.length / BATCH_SIZE);
  console.log(`📦 Dividing into ${totalBatches} batches of up to ${BATCH_SIZE} BCC recipients each.`);
  console.log(`📬 To: ${toAddress}`);
  console.log(`📬 CC: ${ccAddresses.join(', ')}`);
  console.log(`⏱️ Safety interval: ${DELAY_MS / 1000}s cooldown between batches.`);
  console.log(`====================================================\n`);

  const deliveryReport = [];
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (let b = 0; b < totalBatches; b++) {
    const batchRecipients = emails.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchNum = b + 1;

    console.log(`📤 Dispatching Batch [${batchNum}/${totalBatches}] (${batchRecipients.length} BCC recipients)...`);

    const mailOptions = {
      from: process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>',
      to: toAddress,
      replyTo: 'notifications@ai4bt.com',
      cc: ccAddresses,
      bcc: batchRecipients,
      subject: subject,
      html: htmlContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      totalSuccessful += batchRecipients.length;
      console.log(`   ✅ Batch [${batchNum}/${totalBatches}] SENT! MessageID: ${info.messageId}`);
      deliveryReport.push({
        batch: batchNum,
        count: batchRecipients.length,
        status: 'SUCCESS',
        messageId: info.messageId,
        recipients: batchRecipients
      });
    } catch (err) {
      totalFailed += batchRecipients.length;
      console.error(`   ❌ Batch [${batchNum}/${totalBatches}] FAILED:`, err.message);
      deliveryReport.push({
        batch: batchNum,
        count: batchRecipients.length,
        status: 'FAILED',
        error: err.message,
        recipients: batchRecipients
      });
    }

    if (b < totalBatches - 1) {
      console.log(`   ⏳ Waiting ${DELAY_MS / 1000}s before next batch...`);
      await sleep(DELAY_MS);
    }
  }

  // Save full delivery report
  const reportPath = path.resolve(process.cwd(), 'data/day3_broadcast_delivery_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalExtracted: emails.length,
    totalSuccessful,
    totalFailed,
    batches: deliveryReport
  }, null, 2));

  console.log(`\n====================================================`);
  console.log(`🎉 BROADCAST COMPLETED!`);
  console.log(`====================================================`);
  console.log(`✅ Total Successfully Dispatched: ${totalSuccessful} recipients`);
  if (totalFailed > 0) {
    console.log(`❌ Total Failed: ${totalFailed} recipients`);
  }
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  console.log(`====================================================\n`);
}

sendBroadcast().catch(console.error);
