const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getRolesMap } = require('../utils/rolesHelper');
const { getJwtSecret } = require('../utils/authSecrets');

/**
 * Extrae el token JWT priorizando la Cookie HttpOnly (token=<jwt>)
 * con respaldo opcional para cabecera Authorization (Bearer <jwt>)
 */
function extractToken(req) {
  // 1. Prioridad: Cookie nativa HttpOnly
  if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    for (const c of rawCookies) {
      const idx = c.indexOf('=');
      if (idx !== -1) {
        const k = c.slice(0, idx).trim();
        const v = c.slice(idx + 1).trim();
        if (k === 'token' && v) {
          return decodeURIComponent(v);
        }
      }
    }
  }

  // 2. Respaldo: Cabecera Authorization: Bearer <jwt>
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1].includes('.')) {
      return parts[1];
    }
  }

  return null;
}

/**
 * Middleware base para validar el Token JWT (soporta Cookie HttpOnly y Bearer Header)
 */
function verifyToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(503).json({ message: 'Configuración de autenticación no disponible en el servidor.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { sub, unique_name, nombre, rol, email, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado.', error: err.message });
  }
}

/**
 * Middleware de seguridad estricto: verificarRolAdmin
 * Lee el JWT, comprueba su validez y verifica que el rol corresponda a Administrador tanto en el payload
 * como en la base de datos en tiempo real (evita accesos si el admin fue revocado o desactivado).
 */
async function verificarRolAdmin(req, res, next) {
  verifyToken(req, res, async () => {
    try {
      const idRol = req.user.rol || req.user.idRol;
      const idUsuario = req.user.sub || req.user.unique_name;
      const roles = await getRolesMap();

      if (!idRol || idRol !== roles.ADM) {
        return res.status(403).json({
          message: 'Acceso denegado: No tienes permisos para acceder a esta sección.'
        });
      }

      const [rows] = await pool.query(
        'SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = ?',
        [idUsuario]
      );

      if (rows.length === 0) {
        return res.status(403).json({ message: 'Acceso denegado: Usuario no encontrado en el sistema.' });
      }

      const usuarioDb = rows[0];

      if (usuarioDb.id_estado !== 'ACT') {
        return res.status(403).json({ message: 'Acceso denegado: La cuenta se encuentra inactiva.' });
      }

      if (usuarioDb.id_rol !== roles.ADM) {
        return res.status(403).json({ message: 'Acceso denegado: No tienes permisos para acceder a esta sección.' });
      }

      req.adminUser = usuarioDb;
      next();
    } catch (err) {
      console.error('Error en middleware verificarRolAdmin:', err);
      return res.status(500).json({ message: 'Error interno al validar permisos.', error: err.message });
    }
  });
}

/**
 * Middleware de seguridad: verificarRolVendedor
 * Valida el JWT y asegura que el usuario posea rol de Vendedor o Administrador.
 * Si un Comprador intenta publicar productos, se le deniega el acceso con 403 Forbidden.
 */
async function verificarRolVendedor(req, res, next) {
  verifyToken(req, res, async () => {
    try {
      const idRol = req.user.rol || req.user.idRol;
      const idUsuario = req.user.sub || req.user.unique_name;
      const roles = await getRolesMap();

      if (!idRol || (idRol !== roles.VEN && idRol !== roles.ADM)) {
        return res.status(403).json({
          message: 'Acceso denegado: No tienes permisos para acceder a esta sección.'
        });
      }

      const [rows] = await pool.query(
        'SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = ?',
        [idUsuario]
      );

      if (rows.length === 0 || rows[0].id_estado !== 'ACT') {
        return res.status(403).json({ message: 'Acceso denegado. Tu cuenta se encuentra inactiva o no existe.' });
      }

      if (rows[0].id_rol !== roles.VEN && rows[0].id_rol !== roles.ADM) {
        return res.status(403).json({
          message: 'Acceso denegado: No tienes permisos para acceder a esta sección.'
        });
      }

      req.vendedorUser = rows[0];
      next();
    } catch (err) {
      console.error('Error en middleware verificarRolVendedor:', err);
      return res.status(500).json({ message: 'Error interno al validar permisos de vendedor.', error: err.message });
    }
  });
}

// Exportación compatible
verifyToken.verifyToken = verifyToken;
verifyToken.verificarRolAdmin = verificarRolAdmin;
verifyToken.verificarRolVendedor = verificarRolVendedor;
verifyToken.extractToken = extractToken;

module.exports = verifyToken;
module.exports.verifyToken = verifyToken;
module.exports.verificarRolAdmin = verificarRolAdmin;
module.exports.verificarRolVendedor = verificarRolVendedor;
module.exports.extractToken = extractToken;
