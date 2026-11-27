const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-mercauca-productos';

const ROLE_IDS = {
  ADM: 'c2ef338fce5b8f9dc946f1dd77333f0f5000af62e379f7a92393eb8238cc18e6',
  CMP: '1c28919db40d671b4e4888de61fa3a1d47783e0a813b01c681d40e9047b95bbd',
  VEN: 'e6497df97dd8170a661b99f9055b56f0b4cf8a92980936b1fa767959b28ecae6'
};

// Firmas binarias mínimas reales para probar Magic Bytes
const PNG_MAGIC_BUF = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
const JPEG_MAGIC_BUF = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
const WEBP_MAGIC_BUF = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

function createMockDbState() {
  return {
    simulateMissingCarritoTable: true,
    orderProtectedProductIds: new Set(['ORD_LOCKED_1']),
    roles: [
      { id_rol: ROLE_IDS.ADM, nombre_rol: 'Administrador' },
      { id_rol: ROLE_IDS.CMP, nombre_rol: 'Comprador' },
      { id_rol: ROLE_IDS.VEN, nombre_rol: 'Vendedor' }
    ],
    usuarios: [
      { id_usuario: 'U001', nombre_usuario: 'Juan Pérez', id_rol: ROLE_IDS.CMP, id_estado: 'ACT' },
      { id_usuario: 'U002', nombre_usuario: 'María García', id_rol: ROLE_IDS.VEN, id_estado: 'ACT' },
      { id_usuario: 'U003', nombre_usuario: 'Carlos Vendedor', id_rol: ROLE_IDS.VEN, id_estado: 'ACT' },
      { id_usuario: 'U_INA', nombre_usuario: 'Vendedor Inactivo', id_rol: ROLE_IDS.VEN, id_estado: 'INA' },
      { id_usuario: 'admin_mercauca', nombre_usuario: 'Admin', id_rol: ROLE_IDS.ADM, id_estado: 'ACT' }
    ],
    categorias: [
      { id_categoria: 'CAT001', nombre_categoria: 'Relojes', categoria_activa: 1 },
      { id_categoria: 'CAT003', nombre_categoria: 'Electrónica', categoria_activa: 1 },
      { id_categoria: 'CATS01', nombre_categoria: 'Slider y Ofertas', categoria_activa: 1 }
    ],
    condiciones: [
      { id_condicion: 'C001', nombre: 'Nuevo' },
      { id_condicion: 'C002', nombre: 'Usado - Como nuevo' }
    ],
    productos: [
      {
        id_producto: 'PSD01',
        id_vendedor: 'ProductoMediaSlider',
        titulo_producto: 'Banner Slider Principal',
        descripcion: 'Promoción slider',
        marca: 'MercaUca',
        id_condicion: 'C001',
        id_categoria: 'CATS01',
        precio: 199.0,
        foto: JPEG_MAGIC_BUF,
        fechaCreacion: new Date('2026-11-01T10:00:00Z'),
        fechaModificacion: new Date('2026-11-01T10:00:00Z')
      },
      {
        id_producto: 'PB01',
        id_vendedor: 'U002',
        titulo_producto: 'Reloj Bulova Classic',
        descripcion: 'Reloj de acero inoxidable',
        marca: 'Bulova',
        id_condicion: 'C001',
        id_categoria: 'CAT001',
        precio: 215.5,
        foto: JPEG_MAGIC_BUF,
        fechaCreacion: new Date('2026-11-02T10:00:00Z'),
        fechaModificacion: new Date('2026-11-02T10:00:00Z')
      },
      {
        id_producto: 'PB02',
        id_vendedor: 'U003',
        titulo_producto: 'Calculadora Casio fx-991LAX',
        descripcion: 'Calculadora científica',
        marca: 'Casio',
        id_condicion: 'C002',
        id_categoria: 'CAT003',
        precio: 24.0,
        foto: PNG_MAGIC_BUF,
        fechaCreacion: new Date('2026-11-03T10:00:00Z'),
        fechaModificacion: new Date('2026-11-03T10:00:00Z')
      },
      {
        id_producto: 'ORD_LOCKED_1',
        id_vendedor: 'U002',
        titulo_producto: 'Audífonos con orden histórica',
        descripcion: 'Ya vendidos en una orden',
        marca: 'Sony',
        id_condicion: 'C001',
        id_categoria: 'CAT003',
        precio: 45.0,
        foto: null,
        fechaCreacion: new Date('2026-11-04T10:00:00Z'),
        fechaModificacion: new Date('2026-11-04T10:00:00Z')
      }
    ],
    media: [
      { id_media: 'MED01', id_producto: 'PSD01', posicion_galeria: 0, producto_primario: 1, Novedades: 1 },
      { id_media: 'MED02', id_producto: 'PB01', posicion_galeria: 0, producto_primario: 1, Novedades: 1 },
      { id_media: 'MED03', id_producto: 'PB02', posicion_galeria: 0, producto_primario: 1, Novedades: 1 },
      { id_media: 'MED04', id_producto: 'ORD_LOCKED_1', posicion_galeria: 0, producto_primario: 1, Novedades: 1 }
    ],
    variantes: [
      { id_producto_variante: 'PSD01', id_producto: 'PSD01', stock: 5 },
      { id_producto_variante: 'PB01', id_producto: 'PB01', stock: 8 },
      { id_producto_variante: 'PB02', id_producto: 'PB02', stock: 3 },
      { id_producto_variante: 'ORD_LOCKED_1', id_producto: 'ORD_LOCKED_1', stock: 0 }
    ]
  };
}

let dbState = createMockDbState();

function likePatternToRegex(pattern) {
  const raw = String(pattern || '').replace(/^\^?%?|%?$/g, '');
  const unescaped = raw.replace(/\\([%_\\])/g, '$1');
  const escapedRegex = unescaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escapedRegex, 'i');
}

async function mockQuery(sql, params = []) {
  const q = sql.replace(/\s+/g, ' ').trim();

  if (q.startsWith('SELECT id_rol, nombre_rol FROM roles')) {
    return [dbState.roles];
  }

  if (q.startsWith('SELECT id_usuario, id_rol, id_estado FROM usuario WHERE id_usuario = ?')) {
    const u = dbState.usuarios.find(x => x.id_usuario === params[0]);
    return [u ? [u] : []];
  }

  if (q.startsWith('SELECT id_categoria AS idCategoria, nombre_categoria AS nombreCategoria FROM categoria')) {
    return [
      dbState.categorias
        .filter(c => c.categoria_activa === 1 && c.id_categoria !== 'CATS01')
        .map(c => ({ idCategoria: c.id_categoria, nombreCategoria: c.nombre_categoria }))
    ];
  }

  if (q.startsWith('SELECT id_condicion AS idCondicion, nombre FROM condicion_producto')) {
    return [dbState.condiciones.map(c => ({ idCondicion: c.id_condicion, nombre: c.nombre }))];
  }

  if (q.includes('FROM productos p') && q.includes("WHERE p.id_producto NOT LIKE 'PS%'")) {
    let idx = 0;
    let items = dbState.productos.filter(
      p => !p.id_producto.startsWith('PS') && p.id_vendedor !== 'ProductoMediaSlider' && p.id_categoria !== 'CATS01'
    );
    if (q.includes('AND p.id_categoria = ?')) {
      const cat = params[idx++];
      items = items.filter(p => p.id_categoria === cat);
    }
    if (q.includes('LOWER(p.titulo_producto) LIKE ?')) {
      const rx = likePatternToRegex(params[idx++]);
      idx++; // segundo patrón
      items = items.filter(p => rx.test(p.titulo_producto) || rx.test(p.marca));
    }
    items = [...items].sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    return [
      items.map(p => {
        const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
        const c = dbState.categorias.find(x => x.id_categoria === p.id_categoria);
        const cp = dbState.condiciones.find(x => x.id_condicion === p.id_condicion);
        return {
          idProducto: p.id_producto,
          idProductoVariante: v?.id_producto_variante || p.id_producto,
          tituloProducto: p.titulo_producto,
          marca: p.marca,
          idCategoria: p.id_categoria,
          nombreCategoria: c?.nombre_categoria || 'General',
          idCondicion: p.id_condicion,
          nombreCondicion: cp?.nombre || 'N/A',
          precio: p.precio,
          foto: p.foto,
          stock: v?.stock ?? 0
        };
      })
    ];
  }

  if (q.includes('FROM productos p') && q.includes('INNER JOIN producto_media pm')) {
    const items = dbState.productos
      .filter(p => {
        const m = dbState.media.find(x => x.id_producto === p.id_producto);
        return m && m.Novedades === 1 && !p.id_producto.startsWith('PS') && p.id_vendedor !== 'ProductoMediaSlider' && p.id_categoria !== 'CATS01';
      })
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    return [
      items.map(p => {
        const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
        const c = dbState.categorias.find(x => x.id_categoria === p.id_categoria);
        return {
          idProducto: p.id_producto,
          idProductoVariante: v?.id_producto_variante || p.id_producto,
          tituloProducto: p.titulo_producto,
          marca: p.marca,
          idCategoria: p.id_categoria,
          nombreCategoria: c?.nombre_categoria || 'General',
          precio: p.precio,
          foto: p.foto,
          stock: v?.stock ?? 0
        };
      })
    ];
  }

  if (q.includes('SELECT id_producto AS idProducto, titulo_producto AS tituloProducto, foto FROM productos')) {
    const items = dbState.productos.filter(
      p => p.id_vendedor === params[0] || p.id_categoria === 'CATS01'
    );
    return [items.map(p => ({ idProducto: p.id_producto, tituloProducto: p.titulo_producto, foto: p.foto }))];
  }

  if (q.includes('WHERE (LOWER(p.titulo_producto) LIKE ?')) {
    const term = String(params[1] || '').replace(/^%|%$/g, '').replace(/\\([%_\\])/g, '$1').toLowerCase();
    const items = dbState.productos.filter(
      p =>
        !p.id_producto.startsWith('PS') &&
        p.id_vendedor !== 'ProductoMediaSlider' &&
        p.id_categoria !== 'CATS01' &&
        (p.titulo_producto.toLowerCase().includes(term) || p.marca.toLowerCase().includes(term))
    );
    return [
      items.map(p => {
        const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
        return {
          idProducto: p.id_producto,
          idProductoVariante: v?.id_producto_variante || p.id_producto,
          tituloProducto: p.titulo_producto,
          precio: p.precio,
          foto: p.foto,
          stock: v?.stock ?? 0
        };
      })
    ];
  }

  if (q.includes('WHERE p.id_producto = ? OR vp.id_producto_variante = ?')) {
    const id = params[0];
    const p = dbState.productos.find(x => {
      const v = dbState.variantes.find(y => y.id_producto === x.id_producto);
      return x.id_producto === id || (v && v.id_producto_variante === id);
    });
    if (!p) return [[]];
    const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
    const c = dbState.categorias.find(x => x.id_categoria === p.id_categoria);
    const cp = dbState.condiciones.find(x => x.id_condicion === p.id_condicion);
    const u = dbState.usuarios.find(x => x.id_usuario === p.id_vendedor);
    return [[{
      idProducto: p.id_producto,
      tituloProducto: p.titulo_producto,
      descripcion: p.descripcion,
      marca: p.marca,
      precio: p.precio,
      idCondicion: p.id_condicion,
      nombreCondicion: cp?.nombre || 'N/A',
      idCategoria: p.id_categoria,
      nombreCategoria: c?.nombre_categoria || 'General',
      idVendedor: p.id_vendedor,
      nombreVendedor: u?.nombre_usuario || p.id_vendedor,
      foto: p.foto,
      idProductoVariante: v?.id_producto_variante || p.id_producto,
      stock: v?.stock ?? 0
    }]];
  }

  if (q.includes('WHERE p.id_vendedor = ?')) {
    let idx = 0;
    const idVendedor = params[idx++];
    let items = dbState.productos.filter(
      p => p.id_vendedor === idVendedor && !p.id_producto.startsWith('PS') && p.id_categoria !== 'CATS01'
    );
    if (q.includes('AND p.id_categoria = ?')) {
      const cat = params[idx++];
      items = items.filter(p => p.id_categoria === cat);
    }
    if (q.includes('LOWER(p.titulo_producto) LIKE ?')) {
      const rx = likePatternToRegex(params[idx++]);
      idx += 2;
      items = items.filter(p => rx.test(p.titulo_producto) || rx.test(p.marca) || rx.test(p.id_producto));
    }
    return [
      items.map(p => {
        const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
        const c = dbState.categorias.find(x => x.id_categoria === p.id_categoria);
        const cp = dbState.condiciones.find(x => x.id_condicion === p.id_condicion);
        return {
          ...p,
          nombre_categoria: c?.nombre_categoria || 'General',
          nombre_condicion: cp?.nombre || 'N/A',
          id_producto_variante: v?.id_producto_variante || p.id_producto,
          stock: v?.stock ?? 0
        };
      })
    ];
  }

  if (q.includes('FROM productos p') && q.includes('WHERE p.id_producto = ? LIMIT 1')) {
    const p = dbState.productos.find(x => x.id_producto === params[0]);
    if (!p) return [[]];
    const v = dbState.variantes.find(x => x.id_producto === p.id_producto);
    const c = dbState.categorias.find(x => x.id_categoria === p.id_categoria);
    const cp = dbState.condiciones.find(x => x.id_condicion === p.id_condicion);
    return [[{
      ...p,
      nombre_categoria: c?.nombre_categoria || 'General',
      nombre_condicion: cp?.nombre || 'N/A',
      id_producto_variante: v?.id_producto_variante || p.id_producto,
      stock: v?.stock ?? 0
    }]];
  }

  if (q.startsWith('INSERT INTO productos')) {
    const [id_producto, id_vendedor, titulo_producto, descripcion, marca, id_condicion, foto, id_categoria, precio] = params;
    dbState.productos.push({
      id_producto,
      id_vendedor,
      titulo_producto,
      descripcion,
      marca,
      id_condicion,
      foto,
      id_categoria,
      precio,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    });
    return [{ affectedRows: 1 }];
  }

  if (q.startsWith('INSERT INTO producto_media')) {
    const [id_media, id_producto] = params;
    dbState.media.push({ id_media, id_producto, posicion_galeria: 0, producto_primario: 0, Novedades: 1 });
    return [{ affectedRows: 1 }];
  }

  if (q.startsWith('INSERT INTO variantes_productos')) {
    const [id_producto_variante, id_producto, stock] = params;
    dbState.variantes.push({ id_producto_variante, id_producto, stock });
    return [{ affectedRows: 1 }];
  }

  if (q.startsWith('UPDATE productos SET')) {
    const [titulo_producto, descripcion, marca, precio, id_categoria, id_condicion, foto, id_producto] = params;
    const p = dbState.productos.find(x => x.id_producto === id_producto);
    if (p) {
      Object.assign(p, { titulo_producto, descripcion, marca, precio, id_categoria, id_condicion, foto, fechaModificacion: new Date() });
    }
    return [{ affectedRows: p ? 1 : 0 }];
  }

  if (q.startsWith('UPDATE variantes_productos SET stock = ? WHERE id_producto = ?')) {
    const [stock, id_producto] = params;
    const v = dbState.variantes.find(x => x.id_producto === id_producto);
    if (v) v.stock = stock;
    return [{ affectedRows: v ? 1 : 0 }];
  }

  if (q.startsWith('DELETE FROM articulos_carrito')) {
    if (dbState.simulateMissingCarritoTable) {
      const err = new Error("Table 'mercauca.articulos_carrito' doesn't exist");
      err.code = 'ER_NO_SUCH_TABLE';
      throw err;
    }
    return [{ affectedRows: 0 }];
  }

  if (q.startsWith('DELETE FROM variantes_productos WHERE id_producto = ?')) {
    const id_producto = params[0];
    if (dbState.orderProtectedProductIds.has(id_producto)) {
      const err = new Error('Cannot delete or update a parent row: a foreign key constraint fails');
      err.code = 'ER_ROW_IS_REFERENCED_2';
      err.errno = 1451;
      throw err;
    }
    dbState.variantes = dbState.variantes.filter(v => v.id_producto !== id_producto);
    return [{ affectedRows: 1 }];
  }

  if (q.startsWith('DELETE FROM producto_media WHERE id_producto = ?')) {
    dbState.media = dbState.media.filter(m => m.id_producto !== params[0]);
    return [{ affectedRows: 1 }];
  }

  if (q.startsWith('DELETE FROM productos WHERE id_producto = ?')) {
    dbState.productos = dbState.productos.filter(p => p.id_producto !== params[0]);
    return [{ affectedRows: 1 }];
  }

  throw new Error(`Consulta SQL no simulada en test: ${q}`);
}

const mockPool = {
  query: mockQuery,
  async getConnection() {
    let snapshot = null;
    return {
      query: mockQuery,
      async beginTransaction() {
        snapshot = structuredClone(dbState);
      },
      async commit() {
        snapshot = null;
      },
      async rollback() {
        if (snapshot) {
          dbState = snapshot;
          snapshot = null;
        }
      },
      release() {}
    };
  }
};

// Inyectar mock de DB antes de cargar controladores y middlewares
const dbModulePath = path.resolve(__dirname, '../config/db.js');
require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  exports: mockPool
};

const { validarFotoProducto, bufferToDataUrl } = require('../utils/imagenProducto');
const productosRoutes = require('../routes/productosRoutes');
const novedadesRoutes = require('../routes/novedadesRoutes');
const searchRoutes = require('../routes/searchRoutes');

function signToken(idUsuario, rol) {
  return jwt.sign(
    { sub: idUsuario, unique_name: idUsuario, rol },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

let server;
let baseUrl;

test.before(async () => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(['/api/productos', '/api/Productos'], productosRoutes);
  app.use(['/api/novedades', '/api/Novedades'], novedadesRoutes);
  app.use(['/api/search', '/api/Search'], searchRoutes);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test.beforeEach(() => {
  dbState = createMockDbState();
});

test('1. validarFotoProducto detecta Magic Bytes reales y rechaza archivos alterados o > 5MB', () => {
  assert.equal(validarFotoProducto(null).valido, false);
  assert.equal(validarFotoProducto({ mimetype: 'image/jpeg', buffer: Buffer.from('<html>xss</html>') }).valido, false);
  assert.equal(validarFotoProducto({ mimetype: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0x89) }).valido, false);

  assert.equal(validarFotoProducto({ mimetype: 'image/jpeg', buffer: JPEG_MAGIC_BUF }).valido, true);
  assert.equal(validarFotoProducto({ mimetype: 'image/png', buffer: PNG_MAGIC_BUF }).valido, true);
  assert.equal(validarFotoProducto({ mimetype: 'image/webp', buffer: WEBP_MAGIC_BUF }).valido, true);

  assert.match(bufferToDataUrl(PNG_MAGIC_BUF), /^data:image\/png;base64,/);
  assert.match(bufferToDataUrl(WEBP_MAGIC_BUF), /^data:image\/webp;base64,/);
  assert.match(bufferToDataUrl(JPEG_MAGIC_BUF), /^data:image\/jpeg;base64,/);
});

test('2. Catálogo público, novedades, búsqueda y detalle excluyen elementos del slider', async () => {
  const resCat = await fetch(`${baseUrl}/api/productos/catalogos`);
  assert.equal(resCat.status, 200);
  const catalogos = await resCat.json();
  assert.equal(catalogos.categorias.some(c => c.idCategoria === 'CATS01'), false);

  const resList = await fetch(`${baseUrl}/api/Productos`);
  assert.equal(resList.status, 200);
  const lista = await resList.json();
  assert.equal(lista.some(p => p.idProducto === 'PSD01'), false);
  assert.equal(lista.some(p => p.idProducto === 'PB01'), true);

  const resFilter = await fetch(`${baseUrl}/api/productos?categoria=CAT003`);
  const filtrados = await resFilter.json();
  assert.ok(filtrados.every(p => p.idCategoria === 'CAT003'));

  const resNov = await fetch(`${baseUrl}/api/novedades/novedades`);
  assert.equal(resNov.status, 200);
  const novedades = await resNov.json();
  assert.equal(novedades.some(p => p.idProducto === 'PSD01'), false);

  const resSlider = await fetch(`${baseUrl}/api/novedades/productosSlider`);
  assert.equal(resSlider.status, 200);
  const slider = await resSlider.json();
  assert.equal(slider.length, 1);

  const resEmptySearch = await fetch(`${baseUrl}/api/search/buscar?query=%20%20`);
  assert.equal(resEmptySearch.status, 400);

  const resSearch = await fetch(`${baseUrl}/api/search/buscar?query=Casio`);
  assert.equal(resSearch.status, 200);
  const searchData = await resSearch.json();
  assert.equal(searchData.length, 1);
  assert.equal(searchData[0].idProducto, 'PB02');

  const resDet = await fetch(`${baseUrl}/api/productos/PB01`);
  assert.equal(resDet.status, 200);
  const detalle = await resDet.json();
  assert.equal(detalle.nombreCategoria, 'Relojes');
  assert.equal(detalle.nombreCondicion, 'Nuevo');
});

test('3. POST /api/productos exige rol Vendedor/Admin, valida imagen binaria y evita suplantación', async () => {
  // Sin token -> 401
  const resNoAuth = await fetch(`${baseUrl}/api/productos`, { method: 'POST' });
  assert.equal(resNoAuth.status, 401);

  // Comprador -> 403
  const cmpToken = signToken('U001', ROLE_IDS.CMP);
  const resCmp = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { Cookie: `token=${cmpToken}` }
  });
  assert.equal(resCmp.status, 403);

  // Vendedor inactivo -> 403
  const inaToken = signToken('U_INA', ROLE_IDS.VEN);
  const resIna = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { Cookie: `token=${inaToken}` }
  });
  assert.equal(resIna.status, 403);

  // Vendedor válido con imagen falsa (firma HTML disfrazada de PNG) -> 400
  const venToken = signToken('U002', ROLE_IDS.VEN);
  const badForm = new FormData();
  badForm.append('titulo', 'Producto Inválido');
  badForm.append('precio', '20');
  badForm.append('stock', '3');
  badForm.append('imagen', new Blob([Buffer.from('<script>alert(1)</script>')], { type: 'image/png' }), 'fake.png');
  const resBadImg = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { Cookie: `token=${venToken}` },
    body: badForm
  });
  assert.equal(resBadImg.status, 400);

  // Vendedor válido intentando suplantar idUsuario y con XSS en título -> crea usando JWT real y sanitiza
  const okForm = new FormData();
  okForm.append('idUsuario', 'U003'); // debe ignorarse
  okForm.append('titulo', '<script>Reloj</script> Deportivo');
  okForm.append('descripcion', '<b>Descripción</b> limpia');
  okForm.append('marca', 'Seiko');
  okForm.append('idCondicion', 'C001');
  okForm.append('idCategoria', 'CAT001');
  okForm.append('precio', '75.50');
  okForm.append('stock', '9');
  okForm.append('imagen', new Blob([PNG_MAGIC_BUF], { type: 'image/png' }), 'reloj.png');

  const resOk = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { Cookie: `token=${venToken}` },
    body: okForm
  });
  assert.equal(resOk.status, 201);
  const created = await resOk.json();
  assert.ok(created.idProducto);
  assert.equal(created.stock, 9);

  const stored = dbState.productos.find(p => p.id_producto === created.idProducto);
  assert.equal(stored.id_vendedor, 'U002');
  assert.equal(stored.titulo_producto, 'scriptReloj/script Deportivo');
});

test('4. Mis Productos filtra por propietario y bloquea IDOR entre vendedores (403)', async () => {
  const ven2Token = signToken('U002', ROLE_IDS.VEN);
  const ven3Token = signToken('U003', ROLE_IDS.VEN);
  const adminToken = signToken('admin_mercauca', ROLE_IDS.ADM);

  // Vendedor U002 lista solo sus productos (PB01 y ORD_LOCKED_1, nunca PB02 de U003)
  const resMis = await fetch(`${baseUrl}/api/productos/mis-productos`, {
    headers: { Cookie: `token=${ven2Token}` }
  });
  assert.equal(resMis.status, 200);
  const misData = await resMis.json();
  assert.equal(misData.total, 2);
  assert.equal(misData.productos.some(p => p.idProducto === 'PB02'), false);
  assert.equal(misData.resumen.agotados, 1);

  // Vendedor U003 intenta leer, editar, ajustar stock o eliminar PB01 (propiedad de U002) -> 403
  const resIdorGet = await fetch(`${baseUrl}/api/productos/mis-productos/PB01`, {
    headers: { Cookie: `token=${ven3Token}` }
  });
  assert.equal(resIdorGet.status, 403);

  const resIdorPatch = await fetch(`${baseUrl}/api/productos/mis-productos/PB01/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `token=${ven3Token}` },
    body: JSON.stringify({ delta: -5 })
  });
  assert.equal(resIdorPatch.status, 403);

  const resIdorDel = await fetch(`${baseUrl}/api/productos/mis-productos/PB01`, {
    method: 'DELETE',
    headers: { Cookie: `token=${ven3Token}` }
  });
  assert.equal(resIdorDel.status, 403);

  // Vendedor U002 ajusta stock propio y evita stock negativo (clamp a 0)
  const resPatchOwn = await fetch(`${baseUrl}/api/productos/mis-productos/PB01/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: `token=${ven2Token}` },
    body: JSON.stringify({ delta: -20 })
  });
  assert.equal(resPatchOwn.status, 200);
  const patched = await resPatchOwn.json();
  assert.equal(patched.stock, 0);

  // Vendedor U002 edita su producto PB01 con nueva imagen WEBP válida
  const editForm = new FormData();
  editForm.append('titulo', 'Reloj Bulova Editado');
  editForm.append('precio', '199.99');
  editForm.append('stock', '4');
  editForm.append('imagen', new Blob([WEBP_MAGIC_BUF], { type: 'image/webp' }), 'nuevo.webp');

  const resEditOwn = await fetch(`${baseUrl}/api/productos/mis-productos/PB01`, {
    method: 'PUT',
    headers: { Cookie: `token=${ven2Token}` },
    body: editForm
  });
  assert.equal(resEditOwn.status, 200);

  // Eliminar producto con historial en órdenes devuelve 409 amigable en lugar de 500
  const resConflictDel = await fetch(`${baseUrl}/api/productos/mis-productos/ORD_LOCKED_1`, {
    method: 'DELETE',
    headers: { Cookie: `token=${ven2Token}` }
  });
  assert.equal(resConflictDel.status, 409);

  // Eliminar producto sin órdenes funciona aunque articulos_carrito aún no exista
  const resOkDel = await fetch(`${baseUrl}/api/productos/mis-productos/PB01`, {
    method: 'DELETE',
    headers: { Cookie: `token=${ven2Token}` }
  });
  assert.equal(resOkDel.status, 200);
  assert.equal(dbState.productos.some(p => p.id_producto === 'PB01'), false);

  // Administrador puede gestionar producto de otro vendedor (PB02)
  const resAdminPatch = await fetch(`${baseUrl}/api/productos/mis-productos/PB02/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stock: 12 })
  });
  assert.equal(resAdminPatch.status, 200);
  const adminPatched = await resAdminPatch.json();
  assert.equal(adminPatched.stock, 12);
});
