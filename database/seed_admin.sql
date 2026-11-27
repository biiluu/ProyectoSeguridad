USE `mercauca`;

INSERT IGNORE INTO `usuario` (
  `id_usuario`, `email_usuario`, `password_hash`, `nombre_usuario`, `telefono_usuario`, `id_estado`, `id_rol`
) VALUES
  (
    'admin01',
    'admin01@mercauca.edu.sv',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'Administrador de Prueba',
    '77770000',
    'ACT',
    (SELECT id_rol FROM roles WHERE nombre_rol = 'Administrador' LIMIT 1)
  ),
  (
    'U001',
    'juan.perez@example.com',
    '$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u',
    'Juan Pérez',
    '77770001',
    'ACT',
    (SELECT id_rol FROM roles WHERE nombre_rol = 'Comprador' LIMIT 1)
  );