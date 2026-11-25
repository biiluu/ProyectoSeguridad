-- Estados de cada artículo de una orden.
-- Estructura y datos tomados del proyecto original.

CREATE TABLE `estado_articulos_orden` (
  `id_estado_articulo_orden` varchar(25) NOT NULL,
  `nombre_estado` varchar(50) NOT NULL,
  PRIMARY KEY (`id_estado_articulo_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Estados generales de una orden.

CREATE TABLE `estados_orden` (
  `id_estado_orden` varchar(25) NOT NULL,
  `nombre_estado` varchar(75) NOT NULL,
  PRIMARY KEY (`id_estado_orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Datos de prueba del proyecto original.

INSERT INTO `estado_articulos_orden`
VALUES
  ('EA01', 'En preparación'),
  ('EA02', 'Enviado'),
  ('EA03', 'Entregado');

INSERT INTO `estados_orden`
VALUES
  ('EO01', 'Pendiente'),
  ('EO02', 'Pagada'),
  ('EO03', 'Enviada'),
  ('EO04', 'Entregada'),
  ('EO05', 'Cancelada');

-- Datos generales de cada compra.

CREATE TABLE `orden` (
  `id_orden` varchar(50) NOT NULL,
  `id_comprador` varchar(50) NOT NULL,
  `id_estado_orden` varchar(25) NOT NULL,
  `monto_total` double NOT NULL,
  `moneda` varchar(10) NOT NULL DEFAULT '$',
  `id_direccion` varchar(50) DEFAULT NULL,
  `fechaCreacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_pago` datetime DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  PRIMARY KEY (`id_orden`),
  KEY `FK_Orden_Usuario` (`id_comprador`),
  KEY `FK_Orden_EstadosOrden` (`id_estado_orden`),
  CONSTRAINT `FK_Orden_EstadosOrden`
    FOREIGN KEY (`id_estado_orden`)
    REFERENCES `estados_orden` (`id_estado_orden`),
  CONSTRAINT `FK_Orden_Usuario`
    FOREIGN KEY (`id_comprador`)
    REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Productos incluidos en cada compra.

CREATE TABLE `articulos_orden` (
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
  CONSTRAINT `FK_ArticulosOrden_Estado`
    FOREIGN KEY (`id_estado_articulo_orden`)
    REFERENCES `estado_articulos_orden` (`id_estado_articulo_orden`),
  CONSTRAINT `FK_ArticulosOrden_Orden`
    FOREIGN KEY (`id_orden`)
    REFERENCES `orden` (`id_orden`)
    ON DELETE CASCADE,
  CONSTRAINT `FK_ArticulosOrden_Usuario`
    FOREIGN KEY (`id_vendedor`)
    REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `FK_ArticulosOrden_Variante`
    FOREIGN KEY (`id_producto_variante`)
    REFERENCES `variantes_productos` (`id_producto_variante`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;