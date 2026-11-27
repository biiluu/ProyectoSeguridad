const MAX_IMAGEN_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * Valida estrictamente la fotografía de un producto:
 * 1. Existencia y contenido binario no vacío
 * 2. Tamaño máximo de 5 MB
 * 3. MIME type declarado permitido (JPG, PNG, WEBP)
 * 4. Inspección de Magic Bytes reales (firma binaria)
 *
 * @param {{ buffer?: Buffer, mimetype?: string }|undefined|null} file
 * @returns {{ valido: boolean, error?: string }}
 */
function validarFotoProducto(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return { valido: false, error: 'La fotografía del producto es obligatoria.' };
  }

  if (file.buffer.length > MAX_IMAGEN_BYTES) {
    return { valido: false, error: 'El archivo excede el tamaño máximo permitido de 5 MB.' };
  }

  if (!file.mimetype || !TIPOS_IMAGEN_PERMITIDOS.includes(file.mimetype.toLowerCase())) {
    return {
      valido: false,
      error: 'Formato no admitido. Solo se permiten imágenes en formato JPG, PNG o WEBP.'
    };
  }

  const buf = file.buffer;
  let firmaValida = false;

  // JPEG / JPG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    firmaValida = true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4E &&
    buf[3] === 0x47 &&
    buf[4] === 0x0D &&
    buf[5] === 0x0A &&
    buf[6] === 0x1A &&
    buf[7] === 0x0A
  ) {
    firmaValida = true;
  }
  // WEBP: 'RIFF' .... 'WEBP'
  else if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    firmaValida = true;
  }

  if (!firmaValida) {
    return {
      valido: false,
      error: 'El archivo seleccionado no es una imagen válida o está alterado (firma binaria incorrecta).'
    };
  }

  return { valido: true };
}

/**
 * Detecta el tipo MIME real de un buffer binario de imagen usando Magic Bytes.
 * @param {Buffer|Uint8Array|null} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'}
 */
function detectarMimeDesdeBuffer(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';

  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4E &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }

  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

/**
 * Convierte un BLOB binario de imagen en Data URL Base64 lista para el frontend.
 * @param {Buffer|Uint8Array|null} rawFoto
 * @returns {string|null}
 */
function bufferToDataUrl(rawFoto) {
  if (!rawFoto) return null;
  const buf = Buffer.isBuffer(rawFoto) ? rawFoto : Buffer.from(rawFoto);
  if (buf.length === 0) return null;
  const mime = detectarMimeDesdeBuffer(buf);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

module.exports = {
  MAX_IMAGEN_BYTES,
  TIPOS_IMAGEN_PERMITIDOS,
  validarFotoProducto,
  detectarMimeDesdeBuffer,
  bufferToDataUrl
};
