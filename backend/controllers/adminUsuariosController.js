const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { getRolesMap } = require('../utils/rolesHelper');

// GET: /api/admin/usuarios/catalogo/roles
async function listarRolesDisponibles(req, res) {
  try {
    const roles = await getRolesMap();
    return res.status(200).json(roles.list);
  } catch (err) {
    console.error('Error en listarRolesDisponibles:', err);
    return res.status(500).json({ message: 'Error al listar roles.' });
  }
}

// GET: /api/admin/usuarios
async function listarUsuarios(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.email_usuario, u.telefono_usuario,
              u.id_estado, u.id_rol, r.nombre_rol, u.fecha_creacion
       FROM usuario u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       ORDER BY u.fecha_creacion DESC`
    );

    return res.status(200).json(rows.map(u => ({
      idUsuario: u.id_usuario,
      nombreUsuario: u.nombre_usuario,
      emailUsuario: u.email_usuario,
      telefonoUsuario: u.telefono_usuario,
      idEstado: u.id_estado,
      idRol: u.id_rol,
      nombreRol: u.nombre_rol || '',
      fechaCreacion: u.fecha_creacion
    })));
  } catch (err) {
    console.error('Error en listarUsuarios:', err);
    return res.status(500).json({ message: 'Error al listar usuarios.' });
  }
}

// GET: /api/admin/usuarios/:id
async function consultarUsuario(req, res) {
  try {
    const idUsuario = req.params.id;

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.email_usuario, u.telefono_usuario,
              u.id_estado, u.id_rol, r.nombre_rol, u.fecha_creacion
       FROM usuario u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`,
      [idUsuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const u = rows[0];
    return res.status(200).json({
      idUsuario: u.id_usuario,
      nombreUsuario: u.nombre_usuario,
      emailUsuario: u.email_usuario,
      telefonoUsuario: u.telefono_usuario,
      idEstado: u.id_estado,
      idRol: u.id_rol,
      nombreRol: u.nombre_rol || '',
      fechaCreacion: u.fecha_creacion
    });
  } catch (err) {
    console.error('Error en consultarUsuario:', err);
    return res.status(500).json({ message: 'Error al consultar usuario.' });
  }
}

// POST: /api/admin/usuarios
async function crearUsuario(req, res) {
  try {
    const { idUsuario, nombreUsuario, emailUsuario, telefonoUsuario, password, idRol } = req.body;

    if (!idUsuario || !nombreUsuario || !emailUsuario || !password || !idRol) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben ser proporcionados.' });
    }

    const trimmedUser = String(idUsuario).trim();
    const trimmedEmail = String(emailUsuario).trim().toLowerCase();
    const trimmedNombre = String(nombreUsuario).trim().replace(/[<>]/g, '');
    const trimmedTel = telefonoUsuario ? String(telefonoUsuario).trim() : '';

    const userRegex = /^[a-zA-Z0-9_.-]{3,50}$/;
    if (!userRegex.test(trimmedUser)) {
      return res.status(400).json({ message: 'El identificador de usuario solo puede contener letras, números, puntos o guiones (3 a 50 caracteres).' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'El formato del correo electrónico es inválido.' });
    }

    if (String(password).length < 6 || String(password).length > 100) {
      return res.status(400).json({ message: 'La contraseña debe contener entre 6 y 100 caracteres.' });
    }

    const roles = await getRolesMap();
    const rolesValidos = [roles.ADM, roles.VEN, roles.CMP];
    if (!rolesValidos.includes(String(idRol))) {
      return res.status(400).json({ message: 'El rol indicado no es válido.' });
    }

    const [existentes] = await pool.query(
      'SELECT id_usuario FROM usuario WHERE id_usuario = ? OR email_usuario = ?',
      [trimmedUser, trimmedEmail]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ message: 'El usuario o el correo ya existen.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);

    await pool.query(
      `INSERT INTO usuario (id_usuario, email_usuario, password_hash, nombre_usuario, telefono_usuario, id_estado, id_rol, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, 'ACT', ?, NOW())`,
      [trimmedUser, trimmedEmail, passwordHash, trimmedNombre, trimmedTel, idRol]
    );

    return res.status(201).json({
      idUsuario: trimmedUser,
      nombreUsuario: trimmedNombre,
      emailUsuario: trimmedEmail,
      telefonoUsuario: trimmedTel,
      idEstado: 'ACT',
      idRol
    });
  } catch (err) {
    console.error('Error en crearUsuario:', err);
    return res.status(500).json({ message: 'Error al crear usuario.' });
  }
}

// PUT: /api/admin/usuarios/:id
async function editarUsuario(req, res) {
  try {
    const idUsuario = req.params.id;
    const { nombreUsuario, emailUsuario, telefonoUsuario, idRol, idEstado } = req.body;

    const [existentes] = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [idUsuario]);
    if (existentes.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const campos = [];
    const valores = [];

    if (nombreUsuario !== undefined) {
      campos.push('nombre_usuario = ?');
      valores.push(String(nombreUsuario).trim().replace(/[<>]/g, ''));
    }
    if (emailUsuario !== undefined) {
      const trimmedEmail = String(emailUsuario).trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: 'El formato del correo electrónico es inválido.' });
      }
      campos.push('email_usuario = ?');
      valores.push(trimmedEmail);
    }
    if (telefonoUsuario !== undefined) {
      campos.push('telefono_usuario = ?');
      valores.push(String(telefonoUsuario).trim());
    }
    if (idRol !== undefined) {
      const roles = await getRolesMap();
      const rolesValidos = [roles.ADM, roles.VEN, roles.CMP];
      if (!rolesValidos.includes(String(idRol))) {
        return res.status(400).json({ message: 'El rol indicado no es válido.' });
      }
      campos.push('id_rol = ?');
      valores.push(idRol);
    }
    if (idEstado !== undefined) {
      campos.push('id_estado = ?');
      valores.push(String(idEstado));
    }

    if (campos.length === 0) {
      return res.status(400).json({ message: 'No se proporcionó ningún campo para actualizar.' });
    }

    valores.push(idUsuario);
    await pool.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`, valores);

    return res.status(200).json({ message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    console.error('Error en editarUsuario:', err);
    return res.status(500).json({ message: 'Error al editar usuario.' });
  }
}

// DELETE: /api/admin/usuarios/:id
async function eliminarUsuario(req, res) {
  try {
    const idUsuario = req.params.id;

    const [rows] = await pool.query('SELECT id_usuario FROM usuario WHERE id_usuario = ?', [idUsuario]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Se desactiva en lugar de borrar, para no perder las compras y facturas ya asociadas a este usuario
    await pool.query('UPDATE usuario SET id_estado = ? WHERE id_usuario = ?', ['INA', idUsuario]);

    return res.status(200).json({ message: 'Usuario desactivado correctamente.' });
  } catch (err) {
    console.error('Error en eliminarUsuario:', err);
    return res.status(500).json({ message: 'Error al eliminar usuario.' });
  }
}

module.exports = {
  listarRolesDisponibles,
  listarUsuarios,
  consultarUsuario,
  crearUsuario,
  editarUsuario,
  eliminarUsuario
};