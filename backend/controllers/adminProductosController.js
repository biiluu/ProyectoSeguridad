const pool = require('../config/db');
const { bufferToDataUrl, validarFotoProducto } = require('../utils/imagenProducto');
const {
  CONDICIONES_PERMITIDAS,
  CATEGORIAS_PERMITIDAS,
  escapeLikePattern
} = require('./productosController');

function mapProductoAdmin(row) {
  return {
    idProducto: row.id_producto,
    idProductoVariante: row.id_producto_variante || row.id_producto,
    idVendedor: row.id_vendedor,
    nombreVendedor: row.nombre_vendedor || row.id_vendedor,
    tituloProducto: row.titulo_producto,
    descripcion: row.descripcion,
    marca: row.marca,
    precio: parseFloat(row.precio) || 0,
    stock: parseInt(row.stock, 10) || 0,
    idCategoria: row.id_categoria,
    nombreCategoria: row.nombre_categoria || 'General',
    idCondicion: row.id_condicion,
    nombreCondicion: row.nombre_condicion || 'N/A',
    fechaCreacion: row.fechaCreacion,
    fechaModificacion: row.fechaModificacion,
    fotoBase64: bufferToDataUrl(row.foto)
  };
}

const SELECT_BASE = `
  SELECT p.id_producto, p.id_vendedor, u.nombre_usuario AS nombre_vendedor,
         p.titulo_producto, p.descripcion, p.marca,
         p.id_condicion, cp.nombre AS nombre_condicion,
         p.id_categoria, c.nombre_categoria,
         p.precio, p.foto, p.fechaCreacion, p.fechaModificacion,
         vp.id_producto_variante, COALESCE(vp.stock, 0) AS stock
  FROM productos p
  LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
  LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
  LEFT JOIN condicion_producto cp ON p.id_condicion = cp.id_condicion
  LEFT JOIN usuario u ON p.id_vendedor = u.id_usuario
`;

// GET: /api/admin/productos
async function listarProductosAdmin(req, res) {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    let sql = SELECT_BASE + `
      WHERE p.id_producto NOT LIKE 'PS%'
        AND p.id_vendedor <> 'ProductoMediaSlider'
        AND p.id_categoria <> 'CATS01'
    `;
    const params = [];

    if (rawQ) {
      const escaped = escapeLikePattern(rawQ.toLowerCase());
      const pattern = `%${escaped}%`;
      sql += " AND (LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\' OR LOWER(p.id_vendedor) LIKE ? ESCAPE '\\\\')";
      params.push(pattern, pattern);
    }

    sql += ' ORDER BY p.fechaCreacion DESC';

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows.map(mapProductoAdmin));
  } catch (err) {
    console.error('Error en listarProductosAdmin:', err);
    return res.status(500).json({ message: 'Error al listar productos.' });
  }
}

// GET: /api/admin/productos/sin-stock
async function listarProductosSinStock(req, res) {
  try {
    const sql = SELECT_BASE + `
      WHERE p.id_producto NOT LIKE 'PS%'
        AND p.id_vendedor <> 'ProductoMediaSlider'
        AND p.id_categoria <> 'CATS01'
        AND COALESCE(vp.stock, 0) <= 0
      ORDER BY p.fechaModificacion DESC
    `;
    const [rows] = await pool.query(sql);
    return res.status(200).json(rows.map(mapProductoAdmin));
  } catch (err) {
    console.error('Error en listarProductosSinStock:', err);
    return res.status(500).json({ message: 'Error al listar productos sin existencias.' });
  }
}

// GET: /api/admin/productos/:id
async function obtenerProductoAdmin(req, res) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id || id.length > 50) {
      return res.status(400).json({ message: 'Identificador de producto inválido.' });
    }

    const [rows] = await pool.query(SELECT_BASE + ' WHERE p.id_producto = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    return res.status(200).json(mapProductoAdmin(rows[0]));
  } catch (err) {
    console.error('Error en obtenerProductoAdmin:', err);
    return res.status(500).json({ message: 'Error al consultar producto.' });
  }
}

// PUT: /api/admin/productos/:id
async function editarProductoAdmin(req, res) {
  const connection = await pool.getConnection();
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id || id.length > 50) {
      return res.status(400).json({ message: 'Identificador de producto inválido.' });
    }

    const [actualRows] = await connection.query(
      `SELECT p.*, COALESCE(vp.stock, 0) AS stock_actual
       FROM productos p
       LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
       WHERE p.id_producto = ?`,
      [id]
    );
    if (actualRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    const actual = actualRows[0];

    const { titulo, descripcion, marca, idCondicion, idCategoria, precio, stock } = req.body || {};
    const file = req.file;

    let nuevoTitulo = actual.titulo_producto;
    if (titulo !== undefined) {
      const limpio = String(titulo).trim().slice(0, 150).replace(/[<>]/g, '');
      if (limpio.length < 3) {
        return res.status(400).json({ message: 'El título del producto debe tener al menos 3 caracteres.' });
      }
      nuevoTitulo = limpio;
    }

    const nuevaDesc = descripcion !== undefined
      ? String(descripcion).trim().slice(0, 3000).replace(/[<>]/g, '')
      : actual.descripcion;

    const nuevaMarca = marca !== undefined
      ? (String(marca).trim() ? String(marca).trim().slice(0, 75).replace(/[<>]/g, '') : 'Genérica')
      : actual.marca;

    let nuevoPrecio = parseFloat(actual.precio);
    if (precio !== undefined) {
      const pNum = Number(String(precio).trim());
      if (!Number.isFinite(pNum) || pNum <= 0 || pNum > 1000000) {
        return res.status(400).json({ message: 'El precio debe ser un número válido mayor a 0 y menor o igual a $1,000,000.' });
      }
      nuevoPrecio = pNum;
    }

    let nuevaCategoria = actual.id_categoria;
    if (idCategoria !== undefined) {
      const cat = String(idCategoria).trim();
      if (!CATEGORIAS_PERMITIDAS.includes(cat)) {
        return res.status(400).json({ message: 'La categoría seleccionada no es válida.' });
      }
      nuevaCategoria = cat;
    }

    let nuevaCondicion = actual.id_condicion;
    if (idCondicion !== undefined) {
      const cond = String(idCondicion).trim();
      if (!CONDICIONES_PERMITIDAS.includes(cond)) {
        return res.status(400).json({ message: 'La condición seleccionada no es válida.' });
      }
      nuevaCondicion = cond;
    }

    let nuevoStock = parseInt(actual.stock_actual, 10) || 0;
    if (stock !== undefined) {
      const stockStr = String(stock).trim();
      if (!/^\d+$/.test(stockStr)) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
      nuevoStock = Number.parseInt(stockStr, 10);
      if (nuevoStock > 1000000) {
        return res.status(400).json({ message: 'El stock debe ser un número entero entre 0 y 1,000,000.' });
      }
    }

    let nuevaFoto = actual.foto;
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
         titulo_producto = ?, descripcion = ?, marca = ?, precio = ?,
         id_categoria = ?, id_condicion = ?, foto = ?, fechaModificacion = NOW()
       WHERE id_producto = ?`,
      [nuevoTitulo, nuevaDesc, nuevaMarca, nuevoPrecio, nuevaCategoria, nuevaCondicion, nuevaFoto, id]
    );

    if (stock !== undefined) {
      await connection.query('UPDATE variantes_productos SET stock = ? WHERE id_producto = ?', [nuevoStock, id]);
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Producto actualizado correctamente por administración.',
      idProducto: id,
      stock: nuevoStock
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error('Error en editarProductoAdmin:', err);
    return res.status(500).json({ message: 'Error al actualizar el producto.' });
  } finally {
    connection.release();
  }
}

// DELETE: /api/admin/productos/:id
async function eliminarProductoAdmin(req, res) {
  const connection = await pool.getConnection();
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';

    const [rows] = await connection.query('SELECT id_producto FROM productos WHERE id_producto = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    await connection.beginTransaction();

    try {
      await connection.query(
        `DELETE FROM articulos_carrito
         WHERE id_producto_variante IN (
           SELECT id_producto_variante FROM variantes_productos WHERE id_producto = ?
         )`,
        [id]
      );
    } catch (carritoErr) {
      if (carritoErr && carritoErr.code !== 'ER_NO_SUCH_TABLE') throw carritoErr;
    }

    try {
      await connection.query('DELETE FROM variantes_productos WHERE id_producto = ?', [id]);
      await connection.query('DELETE FROM producto_media WHERE id_producto = ?', [id]);
      await connection.query('DELETE FROM productos WHERE id_producto = ?', [id]);
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

    return res.status(200).json({ message: 'Producto eliminado correctamente.', idProducto: id });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error('Error en eliminarProductoAdmin:', err);
    return res.status(500).json({ message: 'Error al eliminar el producto.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  listarProductosAdmin,
  listarProductosSinStock,
  obtenerProductoAdmin,
  editarProductoAdmin,
  eliminarProductoAdmin
};