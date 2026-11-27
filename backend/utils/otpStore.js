const { randomInt } = require('node:crypto');
const pool = require('../config/db');

async function guardarCodigo(email) {
  const destino = email.trim().toLowerCase();
  const codigo = String(randomInt(100000, 1000000));

  await pool.query(
    `INSERT INTO codigos_verificacion (email, codigo, expira, usado)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE), 0)`,
    [destino, codigo]
  );

  return { email: destino, codigo };
}

async function validarYEliminarCodigo(email, codigo) {
  const destino = email.trim().toLowerCase();

  const [filas] = await pool.query(
    `SELECT id FROM codigos_verificacion
     WHERE email = ?
     ORDER BY id DESC LIMIT 1`,
    [destino]
  );

  if (filas.length === 0) return false;

  const [resultado] = await pool.query(
    `UPDATE codigos_verificacion
     SET usado = 1
     WHERE id = ? AND codigo = ? AND usado = 0 AND expira > UTC_TIMESTAMP()`,
    [filas[0].id, codigo]
  );

  return resultado.affectedRows === 1;
}

module.exports = { guardarCodigo, validarYEliminarCodigo };
