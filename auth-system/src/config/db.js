// src/config/db.js
// Conexión al servidor Aiven MySQL via SSL (requerido por Aiven)

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'mysql-5ddca62-bosddaniel-6781.a.aivencloud.com',
  port:               parseInt(process.env.DB_PORT || '20571'),
  user:               process.env.DB_USER     || 'avnadmin',
  password:           process.env.DB_PASSWORD || 'AVNS_ccjTeep7JXGZE8IITnt',
  database:           process.env.DB_NAME     || 'jueguitosDB',
  ssl:                { rejectUnauthorized: true },   // Aiven siempre usa SSL
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

/**
 * Verifica que la conexión funcione al iniciar el servidor.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a Aiven MySQL —', process.env.DB_NAME || 'jueguitosDB');
    conn.release();
  } catch (err) {
    console.error('❌ Error de conexión a la BD:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
