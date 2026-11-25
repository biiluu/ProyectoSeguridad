/**
 * Detecta el tipo MIME real de un buffer binario de imagen usando Magic Bytes.
 * @param {Buffer|Uint8Array|null} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'}
 */
function detectarMimeDesdeBuffer(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';

  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4E &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }

  // WEBP: 'RIFF' .... 'WEBP'
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
  detectarMimeDesdeBuffer,
  bufferToDataUrl
};
