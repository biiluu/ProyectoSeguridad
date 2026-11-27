const express = require('express');
const cors = require('cors');
const path = require('node:path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = require('./config/db');
const { extractToken } = require('./middlewares/auth');
const { globalSanitizer } = require('./middlewares/sanitizer');
const { getRolesMap } = require('./utils/rolesHelper');
const { getJwtSecret } = require('./utils/authSecrets');

const app = express();
const port = process.env.PORT || 5048;
const frontendPath = path.join(__dirname, '../frontend');

app.disable('x-powered-by');

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cabeceras HTTP de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* http://127.0.0.1:*"
  );
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalSanitizer);

// Rutas API (case-insensitive para compatibilidad con frontend)
app.use(['/api/verificacion', '/api/Verificacion'], require('./routes/verificacionRoutes'));
app.use(['/api/usuarios', '/api/Usuarios'], require('./routes/registroRoutes'));
app.use(['/api/usuarios', '/api/Usuarios'], require('./routes/sesionRoutes'));
app.use(['/api/productos', '/api/Productos'], require('./routes/productosRoutes'));
app.use(['/api/novedades', '/api/Novedades'], require('./routes/novedadesRoutes'));
app.use(['/api/search', '/api/Search'], require('./routes/searchRoutes'));
app.use(['/api/carrito', '/api/Carrito'], require('./routes/carritoRoutes'));
app.use(['/api/admin/usuarios', '/api/Admin/usuarios'], require('./routes/adminUsuariosRoutes'));
app.use(['/api/admin/productos', '/api/Admin/productos'], require('./routes/adminProductosRoutes'));
app.use(['/api/admin', '/api/Admin'], require('./routes/adminDashboardRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'MercaUca API - Proyecto SED',
    database: 'MySQL 8',
    timestamp: new Date().toISOString()
  });
});

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

// Cabeceras anti-caché en vistas HTML para mitigar BFCache
app.use((req, res, next) => {
  const isHtml = req.method === 'GET' && (
    req.path.endsWith('.html') ||
    req.path === '/' ||
    req.path === '/admin' ||
    req.path === '/vender' ||
    req.path === '/mis-productos' ||
    (req.headers.accept && req.headers.accept.includes('text/html'))
  );
  if (isHtml) {
    setNoCacheHeaders(res);
  }
  next();
});

async function validarAccesoHtml(req, res, { rolesPermitidos, defaultTarget, denyMotivo }) {
  setNoCacheHeaders(res);
  const token = extractToken(req);
  const rawTarget = req.path.replace(/^\/+/, '');
  const targetHtml = rawTarget ? (rawTarget.endsWith('.html') ? rawTarget : `${rawTarget}.html`) : defaultTarget;

  if (!token) {
    res.redirect(`/login.html?redirect=${encodeURIComponent(targetHtml)}&motivo=no_autenticado`);
    return false;
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    res.redirect(`/login.html?redirect=${encodeURIComponent(targetHtml)}&motivo=no_autenticado`);
    return false;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const idUsuario = String(decoded.sub || decoded.unique_name || '').trim();
    const rolToken = decoded.rol || decoded.idRol;
    const roles = await getRolesMap();

    const [rows] = await pool.query(
      'SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = ? LIMIT 1',
      [idUsuario]
    );

    if (rows.length === 0 || rows[0].id_estado !== 'ACT' || rows[0].id_rol !== rolToken) {
      res.redirect(`/login.html?redirect=${encodeURIComponent(targetHtml)}&motivo=token_expirado`);
      return false;
    }

    const permitido = rolesPermitidos(roles).includes(rows[0].id_rol);
    if (!permitido) {
      res.redirect(`/index.html?motivo=${denyMotivo}`);
      return false;
    }

    return targetHtml;
  } catch {
    res.redirect(`/login.html?redirect=${encodeURIComponent(targetHtml)}&motivo=token_expirado`);
    return false;
  }
}

app.get(['/admin', '/admin.html', '/admin-usuarios.html', '/admin-productos.html', '/admin-ordenes.html'], async (req, res, next) => {
  const targetHtml = await validarAccesoHtml(req, res, {
    rolesPermitidos: (roles) => [roles.ADM],
    defaultTarget: 'admin.html',
    denyMotivo: 'denegado_admin'
  });
  if (!targetHtml) return;
  if (req.path === '/admin') {
    return res.sendFile(path.join(frontendPath, 'admin.html'));
  }
  return next();
});

app.get(['/vender', '/vender.html', '/mis-productos', '/mis-productos.html'], async (req, res, next) => {
  const targetHtml = await validarAccesoHtml(req, res, {
    rolesPermitidos: (roles) => [roles.VEN, roles.ADM],
    defaultTarget: 'vender.html',
    denyMotivo: 'denegado_vendedor'
  });
  if (!targetHtml) return;
  if (req.path === '/vender') {
    return res.sendFile(path.join(frontendPath, 'vender.html'));
  }
  if (req.path === '/mis-productos') {
    return res.sendFile(path.join(frontendPath, 'mis-productos.html'));
  }
  return next();
});

app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      setNoCacheHeaders(res);
    }
  }
}));

// 404 personalizado para rutas inexistentes
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: `Ruta API no encontrada: ${req.originalUrl}` });
  }
  return res.status(404).sendFile(path.join(frontendPath, '404.html'));
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('Error global no capturado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor.'
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`MercaUca API disponible en http://localhost:${port}`);
  });
}

module.exports = app;
