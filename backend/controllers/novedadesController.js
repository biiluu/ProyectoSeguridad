const pool = require('../config/db');
const { bufferToDataUrl } = require('../utils/imagenProducto');

/**
 * GET /api/novedades/novedades
 * Retorna productos marcados en producto_media con Novedades = 1 (excluye slider).
 */
async function getNovedades(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.id_producto AS idProducto,
              p.titulo_producto AS tituloProducto,
              p.marca,
              p.id_categoria AS idCategoria,
              c.nombre_categoria AS nombreCategoria,
              p.precio,
              p.foto,
              vp.id_producto_variante AS idProductoVariante,
              COALESCE(vp.stock, 0) AS stock
       FROM productos p
       INNER JOIN producto_media pm ON p.id_producto = pm.id_producto
       LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
       LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
       WHERE pm.Novedades = 1
         AND p.id_producto NOT LIKE 'PS%'
         AND p.id_vendedor <> 'ProductoMediaSlider'
         AND p.id_categoria <> 'CATS01'
       ORDER BY p.fechaCreacion DESC`
    );

    const result = rows.map(r => ({
      idProducto: r.idProducto,
      idProductoVariante: r.idProductoVariante || r.idProducto,
      tituloProducto: r.tituloProducto,
      marca: r.marca,
      idCategoria: r.idCategoria,
      nombreCategoria: r.nombreCategoria || 'Catálogo General',
      precio: parseFloat(r.precio) || 0,
      stock: parseInt(r.stock, 10) || 0,
      fotoBase64: bufferToDataUrl(r.foto)
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en getNovedades:', err);
    return res.status(500).json({ message: 'Error al obtener novedades.', error: err.message });
  }
}

/**
 * GET /api/novedades/productosSlider
 * Retorna hasta 10 imágenes del carrusel promocional principal.
 */
async function getProductosSlider(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id_producto AS idProducto, titulo_producto AS tituloProducto, foto
       FROM productos
       WHERE id_vendedor = ? OR id_categoria = 'CATS01'
       ORDER BY id_producto ASC
       LIMIT 10`,
      ['ProductoMediaSlider']
    );

    const imagenes = rows.map(r => ({
      idProducto: r.idProducto,
      tituloProducto: r.tituloProducto,
      fotoBase64: bufferToDataUrl(r.foto)
    }));

    return res.status(200).json(imagenes);
  } catch (err) {
    console.error('Error en getProductosSlider:', err);
    return res.status(500).json({ message: 'Error al obtener fotos del slider.', error: err.message });
  }
}

module.exports = {
  getNovedades,
  getProductosSlider
};
