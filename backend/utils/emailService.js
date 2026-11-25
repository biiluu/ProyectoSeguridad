const nodemailer = require('nodemailer');
function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function createTransporter() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Falta configurar el servicio de correo.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

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

async function enviarCorreoCompra(emailDestino, nombreCliente, items, total, moneda = '$', costoEnvio = 0, modoEntrega = 'store') {
  const transporter = createTransporter();
  const year = new Date().getFullYear();

  let filasHtml = '';
  for (const item of items) {
    filasHtml += `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; color:#111827;">${escaparHtml(item.tituloProducto)}</td>
        <td style="padding:10px 8px; text-align:center; border-bottom:1px solid #f3f4f6; color:#374151;">${item.cantidad}</td>
        <td style="padding:10px 8px; text-align:right; border-bottom:1px solid #f3f4f6; font-weight:600; color:#111827;">
          ${(Number(item.precio) * Number(item.cantidad)).toFixed(2)} ${escaparHtml(item.moneda || moneda)}
        </td>
      </tr>
    `;
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Confirmación de compra - MercaUca</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:20px; margin:0;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:#dc2626; padding:22px; text-align:center;">
      <h1 style="color:white; margin:0; font-size:26px; letter-spacing:1px;">MERCAUCA</h1>
      <p style="color:#ffeaea; margin:6px 0 0; font-size:14px;">Confirmación de compra</p>
    </div>

    <!-- Contenido -->
    <div style="padding:26px; font-size:15px; color:#111827;">
      <p>Hola <strong>${escaparHtml(nombreCliente || 'Cliente')}</strong>,</p>
      <p>¡Gracias por tu compra en <strong>MercaUca</strong>! Este es el resumen detallado de tu pedido:</p>

      <h3 style="color:#dc2626; margin-top:22px; margin-bottom:12px; font-size:16px;">Detalle de productos</h3>

      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="background-color:#f9fafb;">
            <th style="text-align:left; padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#4b5563;">Producto</th>
            <th style="text-align:center; padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#4b5563;">Cantidad</th>
            <th style="text-align:right; padding:10px 8px; border-bottom:2px solid #e5e7eb; color:#4b5563;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
      </table>

      <p>
          <strong>Método de entrega:</strong>
          ${modoEntrega === 'home' ? 'Envío a domicilio' : 'Retiro en campus UCA'}
        </p>
        <p>
          <strong>Subtotal de productos:</strong>
          ${Number(total - costoEnvio).toFixed(2)} ${escaparHtml(moneda)}
        </p>
        <p>
          <strong>Costo de envío:</strong>
          ${Number(costoEnvio).toFixed(2)} ${escaparHtml(moneda)}
        </p>

      <div style="margin-top:20px; padding:14px; background:#fef2f2; border-radius:8px; text-align:right;">
        <span style="font-size:15px; font-weight:600; color:#374151;">Total de la compra: </span>
        <span style="color:#dc2626; font-size:20px; font-weight:bold; margin-left:6px;">
          ${Number(total).toFixed(2)} ${escaparHtml(moneda)}
        </span>
      </div>

      <p style="margin-top:20px; color:#4b5563; font-size:14px; line-height:1.5;">
        Te enviaremos otra notificación cuando tu pedido esté listo para entrega o envío en el campus universitario.
      </p>

      <p style="margin-top:12px; color:#6b7280; font-size:13px;">
        Si tienes alguna duda o aclaración sobre tu pedido, puedes responder directamente a este correo.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6; padding:14px 16px; text-align:center; color:#9ca3af; font-size:12px;">
      © ${year} MercaUca — Todos los derechos reservados.
    </div>
  </div>
</body>
</html>`;

  return await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: emailDestino,
    subject: 'Confirmación de compra - MercaUca',
    html: html
  });
}

module.exports = { enviarCorreoCodigo, enviarCorreoCompra };
