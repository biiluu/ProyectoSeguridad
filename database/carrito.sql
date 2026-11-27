-- Tabla del carrito de cada comprador.
-- Tomada de mercauca_mysql.sql del proyecto original (idempotente).

USE `mercauca`;

CREATE TABLE IF NOT EXISTS `carrito` (
  `id_carrito` varchar(60) NOT NULL,
  `id_comprador` varchar(50) NOT NULL,
  `fechaCreacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaModificacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_carrito`),
  UNIQUE KEY `UQ_Carrito_Comprador` (`id_comprador`),
  CONSTRAINT `FK_Carrito_Usuario`
    FOREIGN KEY (`id_comprador`)
    REFERENCES `usuario` (`id_usuario`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Productos que contiene cada carrito.
-- Tomada de mercauca_mysql.sql del proyecto original (idempotente).

CREATE TABLE IF NOT EXISTS `articulos_carrito` (
  `id_articulos_carrito` varchar(60) NOT NULL,
  `id_carrito` varchar(60) NOT NULL,
  `id_producto_variante` varchar(50) NOT NULL,
  `cantidad` int NOT NULL DEFAULT '1',
  `precio` double NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT '$',
  PRIMARY KEY (`id_articulos_carrito`),
  KEY `FK_ArticulosCarrito_Carrito` (`id_carrito`),
  KEY `FK_ArticulosCarrito_Variante` (`id_producto_variante`),
  CONSTRAINT `FK_ArticulosCarrito_Carrito`
    FOREIGN KEY (`id_carrito`)
    REFERENCES `carrito` (`id_carrito`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_ArticulosCarrito_Variante`
    FOREIGN KEY (`id_producto_variante`)
    REFERENCES `variantes_productos` (`id_producto_variante`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Datos de prueba tomados del proyecto original.
-- Solo se insertan si U001 y PB01 ya existen, evitando errores por orden de ejecución.

INSERT IGNORE INTO `carrito` (`id_carrito`, `id_comprador`, `fechaCreacion`, `fechaModificacion`)
SELECT 'CR-U001', u.`id_usuario`, '2026-11-08 20:41:34', '2026-11-08 20:41:34'
FROM `usuario` u
WHERE u.`id_usuario` = 'U001';

INSERT IGNORE INTO `articulos_carrito` (`id_articulos_carrito`, `id_carrito`, `id_producto_variante`, `cantidad`, `precio`, `moneda`)
SELECT 'AC-001', c.`id_carrito`, vp.`id_producto_variante`, 1, 215.5, '$'
FROM `carrito` c
INNER JOIN `variantes_productos` vp ON vp.`id_producto_variante` = 'PB01'
WHERE c.`id_carrito` = 'CR-U001';