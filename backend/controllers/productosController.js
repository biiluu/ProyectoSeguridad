const pool = require('../config/db');
const { bufferToDataUrl } = require('../utils/imagenProducto');

/**
 * Escapa comodines de SQL LIKE para evitar búsquedas expansivas inesperadas.
 * @param {string} value
 * @returns {string}
 */
function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

/**
 * GET /api/productos/catalogos
 * Lista categorías activas (excluyendo CATS01 del slider) y condiciones de producto.
 */
async function listarCatalogos(req, res) {
  try {
    const [categorias] = await pool.query(
      `SELECT id_categoria AS idCategoria, nombre_categoria AS nombreCategoria
       FROM categoria
       WHERE categoria_activa = 1 AND id_categoria <> 'CATS01'
       ORDER BY id_categoria ASC`
    );

    const [condiciones] = await pool.query(
      `SELECT id_condicion AS idCondicion, nombre
       FROM condicion_producto
       ORDER BY id_condicion ASC`
    );

    return res.status(200).json({ categorias, condiciones });
  } catch (err) {
    console.error('Error al consultar catálogos de productos:', err);
    return res.status(500).json({ message: 'Error al consultar catálogos.', error: err.message });
  }
}

/**
 * GET /api/productos
 * Lista el catálogo público de productos (excluye elementos promocionales del slider).
 * Soporta filtros opcionales ?categoria=CAT001 y ?q=texto.
 */
async function listarProductos(req, res) {
  try {
    const rawCategoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

    let sql = `
      SELECT p.id_producto AS idProducto,
             vp.id_producto_variante AS idProductoVariante,
             p.titulo_producto AS tituloProducto,
             p.marca,
             p.id_categoria AS idCategoria,
             c.nombre_categoria AS nombreCategoria,
             p.id_condicion AS idCondicion,
             cp.nombre AS nombreCondicion,
             p.precio,
             p.foto,
             COALESCE(vp.stock, 0) AS stock
      FROM productos p
      LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
      LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN condicion_producto cp ON p.id_condicion = cp.id_condicion
      WHERE p.id_producto NOT LIKE 'PS%'
        AND p.id_vendedor <> 'ProductoMediaSlider'
        AND p.id_categoria <> 'CATS01'
    `;
    const params = [];

    if (rawCategoria && rawCategoria !== 'CATS01') {
      sql += ' AND p.id_categoria = ?';
      params.push(rawCategoria);
    }

    if (rawQ) {
      const escaped = escapeLikePattern(rawQ.toLowerCase());
      const pattern = `%${escaped}%`;
      sql += " AND (LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\' OR LOWER(p.marca) LIKE ? ESCAPE '\\\\')";
      params.push(pattern, pattern);
    }

    sql += ' ORDER BY p.fechaCreacion DESC';

    const [rows] = await pool.query(sql, params);

    const resultado = rows.map(r => ({
      idProducto: r.idProducto,
      idProductoVariante: r.idProductoVariante || r.idProducto,
      tituloProducto: r.tituloProducto,
      marca: r.marca,
      idCategoria: r.idCategoria,
      nombreCategoria: r.nombreCategoria || 'Catálogo General',
      idCondicion: r.idCondicion,
      nombreCondicion: r.nombreCondicion || 'N/A',
      precio: parseFloat(r.precio) || 0,
      stock: parseInt(r.stock, 10) || 0,
      fotoBase64: bufferToDataUrl(r.foto)
    }));

    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error al listar productos:', err);
    return res.status(500).json({ message: 'Error al listar productos.', error: err.message });
  }
}

/**
 * GET /api/productos/:id
 * Obtiene el detalle completo de un producto por id_producto o id_producto_variante.
 */
async function getDetalleProducto(req, res) {
  try {
    const rawId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!rawId || rawId.length > 50) {
      return res.status(400).json({ message: 'Identificador de producto inválido.' });
    }

    const [rows] = await pool.query(
      `SELECT p.id_producto AS idProducto,
              p.titulo_producto AS tituloProducto,
              p.descripcion,
              p.marca,
              p.precio,
              p.id_condicion AS idCondicion,
              cp.nombre AS nombreCondicion,
              p.id_categoria AS idCategoria,
              c.nombre_categoria AS nombreCategoria,
              p.id_vendedor AS idVendedor,
              u.nombre_usuario AS nombreVendedor,
              p.foto,
              vp.id_producto_variante AS idProductoVariante,
              COALESCE(vp.stock, 0) AS stock
       FROM productos p
       LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
       LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
       LEFT JOIN condicion_producto cp ON p.id_condicion = cp.id_condicion
       LEFT JOIN usuario u ON p.id_vendedor = u.id_usuario
       WHERE p.id_producto = ? OR vp.id_producto_variante = ?
       LIMIT 1`,
      [rawId, rawId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const p = rows[0];
    return res.status(200).json({
      idProducto: p.idProducto,
      idProductoVariante: p.idProductoVariante || p.idProducto,
      tituloProducto: p.tituloProducto,
      descripcion: p.descripcion,
      marca: p.marca,
      precio: parseFloat(p.precio) || 0,
      stock: parseInt(p.stock, 10) || 0,
      fotoBase64: bufferToDataUrl(p.foto),
      idCategoria: p.idCategoria,
      nombreCategoria: p.nombreCategoria || p.idCategoria || 'Catálogo General',
      idCondicion: p.idCondicion,
      nombreCondicion: p.nombreCondicion || p.idCondicion || 'N/A',
      idVendedor: p.idVendedor,
      nombreVendedor: p.nombreVendedor || p.idVendedor
    });
  } catch (err) {
    console.error('Error al obtener detalle del producto:', err);
    return res.status(500).json({ message: 'Error al obtener producto.', error: err.message });
  }
}

module.exports = {
  escapeLikePattern,
  listarCatalogos,
  listarProductos,
  getDetalleProducto
};
