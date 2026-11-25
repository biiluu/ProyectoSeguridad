const express = require('express');
const productosController = require('../controllers/productosController');
const upload = require('../middlewares/upload');
const { verificarRolVendedor } = require('../middlewares/verificarRolVendedor');

const router = express.Router();

// Creación de productos (solo Vendedor / Administrador)
router.post('/', verificarRolVendedor, upload, productosController.crearProducto);

// Rutas de consulta pública del catálogo
router.get('/catalogos', productosController.listarCatalogos);
router.get('/', productosController.listarProductos);
router.get('/:id', productosController.getDetalleProducto);

module.exports = router;
