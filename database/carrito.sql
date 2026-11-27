-- Tabla del carrito de cada comprador.
-- Tomada de mercauca_mysql.sql del proyecto original.

CREATE TABLE `carrito` (
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
-- Tomada de mercauca_mysql.sql del proyecto original.

CREATE TABLE `articulos_carrito` (
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
-- Requieren que ya existan el usuario U001 y la variante PB01.

INSERT INTO `carrito`
VALUES ('CR-U001', 'U001', '2026-11-08 20:41:34', '2026-11-08 20:41:34');

INSERT INTO `articulos_carrito`
VALUES ('AC-001', 'CR-U001', 'PB01', 1, 215.5, '$');