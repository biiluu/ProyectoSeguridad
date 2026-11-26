const pool = require('../config/db');
const crypto = require('crypto');
const { enviarCorreoCompra } = require('../utils/emailService');
const { getRolesMap } = require('../utils/rolesHelper');

function generarUUID() {
  return crypto.randomUUID();
}

/**
 * Control de Acceso Nativo contra IDOR (OWASP A01: Broken Access Control)
 * Valida que el ID del recurso solicitado pertenezca al usuario del JWT,
 * permitiendo únicamente excepciones para usuarios con rol de Administrador.
 */
async function verificarAccesoRecurso(req, idRecursoUsuario) {
  if (!req.user) return false;
  const usuarioToken = req.user.sub || req.user.unique_name || req.user.idUsuario;
  const rolToken = req.user.rol || req.user.idRol;
  const roles = await getRolesMap();

  if (rolToken && rolToken === roles.ADM) return true;
  return String(usuarioToken || '').trim().toLowerCase() === String(idRecursoUsuario || '').trim().toLowerCase();
}

// GET: /api/Carrito/:usuario
async function getCarritoPorUsuario(req, res) {
  try {
    const { usuario } = req.params;

    if (!usuario || !usuario.trim()) {
      return res.status(400).json({ message: 'El usuario es requerido.' });
    }

    const u = usuario.trim();

    // Mitigación IDOR: El usuario solo puede consultar su propio carrito
    if (!await verificarAccesoRecurso(req, u)) {
      return res.status(403).json({
        message: 'Acceso denegado (403 Forbidden). No tienes permiso para ver el carrito de otro usuario.'
      });
    }

    const [rows] = await pool.query(
      `SELECT p.id_producto AS idProducto,
              p.titulo_producto AS tituloProducto,
              p.foto,
              p.precio,
              ac.cantidad,
              ac.moneda,
              ac.id_producto_variante AS idProductoVariante,
              COALESCE(vp.stock, 0) AS stockDisponible
        FROM articulos_carrito ac
        INNER JOIN carrito c ON ac.id_carrito = c.id_carrito
        INNER JOIN variantes_productos vp ON ac.id_producto_variante = vp.id_producto_variante
        INNER JOIN productos p ON vp.id_producto = p.id_producto
        WHERE c.id_comprador = ?`,
      [u]
    );

    const items = rows.map(r => ({
      idProducto: r.idProductoVariante || r.idProducto,
      tituloProducto: r.tituloProducto,
      fotoBase64: r.foto ? 'data:image/jpeg;base64,' + Buffer.from(r.foto).toString('base64') : null,
      precio: parseFloat(r.precio) || 0,
      cantidad: parseInt(r.cantidad, 10) || 1,
      stockDisponible: parseInt(r.stockDisponible, 10) || 0,
      moneda: r.moneda || '$'
    }));

    return res.status(200).json(items);
  } catch (err) {
    console.error('Error en getCarritoPorUsuario:', err);
    return res.status(500).json({ message: 'Error al consultar el carrito.', error: err.message });
  }
}

// GET: /api/Carrito/cantidad-articulos/:idUsuario
async function obtenerCantidadArticulos(req, res) {
  try {
    const { idUsuario } = req.params;

    if (!idUsuario || !idUsuario.trim()) {
      return res.status(400).json({ message: 'El idUsuario es requerido.' });
    }

    const u = idUsuario.trim();

    // Mitigación IDOR: El usuario solo puede consultar el contador de su carrito
    if (!await verificarAccesoRecurso(req, u)) {
      return res.status(403).json({
        message: 'Acceso denegado (403 Forbidden). No puedes consultar el contador de artículos de otro usuario.'
      });
    }

    // 1. Buscar id_carrito
    const [carritos] = await pool.query(
      'SELECT id_carrito FROM carrito WHERE id_comprador = ? LIMIT 1',
      [u]
    );

    if (carritos.length === 0) {
      return res.status(200).json(0);
    }

    const idCarrito = carritos[0].id_carrito;

    // 2. Contar artículos
    const [countRows] = await pool.query(
      'SELECT SUM(cantidad) AS total FROM articulos_carrito WHERE id_carrito = ?',
      [idCarrito]
    );

    const cantidad = countRows[0].total ? parseInt(countRows[0].total, 10) : 0;
    return res.status(200).json(cantidad);
  } catch (err) {
    console.error('Error en obtenerCantidadArticulos:', err);
    return res.status(500).json({ message: 'Error al contar artículos.', error: err.message });
  }
}

// POST: /api/Carrito/agregar-articulo
async function agregarArticulo(req, res) {
  try {
    const { idUsuario, idProductoVariante, cantidad, precio, moneda } = req.body;

    if (!idUsuario || !idProductoVariante) {
      return res.status(400).json({ message: 'Usuario y variante de producto requeridos.' });
    }

    const u = String(idUsuario).trim();
    const pv = String(idProductoVariante).trim();

    // Mitigación IDOR: Previene inyectar productos en el carrito de otros usuarios
    if (!await verificarAccesoRecurso(req, u)) {
      return res.status(403).json({
        message: 'Acceso denegado (403 Forbidden). No tienes permiso para agregar artículos al carrito de otro usuario.'
      });
    }

    // Validación y casteo estricto de tipos numéricos (Protección contra DoS y desbordamientos)
    const cantidadNum = parseInt(cantidad, 10);
    const precioNum = parseFloat(precio);

    if (isNaN(cantidadNum) || !Number.isInteger(cantidadNum) || cantidadNum <= 0 || cantidadNum > 1000) {
      return res.status(400).json({ message: 'La cantidad debe ser un número entero entre 1 y 1000.' });
    }

    if (isNaN(precioNum) || !isFinite(precioNum) || precioNum < 0) {
      return res.status(400).json({ message: 'El precio debe ser un número finito válido mayor o igual a cero.' });
    }

    // 0. Validación de Stock Funcional en tiempo real
    const [variantes] = await pool.query(
      `SELECT vp.id_producto_variante, vp.stock, p.titulo_producto, p.precio AS precio_catalogo
        FROM variantes_productos vp
        INNER JOIN productos p ON vp.id_producto = p.id_producto
        WHERE vp.id_producto_variante = ? OR vp.id_producto = ?
        LIMIT 1`,
      [pv, pv]
    );

    if (variantes.length === 0) {
      return res.status(404).json({ message: 'El producto o variante no fue encontrado en el catálogo.' });
    }

    const varianteData = variantes[0];

    const precioCatalogo = Number(varianteData.precio_catalogo);

    if (!Number.isFinite(precioCatalogo) || precioCatalogo < 0) {
      return res.status(500).json({
        message: 'El precio del producto en el catálogo no es válido.'
      });
    }

    const stockDisponible = parseInt(varianteData.stock, 10) || 0;

    if (stockDisponible <= 0) {
      return res.status(400).json({
        message: `El producto "${varianteData.titulo_producto}" se encuentra actualmente agotado.`,
        stockDisponible: 0
      });
    }

    if (cantidadNum > stockDisponible) {
      return res.status(400).json({
        message: `Solo hay ${stockDisponible} unidad(es) disponible(s) en inventario. No puedes agregar ${cantidadNum}.`,
        stockDisponible
      });
    }

    // 1. Validar si ya existe ese artículo en el carrito del usuario
    const [existentes] = await pool.query(
      `SELECT ac.id_articulos_carrito, ac.cantidad 
        FROM articulos_carrito ac
        INNER JOIN carrito c ON ac.id_carrito = c.id_carrito
        WHERE c.id_comprador = ? AND ac.id_producto_variante = ?`,
      [u, pv]
    );

    if (existentes.length > 0) {
      return res.status(400).json({
        message: 'El artículo ya se encuentra en tu carrito de compras.',
        stockDisponible
      });
    }

    // 2. Buscar o crear el carrito
    let idCarrito;
    const [carritos] = await pool.query(
      'SELECT id_carrito FROM carrito WHERE id_comprador = ? LIMIT 1',
      [u]
    );

    if (carritos.length === 0) {
      idCarrito = generarUUID();
      await pool.query(
        'INSERT INTO carrito (id_carrito, id_comprador, fechaCreacion, fechaModificacion) VALUES (?, ?, NOW(), NOW())',
        [idCarrito, u]
      );
    } else {
      idCarrito = carritos[0].id_carrito;
      await pool.query('UPDATE carrito SET fechaModificacion = NOW() WHERE id_carrito = ?', [idCarrito]);
    }

    // 3. Insertar en articulos_carrito con parámetros estrictos
    const idArticulo = generarUUID();
    const monedaFinal = (moneda && String(moneda).trim()) ? String(moneda).trim().slice(0, 5) : '$';

    await pool.query(
      `INSERT INTO articulos_carrito (id_articulos_carrito, id_carrito, id_producto_variante, cantidad, precio, moneda)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [idArticulo, idCarrito, pv, cantidadNum, precioCatalogo, monedaFinal]
    );

    return res.status(200).json({
      message: 'Artículo agregado correctamente al carrito.',
      stockDisponible
    });
  } catch (err) {
    console.error('Error al agregar artículo:', err);
    return res.status(500).json({ message: 'Error interno al agregar al carrito.', error: err.message });
  }
}

// DELETE: /api/Carrito/eliminar-articulo/:idUsuario/:idProducto
async function eliminarArticuloCarrito(req, res) {
  try {
    const { idUsuario, idProducto } = req.params;

    if (!idUsuario || !idProducto) {
      return res.status(400).json({ message: 'El idUsuario y el idProducto son obligatorios.' });
    }

    const u = String(idUsuario).trim();
    const prod = String(idProducto).trim();

    // Mitigación IDOR: Previene eliminar ítems del carrito ajeno
    if (!await verificarAccesoRecurso(req, u)) {
      return res.status(403).json({
        message: 'Acceso denegado (403 Forbidden). No tienes permiso para eliminar artículos del carrito de otro usuario.'
      });
    }

    // 1. Buscar carrito del usuario
    const [carritos] = await pool.query(
      'SELECT id_carrito FROM carrito WHERE id_comprador = ? LIMIT 1',
      [u]
    );

    if (carritos.length === 0) {
      return res.status(404).json({ message: 'El usuario no tiene un carrito registrado.' });
    }

    const idCarrito = carritos[0].id_carrito;

    // 2. Eliminar artículo
    const [delResult] = await pool.query(
      'DELETE FROM articulos_carrito WHERE id_carrito = ? AND id_producto_variante = ?',
      [idCarrito, prod]
    );

    if (delResult.affectedRows === 0) {
      return res.status(404).json({ message: 'El artículo no está en el carrito del usuario.' });
    }

    return res.status(200).json({
      message: 'Artículo eliminado correctamente del carrito.',
      idCarrito,
      idProducto: prod
    });
  } catch (err) {
    console.error('Error al eliminar artículo del carrito:', err);
    return res.status(500).json({ message: 'Error al eliminar artículo.', error: err.message });
  }
}

// POST: /api/Carrito/finalizar-compra/:idUsuario
async function finalizarCompra(req, res) {
  const connection = await pool.getConnection();
  try {
    const { idUsuario } = req.params;

    const { modoEntrega } = req.body || {};

    if (modoEntrega !== 'store' && modoEntrega !== 'home') {
      return res.status(400).json({
        message: 'Selecciona un método de entrega válido.'
      });
    }

    const costoEnvio = modoEntrega === 'home' ? 9.90 : 0;

    if (!idUsuario || !idUsuario.trim()) {
      return res.status(400).json({ message: 'El id de usuario es requerido.' });
    }

    const u = idUsuario.trim();

    // Mitigación IDOR: Nadie puede ejecutar un checkout con la cuenta de otra persona
    if (!await verificarAccesoRecurso(req, u)) {
      return res.status(403).json({
        message: 'Acceso denegado (403 Forbidden). No tienes permiso para finalizar la compra de otro usuario.'
      });
    }

    await connection.beginTransaction();

    // 1. Buscar usuario y correo
    const [usuarios] = await connection.query(
      'SELECT id_usuario, nombre_usuario, email_usuario FROM usuario WHERE id_usuario = ? LIMIT 1',
      [u]
    );

    if (usuarios.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const usuarioData = usuarios[0];
    if (!usuarioData.email_usuario) {
      await connection.rollback();
      return res.status(400).json({ message: 'El usuario no tiene correo registrado.' });
    }

    // 2. Obtener artículos del carrito bloqueando filas con FOR UPDATE para control de concurrencia
    const [itemsCarrito] = await connection.query(
      `SELECT p.id_producto AS idProducto,
              p.id_vendedor AS idVendedor,
              p.titulo_producto AS tituloProducto,
              ac.cantidad,
              p.precio AS precio,
              ac.moneda,
              ac.id_producto_variante AS idProductoVariante,
              c.id_carrito AS idCarrito,
              COALESCE(vp.stock, 0) AS stockDisponible
        FROM articulos_carrito ac
        INNER JOIN carrito c ON ac.id_carrito = c.id_carrito
        INNER JOIN variantes_productos vp ON ac.id_producto_variante = vp.id_producto_variante
        INNER JOIN productos p ON vp.id_producto = p.id_producto
        WHERE c.id_comprador = ?
        FOR UPDATE`,
      [u]
    );

    if (itemsCarrito.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'El carrito está vacío, no hay nada que finalizar.' });
    }

    // 2.1 VALIDACIÓN ESTRICTA DE STOCK DISPONIBLE
    for (const item of itemsCarrito) {
      const stockDisp = parseInt(item.stockDisponible, 10) || 0;
      const cantSolicitada = parseInt(item.cantidad, 10) || 1;

      if (stockDisp <= 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `El producto "${item.tituloProducto}" se encuentra agotado. Retíralo de tu carrito para continuar.`
        });
      }

      if (cantSolicitada > stockDisp) {
        await connection.rollback();
        return res.status(400).json({
          message: `El producto "${item.tituloProducto}" solo tiene ${stockDisp} unidades disponibles (solicitadas: ${cantSolicitada}). Por favor reduce la cantidad en el carrito.`
        });
      }
    }

    const idCarrito = itemsCarrito[0].idCarrito;
    const subtotal = itemsCarrito.reduce((acc, item) => acc + (parseFloat(item.precio) || 0) * (parseInt(item.cantidad, 10) || 1),0);
    const total = subtotal + costoEnvio;
    const moneda = itemsCarrito[0].moneda || '$';
    const nombreCliente = usuarioData.nombre_usuario || 'Cliente MercaUca';

    // 2.2 Registrar Orden
    const idOrden = crypto.randomUUID();
    await connection.query(
      `INSERT INTO orden (id_orden, id_comprador, id_estado_orden, monto_total, moneda, modo_entrega, costo_envio, fechaCreacion, fecha_pago)
      VALUES (?, ?, 'EO01', ?, ?, ?, ?, NOW(), NULL)`,
      [idOrden, u, total, moneda, modoEntrega, costoEnvio]
    );

    // 2.3 Descontar stock e insertar artículos de orden
    for (const item of itemsCarrito) {
      const idArticuloOrden = crypto.randomUUID();
      const cant = parseInt(item.cantidad, 10) || 1;
      const subTotal = (parseFloat(item.precio) || 0) * cant;
      const vendedor = item.idVendedor || 'U002';

      // Insertar detalle en articulos_orden
      await connection.query(
        `INSERT INTO articulos_orden (id_articulo_orden, id_orden, id_vendedor, id_producto_variante, id_estado_articulo_orden, cantidad, sub_total)
          VALUES (?, ?, ?, ?, 'EA01', ?, ?)`,
        [idArticuloOrden, idOrden, vendedor, item.idProductoVariante, cant, subTotal]
      );

      // Descuento atómico del inventario en variantes_productos
      await connection.query(
        `UPDATE variantes_productos 
          SET stock = stock - ? 
          WHERE id_producto_variante = ?`,
        [cant, item.idProductoVariante]
      );
    }

    // 3. Vaciar y eliminar el carrito
    await connection.query('DELETE FROM articulos_carrito WHERE id_carrito = ?', [idCarrito]);
    await connection.query('DELETE FROM carrito WHERE id_carrito = ?', [idCarrito]);

    // Confirmar transacción de compra y stock
    await connection.commit();

    // 4. Enviar correo de confirmación de compra
    // La compra ya se guardó. El correo se intenta por separado.
    let correoEnviado = false;

    try {
      await enviarCorreoCompra(
        usuarioData.email_usuario,
        nombreCliente,
        itemsCarrito,
        total,
        moneda,
        costoEnvio,
        modoEntrega
      );
      correoEnviado = true;
    } catch (mailErr) {
      console.error('No se pudo enviar el correo de compra:', mailErr.message);
    }

    return res.status(200).json({
      mensaje: correoEnviado
        ? 'Compra finalizada y correo enviado.'
        : 'Compra finalizada. No se pudo enviar el correo.',
      idOrden,
      comprador: usuarioData.nombre_usuario,
      subtotal,
      costoEnvio,
      total,
      moneda,
      modoEntrega,
      correoEnviado,
      productos: itemsCarrito.map(item => ({
      nombre: item.tituloProducto,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precio),
      subtotal: Number(item.precio) * Number(item.cantidad)
    }))
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error al finalizar compra:', err);
    return res.status(500).json({ message: 'Error al finalizar compra.', error: err.message });
  } finally {
    connection.release();
  }
}

module.exports = {
  getCarritoPorUsuario,
  obtenerCantidadArticulos,
  agregarArticulo,
  eliminarArticuloCarrito,
  finalizarCompra
};

