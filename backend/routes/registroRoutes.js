const express = require('express');
const verificarCorreoRegistro = require('../middlewares/verificarCorreoRegistro');
const { registro } = require('../controllers/registroController');

const router = express.Router();

router.post('/registro', verificarCorreoRegistro, registro);

module.exports = router;
