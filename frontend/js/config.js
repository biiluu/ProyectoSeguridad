// Configuración de API Base
// Si el frontend se sirve desde Express/Docker (puerto 5048, 80, 443, etc.), usa el mismo origen ('')
const devStaticPorts = new Set(['5500', '5501', '5502', '3000', '4200', '5173']);
const API_URL = (window.location.protocol.startsWith('http') && !devStaticPorts.has(window.location.port))
  ? ''
  : 'http://localhost:5048';

window.API_URL = API_URL;

