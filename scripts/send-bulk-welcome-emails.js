import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';

// Load environment variables
dotenv.config();

/**
 * Configuration & Environment Setup
 */
const SMTP_HOST = process.env.SMTP_HOST || 'server903.web-hosting.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'notifications@ai4bt.com';
const SMTP_PASS = process.env.SMTP_PASS || 't*E7LEiU-*+]-dgs';
const SMTP_FROM = process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>';

const DELAY_MS = 5000; // 5 seconds delay between each email

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Load HTML template from welcome-email-template.html
 */
function getEmailTemplate(recipientName = 'Esteemed Participant', zoomLink = 'https://us06web.zoom.us/j/86798462496?pwd=qi7Zz4W2Xc0cIfDWoxep5Gl0yUYvrL.1') {
  const templatePath = path.resolve(process.cwd(), 'welcome-email-template.html');
  let html = '';

  if (fs.existsSync(templatePath)) {
    html = fs.readFileSync(templatePath, 'utf8');
  } else {
    throw new Error(`Template not found at ${templatePath}`);
  }

  // Personalize greeting if custom name provided
  if (recipientName && recipientName !== 'Esteemed Participant') {
    html = html.replace('Welcome, Esteemed Participant! 👋', `Welcome, ${escapeHtml(recipientName)}! 👋`);
  }

  // Replace Zoom link if a specific URL is provided
  if (zoomLink && zoomLink !== '#') {
    html = html.replace(/href="#"/g, `href="${escapeHtml(zoomLink)}"`);
  }

  return html;
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
 * Extract participants from Excel file (.xlsx)
 */
async function parseExcelParticipants(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Excel file not found at: ${absolutePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absolutePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const headerRow = worksheet.getRow(1);
  const headers = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').trim().toLowerCase();
    headers[colNumber] = val;
  });

  // Find column indices
  let emailCol = null;
  let nameCol = null;
  let companyCol = null;

  for (const [colNum, headerName] of Object.entries(headers)) {
    if (headerName.includes('email') || headerName.includes('e-mail') || headerName.includes('mail')) {
      if (!emailCol) emailCol = parseInt(colNum, 10);
    }
    if (headerName.includes('name') || headerName.includes('full name') || headerName.includes('participant') || headerName.includes('fullname')) {
      if (!nameCol) nameCol = parseInt(colNum, 10);
    }
    if (headerName.includes('company') || headerName.includes('organization')) {
      if (!companyCol) companyCol = parseInt(colNum, 10);
    }
  }

  const participants = [];
  const seenEmails = new Set();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers

    let emailVal = emailCol ? row.getCell(emailCol).value : null;
    let nameVal = nameCol ? row.getCell(nameCol).value : null;
    let companyVal = companyCol ? row.getCell(companyCol).value : null;

    // Handle hyperlink/rich objects in ExcelJS
    if (emailVal && typeof emailVal === 'object') {
      emailVal = emailVal.text || emailVal.result || emailVal.value || '';
    }
    if (nameVal && typeof nameVal === 'object') {
      nameVal = nameVal.text || nameVal.result || nameVal.value || '';
    }
    if (companyVal && typeof companyVal === 'object') {
      companyVal = companyVal.text || companyVal.result || companyVal.value || '';
    }

    const email = String(emailVal || '').trim().toLowerCase();
    const name = String(nameVal || '').trim();
    const company = String(companyVal || '').trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && emailRegex.test(email)) {
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        participants.push({
          rowNumber,
          email,
          name: name || 'Esteemed Participant',
          company: company || ''
        });
      }
    }
  });

  return participants;
}

/**
 * Main Dispatcher Function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const testEmailIndex = args.indexOf('--test-to');
  const testRecipient = testEmailIndex !== -1 ? args[testEmailIndex + 1] : null;
  const zoomLinkIndex = args.indexOf('--zoom-link');
  const customZoomLink = zoomLinkIndex !== -1 ? args[zoomLinkIndex + 1] : 'https://us06web.zoom.us/j/86798462496?pwd=qi7Zz4W2Xc0cIfDWoxep5Gl0yUYvrL.1';

  // Excel file argument (first non-flag arg)
  const excelFileArg = args.find((arg) => !arg.startsWith('--') && (arg.endsWith('.xlsx') || arg.endsWith('.xls') || arg.endsWith('.csv'))) || 'data/registrations.xlsx';

  console.log('====================================================');
  console.log('🚀 AI4BT Global Summit 2026 - Bulk Email Dispatcher');
  console.log('====================================================');
  console.log(`📁 Source Excel File: ${excelFileArg}`);
  console.log(`⏱️ Delay Between Emails: ${DELAY_MS / 1000} seconds`);
  console.log(`🔒 Mode: ${isDryRun ? 'DRY RUN (Simulation Only - No emails will be sent)' : testRecipient ? `TEST MODE (Sending 1 test to: ${testRecipient})` : 'LIVE BROADCAST'}`);
  console.log(`🔗 Summit Zoom Link: ${customZoomLink}`);
  console.log('----------------------------------------------------');

  let participants = [];
  try {
    participants = await parseExcelParticipants(excelFileArg);
    console.log(`✅ Loaded ${participants.length} valid unique participant(s) from Excel.\n`);
  } catch (err) {
    console.error(`❌ Failed to read Excel file: ${err.message}`);
    process.exit(1);
  }

  if (participants.length === 0) {
    console.log('⚠️ No valid email recipients found in the Excel file.');
    process.exit(0);
  }

  // If in test mode, only process test recipient
  if (testRecipient) {
    participants = [{
      rowNumber: 1,
      email: testRecipient,
      name: 'Test Delegate',
      company: 'Test Organization'
    }];
  }

  // Setup Transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 20000
  });

  if (!isDryRun) {
    try {
      console.log('🔍 Verifying SMTP Server connection...');
      await transporter.verify();
      console.log(`✅ Connected successfully to SMTP (${SMTP_HOST}:${SMTP_PORT}).\n`);
    } catch (verifyErr) {
      console.error(`❌ SMTP verification failed: ${verifyErr.message}`);
      process.exit(1);
    }
  }

  const results = {
    total: participants.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  const startTime = Date.now();

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const indexStr = `[${i + 1}/${participants.length}]`;

    console.log(`${indexStr} Preparing email for: ${p.name} <${p.email}>...`);

    const emailHtml = getEmailTemplate(p.name, customZoomLink);

    const mailOptions = {
      from: SMTP_FROM,
      to: p.email,
      subject: `Welcome to AI4BT Global Summit 2026 – Access Details & Official WhatsApp Group`,
      html: emailHtml
    };

    if (isDryRun) {
      console.log(`   🔎 [DRY RUN] Would send to: ${p.email}`);
      results.sent++;
    } else {
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`   ✅ Sent! (Message ID: ${info.messageId})`);
        results.sent++;
      } catch (sendErr) {
        console.error(`   ❌ Failed to send to ${p.email}: ${sendErr.message}`);
        results.failed++;
        results.errors.push({ email: p.email, error: sendErr.message });
      }
    }

    // Apply 5-second delay if not the last recipient
    if (i < participants.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_MS / 1000} seconds before next dispatch...\n`);
      await sleep(DELAY_MS);
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n====================================================');
  console.log('📊 DISPATCH SUMMARY');
  console.log('====================================================');
  console.log(`Total Recipients : ${results.total}`);
  console.log(`Successfully Sent: ${results.sent}`);
  console.log(`Failed           : ${results.failed}`);
  console.log(`Total Time Taken : ${totalTimeSec}s`);
  console.log('====================================================');

  if (results.errors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    results.errors.forEach((e) => console.log(` - ${e.email}: ${e.error}`));
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
