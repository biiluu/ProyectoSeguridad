const express = require('express');
const verificarSesion = require('../middlewares/auth');
const { login, logout, perfil, verify } = require('../controllers/sesionController');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/perfil', verificarSesion, perfil);
router.get('/verify', verificarSesion, verify);

module.exports = router;
