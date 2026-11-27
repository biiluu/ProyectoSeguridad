const express = require('express');
const { verificarRolAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  listarProductosAdmin,
  listarProductosSinStock,
  obtenerProductoAdmin,
  editarProductoAdmin,
  eliminarProductoAdmin
} = require('../controllers/adminProductosController');

const router = express.Router();

router.get('/sin-stock', verificarRolAdmin, listarProductosSinStock);
router.get('/', verificarRolAdmin, listarProductosAdmin);
router.get('/:id', verificarRolAdmin, obtenerProductoAdmin);
router.put('/:id', verificarRolAdmin, upload, editarProductoAdmin);
router.delete('/:id', verificarRolAdmin, eliminarProductoAdmin);

module.exports = router;