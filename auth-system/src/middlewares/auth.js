// src/middlewares/auth.js
// Verifica JWT y aplica control de acceso por rol

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_este_secreto_en_produccion';

/**
 * verifyToken
 * Middleware que valida el JWT enviado en el header Authorization.
 * Si es válido, adjunta el payload a req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * checkRole(...roles)
 * Middleware factory que restringe el acceso a los roles indicados.
 *
 * Jerarquía de roles:
 *   admin > moderador > jugador > pendiente
 *
 * Uso:
 *   router.get('/admin/panel', verifyToken, checkRole('admin'), handler)
 *   router.get('/juego/:id',   verifyToken, checkRole('jugador','admin','moderador'), handler)
 */
function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de: ${roles.join(', ')}.`,
        tuRol: req.user.rol,
      });
    }
    next();
  };
}

module.exports = { verifyToken, checkRole };
