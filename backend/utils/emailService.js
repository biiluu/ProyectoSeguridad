const nodemailer = require('nodemailer');

async function enviarCorreoCodigo(destino, codigo) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Falta configurar el servicio de correo.');
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transport.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: destino,
    subject: 'Código de verificación de MercaUca',
    text: `Tu código de verificación es ${codigo}. Vence en 5 minutos.`
  });
}

module.exports = { enviarCorreoCodigo };
