// Vercel Serverless Function - API Key Proxy
// Keys are stored in Vercel Environment Variables, never exposed to client

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { engine, prompt } = req.body;
  if (!engine || !prompt) return res.status(400).json({ error: 'Missing engine or prompt' });

  // Rate limiting via simple header check (Vercel edge will handle advanced rate limiting)
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  try {
    let result;
    switch (engine) {
      case 'groq':
        result = await callGroq(prompt);
        break;
      case 'gemini':
        result = await callGemini(prompt);
        break;
      case 'sambanova':
        result = await callSambanova(prompt);
        break;
      case 'mistral':
        result = await callMistral(prompt);
        break;
      default:
        return res.status(400).json({ error: 'Unknown engine' });
    }
    return res.status(200).json({ result });
  } catch (err) {
    console.error(`[${engine}] error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 2500 })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  return (await r.json()).choices[0].message.content;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.85, maxOutputTokens: 2500 } })
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  return (await r.json()).candidates[0].content.parts[0].text;
}

async function callSambanova(prompt) {
  const key = process.env.SAMBANOVA_API_KEY;
  if (!key) throw new Error('SAMBANOVA_API_KEY not configured');
  const r = await fetch('https://api.sambanova.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'Meta-Llama-3.3-70B-Instruct', messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 2500 })
  });
  if (!r.ok) throw new Error(`Sambanova ${r.status}: ${await r.text()}`);
  return (await r.json()).choices[0].message.content;
}

async function callMistral(prompt) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('MISTRAL_API_KEY not configured');
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'mistral-large-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 2500 })
  });
  if (!r.ok) throw new Error(`Mistral ${r.status}: ${await r.text()}`);
  return (await r.json()).choices[0].message.content;
}
