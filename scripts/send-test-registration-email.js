import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { sendRegistrationEmails } from '../api/register.js';

dotenv.config();

const targetEmail = 'sadiq.alam@gmail.com';

async function main() {
  console.log('====================================================');
  console.log(`🚀 Sending Test Emails to: ${targetEmail}`);
  console.log('====================================================');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'server903.web-hosting.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'notifications@ai4bt.com',
      pass: process.env.SMTP_PASS || 't*E7LEiU-*+]-dgs'
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000
  });

  // 1. Send the Registration Confirmation Email (as generated when a user registers on the website)
  console.log('\n📧 1. Dispatching Registration Confirmation Email...');
  const sampleRegistration = {
    regId: 'AI4BT-TEST-' + Math.floor(1000 + Math.random() * 9000),
    fullName: 'Sadiq Alam',
    designation: 'Managing Director & Founder',
    companyName: 'MetaKave & AI4BT Secretariat',
    mobile: '+8801709190412',
    whatsApp: '+8801709190412',
    email: targetEmail,
    linkedinUrl: 'https://www.linkedin.com/in/sadiqalam/',
    timestamp: new Date().toISOString()
  };

  try {
    const regResult = await sendRegistrationEmails(sampleRegistration);
    console.log('   ✅ Registration Confirmation Email dispatched successfully!');
  } catch (err) {
    console.error('   ❌ Error sending Registration Confirmation email:', err.message);
  }

  // 2. Send the Welcome & Summit Onboarding Template email (welcome-email-template.html)
  console.log('\n📧 2. Dispatching Welcome & Onboarding Summit Template Email (welcome-email-template.html)...');
  try {
    const templatePath = path.resolve(process.cwd(), 'welcome-email-template.html');
    const htmlContent = fs.readFileSync(templatePath, 'utf8');

    const mailOptions = {
      from: process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>',
      to: targetEmail,
      subject: '[TEST PREVIEW] Welcome to AI4BT Global Summit 2026 – Zoom Access & Official WhatsApp Group',
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Welcome Template Email sent successfully! MessageID: ${info.messageId}`);
  } catch (err) {
    console.error('   ❌ Error sending Welcome Template email:', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 All test emails have been dispatched to ' + targetEmail);
  console.log('====================================================');
}

main().catch(console.error);
