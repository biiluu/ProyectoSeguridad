/**
 * =============================================================================
 * SANITIZADOR Y VALIDADOR GLOBAL DE PARÁMETROS NATIVO (OWASP Top 10)
 * =============================================================================
 * Protege contra Prototype Pollution, bytes nulos y caracteres de control.
 */

function cleanPayload(data, depth = 0) {
  if (depth > 10 || data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  if (Array.isArray(data)) {
    return data.map(item => cleanPayload(item, depth + 1));
  }

  if (typeof data === 'object') {
    const cleaned = {};
    for (const key of Object.keys(data)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = cleanPayload(data[key], depth + 1);
    }
    return cleaned;
  }

  return data;
}

function globalSanitizer(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = cleanPayload(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = cleanPayload(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = cleanPayload(req.params);
    }
    next();
  } catch (err) {
    console.error('Error en globalSanitizer:', err);
    return res.status(400).json({ message: 'Parámetros de solicitud malformados.' });
  }
}

module.exports = {
  cleanPayload,
  globalSanitizer
};
