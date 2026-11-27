const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/authSecrets');

const intentosLogin = new Map();

// Tarea periódica de limpieza para liberar memoria cada 30 minutos
setInterval(() => {
  const ahora = Date.now();
  for (const [key, data] of intentosLogin.entries()) {
    if (data.bloqueadoHasta && data.bloqueadoHasta < ahora) {
      intentosLogin.delete(key);
    } else if (!data.bloqueadoHasta && ahora - data.ultimoIntento > 30 * 60 * 1000) {
      intentosLogin.delete(key);
    }
  }
}, 30 * 60 * 1000).unref();

function buildAuthCookieOptions(req, includeMaxAge = true) {
  const isHttpsRequest = Boolean(
    req.secure ||
    String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase() === 'https'
  );
  const cookieSecure = process.env.COOKIE_SECURE !== undefined
    ? String(process.env.COOKIE_SECURE).trim().toLowerCase() === 'true'
    : isHttpsRequest;

  const opts = {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/'
  };
  if (includeMaxAge) {
    opts.maxAge = 60 * 60 * 1000;
  }
  return opts;
}

// POST: /api/usuarios/login
async function login(req, res) {
  try {
    const { idUsuario, password } = req.body;

    if (!idUsuario || !password) {
      return res.status(400).json({ message: 'Debe ingresar usuario y contraseña.' });
    }

    if (typeof idUsuario !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Credenciales con formato inválido.' });
    }

    if (password.length > 100) {
      return res.status(400).json({ message: 'Contraseña excede la longitud máxima permitida.' });
    }

    const trimmedUser = idUsuario.trim().slice(0, 50);
    const userKey = trimmedUser.toLowerCase();
    const ahora = Date.now();

    // 1. REGLA DE SEGURIDAD: LÍMITE DE 3 INTENTOS FALLIDOS (OWASP Anti-Fuerza Bruta)
    const estadoIntento = intentosLogin.get(userKey);
    if (estadoIntento && estadoIntento.bloqueadoHasta && ahora < estadoIntento.bloqueadoHasta) {
      const minutosRestantes = Math.ceil((estadoIntento.bloqueadoHasta - ahora) / (60 * 1000));
      return res.status(429).json({
        message: `Has superado el límite de 3 intentos fallidos permitidos. Tu cuenta ha sido bloqueada temporalmente. Espera ${minutosRestantes} minuto(s) antes de reintentar.`
      });
    }

    // 2. Consulta segura parametrizada
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.email_usuario, u.password_hash, u.nombre_usuario,
              u.telefono_usuario, u.id_estado, u.id_rol, r.nombre_rol
       FROM usuario u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [trimmedUser]
    );

    const user = rows[0];
    const passwordValido = Boolean(user && user.password_hash) &&
      await bcrypt.compare(password, user.password_hash);

    // 3. Si la contraseña o el usuario son inválidos:
    if (!passwordValido) {
      const intentosPrevios = estadoIntento ? estadoIntento.intentos : 0;
      const nuevosIntentos = intentosPrevios + 1;

      if (nuevosIntentos >= 3) {
        intentosLogin.set(userKey, {
          intentos: nuevosIntentos,
          bloqueadoHasta: ahora + 15 * 60 * 1000, // 15 minutos de bloqueo
          ultimoIntento: ahora
        });
        return res.status(429).json({
          message: 'Has superado el límite de 3 intentos fallidos de inicio de sesión. Por motivos de seguridad, tu cuenta ha sido bloqueada temporalmente durante 15 minutos.'
        });
      } else {
        intentosLogin.set(userKey, {
          intentos: nuevosIntentos,
          bloqueadoHasta: null,
          ultimoIntento: ahora
        });
        const restantes = 3 - nuevosIntentos;
        return res.status(401).json({
          message: `Usuario o contraseña incorrectos. Te queda ${restantes} intento${restantes > 1 ? 's' : ''} antes del bloqueo temporal.`
        });
      }
    }

    // 4. Login exitoso: Resetear contador de intentos fallidos
    intentosLogin.delete(userKey);

    // Verificar si la cuenta está activa
    if (user.id_estado !== 'ACT') {
      return res.status(403).json({ message: 'Tu cuenta se encuentra inactiva. Contacta al soporte de MercaUca.' });
    }

    // 5. Generar Token JWT con claims autenticados
    const payload = {
      sub: user.id_usuario,
      unique_name: user.id_usuario,
      nombre: user.nombre_usuario,
      rol: user.id_rol,
      email: user.email_usuario
    };

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(503).json({ message: 'Configuración de autenticación no disponible en el servidor.' });
    }

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '60m'
    });

    const expiresAtUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 6. JWT EN COOKIE HTTPONLY (El token NO se expone en el body JSON ni en localStorage)
    // Protege el token contra robo o inspección mediante Cross-Site Scripting (XSS)
    res.cookie('token', token, buildAuthCookieOptions(req, true));

    // 7. Sanitización de respuesta: NO se envía el JWT en el JSON para que jamás quede expuesto al cliente
    return res.status(200).json({
      authenticated: true,
      expiresAtUtc,
      user: {
        idUsuario: user.id_usuario,
        nombreUsuario: user.nombre_usuario,
        emailUsuario: user.email_usuario,
        telefonoUsuario: user.telefono_usuario,
        idRol: user.id_rol,
        nombreRol: user.nombre_rol || ''
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ message: 'Error interno del servidor al iniciar sesión.' });
  }
}

// POST: /api/usuarios/logout
// Cierra la sesión de inmediato eliminando la Cookie HttpOnly del navegador
async function logout(req, res) {
  try {
    res.clearCookie('token', buildAuthCookieOptions(req, false));
    return res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
  } catch (err) {
    console.error('Error en logout:', err);
    return res.status(500).json({ message: 'Error al cerrar sesión.' });
  }
}

// GET: /api/usuarios/perfil
async function perfil(req, res) {
  try {
    const idUsuario = req.user.sub || req.user.unique_name;

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.email_usuario, u.telefono_usuario,
              u.id_rol, r.nombre_rol, u.id_estado
       FROM usuario u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [idUsuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const u = rows[0];
    if (u.id_estado !== 'ACT') {
      return res.status(403).json({ message: 'Acceso denegado. Tu cuenta se encuentra inactiva.' });
    }

    return res.status(200).json({
      idUsuario: u.id_usuario,
      nombreUsuario: u.nombre_usuario,
      emailUsuario: u.email_usuario,
      telefonoUsuario: u.telefono_usuario,
      idRol: u.id_rol,
      nombreRol: u.nombre_rol || '',
      idEstado: u.id_estado
    });
  } catch (err) {
    console.error('Error en perfil:', err);
    return res.status(500).json({ message: 'Error al obtener perfil.' });
  }
}

// GET: /api/usuarios/verify
async function verify(req, res) {
  try {
    const idUsuario = req.user.sub || req.user.unique_name;
    const rolToken = req.user.rol || req.user.idRol;

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.email_usuario, u.telefono_usuario,
              u.id_rol, u.id_estado, r.nombre_rol
       FROM usuario u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [idUsuario]
    );

    if (rows.length === 0 || rows[0].id_estado !== 'ACT' || !rolToken || rows[0].id_rol !== rolToken) {
      return res.status(401).json({ message: 'Sesión inválida o desactualizada. Inicia sesión nuevamente.' });
    }

    const u = rows[0];
    return res.status(200).json({
      message: 'Token válido',
      user: {
        idUsuario: u.id_usuario,
        nombre: u.nombre_usuario,
        nombreUsuario: u.nombre_usuario,
        emailUsuario: u.email_usuario,
        telefonoUsuario: u.telefono_usuario,
        rol: u.id_rol,
        idRol: u.id_rol,
        nombreRol: u.nombre_rol || ''
      }
    });
  } catch (err) {
    console.error('Error en verify:', err);
    return res.status(500).json({ message: 'Error al verificar token.' });
  }
}

module.exports = { login, logout, perfil, verify };
