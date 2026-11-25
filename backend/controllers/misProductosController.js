const pool = require('../config/db');
const { getRolesMap } = require('../utils/rolesHelper');
const { bufferToDataUrl, validarFotoProducto } = require('../utils/imagenProducto');
const {
  CONDICIONES_PERMITIDAS,
  CATEGORIAS_PERMITIDAS,
  escapeLikePattern
} = require('./productosController');

/**
 * Busca un producto y valida que el usuario autenticado sea su propietario o Administrador.
 * Previene IDOR/BOLA sobre productos de otros vendedores o recursos del slider.
 */
async function obtenerProductoAutorizado(dbConn, rawId, req) {
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!id || id.length > 50) {
    return { status: 400, message: 'Identificador de producto inválido.' };
  }

  const [rows] = await dbConn.query(
    `SELECT p.id_producto,
            p.id_vendedor,
            p.titulo_producto,
            p.descripcion,
            p.marca,
            p.id_condicion,
            cp.nombre AS nombre_condicion,
            p.id_categoria,
            c.nombre_categoria,
            p.precio,
            p.foto,
            p.fechaCreacion,
            p.fechaModificacion,
            vp.id_producto_variante,
            COALESCE(vp.stock, 0) AS stock
     FROM productos p
     LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
     LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
     LEFT JOIN condicion_producto cp ON p.id_condicion = cp.id_condicion
     WHERE p.id_producto = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return { status: 404, message: 'Producto no encontrado.' };
  }

  const prod = rows[0];
  if (
    String(prod.id_producto).toUpperCase().startsWith('PS') ||
    prod.id_vendedor === 'ProductoMediaSlider' ||
    prod.id_categoria === 'CATS01'
  ) {
    return { status: 403, message: 'Acceso denegado: este recurso promocional no es editable desde Mis Productos.' };
  }

  const roles = await getRolesMap();
  const idSolicitante = String(req.vendedorUser?.id_usuario || '').trim();
  const rolSolicitante = req.vendedorUser?.id_rol;
  const esAdmin = Boolean(rolSolicitante && rolSolicitante === roles.ADM);
  const esPropietario = idSolicitante && prod.id_vendedor === idSolicitante;

  if (!esPropietario && !esAdmin) {
    return {
      status: 403,
      message: 'Acceso denegado: solo puedes consultar o modificar tus propios productos.'
    };
  }

  return { status: 200, producto: prod };
}

function mapProductoVendedor(row) {
  const stock = parseInt(row.stock, 10) || 0;
  return {
    idProducto: row.id_producto,
    idProductoVariante: row.id_producto_variante || row.id_producto,
    idVendedor: row.id_vendedor,
    tituloProducto: row.titulo_producto,
    descripcion: row.descripcion,
    marca: row.marca,
    precio: parseFloat(row.precio) || 0,
    stock,
    idCategoria: row.id_categoria,
    nombreCategoria: row.nombre_categoria || 'General',
    idCondicion: row.id_condicion,
    nombreCondicion: row.nombre_condicion || 'N/A',
    fechaCreacion: row.fechaCreacion,
    fechaModificacion: row.fechaModificacion,
    fotoBase64: bufferToDataUrl(row.foto)
  };
}

/**
 * GET /api/productos/mis-productos
 * Lista únicamente los productos del vendedor autenticado, con KPIs y filtros ?q= y ?categoria=.
 */
async function listarMisProductos(req, res) {
  try {
    const idVendedor = req.vendedorUser?.id_usuario;
    if (!idVendedor) {
      return res.status(401).json({ message: 'No se pudo identificar la cuenta del vendedor.' });
    }

    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const rawCat = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';

    let sql = `
      SELECT p.id_producto,
             p.id_vendedor,
             p.titulo_producto,
             p.descripcion,
             p.marca,
             p.id_condicion,
             cp.nombre AS nombre_condicion,
             p.id_categoria,
             c.nombre_categoria,
             p.precio,
             p.foto,
             p.fechaCreacion,
             p.fechaModificacion,
             vp.id_producto_variante,
             COALESCE(vp.stock, 0) AS stock
      FROM productos p
      LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
      LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN condicion_producto cp ON p.id_condicion = cp.id_condicion
      WHERE p.id_vendedor = ?
        AND p.id_producto NOT LIKE 'PS%'
        AND p.id_categoria <> 'CATS01'
    `;
    const params = [idVendedor];

    if (rawCat && rawCat !== 'CATS01') {
      sql += ' AND p.id_categoria = ?';
      params.push(rawCat);
    }

    if (rawQ) {
      const escaped = escapeLikePattern(rawQ.toLowerCase());
      const pattern = `%${escaped}%`;
      sql += " AND (LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\' OR LOWER(p.marca) LIKE ? ESCAPE '\\\\' OR LOWER(p.id_producto) LIKE ? ESCAPE '\\\\')";
      params.push(pattern, pattern, pattern);
    }

    sql += ' ORDER BY p.fechaCreacion DESC';

    const [rows] = await pool.query(sql, params);
    const productos = rows.map(mapProductoVendedor);

    const resumen = {
      total: productos.length,
      disponibles: productos.filter(p => p.stock > 0).length,
      stockBajo: productos.filter(p => p.stock > 0 && p.stock <= 5).length,
      agotados: productos.filter(p => p.stock <= 0).length
    };

    return res.status(200).json({
      total: resumen.total,
      resumen,
      productos
    });
  } catch (err) {
    console.error('Error en listarMisProductos:', err);
    return res.status(500).json({ message: 'Error al consultar tus productos.', error: err.message });
  }
}

/**
 * GET /api/productos/mis-productos/:id
 * Obtiene el detalle de un producto propio verificando propiedad o rol Admin.
 */
async function obtenerMiProducto(req, res) {
  try {
    const authCheck = await obtenerProductoAutorizado(pool, req.params.id, req);
    if (authCheck.status !== 200) {
      return res.status(authCheck.status).json({ message: authCheck.message });
    }

    return res.status(200).json(mapProductoVendedor(authCheck.producto));
  } catch (err) {
    console.error('Error en obtenerMiProducto:', err);
    return res.status(500).json({ message: 'Error al consultar el producto.', error: err.message });
  }
}

/**
 * PUT /api/productos/mis-productos/:id (y PUT /api/productos/:id)
 * Actualiza información, stock y fotografía opcional de un producto propio.
 */
async function actualizarMiProducto(req, res) {
  const connection = await pool.getConnection();
  try {
    const authCheck = await obtenerProductoAutorizado(connection, req.params.id, req);
    if (authCheck.status !== 200) {
      return res.status(authCheck.status).json({ message: authCheck.message });
    }

    const prodActual = authCheck.producto;
    const { titulo, descripcion, marca, idCondicion, idCategoria, precio, stock } = req.body || {};
    const file = req.file;

    let nuevoTitulo = prodActual.titulo_producto;
    if (titulo !== undefined) {
      const limpio = String(titulo).trim().slice(0, 150).replace(/[<>]/g, '');
      if (limpio.length < 3) {
        return res.status(400).json({ message: 'El título del producto debe tener al menos 3 caracteres.' });
      }
      nuevoTitulo = limpio;
    }

    const nuevaDesc = descripcion !== undefined
      ? String(descripcion).trim().slice(0, 3000).replace(/[<>]/g, '')
      : prodActual.descripcion;

    const nuevaMarca = marca !== undefined
      ? (String(marca).trim() ? String(marca).trim().slice(0, 75).replace(/[<>]/g, '') : 'Genérica')
      : prodActual.marca;

    let nuevoPrecio = parseFloat(prodActual.precio);
    if (precio !== undefined) {
      const pStr = String(precio).trim();
      const pNum = Number(pStr);
      if (!pStr || !Number.isFinite(pNum) || pNum <= 0 || pNum > 1000000) {
        return res.status(400).json({
          message: 'El precio debe ser un número válido mayor a 0 y menor o igual a $1,000,000.'
        });
      }
      nuevoPrecio = pNum;
    }

    let nuevaCategoria = prodActual.id_categoria;
    if (idCategoria !== undefined) {
      const cat = String(idCategoria).trim();
      if (!CATEGORIAS_PERMITIDAS.includes(cat)) {
        return res.status(400).json({ message: 'La categoría seleccionada no es válida.' });
      }
      nuevaCategoria = cat;
    }

    let nuevaCondicion = prodActual.id_condicion;
    if (idCondicion !== undefined) {
      const cond = String(idCondicion).trim();
      if (!CONDICIONES_PERMITIDAS.includes(cond)) {
        return res.status(400).json({ message: 'La condición seleccionada no es válida.' });
      }
      nuevaCondicion = cond;
    }

    let nuevoStock = parseInt(prodActual.stock, 10) || 0;
    if (stock !== undefined) {
      const stockStr = String(stock).trim();
      if (!/^\d+$/.test(stockStr)) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
      const stockNum = Number.parseInt(stockStr, 10);
      if (!Number.isInteger(stockNum) || stockNum < 0 || stockNum > 1000000) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
      nuevoStock = stockNum;
    }

    let nuevaFoto = prodActual.foto;
    if (file) {
      const checkFoto = validarFotoProducto(file);
      if (!checkFoto.valido) {
        return res.status(400).json({ message: checkFoto.error });
      }
      nuevaFoto = file.buffer;
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE productos SET
         titulo_producto = ?,
         descripcion = ?,
         marca = ?,
         precio = ?,
         id_categoria = ?,
         id_condicion = ?,
         foto = ?,
         fechaModificacion = NOW()
       WHERE id_producto = ?`,
      [nuevoTitulo, nuevaDesc, nuevaMarca, nuevoPrecio, nuevaCategoria, nuevaCondicion, nuevaFoto, prodActual.id_producto]
    );

    if (stock !== undefined) {
      await connection.query(
        'UPDATE variantes_productos SET stock = ? WHERE id_producto = ?',
        [nuevoStock, prodActual.id_producto]
      );
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Producto actualizado exitosamente.',
      idProducto: prodActual.id_producto,
      stock: nuevoStock
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error('Error en actualizarMiProducto:', err);
    return res.status(500).json({ message: 'Error al actualizar el producto.', error: err.message });
  } finally {
    connection.release();
  }
}

/**
 * PATCH /api/productos/mis-productos/:id/stock (y PATCH /api/productos/:id/stock)
 * Ajuste rápido de stock (+1, -1 o valor absoluto) validando propiedad.
 */
async function actualizarStockMiProducto(req, res) {
  try {
    const authCheck = await obtenerProductoAutorizado(pool, req.params.id, req);
    if (authCheck.status !== 200) {
      return res.status(authCheck.status).json({ message: authCheck.message });
    }

    const prod = authCheck.producto;
    const { stock, delta } = req.body || {};
    let nuevoStock = parseInt(prod.stock, 10) || 0;

    if (stock !== undefined) {
      const stockStr = String(stock).trim();
      if (!/^\d+$/.test(stockStr)) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
      const s = Number.parseInt(stockStr, 10);
      if (!Number.isInteger(s) || s < 0 || s > 1000000) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
      nuevoStock = s;
    } else if (delta !== undefined) {
      const deltaStr = String(delta).trim();
      if (!/^-?\d+$/.test(deltaStr)) {
        return res.status(400).json({ message: 'El ajuste delta debe ser un número entero válido.' });
      }
      const d = Number.parseInt(deltaStr, 10);
      if (!Number.isInteger(d) || Math.abs(d) > 10000) {
        return res.status(400).json({ message: 'El ajuste delta debe estar entre -10,000 y 10,000.' });
      }
      nuevoStock = Math.max(0, Math.min(1000000, nuevoStock + d));
    } else {
      return res.status(400).json({ message: 'Debe especificar un valor de stock o ajuste delta.' });
    }

    await pool.query('UPDATE variantes_productos SET stock = ? WHERE id_producto = ?', [nuevoStock, prod.id_producto]);

    return res.status(200).json({
      message: 'Stock actualizado correctamente.',
      idProducto: prod.id_producto,
      stock: nuevoStock
    });
  } catch (err) {
    console.error('Error en actualizarStockMiProducto:', err);
    return res.status(500).json({ message: 'Error al actualizar stock del producto.', error: err.message });
  }
}

/**
 * DELETE /api/productos/mis-productos/:id (y DELETE /api/productos/:id)
 * Elimina un producto propio si no posee órdenes históricas asociadas.
 */
async function eliminarMiProducto(req, res) {
  const connection = await pool.getConnection();
  try {
    const authCheck = await obtenerProductoAutorizado(connection, req.params.id, req);
    if (authCheck.status !== 200) {
      return res.status(authCheck.status).json({ message: authCheck.message });
    }

    const idProducto = authCheck.producto.id_producto;

    await connection.beginTransaction();

    // Limpiar carrito si el módulo de carrito ya fue desplegado en BD
    try {
      await connection.query(
        `DELETE FROM articulos_carrito
         WHERE id_producto_variante IN (
           SELECT id_producto_variante FROM variantes_productos WHERE id_producto = ?
         )`,
        [idProducto]
      );
    } catch (carritoErr) {
      if (carritoErr && carritoErr.code !== 'ER_NO_SUCH_TABLE') {
        throw carritoErr;
      }
    }

    try {
      await connection.query('DELETE FROM variantes_productos WHERE id_producto = ?', [idProducto]);
      await connection.query('DELETE FROM producto_media WHERE id_producto = ?', [idProducto]);
      await connection.query('DELETE FROM productos WHERE id_producto = ?', [idProducto]);
    } catch (fkErr) {
      if (fkErr && (fkErr.code === 'ER_ROW_IS_REFERENCED_2' || fkErr.errno === 1451)) {
        await connection.rollback();
        return res.status(409).json({
          message: 'No puedes eliminar este producto porque ya forma parte de órdenes de compra registradas. Puedes ajustar su stock a 0 para pausarlo.'
        });
      }
      throw fkErr;
    }

    await connection.commit();

    return res.status(200).json({
      message: `Producto "${idProducto}" eliminado correctamente.`,
      idProducto
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error('Error en eliminarMiProducto:', err);
    return res.status(500).json({ message: 'Error al eliminar el producto.', error: err.message });
  } finally {
    connection.release();
  }
}

module.exports = {
  obtenerProductoAutorizado,
  listarMisProductos,
  obtenerMiProducto,
  actualizarMiProducto,
  actualizarStockMiProducto,
  eliminarMiProducto
};
