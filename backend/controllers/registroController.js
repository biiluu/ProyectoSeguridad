const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { getRolesMap } = require('../utils/rolesHelper');

async function registro(req, res) {
  try {
    const { idUsuario, nombreUsuario, emailUsuario, telefonoUsuario, password } = req.body;

    // 1. Validaciones estrictas de entrada
    if (!idUsuario || !emailUsuario || !password || !nombreUsuario) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben ser proporcionados.' });
    }

    if (typeof idUsuario !== 'string' || typeof emailUsuario !== 'string' || typeof password !== 'string' || typeof nombreUsuario !== 'string') {
      return res.status(400).json({ message: 'Tipos de datos inválidos en los campos de registro.' });
    }

    const trimmedUser = idUsuario.trim();
    const trimmedEmail = emailUsuario.trim().toLowerCase();
    const trimmedNombre = nombreUsuario.trim().replace(/[<>]/g, '');
    const trimmedTel = (telefonoUsuario ? String(telefonoUsuario) : '').trim();

    const userRegex = /^[a-zA-Z0-9_.-]{3,50}$/;
    if (!userRegex.test(trimmedUser)) {
      return res.status(400).json({ message: 'El identificador de usuario solo puede contener letras, números, puntos o guiones (3 a 50 caracteres).' });
    }

    if (trimmedNombre.length < 2 || trimmedNombre.length > 100) {
      return res.status(400).json({ message: 'El nombre completo debe tener entre 2 y 100 caracteres.' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 120) {
      return res.status(400).json({ message: 'El formato del correo electrónico es inválido.' });
    }

    const telRegex = /^[267]\d{3}-?\d{4}$/;
    if (!trimmedTel || !telRegex.test(trimmedTel)) {
      return res.status(400).json({ message: 'El número de teléfono debe tener 8 dígitos válidos (ej. 7777-8888).' });
    }

    if (password.length < 6 || password.length > 100) {
      return res.status(400).json({ message: 'La contraseña debe contener entre 6 y 100 caracteres.' });
    }

    // 2. Validar si el usuario o el email ya existen (Consulta parametrizada anti-SQLi)
    const [existentes] = await pool.query(
      'SELECT id_usuario, email_usuario FROM usuario WHERE id_usuario = ? OR email_usuario = ?',
      [trimmedUser, trimmedEmail]
    );

    if (existentes.length > 0) {
      if (existentes.some(u => u.id_usuario.toLowerCase() === trimmedUser.toLowerCase())) {
        return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
      }
      if (existentes.some(u => u.email_usuario.toLowerCase() === trimmedEmail)) {
        return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
      }
    }

    // 3. Hashear contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // REGLA ESTRICTA DE SEGURIDAD:
    // El registro público SOLO asigna el rol de Comprador (ID hash en BD) y estado Activo ('ACT').
    const roles = await getRolesMap();
    const rol = roles.CMP;
    const estado = 'ACT';

    await pool.query(
      `INSERT INTO usuario (id_usuario, email_usuario, password_hash, nombre_usuario, telefono_usuario, id_estado, id_rol, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [trimmedUser, trimmedEmail, passwordHash, trimmedNombre, trimmedTel, estado, rol]
    );

    return res.status(201).json({
      idUsuario: trimmedUser,
      nombreUsuario: trimmedNombre,
      emailUsuario: trimmedEmail,
      telefonoUsuario: trimmedTel,
      idRol: rol,
      nombreRol: 'Comprador',
      idEstado: estado
    });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ message: 'Error interno del servidor al registrar usuario.', error: err.message });
  }
}

module.exports = { registro };
