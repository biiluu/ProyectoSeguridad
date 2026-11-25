# Módulo de Productos, Catálogo Público y Mis Productos (Integrante 2)

Documentación técnica del módulo desarrollado en las tres ramas de **Integrante 2** siguiendo la metodología **Git Flow** del proyecto **MercaUca (Proyecto SED)**:

1. `feature/catalogo`: Esquema SQL de productos, API de consulta pública y vistas de catálogo/detalle.
2. `feature/publicar-productos`: Carga de imágenes con validación binaria (Magic Bytes), middleware de rol vendedor y formulario de publicación.
3. `feature/mis-productos`: API y pantalla de gestión de inventario propio, comprobaciones automatizadas y esta documentación.

---

## 1. Modelo de Datos (`database/catalogo_productos.sql`)

Todas las tablas usan motor `InnoDB`, codificación `utf8mb4_unicode_ci` y nombres en minúsculas para compatibilidad entre MySQL en Linux y Windows:

- `categoria`: Catálogo de categorías (`CAT001`–`CAT005`) más `CATS01` reservada para elementos del slider promocional.
- `condicion_producto`: Catálogo de condiciones (`C001` Nuevo a `C005` Reacondicionado).
- `productos`: Registro principal del artículo (`id_producto`, `id_vendedor`, `titulo_producto`, `descripcion`, `marca`, `id_condicion`, `foto` `LONGBLOB`, `id_categoria`, `precio`, marcas temporales).
- `producto_media`: Metadatos de exhibición (`posicion_galeria`, `producto_primario`, bandera `Novedades`).
- `variantes_productos`: Variantes e inventario (`id_producto_variante`, `talla`, `color`, `stock`).

El script es idempotente (`CREATE TABLE IF NOT EXISTS` e `INSERT IGNORE`), asegurando las tablas referenciadas mínimas (`roles`, `estado_usuario`, `usuario`) si se ejecuta de manera aislada antes de integrar el script general de usuarios.

---

## 2. Catálogo de Endpoints (Backend)

Prefijos case-insensitive montados en `backend/server.js`:
- `/api/productos` y `/api/Productos`
- `/api/novedades` y `/api/Novedades`
- `/api/search` y `/api/Search`

### 2.1 Consulta Pública (`feature/catalogo`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/productos/catalogos` | Público | Lista categorías activas (excluyendo `CATS01`) y condiciones. |
| `GET` | `/api/productos` | Público | Lista productos del catálogo (excluye `PS%`, `ProductoMediaSlider`, `CATS01`). Admite `?categoria=` y `?q=`. |
| `GET` | `/api/productos/:id` | Público | Detalle completo de un producto por `id_producto` o `id_producto_variante`. |
| `GET` | `/api/novedades/novedades` | Público | Lista productos con `Novedades = 1` excluyendo elementos de slider. |
| `GET` | `/api/novedades/productosSlider` | Público | Hasta 10 imágenes promocionales del carrusel principal. |
| `GET` | `/api/search/buscar?query=` | Público | Búsqueda en tiempo real por título o marca (máx. 100 chars en consulta, límite 15 resultados). |

### 2.2 Publicación de Productos (`feature/publicar-productos`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/productos` | Vendedor / Admin | Crea un producto de forma transaccional (`productos`, `producto_media`, `variantes_productos`) desde `multipart/form-data`. |

- **Validación de imagen (`backend/utils/imagenProducto.js`, `backend/middlewares/upload.js`)**:
  - Transporte Multer en memoria (máx. 10 MB; acepta campo `imagen` o `foto`).
  - Validación estricta a máximo **5 MB**, MIME permitido (`image/jpeg`, `image/png`, `image/webp`) e inspección binaria real (**Magic Bytes**: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WEBP `RIFF....WEBP`).
- **Identidad del vendedor**: Se toma exclusivamente del token JWT verificado en base de datos (`req.vendedorUser.id_usuario`), ignorando cualquier `idUsuario` enviado en el cuerpo.

### 2.3 Mis Productos (`feature/mis-productos`)

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/productos/mis-productos` | Vendedor / Admin | Lista únicamente los productos del usuario autenticado (`?q=`, `?categoria=`) junto con KPIs (`total`, `disponibles`, `stockBajo`, `agotados`). |
| `GET` | `/api/productos/mis-productos/:id` | Propietario / Admin | Obtiene detalle de un producto propio validando propiedad (`403` si pertenece a otro vendedor). |
| `PUT` | `/api/productos/mis-productos/:id` (y `PUT /api/productos/:id`) | Propietario / Admin | Edita título, descripción, marca, categoría, condición, precio, stock y fotografía opcional (`validarFotoProducto`). |
| `PATCH` | `/api/productos/mis-productos/:id/stock` (y `PATCH /api/productos/:id/stock`) | Propietario / Admin | Ajuste rápido de existencias mediante valor absoluto `{ stock }` o relativo `{ delta }`. |
| `DELETE` | `/api/productos/mis-productos/:id` (y `DELETE /api/productos/:id`) | Propietario / Admin | Elimina el producto y sus variantes/media; si ya existen órdenes históricas asociadas, responde `409 Conflict` preservando la integridad referencial. |

---

## 3. Controles de Seguridad Aplicados

1. **Autenticación y roles en tiempo real (`backend/middlewares/verificarRolVendedor.js`)**:
   - Prioriza cookie HttpOnly `token` (con respaldo `Authorization: Bearer <jwt>`).
   - Comprueba en MySQL que el usuario exista, tenga `id_estado = 'ACT'`, su rol coincida con el token y corresponda a `Vendedor` o `Administrador` según `rolesHelper.js`.
2. **Autorización por propietario (Anti-IDOR / OWASP API1)**:
   - Todos los endpoints de `mis-productos` validan `prod.id_vendedor === req.vendedorUser.id_usuario` (o rol `Administrador`), bloqueando con `403 Forbidden` cualquier intento de leer, editar, ajustar stock o eliminar artículos de terceros o banners del slider (`CATS01`).
3. **Prevención de SQL Injection y XSS**:
   - Consultas 100 % parametrizadas con `mysql2/promise` y escape explícito de comodines `%` / `_` en cláusulas `LIKE`.
   - Sanitización de entradas (`<`, `>`) en backend y construcción segura del DOM (`textContent`, sin interpolar HTML no confiable) en `main.js`, `producto.js`, `vender.js` y `mis-productos.js`.

---

## 4. Pantallas Frontend

- `frontend/index.html` (`js/main.js`, `js/slider.js`): Carrusel promocional, buscador en vivo, filtros por categoría y grilla pública responsiva.
- `frontend/producto.html` (`js/producto.js`): Ficha de detalle con marca, condición, vendedor, stock disponible y cálculo en vivo de subtotal.
- `frontend/vender.html` (`js/vender.js`, `css/vender.css`): Formulario de publicación con drag & drop, vista previa y bloqueo visual para visitantes/compradores.
- `frontend/mis-productos.html` (`js/mis-productos.js`, `css/mis-productos.css`): Panel de inventario propio con KPIs, búsqueda, filtro por categoría, stepper rápido de stock, modal de edición con reemplazo opcional de imagen y confirmación de borrado.

---

## 5. Comprobaciones Automatizadas

Para ejecutar las pruebas de contrato, seguridad, Magic Bytes, creación transaccional y anti-IDOR en `backend/`:

```bash
cd backend
node --test tests/productos.test.js
```

Las pruebas verifican con un servidor Express real y un repositorio simulado en memoria:
- Rechazo de imágenes con extensión falsa o firma binaria alterada, y archivos mayores a 5 MB.
- Exclusión de elementos `PS%` / `CATS01` en catálogo público, novedades y búsqueda.
- Control de acceso (`401` sin JWT, `403` para Compradores o Vendedores inactivos).
- Prevención de suplantación de `idUsuario` en `POST /api/productos` y sanitización XSS.
- Protección anti-IDOR (`403`) cuando un vendedor intenta consultar, editar, ajustar stock o eliminar productos de otro vendedor.
- Manejo seguro de eliminación (`409` si tiene órdenes asociadas, `200` aunque la tabla `articulos_carrito` aún no exista).

---

## 6. Convenciones Anti-Conflictos (Git Flow)

- Las validaciones de rol vendedor residen en `backend/middlewares/verificarRolVendedor.js` para no colisionar con `backend/middlewares/auth.js` (`feature/login-roles`).
- El frontend verifica la sesión de forma resiliente si `js/auth.js` o `js/cart.js` aún no han sido integrados en `develop`.
- El montaje en `backend/server.js` se realizó únicamente en `feature/catalogo` (los PR posteriores reutilizan `routes/productosRoutes.js`).
- Esta documentación vive en `docs/modulo-productos-vendedor.md` para evitar conflictos con el `README.md` principal en `feature/integracion-web`.
