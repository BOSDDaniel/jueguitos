// src/index.js
// Punto de entrada del servidor

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', authRoutes);   // Las rutas /admin/... también están en authRoutes

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Arranque ──────────────────────────────────────────────────────────────────
(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
})();
