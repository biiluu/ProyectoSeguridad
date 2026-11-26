const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carritoController');
const verifyToken = require('../middlewares/auth');

// Todas las rutas de carrito requieren token JWT
router.use(verifyToken);

router.get('/:usuario', carritoController.getCarritoPorUsuario);
router.get('/cantidad-articulos/:idUsuario', carritoController.obtenerCantidadArticulos);
router.post('/agregar-articulo', carritoController.agregarArticulo);
router.delete('/eliminar-articulo/:idUsuario/:idProducto', carritoController.eliminarArticuloCarrito);
router.post('/finalizar-compra/:idUsuario', carritoController.finalizarCompra);

module.exports = router;

