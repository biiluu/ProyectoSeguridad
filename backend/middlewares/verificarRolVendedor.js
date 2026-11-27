const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getRolesMap } = require('../utils/rolesHelper');
const { getJwtSecret } = require('../utils/authSecrets');

/**
 * Extrae el token JWT priorizando la Cookie HttpOnly `token`
 * y aceptando Authorization: Bearer <jwt> como respaldo.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  if (req && req.headers && req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    for (const c of rawCookies) {
      const idx = c.indexOf('=');
      if (idx !== -1) {
        const key = c.slice(0, idx).trim();
        const value = c.slice(idx + 1).trim();
        if (key === 'token' && value) {
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        }
      }
    }
  }

  const authHeader = req && req.headers ? req.headers.authorization : null;
  if (typeof authHeader === 'string') {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1].includes('.')) {
      return parts[1];
    }
  }

  return null;
}

/**
 * Middleware de autorización para vendedores y administradores.
 * Valida JWT y comprueba en MySQL en tiempo real estado ACT y rol VEN/ADM.
 */
async function verificarRolVendedor(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(503).json({ message: 'Configuración de autenticación no disponible en el servidor.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado.', error: err.message });
  }

  const idUsuario = String(decoded.sub || decoded.unique_name || decoded.idUsuario || '').trim();
  const idRolToken = decoded.rol || decoded.idRol;

  if (!idUsuario || !idRolToken) {
    return res.status(401).json({ message: 'Token inválido: faltan claims de identidad o rol.' });
  }

  try {
    const roles = await getRolesMap();

    if (idRolToken !== roles.VEN && idRolToken !== roles.ADM) {
      return res.status(403).json({
        message: 'Acceso denegado: No tienes permisos para publicar o gestionar productos.'
      });
    }

    const [rows] = await pool.query(
      'SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = ? LIMIT 1',
      [idUsuario]
    );

    if (rows.length === 0 || rows[0].id_estado !== 'ACT') {
      return res.status(403).json({
        message: 'Acceso denegado. Tu cuenta se encuentra inactiva o no existe.'
      });
    }

    const usuarioDb = rows[0];
    if (usuarioDb.id_rol !== roles.VEN && usuarioDb.id_rol !== roles.ADM) {
      return res.status(403).json({
        message: 'Acceso denegado: No tienes permisos de vendedor vigentes.'
      });
    }

    if (usuarioDb.id_rol !== idRolToken) {
      return res.status(401).json({
        message: 'Sesión desactualizada. Inicia sesión nuevamente para refrescar tus permisos.'
      });
    }

    req.user = decoded;
    req.vendedorUser = usuarioDb;
    return next();
  } catch (err) {
    console.error('Error en middleware verificarRolVendedor:', err);
    return res.status(500).json({ message: 'Error interno al validar permisos de vendedor.', error: err.message });
  }
}

module.exports = verificarRolVendedor;
module.exports.verificarRolVendedor = verificarRolVendedor;
module.exports.extractToken = extractToken;
