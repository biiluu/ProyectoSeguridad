const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-mercauca-integracion';
process.env.REGISTRO_TOKEN_SECRET = 'test-reg-secret-mercauca';

const ROLE_IDS = {
  ADM: 'c2ef338fce5b8f9dc946f1dd77333f0f5000af62e379f7a92393eb8238cc18e6',
  CMP: '1c28919db40d671b4e4888de61fa3a1d47783e0a813b01c681d40e9047b95bbd',
  VEN: 'e6497df97dd8170a661b99f9055b56f0b4cf8a92980936b1fa767959b28ecae6'
};

function installMockPool() {
  const dbPath = require.resolve('../config/db');
  const usuarios = [
    {
      id_usuario: 'admin01',
      nombre_usuario: 'Admin Test',
      email_usuario: 'admin01@mercauca.edu.sv',
      telefono_usuario: '77770000',
      id_estado: 'ACT',
      id_rol: ROLE_IDS.ADM,
      nombre_rol: 'Administrador',
      fecha_creacion: new Date('2026-11-01T10:00:00Z')
    },
    {
      id_usuario: 'U001',
      nombre_usuario: 'Juan Pérez',
      email_usuario: 'juan@example.com',
      telefono_usuario: '77770001',
      id_estado: 'ACT',
      id_rol: ROLE_IDS.CMP,
      nombre_rol: 'Comprador',
      fecha_creacion: new Date('2026-11-01T10:00:00Z')
    },
    {
      id_usuario: 'U002',
      nombre_usuario: 'María García',
      email_usuario: 'maria@example.com',
      telefono_usuario: '77770002',
      id_estado: 'ACT',
      id_rol: ROLE_IDS.VEN,
      nombre_rol: 'Vendedor',
      fecha_creacion: new Date('2026-11-01T10:00:00Z')
    }
  ];

  const roles = [
    { id_rol: ROLE_IDS.ADM, nombre_rol: 'Administrador' },
    { id_rol: ROLE_IDS.CMP, nombre_rol: 'Comprador' },
    { id_rol: ROLE_IDS.VEN, nombre_rol: 'Vendedor' }
  ];

  const ordenes = [
    {
      id_orden: 'ORD-001',
      id_comprador: 'U001',
      nombre_comprador: 'Juan Pérez',
      email_comprador: 'juan@example.com',
      telefono_comprador: '77770001',
      id_estado_orden: 'EO01',
      nombre_estado: 'Pendiente',
      monto_total: 215.5,
      moneda: '$',
      fechaCreacion: new Date('2026-11-10T10:00:00Z'),
      fecha_pago: null,
      fecha_cierre: null
    }
  ];

  const articulosOrden = [
    {
      id_articulo_orden: 'AO-001',
      id_orden: 'ORD-001',
      id_vendedor: 'U002',
      nombre_vendedor: 'María García',
      id_producto_variante: 'PB01',
      id_producto: 'PB01',
      titulo_producto: 'Reloj Bulova Classic',
      cantidad: 1,
      sub_total: 215.5,
      estado_articulo: 'En preparación'
    }
  ];

  async function query(sql, params = []) {
    const norm = sql.replace(/\s+/g, ' ').trim();

    if (/SELECT id_rol, nombre_rol FROM roles/i.test(norm)) {
      return [roles];
    }
    if (/SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = \?/i.test(norm)) {
      const found = usuarios.find(u => u.id_usuario === params[0]);
      return [found ? [{ id_usuario: found.id_usuario, id_rol: found.id_rol, id_estado: found.id_estado }] : []];
    }
    if (/SELECT u\.id_usuario, u\.nombre_usuario, u\.email_usuario, u\.telefono_usuario, u\.id_estado, u\.id_rol, r\.nombre_rol, u\.fecha_creacion FROM usuario u/i.test(norm)) {
      if (/WHERE u\.id_usuario = \?/i.test(norm)) {
        const found = usuarios.find(u => u.id_usuario === params[0]);
        return [found ? [found] : []];
      }
      return [usuarios];
    }
    if (/SELECT id_usuario FROM usuario WHERE id_usuario = \?/i.test(norm)) {
      const found = usuarios.find(u => u.id_usuario === params[0]);
      return [found ? [{ id_usuario: found.id_usuario }] : []];
    }
    if (/^UPDATE usuario SET /i.test(norm)) {
      const targetId = params[params.length - 1];
      const found = usuarios.find(u => u.id_usuario === targetId);
      if (found && /nombre_usuario = \?/i.test(norm)) {
        found.nombre_usuario = params[0];
      }
      return [{ affectedRows: found ? 1 : 0 }];
    }
    if (/AS totalUsuarios/i.test(norm)) {
      return [[{
        totalUsuarios: usuarios.length,
        totalAdmins: 1,
        totalCompradores: 1,
        totalVendedores: 1,
        usuariosActivos: usuarios.length
      }]];
    }
    if (/AS totalProductos/i.test(norm)) {
      return [[{ totalProductos: 6, productosBajoStock: 2 }]];
    }
    if (/AS totalOrdenes/i.test(norm)) {
      return [[{
        totalOrdenes: ordenes.length,
        totalVentas: 215.5,
        ordenesPendientes: 1,
        ordenesPagadas: 0,
        ordenesEnviadas: 0,
        ordenesEntregadas: 0
      }]];
    }
    if (/FROM orden o/i.test(norm)) {
      if (/WHERE o\.id_orden = \?/i.test(norm)) {
        const found = ordenes.find(o => o.id_orden === params[0]);
        return [found ? [{
          idOrden: found.id_orden,
          idComprador: found.id_comprador,
          nombreComprador: found.nombre_comprador,
          emailComprador: found.email_comprador,
          telefonoComprador: found.telefono_comprador,
          idEstadoOrden: found.id_estado_orden,
          nombreEstado: found.nombre_estado,
          montoTotal: found.monto_total,
          moneda: found.moneda,
          fechaCreacion: found.fechaCreacion,
          fechaPago: found.fecha_pago,
          fechaCierre: found.fecha_cierre
        }] : []];
      }
      return [ordenes.map(o => ({
        idOrden: o.id_orden,
        idComprador: o.id_comprador,
        nombreComprador: o.nombre_comprador,
        emailComprador: o.email_comprador,
        idEstadoOrden: o.id_estado_orden,
        nombreEstado: o.nombre_estado,
        montoTotal: o.monto_total,
        moneda: o.moneda,
        fechaCreacion: o.fechaCreacion,
        fechaPago: o.fecha_pago,
        fechaCierre: o.fecha_cierre
      }))];
    }
    if (/FROM articulos_orden ao/i.test(norm)) {
      return [articulosOrden.map(a => ({
        idArticuloOrden: a.id_articulo_orden,
        idOrden: a.id_orden,
        idVendedor: a.id_vendedor,
        nombreVendedor: a.nombre_vendedor,
        idProductoVariante: a.id_producto_variante,
        idProducto: a.id_producto,
        tituloProducto: a.titulo_producto,
        cantidad: a.cantidad,
        subTotal: a.sub_total,
        estadoArticulo: a.estado_articulo
      }))];
    }
    if (/SELECT id_orden FROM orden WHERE id_orden = \?/i.test(norm)) {
      const found = ordenes.find(o => o.id_orden === params[0]);
      return [found ? [{ id_orden: found.id_orden }] : []];
    }
    if (/^UPDATE orden SET id_estado_orden = \?/i.test(norm)) {
      const [estado, id] = params;
      const found = ordenes.find(o => o.id_orden === id);
      if (found) found.id_estado_orden = estado;
      return [{ affectedRows: found ? 1 : 0 }];
    }
    return [[]];
  }

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query,
      getConnection: async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} })
    }
  };
}

function makeToken(idUsuario, idRol) {
  return jwt.sign({ sub: idUsuario, unique_name: idUsuario, rol: idRol }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

installMockPool();
const app = require('../server');
const { cleanPayload } = require('../middlewares/sanitizer');

test('1. globalSanitizer bloquea prototype pollution y bytes nulos', () => {
  const dirty = JSON.parse('{"nombre":"Ana\\u0000","__proto__":{"polluted":true},"nested":{"constructor":"x","ok":1}}');
  const cleaned = cleanPayload(dirty);
  assert.equal(cleaned.nombre, 'Ana');
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned.nested, 'constructor'), false);
  assert.equal(cleaned.nested.ok, 1);
  assert.equal(({}).polluted, undefined);
});

test('2. Rutas HTML protegidas, 404 personalizado, cabeceras de seguridad y dashboard admin', async (t) => {
  const server = app.listen(0);
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 2a. Health + cabeceras
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('x-powered-by'), null);

  // 2b. Sin sesión -> /admin.html y /vender.html redirigen a login.html con redirect y motivo
  const noAuthAdmin = await fetch(`${baseUrl}/admin.html`, { redirect: 'manual' });
  assert.equal(noAuthAdmin.status, 302);
  assert.match(noAuthAdmin.headers.get('location'), /login\.html\?redirect=admin\.html&motivo=no_autenticado/);

  const noAuthVender = await fetch(`${baseUrl}/vender.html`, { redirect: 'manual' });
  assert.equal(noAuthVender.status, 302);
  assert.match(noAuthVender.headers.get('location'), /login\.html\?redirect=vender\.html&motivo=no_autenticado/);

  // 2c. Comprador intentando /admin.html -> redirige con motivo=denegado_admin
  const cmpCookie = `token=${makeToken('U001', ROLE_IDS.CMP)}`;
  const cmpAdmin = await fetch(`${baseUrl}/admin.html`, { headers: { Cookie: cmpCookie }, redirect: 'manual' });
  assert.equal(cmpAdmin.status, 302);
  assert.match(cmpAdmin.headers.get('location'), /motivo=denegado_admin/);

  // 2d. Administrador accediendo a /admin.html y /admin-ordenes.html -> 200
  const admCookie = `token=${makeToken('admin01', ROLE_IDS.ADM)}`;
  const admPage = await fetch(`${baseUrl}/admin.html`, { headers: { Cookie: admCookie }, redirect: 'manual' });
  assert.equal(admPage.status, 200);
  assert.match(admPage.headers.get('cache-control'), /no-store/);

  // 2e. 404 personalizado para ruta inexistente web y API
  const notFoundWeb = await fetch(`${baseUrl}/no-existe-esta-vista`);
  assert.equal(notFoundWeb.status, 404);
  const notFoundHtml = await notFoundWeb.text();
  assert.match(notFoundHtml, /Página no encontrada/);

  const notFoundApi = await fetch(`${baseUrl}/api/ruta-inexistente`);
  assert.equal(notFoundApi.status, 404);

  // 2f. Endpoints de Dashboard y Órdenes de Admin
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`, { headers: { Cookie: admCookie } });
  assert.equal(statsRes.status, 200);
  const statsJson = await statsRes.json();
  assert.equal(statsJson.ventas.totalOrdenes, 1);

  const ordRes = await fetch(`${baseUrl}/api/admin/ordenes`, { headers: { Cookie: admCookie } });
  assert.equal(ordRes.status, 200);
  const ordList = await ordRes.json();
  assert.equal(ordList[0].idOrden, 'ORD-001');

  const putOrd = await fetch(`${baseUrl}/api/admin/ordenes/ORD-001/estado`, {
    method: 'PUT',
    headers: { Cookie: admCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEstadoOrden: 'EO02' })
  });
  assert.equal(putOrd.status, 200);
});

test('3. Vulnerabilidad IDOR intencional preservada en /api/admin/usuarios/:id (solo token válido)', async (t) => {
  const server = app.listen(0);
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Sin token sigue bloqueado con 401
  const noTok = await fetch(`${baseUrl}/api/admin/usuarios/U002`);
  assert.equal(noTok.status, 401);

  // Comprador autenticado (U001) puede consultar y editar a otro usuario (U002) por ID (IDOR)
  const cmpCookie = `token=${makeToken('U001', ROLE_IDS.CMP)}`;
  const idorGet = await fetch(`${baseUrl}/api/admin/usuarios/U002`, { headers: { Cookie: cmpCookie } });
  assert.equal(idorGet.status, 200);
  const target = await idorGet.json();
  assert.equal(target.idUsuario, 'U002');

  // Listado general sí sigue restringido a Administrador (403 para Comprador)
  const listAsCmp = await fetch(`${baseUrl}/api/admin/usuarios`, { headers: { Cookie: cmpCookie } });
  assert.equal(listAsCmp.status, 403);
});
