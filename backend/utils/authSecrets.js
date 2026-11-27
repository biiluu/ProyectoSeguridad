/**
 * Resolución centralizada de secretos JWT de autenticación y registro.
 * En producción exige variables de entorno explícitas; en desarrollo/pruebas usa fallback local.
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  return process.env.NODE_ENV === 'production' ? '' : 'secret';
}

function getRegistroTokenSecret() {
  if (process.env.REGISTRO_TOKEN_SECRET) {
    return process.env.REGISTRO_TOKEN_SECRET;
  }
  return process.env.NODE_ENV === 'production' ? '' : 'dev-registro-secret';
}

module.exports = {
  getJwtSecret,
  getRegistroTokenSecret
};
