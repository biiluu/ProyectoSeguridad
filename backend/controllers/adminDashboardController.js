const pool = require('../config/db');
const { getRolesMap } = require('../utils/rolesHelper');

/**
 * GET /api/admin/stats
 * Resumen de métricas principales para el panel administrativo.
 */
async function getDashboardStats(req, res) {
  try {
    const roles = await getRolesMap();
    const [userRows] = await pool.query(
      `SELECT
        COUNT(*) AS totalUsuarios,
        SUM(CASE WHEN id_rol = ? THEN 1 ELSE 0 END) AS totalAdmins,
        SUM(CASE WHEN id_rol = ? THEN 1 ELSE 0 END) AS totalCompradores,
        SUM(CASE WHEN id_rol = ? THEN 1 ELSE 0 END) AS totalVendedores,
        SUM(CASE WHEN id_estado = 'ACT' THEN 1 ELSE 0 END) AS usuariosActivos
       FROM usuario`,
      [roles.ADM, roles.CMP, roles.VEN]
    );

    const [prodRows] = await pool.query(
      `SELECT
        COUNT(*) AS totalProductos,
        SUM(CASE WHEN COALESCE(vp.stock, 0) <= 5 THEN 1 ELSE 0 END) AS productosBajoStock
       FROM productos p
       LEFT JOIN variantes_productos vp ON p.id_producto = vp.id_producto
       WHERE p.id_producto NOT LIKE 'PS%'
         AND p.id_vendedor <> 'ProductoMediaSlider'
         AND p.id_categoria <> 'CATS01'`
    );

    const [ordenRows] = await pool.query(
      `SELECT
        COUNT(*) AS totalOrdenes,
        COALESCE(SUM(monto_total), 0) AS totalVentas,
        SUM(CASE WHEN id_estado_orden = 'EO01' THEN 1 ELSE 0 END) AS ordenesPendientes,
        SUM(CASE WHEN id_estado_orden = 'EO02' THEN 1 ELSE 0 END) AS ordenesPagadas,
        SUM(CASE WHEN id_estado_orden = 'EO03' THEN 1 ELSE 0 END) AS ordenesEnviadas,
        SUM(CASE WHEN id_estado_orden = 'EO04' THEN 1 ELSE 0 END) AS ordenesEntregadas
       FROM orden`
    );

    return res.status(200).json({
      usuarios: userRows[0],
      productos: prodRows[0],
      ventas: ordenRows[0]
    });
  } catch (err) {
    console.error('Error en getDashboardStats:', err);
    return res.status(500).json({ message: 'Error al consultar métricas del dashboard.' });
  }
}

/**
 * GET /api/admin/ordenes
 * Historial de órdenes con artículos asociados y filtro opcional ?estado=EO01..EO05.
 */
async function listarOrdenes(req, res) {
  try {
    const estado = typeof req.query.estado === 'string' ? req.query.estado.trim() : '';
    let sql = `
      SELECT
        o.id_orden AS idOrden,
        o.id_comprador AS idComprador,
        u.nombre_usuario AS nombreComprador,
        u.email_usuario AS emailComprador,
        o.id_estado_orden AS idEstadoOrden,
        eo.nombre_estado AS nombreEstado,
        o.monto_total AS montoTotal,
        o.moneda,
        o.fechaCreacion,
        o.fecha_pago AS fechaPago,
        o.fecha_cierre AS fechaCierre
      FROM orden o
      LEFT JOIN usuario u ON o.id_comprador = u.id_usuario
      LEFT JOIN estados_orden eo ON o.id_estado_orden = eo.id_estado_orden
    `;
    const params = [];

    if (estado) {
      sql += ' WHERE o.id_estado_orden = ?';
      params.push(estado);
    }

    sql += ' ORDER BY o.fechaCreacion DESC';
    const [ordenes] = await pool.query(sql, params);

    const [articulos] = await pool.query(
      `SELECT
        ao.id_articulo_orden AS idArticuloOrden,
        ao.id_orden AS idOrden,
        ao.id_vendedor AS idVendedor,
        uv.nombre_usuario AS nombreVendedor,
        ao.id_producto_variante AS idProductoVariante,
        p.id_producto AS idProducto,
        p.titulo_producto AS tituloProducto,
        ao.cantidad,
        ao.sub_total AS subTotal,
        eao.nombre_estado AS estadoArticulo
       FROM articulos_orden ao
       LEFT JOIN variantes_productos vp ON ao.id_producto_variante = vp.id_producto_variante
       LEFT JOIN productos p ON vp.id_producto = p.id_producto
       LEFT JOIN usuario uv ON ao.id_vendedor = uv.id_usuario
       LEFT JOIN estado_articulos_orden eao ON ao.id_estado_articulo_orden = eao.id_estado_articulo_orden`
    );

    const resultado = ordenes.map(o => ({
      idOrden: o.idOrden,
      idComprador: o.idComprador,
      nombreComprador: o.nombreComprador || o.idComprador,
      emailComprador: o.emailComprador || '',
      idEstadoOrden: o.idEstadoOrden,
      nombreEstado: o.nombreEstado || 'Pendiente',
      montoTotal: parseFloat(o.montoTotal) || 0,
      moneda: o.moneda || '$',
      fechaCreacion: o.fechaCreacion,
      fechaPago: o.fechaPago,
      fechaCierre: o.fechaCierre,
      articulos: articulos
        .filter(a => a.idOrden === o.idOrden)
        .map(a => ({
          idArticuloOrden: a.idArticuloOrden,
          idProducto: a.idProducto,
          tituloProducto: a.tituloProducto || 'Producto MercaUca',
          idVendedor: a.idVendedor,
          nombreVendedor: a.nombreVendedor || a.idVendedor,
          cantidad: a.cantidad,
          subTotal: parseFloat(a.subTotal) || 0,
          estadoArticulo: a.estadoArticulo || 'En preparación'
        }))
    }));

    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error en listarOrdenes:', err);
    return res.status(500).json({ message: 'Error al consultar historial de órdenes.' });
  }
}

/**
 * GET /api/admin/ordenes/:id
 * Detalle completo de una orden específica.
 */
async function getDetalleOrden(req, res) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      return res.status(400).json({ message: 'Identificador de orden inválido.' });
    }

    const [ordenRows] = await pool.query(
      `SELECT
        o.id_orden AS idOrden,
        o.id_comprador AS idComprador,
        u.nombre_usuario AS nombreComprador,
        u.email_usuario AS emailComprador,
        u.telefono_usuario AS telefonoComprador,
        o.id_estado_orden AS idEstadoOrden,
        eo.nombre_estado AS nombreEstado,
        o.monto_total AS montoTotal,
        o.moneda,
        o.fechaCreacion,
        o.fecha_pago AS fechaPago,
        o.fecha_cierre AS fechaCierre
       FROM orden o
       LEFT JOIN usuario u ON o.id_comprador = u.id_usuario
       LEFT JOIN estados_orden eo ON o.id_estado_orden = eo.id_estado_orden
       WHERE o.id_orden = ?`,
      [id]
    );

    if (ordenRows.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    const [articulos] = await pool.query(
      `SELECT
        ao.id_articulo_orden AS idArticuloOrden,
        ao.id_orden AS idOrden,
        ao.id_vendedor AS idVendedor,
        uv.nombre_usuario AS nombreVendedor,
        ao.id_producto_variante AS idProductoVariante,
        p.id_producto AS idProducto,
        p.titulo_producto AS tituloProducto,
        ao.cantidad,
        ao.sub_total AS subTotal,
        eao.nombre_estado AS estadoArticulo
       FROM articulos_orden ao
       LEFT JOIN variantes_productos vp ON ao.id_producto_variante = vp.id_producto_variante
       LEFT JOIN productos p ON vp.id_producto = p.id_producto
       LEFT JOIN usuario uv ON ao.id_vendedor = uv.id_usuario
       LEFT JOIN estado_articulos_orden eao ON ao.id_estado_articulo_orden = eao.id_estado_articulo_orden
       WHERE ao.id_orden = ?`,
      [id]
    );

    return res.status(200).json({
      ...ordenRows[0],
      montoTotal: parseFloat(ordenRows[0].montoTotal) || 0,
      articulos: articulos.map(a => ({
        idArticuloOrden: a.idArticuloOrden,
        idProducto: a.idProducto,
        tituloProducto: a.tituloProducto || 'Producto MercaUca',
        idVendedor: a.idVendedor,
        nombreVendedor: a.nombreVendedor || a.idVendedor,
        cantidad: a.cantidad,
        subTotal: parseFloat(a.subTotal) || 0,
        estadoArticulo: a.estadoArticulo || 'En preparación'
      }))
    });
  } catch (err) {
    console.error('Error en getDetalleOrden:', err);
    return res.status(500).json({ message: 'Error al consultar detalle de orden.' });
  }
}

/**
 * PUT /api/admin/ordenes/:id/estado
 * Actualiza el estado de una orden (EO01..EO05).
 */
async function actualizarEstadoOrden(req, res) {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    const { idEstadoOrden } = req.body || {};
    const estadosPermitidos = ['EO01', 'EO02', 'EO03', 'EO04', 'EO05'];

    if (!idEstadoOrden || !estadosPermitidos.includes(String(idEstadoOrden).trim())) {
      return res.status(400).json({ message: 'Estado de orden no válido (EO01 a EO05).' });
    }

    const estadoFinal = String(idEstadoOrden).trim();
    const [rows] = await pool.query('SELECT id_orden FROM orden WHERE id_orden = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }

    if (estadoFinal === 'EO02') {
      await pool.query('UPDATE orden SET id_estado_orden = ?, fecha_pago = NOW() WHERE id_orden = ?', [estadoFinal, id]);
    } else if (estadoFinal === 'EO04') {
      await pool.query('UPDATE orden SET id_estado_orden = ?, fecha_cierre = NOW() WHERE id_orden = ?', [estadoFinal, id]);
    } else {
      await pool.query('UPDATE orden SET id_estado_orden = ? WHERE id_orden = ?', [estadoFinal, id]);
    }

    return res.status(200).json({
      message: 'Estado de la orden actualizado exitosamente.',
      idOrden: id,
      idEstadoOrden: estadoFinal
    });
  } catch (err) {
    console.error('Error en actualizarEstadoOrden:', err);
    return res.status(500).json({ message: 'Error al actualizar estado de la orden.' });
  }
}

module.exports = {
  getDashboardStats,
  listarOrdenes,
  getDetalleOrden,
  actualizarEstadoOrden
};
