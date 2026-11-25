const express = require('express');
const productosController = require('../controllers/productosController');

const router = express.Router();

// Rutas de consulta pública del catálogo
router.get('/catalogos', productosController.listarCatalogos);
router.get('/', productosController.listarProductos);
router.get('/:id', productosController.getDetalleProducto);

module.exports = router;
