import express from 'express';
import purchaseRoutes from './routes/purchaseRoutes.js';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(purchaseRoutes);
