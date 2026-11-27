const express = require('express');
const { verifyToken, verificarRolAdmin } = require('../middlewares/auth');
const {
  listarRolesDisponibles,
  listarUsuarios,
  consultarUsuario,
  crearUsuario,
  editarUsuario,
  eliminarUsuario
} = require('../controllers/adminUsuariosController');

const router = express.Router();

router.get('/catalogo/roles', verificarRolAdmin, listarRolesDisponibles);
router.get('/', verificarRolAdmin, listarUsuarios);
router.get('/:id', verifyToken, consultarUsuario);
router.post('/', verificarRolAdmin, crearUsuario);
router.put('/:id', verifyToken, editarUsuario);
router.delete('/:id', verificarRolAdmin, eliminarUsuario);

module.exports = router;