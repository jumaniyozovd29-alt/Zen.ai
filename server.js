import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const aiProvider = process.env.AI_PROVIDER || 'none';
const aiApiKey = process.env.AI_API_KEY || '';
const aiBaseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\\/$/, '');
const aiModel = process.env.AI_MODEL || 'gpt-4o-mini';
const supabaseAdmin = supabaseUrl && supabaseAdminKey
  ? createClient(supabaseUrl, supabaseAdminKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

app.use(cors({ origin: (requestOrigin, callback) => { if (!requestOrigin || allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) return callback(null, true); return callback(new Error('CORS_ORIGIN_NOT_ALLOWED')); } }));
app.use(express.json({ limit: '1mb' }));

const requestBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);
function rateLimit(req, res, next) {
  const key = req.headers.authorization || req.ip || 'anonymous';
  const now = Date.now();
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= RATE_WINDOW_MS) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1; requestBuckets.set(key, bucket);
  if (bucket.count > RATE_MAX) return res.status(429).json({ error: 'RATE_LIMITED', message: 'Juda ko‘p so‘rov. Bir daqiqadan keyin qayta urinib ko‘ring.' });
  return next();
}
app.use('/api/', rateLimit);

function requireConfig(res) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseAdmin) {
    res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase environment variables hali sozlanmagan.' });
    return false;
  }
  return true;
}

async function getUserFromBearer(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'MISSING_BEARER_TOKEN', message: 'Authorization: Bearer <token> kerak.' });
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Token yaroqsiz yoki muddati tugagan.' });
    return null;
  }
  return data.user;
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'zenai-api',
    supabaseConfigured: Boolean(supabaseAdmin),
    aiProvider,
    aiConfigured: Boolean(aiApiKey && aiProvider !== 'none')
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    freeLimit: 250,
    premiumLimit: 1500,
    premiumPriceUzs: 29000,
    integrations: {
      auth: Boolean(supabaseAdmin),
      database: Boolean(supabaseAdmin),
      ai: Boolean(aiApiKey && aiProvider !== 'none'),
      payments: false
    }
  });
});

app.get('/api/me', async (req, res) => {
  if (!requireConfig(res)) return;
  const user = await getUserFromBearer(req, res);
  if (!user) return;
  const { data, error } = await supabaseAdmin.from('profiles').select('id, plan, monthly_limit, usage_count, usage_month').eq('id', user.id).single();
  if (error) return res.status(500).json({ error: 'PROFILE_READ_FAILED', details: process.env.NODE_ENV === 'production' ? undefined : error.message });
  res.json({ user: { id: user.id, email: user.email }, profile: data });
});

app.post('/api/usage/reserve', async (req, res) => {
  if (!requireConfig(res)) return;
  const user = await getUserFromBearer(req, res);
  if (!user) return;
  const { data, error } = await supabaseAdmin.rpc('reserve_usage', { p_user_id: user.id });
  if (error) return res.status(500).json({ error: 'USAGE_RESERVE_FAILED', details: error.message });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) return res.status(429).json({ error: 'MONTHLY_LIMIT_REACHED', message: 'Oylik limit tugagan.', plan: row?.plan || null, remaining: 0 });
  res.json({ allowed: true, plan: row.plan, remaining: row.remaining });
});

app.post('/api/chat', async (req, res) => {
  if (!requireConfig(res)) return;
  const user = await getUserFromBearer(req, res);
  if (!user) return;
  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'MESSAGE_REQUIRED', message: 'message matni kerak.' });
  if (message.length > 8000) return res.status(413).json({ error: 'MESSAGE_TOO_LONG', message: 'Xabar 8000 belgidan oshmasin.' });
  const reservation = await supabaseAdmin.rpc('reserve_usage', { p_user_id: user.id });
  if (reservation.error) return res.status(500).json({ error: 'USAGE_RESERVE_FAILED', details: reservation.error.message });
  const row = Array.isArray(reservation.data) ? reservation.data[0] : reservation.data;
  if (!row?.allowed) return res.status(429).json({ error: 'MONTHLY_LIMIT_REACHED', message: 'Oylik limit tugagan.', remaining: 0 });
  if (!aiApiKey || aiProvider === 'none') {
    await supabaseAdmin.rpc('refund_usage', { p_user_id: user.id });
    return res.status(503).json({ error: 'AI_PROVIDER_NOT_CONFIGURED', message: 'AI provayder sozlanmagan. Limit qaytarildi.', remaining: row.remaining + 1 });
  }
  try {
    const response = await fetch(aiBaseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiApiKey },
      body: JSON.stringify({
        model: aiModel,
        messages: [{ role: 'user', content: message.trim() }],
        temperature: 0.7
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'AI provider request failed');
    const reply = payload?.choices?.[0]?.message?.content || '';
    if (!reply) throw new Error('AI provider returned an empty response');
    return res.json({ reply, remaining: row.remaining, provider: aiProvider, model: aiModel });
  } catch (error) {
    await supabaseAdmin.rpc('refund_usage', { p_user_id: user.id });
    return res.status(502).json({ error: 'AI_PROVIDER_FAILED', message: 'AI provayderdan javob olishda xatolik. Limit qaytarildi.', details: error.message });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.listen(port, () => console.log('ZENAI API listening on :' + port));
