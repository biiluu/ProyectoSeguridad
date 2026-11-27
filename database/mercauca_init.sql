-- =============================================================================
-- MercaUca (ProyectoSeguridad): Script unificado idempotente (MySQL 8.0+)
-- =============================================================================
-- Crea la base de datos `mercauca`, todas las tablas de todos los módulos
-- (usuarios/roles, verificación OTP, catálogo/productos, carrito y compras),
-- migra columnas faltantes en bases heredadas e inserta los datos iniciales.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `mercauca`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mercauca`;

-- -----------------------------------------------------------------------------
-- 1. Roles, estados y usuarios base
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` varchar(100) NOT NULL,
  `nombre_rol` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `roles` (`id_rol`, `nombre_rol`) VALUES
  ('1c28919db40d671b4e4888de61fa3a1d47783e0a813b01c681d40e9047b95bbd', 'Comprador'),
  ('c2ef338fce5b8f9dc946f1dd77333f0f5000af62e379f7a92393eb8238cc18e6', 'Administrador'),
  ('e6497df97dd8170a661b99f9055b56f0b4cf8a92980936b1fa767959b28ecae6', 'Vendedor');

CREATE TABLE IF NOT EXISTS `estado_usuario` (
  `id_estado` varchar(10) NOT NULL,
  `nombre_estado` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id_estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `estado_usuario` (`id_estado`, `nombre_estado`) VALUES
  ('ACT', 'Activo'),
  ('INA', 'Inactivo');

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` varchar(50) NOT NULL,
  `email_usuario` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre_usuario` varchar(175) NOT NULL,
  `telefono_usuario` varchar(25) NOT NULL,
  `id_estado` varchar(10) NOT NULL,
  `id_rol` varchar(100) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `UQ_email_usuario` (`email_usuario`),
  KEY `FK_Usuario_Estado` (`id_estado`),
  KEY `FK_Usuario_Roles` (`id_rol`),
  CONSTRAINT `FK_Usuario_Estado` FOREIGN KEY (`id_estado`) REFERENCES `estado_usuario` (`id_estado`),
  CONSTRAINT `FK_Usuario_Roles` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `usuario` (
  `id_usuario`, `email_usuario`, `password_hash`, `nombre_usuario`, `telefono_usuario`, `id_estado`, `id_rol`
) VALUES
  (
    'ProductoMediaSlider',
    'slider@mercauca.edu.sv',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'Product Media Slider',
    '0000-0000',
    'ACT',
    'c2ef338fce5b8f9dc946f1dd77333f0f5000af62e379f7a92393eb8238cc18e6'
  ),
  (
    'admin01',
    'admin01@mercauca.edu.sv',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'Administrador de Prueba',
    '77770000',
    'ACT',
    'c2ef338fce5b8f9dc946f1dd77333f0f5000af62e379f7a92393eb8238cc18e6'
  ),
  (
    'U001',
    'juan.perez@example.com',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'Juan Pérez',
    '77770001',
    'ACT',
    '1c28919db40d671b4e4888de61fa3a1d47783e0a813b01c681d40e9047b95bbd'
  ),
  (
    'U002',
    'maria.garcia@example.com',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'María García',
    '77770002',
    'ACT',
    'e6497df97dd8170a661b99f9055b56f0b4cf8a92980936b1fa767959b28ecae6'
  );

-- -----------------------------------------------------------------------------
-- 2. Códigos OTP de verificación de registro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `codigos_verificacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `expira` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_codigo` (`email`, `codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Catálogo, productos, media y variantes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categoria` (
  `id_categoria` varchar(25) NOT NULL,
  `nombre_categoria` varchar(75) NOT NULL,
  `categoria_activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `categoria` (`id_categoria`, `nombre_categoria`, `categoria_activa`) VALUES
  ('CAT001', 'Relojes', 1),
  ('CAT002', 'Joyería', 1),
  ('CAT003', 'Electrónica', 1),
  ('CAT004', 'Moda', 1),
  ('CAT005', 'Hogar y decoración', 1),
  ('CATS01', 'Slider y Ofertas', 1);

CREATE TABLE IF NOT EXISTS `condicion_producto` (
  `id_condicion` varchar(25) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id_condicion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `condicion_producto` (`id_condicion`, `nombre`) VALUES
  ('C001', 'Nuevo'),
  ('C002', 'Usado - Como nuevo'),
  ('C003', 'Usado - Buen estado'),
  ('C004', 'Usado - Regular'),
  ('C005', 'Reacondicionado');

CREATE TABLE IF NOT EXISTS `productos` (
  `id_producto` varchar(50) NOT NULL,
  `id_vendedor` varchar(50) NOT NULL,
  `titulo_producto` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `marca` varchar(75) NOT NULL,
  `id_condicion` varchar(25) NOT NULL,
  `fechaCreacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaModificacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `foto` longblob,
  `id_categoria` varchar(25) NOT NULL,
  `precio` double NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_producto`),
  KEY `FK_Productos_Usuario` (`id_vendedor`),
  KEY `FK_Productos_Condicion` (`id_condicion`),
  KEY `FK_Productos_Categoria` (`id_categoria`),
  CONSTRAINT `FK_Productos_Categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id_categoria`),
  CONSTRAINT `FK_Productos_Condicion` FOREIGN KEY (`id_condicion`) REFERENCES `condicion_producto` (`id_condicion`),
  CONSTRAINT `FK_Productos_Usuario` FOREIGN KEY (`id_vendedor`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `producto_media` (
  `id_media` varchar(50) NOT NULL,
  `id_producto` varchar(50) NOT NULL,
  `posicion_galeria` int NOT NULL DEFAULT 0,
  `producto_primario` tinyint(1) NOT NULL DEFAULT 0,
  `Novedades` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_media`),
  KEY `FK_ProductoMedia_Productos` (`id_producto`),
  CONSTRAINT `FK_ProductoMedia_Productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `variantes_productos` (
  `id_producto_variante` varchar(50) NOT NULL,
  `id_producto` varchar(50) NOT NULL,
  `talla` varchar(45) DEFAULT NULL,
  `color` varchar(55) DEFAULT NULL,
  `stock` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_producto_variante`),
  KEY `FK_Variantes_Productos` (`id_producto`),
  CONSTRAINT `FK_Variantes_Productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `productos` (
  `id_producto`, `id_vendedor`, `titulo_producto`, `descripcion`, `marca`,
  `id_condicion`, `foto`, `id_categoria`, `precio`
) VALUES
  ('PSD01', 'ProductoMediaSlider', 'Reloj Bulova Classic', 'Reloj de pulsera con correa de cuero y caja de acero inoxidable de alta precisión.', 'Bulova', 'C001', NULL, 'CATS01', 215.50),
  ('PSD02', 'ProductoMediaSlider', 'Anillo de Slider Oro 18k', 'Elegante anillo con acabado en oro de 18 kilates, diseño contemporáneo.', 'Arguello Joyas', 'C001', NULL, 'CATS01', 145.00),
  ('PSD03', 'ProductoMediaSlider', 'Ofertas de Temporada MercaUca', 'Accesorios seleccionados y moda universitaria con precios rebajados.', 'MercaUca', 'C001', NULL, 'CATS01', 35.00),
  ('PB01', 'U002', 'Reloj Bulova Classic Edición Campus', 'Reloj analógico de acero inoxidable resistente al agua con correa negra ajustable.', 'Bulova', 'C001', NULL, 'CAT001', 215.50),
  ('PB02', 'U002', 'Calculadora Científica Casio fx-991LAX', 'Calculadora solar y de batería ideal para ingeniería, estadística y cálculo universitario.', 'Casio', 'C002', NULL, 'CAT003', 24.00),
  ('PB03', 'U002', 'Audífonos Inalámbricos Beats Flex', 'Audífonos Bluetooth con hasta 12 horas de autonomía, carga USB-C y estuche protector.', 'Beats', 'C002', NULL, 'CAT003', 48.00),
  ('PB04', 'U002', 'Mochila Universitaria Impermeable', 'Mochila acolchada para laptop de hasta 15.6 pulgadas con múltiples compartimentos.', 'Samsonite', 'C001', NULL, 'CAT004', 32.50),
  ('PB05', 'U002', 'Aretes de Cristal Esmeralda', 'Aretes elegantes bañados en plata 925 con incrustación de cristal verde.', 'Arguello Joyas', 'C001', NULL, 'CAT002', 18.00),
  ('PB06', 'U002', 'Lámpara LED Minimalista de Escritorio', 'Lámpara regulable de 3 tonos de luz ideal para estudio nocturno.', 'Philips', 'C005', NULL, 'CAT005', 19.75);

INSERT IGNORE INTO `producto_media` (`id_media`, `id_producto`, `posicion_galeria`, `producto_primario`, `Novedades`) VALUES
  ('MED01', 'PSD01', 0, 1, 1),
  ('MED02', 'PSD02', 1, 1, 1),
  ('MED03', 'PSD03', 2, 1, 1),
  ('MED04', 'PB01', 0, 1, 1),
  ('MED05', 'PB02', 0, 1, 1),
  ('MED06', 'PB03', 0, 1, 1),
  ('MED07', 'PB04', 0, 1, 1),
  ('MED08', 'PB05', 0, 1, 1),
  ('MED09', 'PB06', 0, 1, 1);

INSERT IGNORE INTO `variantes_productos` (`id_producto_variante`, `id_producto`, `talla`, `color`, `stock`) VALUES
  ('PSD01', 'PSD01', 'Estándar', 'Plateado/Marrón', 5),
  ('PSD02', 'PSD02', 'Estándar', 'Dorado', 3),
  ('PSD03', 'PSD03', 'Estándar', 'Negro', 10),
  ('PB01', 'PB01', 'Estándar', 'Negro/Plateado', 8),
  ('PB02', 'PB02', 'Estándar', 'Negro', 15),
  ('PB03', 'PB03', 'Estándar', 'Gris Lunar', 4),
  ('PB04', 'PB04', '15.6 pulg', 'Negro', 6),
  ('PB05', 'PB05', 'Única', 'Verde/Plata', 12),
  ('PB06', 'PB06', 'Estándar', 'Blanco Mate', 2);

-- -----------------------------------------------------------------------------
-- 4. Carrito de compras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `carrito` (
  `id_carrito` varchar(60) NOT NULL,
  `id_comprador` varchar(50) NOT NULL,
  `fechaCreacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaModificacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_carrito`),
  UNIQUE KEY `UQ_Carrito_Comprador` (`id_comprador`),
  CONSTRAINT `FK_Carrito_Usuario` FOREIGN KEY (`id_comprador`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT `FK_ArticulosCarrito_Carrito` FOREIGN KEY (`id_carrito`) REFERENCES `carrito` (`id_carrito`) ON DELETE CASCADE,
  CONSTRAINT `FK_ArticulosCarrito_Variante` FOREIGN KEY (`id_producto_variante`) REFERENCES `variantes_productos` (`id_producto_variante`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `carrito` (`id_carrito`, `id_comprador`, `fechaCreacion`, `fechaModificacion`)
VALUES ('CR-U001', 'U001', '2026-11-08 20:41:34', '2026-11-08 20:41:34');

INSERT IGNORE INTO `articulos_carrito` (`id_articulos_carrito`, `id_carrito`, `id_producto_variante`, `cantidad`, `precio`, `moneda`)
VALUES ('AC-001', 'CR-U001', 'PB01', 1, 215.5, '$');

-- -----------------------------------------------------------------------------
-- 5. Órdenes y compras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `estado_articulos_orden` (
  `id_estado_articulo_orden` varchar(25) NOT NULL,
  `nombre_estado` varchar(50) NOT NULL,
  PRIMARY KEY (`id_estado_articulo_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `estados_orden` (
  `id_estado_orden` varchar(25) NOT NULL,
  `nombre_estado` varchar(75) NOT NULL,
  PRIMARY KEY (`id_estado_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `estado_articulos_orden` (`id_estado_articulo_orden`, `nombre_estado`) VALUES
  ('EA01', 'En preparación'),
  ('EA02', 'Enviado'),
  ('EA03', 'Entregado');

INSERT IGNORE INTO `estados_orden` (`id_estado_orden`, `nombre_estado`) VALUES
  ('EO01', 'Pendiente'),
  ('EO02', 'Pagada'),
  ('EO03', 'Enviada'),
  ('EO04', 'Entregada'),
  ('EO05', 'Cancelada');

CREATE TABLE IF NOT EXISTS `orden` (
  `id_orden` varchar(50) NOT NULL,
  `id_comprador` varchar(50) NOT NULL,
  `id_estado_orden` varchar(25) NOT NULL,
  `monto_total` double NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT '$',
  `modo_entrega` varchar(10) NOT NULL DEFAULT 'store',
  `costo_envio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `id_direccion` varchar(50) DEFAULT NULL,
  `fechaCreacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_pago` datetime DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  PRIMARY KEY (`id_orden`),
  KEY `FK_Orden_Usuario` (`id_comprador`),
  KEY `FK_Orden_EstadosOrden` (`id_estado_orden`),
  CONSTRAINT `FK_Orden_EstadosOrden` FOREIGN KEY (`id_estado_orden`) REFERENCES `estados_orden` (`id_estado_orden`),
  CONSTRAINT `FK_Orden_Usuario` FOREIGN KEY (`id_comprador`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @stmt_modo_entrega = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orden' AND COLUMN_NAME = 'modo_entrega'
    ),
    'SELECT 1',
    'ALTER TABLE `orden` ADD COLUMN `modo_entrega` varchar(10) NOT NULL DEFAULT ''store'' AFTER `moneda`'
  )
);
PREPARE s1 FROM @stmt_modo_entrega;
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @stmt_costo_envio = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orden' AND COLUMN_NAME = 'costo_envio'
    ),
    'SELECT 1',
    'ALTER TABLE `orden` ADD COLUMN `costo_envio` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `modo_entrega`'
  )
);
PREPARE s2 FROM @stmt_costo_envio;
EXECUTE s2;
DEALLOCATE PREPARE s2;

CREATE TABLE IF NOT EXISTS `articulos_orden` (
  `id_articulo_orden` varchar(50) NOT NULL,
  `id_orden` varchar(50) NOT NULL,
  `id_vendedor` varchar(50) NOT NULL,
  `id_producto_variante` varchar(50) NOT NULL,
  `id_estado_articulo_orden` varchar(25) NOT NULL,
  `cantidad` int NOT NULL,
  `sub_total` double NOT NULL,
  `porcentaje_comision` double NOT NULL DEFAULT '0',
  `subtotal_comision` double NOT NULL DEFAULT '0',
  `tracking_number` varchar(250) DEFAULT NULL,
  `fecha_entrega` datetime DEFAULT NULL,
  PRIMARY KEY (`id_articulo_orden`),
  KEY `FK_ArticulosOrden_Orden` (`id_orden`),
  KEY `FK_ArticulosOrden_Usuario` (`id_vendedor`),
  KEY `FK_ArticulosOrden_Variante` (`id_producto_variante`),
  KEY `FK_ArticulosOrden_Estado` (`id_estado_articulo_orden`),
  CONSTRAINT `FK_ArticulosOrden_Estado` FOREIGN KEY (`id_estado_articulo_orden`) REFERENCES `estado_articulos_orden` (`id_estado_articulo_orden`),
  CONSTRAINT `FK_ArticulosOrden_Orden` FOREIGN KEY (`id_orden`) REFERENCES `orden` (`id_orden`) ON DELETE CASCADE,
  CONSTRAINT `FK_ArticulosOrden_Usuario` FOREIGN KEY (`id_vendedor`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `FK_ArticulosOrden_Variante` FOREIGN KEY (`id_producto_variante`) REFERENCES `variantes_productos` (`id_producto_variante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
