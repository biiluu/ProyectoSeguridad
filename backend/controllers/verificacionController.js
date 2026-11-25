const jwt = require('jsonwebtoken');
const { guardarCodigo, validarYEliminarCodigo } = require('../utils/otpStore');
const { enviarCorreoCodigo } = require('../utils/emailService');

function leerCorreo(body) {
  if (typeof body?.email !== 'string') return '';
  const email = body.email.trim().toLowerCase();
  return email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : '';
}

async function enviarCodigo(req, res) {
  const email = leerCorreo(req.body);
  if (!email) {
    return res.status(400).json({ mensaje: 'Ingresá un correo válido.' });
  }

  try {
    const { codigo } = await guardarCodigo(email);
    await enviarCorreoCodigo(email, codigo);
    return res.json({ mensaje: 'Código enviado. Revisá tu correo.' });
  } catch {
    return res.status(503).json({
      mensaje: 'No se pudo enviar el código. Intentá nuevamente.'
    });
  }
}

async function verificarCodigo(req, res) {
  const email = leerCorreo(req.body);
  const codigo = req.body?.codigo;

  if (!email || typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
    return res.status(400).json({ mensaje: 'Revisá el correo y el código de seis dígitos.' });
  }

  const secreto = process.env.REGISTRO_TOKEN_SECRET;
  if (!secreto) {
    return res.status(503).json({ mensaje: 'La verificación no está disponible.' });
  }

  try {
    const valido = await validarYEliminarCodigo(email, codigo);
    if (!valido) {
      return res.status(400).json({ mensaje: 'El código es incorrecto o ya expiró.' });
    }

    const comprobante = jwt.sign({}, secreto, {
      algorithm: 'HS256',
      subject: email,
      audience: 'registro',
      expiresIn: '5m'
    });

    return res.json({ comprobante });
  } catch {
    return res.status(503).json({ mensaje: 'No se pudo completar la verificación.' });
  }
}

module.exports = { enviarCodigo, verificarCodigo };
