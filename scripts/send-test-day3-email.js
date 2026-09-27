import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const targetEmail = 'sadiq.alam@gmail.com';

async function main() {
  console.log('====================================================');
  console.log(`🚀 Dispatching Day 3 & Grand Finale Test Email to: ${targetEmail}`);
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
    connectionTimeout: 20000
  });

  const templatePath = path.resolve(process.cwd(), 'day-3-email-template.html');
  const htmlContent = fs.readFileSync(templatePath, 'utf8');

  const subject = '🎓 [Action Required] Claim Your Digital Certificate + Day 3 Grand Finale Live Access (7:45 PM BST) | AI4BT Global Summit 2026';

  const mailOptions = {
    from: process.env.SMTP_FROM || 'AI4BT Global Summit 2026 <notifications@ai4bt.com>',
    to: targetEmail,
    replyTo: 'notifications@ai4bt.com',
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`\n✅ Day 3 Test Email successfully delivered to: ${targetEmail}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Subject: ${subject}`);
    console.log('\n====================================================');
  } catch (err) {
    console.error('❌ Error sending Day 3 test email:', err);
    process.exit(1);
  }
}

main().catch(console.error);
