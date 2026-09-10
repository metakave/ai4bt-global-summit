import { handleSecondStep } from './register.js';

/**
 * Vercel Serverless Function: POST /api/confirm-payment
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleSecondStep(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Confirm Payment API Error]:', error.message);
    return res.status(400).json({ success: false, error: error.message });
  }
}
