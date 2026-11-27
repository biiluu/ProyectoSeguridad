const express = require('express');
const novedadesController = require('../controllers/novedadesController');

const router = express.Router();

router.get('/novedades', novedadesController.getNovedades);
router.get('/productosSlider', novedadesController.getProductosSlider);

module.exports = router;
