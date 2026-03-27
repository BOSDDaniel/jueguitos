// src/services/authService.js
// Registro, login y utilidades de autorización

const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const { pool }   = require('../config/db');

const SALT_ROUNDS  = 12;
const JWT_SECRET   = process.env.JWT_SECRET || 'cambia_este_secreto_en_produccion';
const JWT_EXPIRES  = process.env.JWT_EXPIRES || '8h';

// ─── REGISTRO ────────────────────────────────────────────────────────────────
/**
 * Crea un usuario nuevo con rol 'pendiente'.
 * Un admin deberá cambiarle el rol a 'jugador' manualmente.
 */
async function register({ nombre, correo, password }) {
  // 1. Verificar duplicado
  const [rows] = await pool.query(
    'SELECT id FROM usuarios WHERE correo = ?',
    [correo]
  );
  if (rows.length) throw new Error('El correo ya está registrado.');

  // 2. Hash de contraseña
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Insertar — rol 4 = 'pendiente'
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre, correo, password_hash, rol_id)
     VALUES (?, ?, ?, 4)`,
    [nombre, correo, password_hash]
  );

  // 4. Log de auditoría
  await _log(result.insertId, 'registro');

  return { id: result.insertId, nombre, correo, rol: 'pendiente' };
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
/**
 * Valida credenciales y retorna un JWT si todo es correcto.
 * Usuarios con rol 'pendiente' pueden autenticarse pero recibirán
 * un token con acceso mínimo; el middleware checkRole se encarga
 * de bloquearlos en las rutas protegidas.
 */
async function login({ correo, password }, ip, userAgent) {
  // 1. Buscar usuario con su rol
  const [rows] = await pool.query(
    `SELECT u.id, u.nombre, u.correo, u.password_hash, u.activo,
            r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON u.rol_id = r.id
     WHERE u.correo = ?`,
    [correo]
  );

  if (!rows.length) throw new Error('Credenciales inválidas.');

  const user = rows[0];
  if (!user.activo) throw new Error('Cuenta desactivada. Contacta al administrador.');

  // 2. Verificar contraseña
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Credenciales inválidas.');

  // 3. Actualizar último login
  await pool.query(
    'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
    [user.id]
  );

  // 4. Log
  await _log(user.id, 'login', ip, userAgent);

  // 5. Generar JWT
  const payload = { sub: user.id, nombre: user.nombre, rol: user.rol };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return { token, usuario: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol } };
}

// ─── GESTIÓN DE ROLES (solo admins) ──────────────────────────────────────────
/**
 * Cambia el rol de un usuario.
 * @param {number} targetId  - ID del usuario a modificar
 * @param {string} nuevoRol  - Nombre del rol: 'jugador' | 'moderador' | 'admin' | 'pendiente'
 * @param {number} adminId   - ID del admin que realiza el cambio
 */
async function cambiarRol(targetId, nuevoRol, adminId) {
  const [rolRows] = await pool.query(
    'SELECT id FROM roles WHERE nombre = ?',
    [nuevoRol]
  );
  if (!rolRows.length) throw new Error(`Rol '${nuevoRol}' no existe.`);

  await pool.query(
    'UPDATE usuarios SET rol_id = ? WHERE id = ?',
    [rolRows[0].id, targetId]
  );

  await _log(targetId, 'cambio_rol');
  return { mensaje: `Rol de usuario ${targetId} cambiado a '${nuevoRol}'.` };
}

/**
 * Lista todos los usuarios (sin hash de contraseña).
 */
async function listarUsuarios() {
  const [rows] = await pool.query('SELECT * FROM vista_usuarios');
  return rows;
}

// ─── INTERNO ─────────────────────────────────────────────────────────────────
async function _log(usuario_id, accion, ip = null, user_agent = null) {
  await pool.query(
    `INSERT INTO sesiones_log (usuario_id, accion, ip, user_agent)
     VALUES (?, ?, ?, ?)`,
    [usuario_id, accion, ip, user_agent]
  );
}

module.exports = { register, login, cambiarRol, listarUsuarios };
