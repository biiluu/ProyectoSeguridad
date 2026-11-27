const pool = require('../config/db');
const { bufferToDataUrl } = require('../utils/imagenProducto');
const { escapeLikePattern } = require('./productosController');

/**
 * GET /api/search/buscar?query=...
 * Búsqueda en tiempo real sobre titulo_producto y marca, excluyendo elementos del slider.
 */
async function buscarProductos(req, res) {
  try {
    const rawQuery = req.query.query;

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ message: 'Debe ingresar un término de búsqueda válido.' });
    }

    const q = escapeLikePattern(rawQuery.trim().slice(0, 100).toLowerCase());
    const prefixPattern = `${q}%`;
    const containsPattern = `%${q}%`;

    const [rows] = await pool.query(
      `SELECT p.id_producto AS idProducto,
              p.titulo_producto AS tituloProducto,
              p.precio,
              p.foto,
              vp.id_producto_variante AS idProductoVariante,
              COALESCE(vp.stock, 0) AS stock
       FROM productos p
       LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
       WHERE (LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\'
          OR LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\'
          OR LOWER(p.marca) LIKE ? ESCAPE '\\\\')
         AND p.id_producto NOT LIKE 'PS%'
         AND p.id_vendedor <> 'ProductoMediaSlider'
         AND p.id_categoria <> 'CATS01'
       ORDER BY (LOWER(p.titulo_producto) LIKE ? ESCAPE '\\\\') DESC, p.fechaCreacion DESC
       LIMIT 15`,
      [prefixPattern, containsPattern, containsPattern, prefixPattern]
    );

    const productos = rows.map(p => ({
      idProducto: p.idProducto,
      idProductoVariante: p.idProductoVariante || p.idProducto,
      tituloProducto: p.tituloProducto,
      precio: parseFloat(p.precio) || 0,
      stock: parseInt(p.stock, 10) || 0,
      fotoBase64: bufferToDataUrl(p.foto)
    }));

    return res.status(200).json(productos);
  } catch (err) {
    console.error('Error en búsqueda de productos:', err);
    return res.status(500).json({ message: 'Error al realizar la búsqueda.', error: err.message });
  }
}

module.exports = {
  buscarProductos
};
