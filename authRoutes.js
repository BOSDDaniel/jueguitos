// src/routes/authRoutes.js

const express    = require('express');
const router     = express.Router();
const authService = require('../services/authService');
const { verifyToken, checkRole } = require('../middlewares/auth');

// ── POST /api/auth/registro ───────────────────────────────────────────────────
// Crea usuario nuevo con rol 'pendiente'. Requiere aprobación manual.
router.post('/registro', async (req, res) => {
  const { nombre, correo, password } = req.body;
  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'nombre, correo y password son requeridos.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
  }
  try {
    const usuario = await authService.register({ nombre, correo, password });
    res.status(201).json({
      mensaje: '✅ Registro exitoso. Espera a que un admin apruebe tu cuenta.',
      usuario,
    });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password) {
    return res.status(400).json({ error: 'correo y password son requeridos.' });
  }
  try {
    const ip        = req.ip;
    const userAgent = req.headers['user-agent'];
    const data      = await authService.login({ correo, password }, ip, userAgent);
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Retorna info del usuario autenticado (útil para el frontend)
router.get('/me', verifyToken, (req, res) => {
  res.json({ usuario: req.user });
});

// ── GET /api/admin/usuarios ───────────────────────────────────────────────────
// Lista todos los usuarios — solo admin / moderador
router.get('/admin/usuarios', verifyToken, checkRole('admin', 'moderador'), async (_req, res) => {
  const usuarios = await authService.listarUsuarios();
  res.json({ usuarios });
});

// ── PATCH /api/admin/usuarios/:id/rol ────────────────────────────────────────
// Aprueba o cambia el rol de un usuario — solo admin
// Body: { "rol": "jugador" }
router.patch(
  '/admin/usuarios/:id/rol',
  verifyToken,
  checkRole('admin'),
  async (req, res) => {
    const targetId = parseInt(req.params.id);
    const { rol }  = req.body;
    if (!rol) return res.status(400).json({ error: 'Proporciona el campo "rol".' });
    try {
      const result = await authService.cambiarRol(targetId, rol, req.user.sub);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
