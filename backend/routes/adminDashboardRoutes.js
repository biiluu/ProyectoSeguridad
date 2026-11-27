const express = require('express');
const { verificarRolAdmin } = require('../middlewares/auth');
const {
  getDashboardStats,
  listarOrdenes,
  getDetalleOrden,
  actualizarEstadoOrden
} = require('../controllers/adminDashboardController');

const router = express.Router();

router.use(verificarRolAdmin);

router.get('/stats', getDashboardStats);
router.get('/ordenes', listarOrdenes);
router.get('/ordenes/:id', getDetalleOrden);
router.put('/ordenes/:id/estado', actualizarEstadoOrden);

module.exports = router;
