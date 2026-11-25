const jwt = require('jsonwebtoken');

function verificarCorreoRegistro(req, res, next) {
  const { emailUsuario, comprobante } = req.body || {};
  const secreto = process.env.REGISTRO_TOKEN_SECRET;

  if (!secreto) {
    return res.status(503).json({ message: 'El registro no está disponible.' });
  }

  if (typeof emailUsuario !== 'string' || typeof comprobante !== 'string') {
    return res.status(400).json({ message: 'Verificá tu correo antes de registrarte.' });
  }

  try {
    jwt.verify(comprobante, secreto, {
      algorithms: ['HS256'],
      audience: 'registro',
      subject: emailUsuario.trim().toLowerCase()
    });
  } catch {
    return res.status(403).json({
      message: 'La verificación del correo no es válida o venció. Solicitá otro código.'
    });
  }

  return next();
}

module.exports = verificarCorreoRegistro;
