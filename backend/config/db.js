const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'leguzman14';
const dbName = process.env.DB_NAME || 'mercauca';

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Prueba de conexión inicial
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ [MySQL] Conexión exitosa a ${dbHost}:${dbPort}/${dbName}`);
    connection.release();
  } catch (err) {
    console.warn(`⚠️ [MySQL] No se pudo conectar a ${dbHost}:${dbPort} (${err.message})`);
  }
}

testConnection();

module.exports = pool;
