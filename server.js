import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT || 3000);
const origin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({ origin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'zenai-api', aiProvider: process.env.AI_PROVIDER || 'none' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    freeLimit: 250,
    premiumLimit: 1500,
    premiumPriceUzs: 29000,
    integrations: { auth: false, database: false, ai: false, payments: false }
  });
});

app.post('/api/chat', (_req, res) => {
  res.status(501).json({
    error: 'AI_PROVIDER_NOT_CONFIGURED',
    message: 'AI provayder hali ulanmagan. API kaliti server muhitiga qo‘shilgandan keyin endpoint faollashtiriladi.'
  });
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

app.listen(port, () => console.log('ZENAI API listening on :' + port));
