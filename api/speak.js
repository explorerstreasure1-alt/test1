// Vercel Serverless Function - Text to Speech via Hugging Face
// Microsoft SpeechT5 model - gür ve şiirsel ses

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) throw new Error('HF_TOKEN not configured');

    // Microsoft SpeechT5 TTS
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/speecht5_tts',
      {
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ 
          inputs: text,
          options: { use_cache: false }
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HF API error: ${response.status} - ${err}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('[TTS] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
