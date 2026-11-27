const pool = require('../config/db');

const CACHE_TTL_MS = 60 * 1000; // 60 segundos
const MISS_REFRESH_THROTTLE_MS = 5 * 1000; // Evita martillar la BD con IDs inválidos

let cache = null;
let cacheTimestamp = 0;
let lastMissRefresh = 0;
let inflightLoad = null;

/**
 * Normaliza el nombre de rol para identificar la clave lógica (ADM, CMP, VEN)
 */
function resolverClaveRol(nombreRol) {
  const nombre = String(nombreRol || '').trim().toLowerCase();
  if (nombre.includes('admin')) return 'ADM';
  if (nombre.includes('vend')) return 'VEN';
  if (nombre.includes('comp')) return 'CMP';
  return null;
}

/**
 * Carga la tabla `roles` desde MySQL y construye mapas rápidos por clave e ID hash
 */
async function cargarRolesDesdeDB() {
  const [rows] = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY nombre_rol ASC');

  const byKey = { ADM: null, CMP: null, VEN: null };
  const byId = new Map();

  for (const row of rows) {
    const idRol = String(row.id_rol);
    const nombreRol = String(row.nombre_rol || '').trim();
    const key = resolverClaveRol(nombreRol);

    if (key && !byKey[key]) {
      byKey[key] = idRol;
    }

    byId.set(idRol, {
      idRol,
      nombreRol,
      key
    });
  }

  if (!byKey.ADM || !byKey.CMP || !byKey.VEN) {
    throw new Error('Catálogo de roles incompleto en la base de datos (se requieren Administrador, Comprador y Vendedor).');
  }

  cache = {
    ADM: byKey.ADM,
    CMP: byKey.CMP,
    VEN: byKey.VEN,
    byId,
    list: rows.map(r => ({ id_rol: String(r.id_rol), nombre_rol: String(r.nombre_rol || '').trim() }))
  };
  cacheTimestamp = Date.now();
  return cache;
}

/**
 * Obtiene el mapa de roles vigente (con caché en memoria de 60s)
 */
async function getRolesMap(forceRefresh = false) {
  const ahora = Date.now();
  if (!forceRefresh && cache && (ahora - cacheTimestamp) < CACHE_TTL_MS) {
    return cache;
  }

  if (!inflightLoad) {
    inflightLoad = cargarRolesDesdeDB().finally(() => {
      inflightLoad = null;
    });
  }

  return inflightLoad;
}

/**
 * Obtiene la metadata de un rol dado su id_rol (refresca con throttling si no existe en caché)
 */
async function getRolInfo(idRol) {
  if (!idRol || typeof idRol !== 'string') return null;
  const trimmed = idRol.trim();
  let map = await getRolesMap();

  if (map.byId.has(trimmed)) {
    return map.byId.get(trimmed);
  }

  const ahora = Date.now();
  if (ahora - lastMissRefresh > MISS_REFRESH_THROTTLE_MS) {
    lastMissRefresh = ahora;
    map = await getRolesMap(true);
    if (map.byId.has(trimmed)) {
      return map.byId.get(trimmed);
    }
  }

  return null;
}

/**
 * Invalida la caché de roles en memoria
 */
function invalidateRolesCache() {
  cache = null;
  cacheTimestamp = 0;
}

module.exports = {
  getRolesMap,
  getRolInfo,
  invalidateRolesCache
};
