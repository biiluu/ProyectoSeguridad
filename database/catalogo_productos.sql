-- =============================================================================
-- Proyecto SED - MercaUca: Tablas de Catálogo y Productos (feature/catalogo)
-- =============================================================================
-- Script idempotente compatible con MySQL 8.0+ (Linux y Windows).
-- Crea las tablas de productos, categorías, condiciones, media y variantes,
-- asegurando las tablas referenciadas mínimas si aún no han sido inicializadas.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `mercauca`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mercauca`;

-- -----------------------------------------------------------------------------
-- Tablas base referenciadas por claves foráneas (idempotentes)
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
    'U002',
    'maria.garcia@example.com',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'María García',
    '77770002',
    'ACT',
    'e6497df97dd8170a661b99f9055b56f0b4cf8a92980936b1fa767959b28ecae6'
  );

-- -----------------------------------------------------------------------------
-- 1. Catálogo de categorías de producto
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

-- -----------------------------------------------------------------------------
-- 2. Catálogo de condiciones de producto
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. Tabla principal de productos
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Metadatos multimedia y bandera de Novedades
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. Variantes e inventario (stock) por producto
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. Datos semilla iniciales para slider y catálogo público
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `productos` (
  `id_producto`, `id_vendedor`, `titulo_producto`, `descripcion`, `marca`,
  `id_condicion`, `foto`, `id_categoria`, `precio`
) VALUES
  (
    'PSD01', 'ProductoMediaSlider', 'Reloj Bulova Classic',
    'Reloj de pulsera con correa de cuero y caja de acero inoxidable de alta precisión.',
    'Bulova', 'C001', NULL, 'CATS01', 215.50
  ),
  (
    'PSD02', 'ProductoMediaSlider', 'Anillo de Slider Oro 18k',
    'Elegante anillo con acabado en oro de 18 kilates, diseño contemporáneo.',
    'Arguello Joyas', 'C001', NULL, 'CATS01', 145.00
  ),
  (
    'PSD03', 'ProductoMediaSlider', 'Ofertas de Temporada MercaUca',
    'Accesorios seleccionados y moda universitaria con precios rebajados.',
    'MercaUca', 'C001', NULL, 'CATS01', 35.00
  ),
  (
    'PB01', 'U002', 'Reloj Bulova Classic Edición Campus',
    'Reloj analógico de acero inoxidable resistente al agua con correa negra ajustable.',
    'Bulova', 'C001', NULL, 'CAT001', 215.50
  ),
  (
    'PB02', 'U002', 'Calculadora Científica Casio fx-991LAX',
    'Calculadora solar y de batería ideal para ingeniería, estadística y cálculo universitario.',
    'Casio', 'C002', NULL, 'CAT003', 24.00
  ),
  (
    'PB03', 'U002', 'Audífonos Inalámbricos Beats Flex',
    'Audífonos Bluetooth con hasta 12 horas de autonomía, carga USB-C y estuche protector.',
    'Beats', 'C002', NULL, 'CAT003', 48.00
  ),
  (
    'PB04', 'U002', 'Mochila Universitaria Impermeable',
    'Mochila acolchada para laptop de hasta 15.6 pulgadas con múltiples compartimentos.',
    'Samsonite', 'C001', NULL, 'CAT004', 32.50
  ),
  (
    'PB05', 'U002', 'Aretes de Cristal Esmeralda',
    'Aretes elegantes bañados en plata 925 con incrustación de cristal verde.',
    'Arguello Joyas', 'C001', NULL, 'CAT002', 18.00
  ),
  (
    'PB06', 'U002', 'Lámpara LED Minimalista de Escritorio',
    'Lámpara regulable de 3 tonos de luz ideal para estudio nocturno.',
    'Philips', 'C005', NULL, 'CAT005', 19.75
  );

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
