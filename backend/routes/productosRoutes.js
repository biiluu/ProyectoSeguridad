const express = require('express');
const productosController = require('../controllers/productosController');
const misProductosController = require('../controllers/misProductosController');
const upload = require('../middlewares/upload');
const { verificarRolVendedor } = require('../middlewares/verificarRolVendedor');

const router = express.Router();

// Catálogos auxiliares públicos
router.get('/catalogos', productosController.listarCatalogos);

// Gestión de productos propios del vendedor autenticado (antes de /:id)
router.get('/mis-productos', verificarRolVendedor, misProductosController.listarMisProductos);
router.get('/mis-productos/:id', verificarRolVendedor, misProductosController.obtenerMiProducto);
router.put('/mis-productos/:id', verificarRolVendedor, upload, misProductosController.actualizarMiProducto);
router.patch('/mis-productos/:id/stock', verificarRolVendedor, misProductosController.actualizarStockMiProducto);
router.delete('/mis-productos/:id', verificarRolVendedor, misProductosController.eliminarMiProducto);

// Creación de productos (solo Vendedor / Administrador)
router.post('/', verificarRolVendedor, upload, productosController.crearProducto);

// Consulta pública y acciones REST sobre recurso
router.get('/', productosController.listarProductos);
router.get('/:id', productosController.getDetalleProducto);
router.put('/:id', verificarRolVendedor, upload, misProductosController.actualizarMiProducto);
router.patch('/:id/stock', verificarRolVendedor, misProductosController.actualizarStockMiProducto);
router.delete('/:id', verificarRolVendedor, misProductosController.eliminarMiProducto);

module.exports = router;
