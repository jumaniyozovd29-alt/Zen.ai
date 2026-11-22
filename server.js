import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);
const origin = process.env.ALLOWED_ORIGIN || '*';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseAdminKey
  ? createClient(supabaseUrl, supabaseAdminKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

app.use(cors({ origin }));
app.use(express.json({ limit: '1mb' }));

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
  res.json({ ok: true, service: 'zenai-api', supabaseConfigured: Boolean(supabaseAdmin), aiProvider: process.env.AI_PROVIDER || 'none' });
});

app.get('/api/config', (_req, res) => {
  res.json({ freeLimit: 250, premiumLimit: 1500, premiumPriceUzs: 29000, integrations: { auth: Boolean(supabaseAdmin), database: Boolean(supabaseAdmin), ai: false, payments: false } });
});

app.get('/api/me', async (req, res) => {
  if (!requireConfig(res)) return;
  const user = await getUserFromBearer(req, res);
  if (!user) return;
  const { data, error } = await supabaseAdmin.from('profiles').select('id, plan, monthly_limit, usage_count, usage_month').eq('id', user.id).single();
  if (error) return res.status(500).json({ error: 'PROFILE_READ_FAILED', details: error.message });
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
  const reservation = await supabaseAdmin.rpc('reserve_usage', { p_user_id: user.id });
  if (reservation.error) return res.status(500).json({ error: 'USAGE_RESERVE_FAILED', details: reservation.error.message });
  const row = Array.isArray(reservation.data) ? reservation.data[0] : reservation.data;
  if (!row?.allowed) return res.status(429).json({ error: 'MONTHLY_LIMIT_REACHED', message: 'Oylik limit tugagan.', remaining: 0 });
  res.status(501).json({ error: 'AI_PROVIDER_NOT_CONFIGURED', message: 'Limitdan 1 ta foydalanish band qilindi, lekin AI provayder ulanmagan.', remaining: row.remaining });
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.listen(port, () => console.log('ZENAI API listening on :' + port));
