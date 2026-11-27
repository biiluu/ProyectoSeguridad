# Guía de Instalación y Despliegue en Máquina Virtual — MercaUca

> **Documento principal:** [`README.md`](./README.md) · **Repositorio oficial:** [`https://github.com/biiluu/ProyectoSeguridad.git`](https://github.com/biiluu/ProyectoSeguridad.git)

Esta guía complementa la Sección 3 de [`README.md`](./README.md) con instrucciones detalladas desde la creación de la máquina virtual Ubuntu Server hasta la verificación del sitio web y la base de datos desde otro equipo conectado por cable Ethernet en el **Laboratorio 4** (ventana operativa máxima de **30 minutos**).

---

## 1. Configuración oficial que se instalará en la VM

La configuración unificada que se desplegará en la máquina virtual corresponde al repositorio oficial [`https://github.com/biiluu/ProyectoSeguridad.git`](https://github.com/biiluu/ProyectoSeguridad.git):

| Elemento | Configuración real de `biiluu/ProyectoSeguridad` |
| :--- | :--- |
| **Base de datos en Docker (`docker-compose.yml`)** | Define **únicamente** el servicio `mysql-db` (imagen `mysql:8.0`, contenedor `proyectoseguridad-mysql`, puerto `${DB_PORT:-3308}:3306`, volumen `proyectoseguridad_mysql_data`). |
| **Aplicación Web y API (`backend/server.js`)** | Se ejecuta directamente con **Node.js en la VM** (`cd ~/ProyectoSeguridad/backend && npm start`), escuchando en el puerto `5048` y sirviendo los archivos estáticos de `frontend/`. No utiliza `Dockerfile` para la app. |
| **Esquema SQL y semillas** | `database/mercauca_init.sql` (**15 tablas**, catálogos, productos y usuarios base) y `database/seed_admin.sql`. |
| **Vulnerabilidades a presentar** | **1) Web (IDOR en consulta):** `GET /api/admin/usuarios/:id` (`backend/routes/adminUsuariosRoutes.js`). **2) Servidor:** exposición en red del puerto MySQL **`3306/TCP`** (definiendo `DB_PORT=3306` al levantar `docker-compose.yml` o con MySQL nativo y permitiendo el puerto en el firewall de la VM). |

> **Datos de sitio por confirmar al llegar al Laboratorio 4 (no inventados):** la dirección IP asignada en la subred Ethernet física del laboratorio (se obtiene dentro de la VM con `ip -4 addr show`), el usuario Linux elegido durante la instalación de Ubuntu Server y si la VM recibirá IP por DHCP o estática en la red cableada.

---

## 2. Requisitos previos y archivos necesarios

### 2.1 En los equipos de trabajo (Laboratorio 4)
- **VirtualBox** (Oracle VM VirtualBox) en el equipo anfitrión que alojará la máquina virtual víctima.
- **Laptops de los 3 atacantes** con entrada física **Ethernet RJ45** o adaptador **USB a Ethernet** (requisito obligatorio del catedrático, ya que el sitio web solo será accesible por cable Ethernet en el laboratorio).
- **ISO de Ubuntu Server** (22.04 LTS o 24.04 LTS recomendada) o VM previamente instalada antes de iniciar los 30 minutos de evaluación.

### 2.2 Archivos del proyecto requeridos en la VM
Clonados desde `https://github.com/biiluu/ProyectoSeguridad.git` (o ZIP del repositorio):
- `docker-compose.yml`
- `database/mercauca_init.sql` y `database/seed_admin.sql`
- `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`, `backend/server.js`, `backend/config/`, `backend/controllers/`, `backend/middlewares/`, `backend/routes/`, `backend/utils/` y `backend/tests/`
- `frontend/` (archivos HTML, CSS, JS y `assets/`)

---

## 3. Preparación y configuración de la máquina virtual (VirtualBox)

1. Abrir **Oracle VirtualBox** → **Nueva**:
   - **Nombre sugerido:** `mercauca-lab` (o el nombre elegido por el equipo).
   - **Tipo / Versión:** Linux → Ubuntu (64-bit).
   - **Memoria RAM:** mínimo **2048 MB** (recomendado **4096 MB** para MySQL 8.0 + Node.js).
   - **Procesadores:** **2 vCPU**.
   - **Disco duro virtual:** al menos **20 GB** dinámicos.
2. Instalar **Ubuntu Server**:
   - Marcar **Install OpenSSH Server** durante la instalación para administración por SSH si es necesario.
   - Registrar el usuario operador del sistema y comprobar que inicia correctamente.

---

## 4. Configuración de red para el laboratorio y acceso por Ethernet

### 4.1 Diferencia clave entre Host-Only (anfitrión) y Adaptador Puente (otra computadora por Ethernet)

| Tipo de adaptador en VirtualBox | Quién puede conectarse a la VM | Uso recomendado |
| :--- | :--- | :--- |
| **Adaptador Puente (Bridged Adapter)** | **Otras computadoras físicas** conectadas al mismo switch/cable **Ethernet RJ45** del Laboratorio 4, además del propio anfitrión. | **Obligatorio en la evaluación del Laboratorio 4** para que las laptops de los atacantes accedan por Ethernet a `:5048` y prueben el puerto `:3306`. |
| **Red Solo-Anfitrión (Host-Only) o NAT con reenvío (`127.0.0.1`)** | **Únicamente la computadora anfitriona** que ejecuta VirtualBox. | Sirve solo para pruebas locales previas en una sola laptop; **no permite** comprobar el acceso desde otra computadora física por cable Ethernet. |

### 4.2 Configuración recomendada en VirtualBox y firewall de Ubuntu
1. En **Configuración → Red → Adaptador 1**, seleccionar **Adaptador Puente (Bridged Adapter)** y elegir en *Nombre* el adaptador físico **Ethernet RJ45** (o adaptador USB-Ethernet) de la laptop anfitriona.
2. En Ubuntu Server, configurar el firewall (`ufw`) para la sesión de evaluación:
   - Permitir web/API: `sudo ufw allow 5048/tcp` (y `sudo ufw allow 22/tcp` si se usa SSH).
   - Permitir MySQL **únicamente durante la demostración de la vulnerabilidad de servidor**: `sudo ufw allow 3306/tcp` (y cerrarlo al finalizar con `sudo ufw deny 3306/tcp`).
   - *(Pendiente de verificar en la VM dentro del laboratorio: validar conectividad bidireccional y que `ufw` esté activo si decide usarse `sudo ufw enable`.)*

## 5. Instalación de Docker, Node.js, MySQL y herramientas

Conectar por consola local de VirtualBox o SSH a la VM Ubuntu Server y ejecutar:

```bash
# 1. Actualizar repositorios e instalar utilidades base
sudo apt-get update
sudo apt-get install -y git curl ca-certificates gnupg mysql-client

# 2. Instalar Node.js 20 LTS y npm (requerido para ejecutar backend/server.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

# 3. Instalar Docker Engine y el plugin Compose (para levantar MySQL 8.0)
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
# Nota: cerrar sesión SSH y volver a entrar (o usar `newgrp docker`) para usar docker sin sudo
docker --version
docker compose version
```

*(Si se prefiere usar MySQL nativo en lugar de contenedor Docker, puede instalarse `sudo apt-get install -y mysql-server` escuchando en `3306` e importar `database/mercauca_init.sql`.)*

---

## 6. Preparación para trabajar sin Internet en el laboratorio (Modo Offline)

Si el Laboratorio 4 restringe o bloquea la salida a Internet por cable Ethernet, preparar **antes de la evaluación** (con acceso a Internet) los artefactos en la VM o en una memoria USB:

1. **Pre-instalar `node_modules` del backend:**
   ```bash
   cd ~/ProyectoSeguridad/backend
   npm ci --omit=dev || npm install --omit=dev
   ```
   *(Esto deja compiladas y guardadas todas las dependencias de `package-lock.json` en `~/ProyectoSeguridad/backend/node_modules/`.)*
2. **Pre-descargar y exportar la imagen Docker de MySQL 8.0:**
   ```bash
   docker pull mysql:8.0
   mkdir -p ~/offline-images
   docker save -o ~/offline-images/mysql-8.0.tar mysql:8.0
   ```
   *(Para cargarla en la VM cuando ya esté sin Internet: `docker load -i ~/offline-images/mysql-8.0.tar`.)*
3. **Instalar paquetes `apt` previos:** completar el Paso 5 (`nodejs`, `docker.io`, `docker-compose-plugin`, `mysql-client`) antes de desconectar la VM de Internet.

---

## 7. Descarga del código y configuración de variables de entorno

1. Clonar el repositorio oficial (o descomprimir el ZIP verificado en la VM) desde el directorio HOME (`~`):
   ```bash
   cd ~
   git clone https://github.com/biiluu/ProyectoSeguridad.git
   cd ~/ProyectoSeguridad/backend
   ```
2. Crear `backend/.env` a partir de la plantilla [`backend/.env.example`](./backend/.env.example) (**sin subir `.env` real a GitHub**; `.gitignore` lo ignora automáticamente):
   ```bash
   cp .env.example .env
   nano .env
   ```
3. Configurar los valores reales requeridos para el entorno de laboratorio:
   - **Si usas `docker-compose.yml` con puerto por defecto (`3308`):**
     ```env
     PORT=5048
     NODE_ENV=production

     DB_HOST=127.0.0.1
     DB_PORT=3308
     DB_NAME=mercauca
     DB_USER=root
     DB_PASSWORD=root

     JWT_SECRET=REEMPLAZAR_POR_SECRETO_LARGO_Y_ALEATORIO
     JWT_EXPIRES_IN=60m
     REGISTRO_TOKEN_SECRET=REEMPLAZAR_POR_OTRO_SECRETO_ALEATORIO
     COOKIE_SECURE=false
     ```
   - **Importante sobre `COOKIE_SECURE`:** dejar `COOKIE_SECURE=false` cuando la aplicación en laboratorio se sirva por **HTTP** (sin HTTPS/TLS), de lo contrario el navegador no enviará la cookie `HttpOnly` `token` y el inicio de sesión fallará.
   - **Importante sobre `NODE_ENV=production`:** según `backend/utils/authSecrets.js` (en `ProyectoSeguridad`), en `production` **es obligatorio** definir `JWT_SECRET` y `REGISTRO_TOKEN_SECRET`; de lo contrario los endpoints protegidos responderán HTTP `503`.
   - **Si se expone MySQL en el puerto `3306`** (fijando `DB_PORT=3306` al levantar `docker-compose.yml` o usando MySQL nativo), actualizar `DB_PORT=3306` en `backend/.env`.
   - **Uso de SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`):** en el código real de `ProyectoSeguridad`, SMTP se utiliza **en dos flujos distintos**:
     1. **Registro público (`POST /api/verificacion/enviar-codigo`):** obligatorio para enviar el código OTP de 6 dígitos (`enviarCorreoCodigo` en `backend/utils/emailService.js`); si SMTP no está configurado, este endpoint devuelve HTTP `503`.
     2. **Confirmación de compra (`POST /api/carrito/finalizar-compra/:idUsuario`):** una vez confirmada la transacción de la orden en MySQL (`carritoController.js`), el servidor **intenta enviar por separado** el correo HTML de confirmación (`enviarCorreoCompra`); si SMTP falla o no está configurado, la compra igual se registra (`HTTP 200`, `correoEnviado: false`).

---

## 8. Carga de base de datos y cuentas ficticias de prueba

1. Ubicarse en la raíz del repositorio (`~/ProyectoSeguridad`, donde reside `docker-compose.yml`) e iniciar el contenedor MySQL:
   ```bash
   cd ~/ProyectoSeguridad
   docker compose up -d
   ```
   - **Primer arranque (volumen `proyectoseguridad_mysql_data` vacío):** Docker ejecuta automáticamente `database/mercauca_init.sql` (presente en `ProyectoSeguridad`), creando la base `mercauca`, las **15 tablas**, catálogos, productos y las cuatro cuentas base (`admin01`, `ProductoMediaSlider`, `U001`, `U002`).
   - **Consecuencias de volver a ejecutar los SQL sobre una base ya existente:** tanto `database/mercauca_init.sql` como `database/seed_admin.sql` son **idempotentes** (`CREATE DATABASE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE INTO` y bloques `PREPARE`/`EXECUTE` condicionales que verifican `INFORMATION_SCHEMA.COLUMNS`). Volver a ejecutarlos **no borra tablas ni registros existentes ni sobrescribe contraseñas ya actualizadas** (únicamente restaura registros semilla que hayan sido eliminados; si deseas reiniciar todo desde cero debes recrear el volumen con `docker compose down -v && docker compose up -d`).
     ```bash
     # Solo si se necesita re-aplicar semillas faltantes sin borrar datos (desde ~/ProyectoSeguridad):
     docker exec -i proyectoseguridad-mysql mysql -uroot -proot < database/mercauca_init.sql
     docker exec -i proyectoseguridad-mysql mysql -uroot -proot < database/seed_admin.sql
     ```
2. **Preparar cuentas de prueba funcionales únicamente en el entorno de la VM:**
   - El hash bcrypt guardado en `database/mercauca_init.sql` y `database/seed_admin.sql` (`$2a$10$qodyMehIheS3.eAQCxZ3kuEcDngKfEr2nurqxhuY9hyON6yTStD6u`) no incluye una contraseña en texto plano documentada en el repositorio.
   - Para poder probar los 3 roles (`Administrador` `admin01`, `Vendedor` `U002`, `Comprador` `U001`) **exclusivamente dentro de la VM de laboratorio** (sin alterar los archivos SQL del repositorio), genera un hash bcrypt y actualiza únicamente las filas de prueba en la base MySQL de la VM:
   ```bash
   cd ~/ProyectoSeguridad/backend
   HASH_PRUEBA=$(node -e "console.log(require('bcryptjs').hashSync('Prueba2026*', 10))")
   cd ~/ProyectoSeguridad
   docker exec proyectoseguridad-mysql mysql -uroot -proot -D mercauca -e "UPDATE usuario SET password_hash='$HASH_PRUEBA' WHERE id_usuario IN ('admin01','U001','U002');"
   ```
   *(Sustituye `Prueba2026*` por la contraseña temporal de pruebas que defina tu equipo en la VM; `ProductoMediaSlider` corresponde a la cuenta del slider promocional y no requiere contraseña operativa.)*

---

## 9. Inicio de los servicios y de la aplicación

1. **Asegurar MySQL levantado** desde la raíz del proyecto (`~/ProyectoSeguridad`):
   - **Configuración por defecto (`3308`):**
     ```bash
     cd ~/ProyectoSeguridad
     docker compose up -d
     ```
   - **Configuración para presentar el puerto `3306` expuesto en red (vulnerabilidad de servidor):**
     ```bash
     cd ~/ProyectoSeguridad
     DB_PORT=3306 docker compose up -d
     ```
     *(Asegurarse en ese caso de colocar `DB_PORT=3306` también en `~/ProyectoSeguridad/backend/.env` antes de iniciar Node.js.)*
2. **Instalar dependencias e iniciar la aplicación Express** desde `~/ProyectoSeguridad/backend`:
   ```bash
   cd ~/ProyectoSeguridad/backend
   npm install
   # En primer plano (para ver logs en tiempo real):
   npm start
   ```
   *(O en segundo plano para dejar libre la terminal SSH: `nohup npm start > ~/mercauca-app.log 2>&1 &`.)*

---

## 10. Verificación de servicios y acceso desde otra computadora

### 10.1 Comprobaciones locales dentro de la VM (cuidando el directorio de trabajo)

```bash
# 1. Desde la raíz donde vive docker-compose.yml: verificar contenedor MySQL y 15 tablas
cd ~/ProyectoSeguridad
docker compose ps
docker exec proyectoseguridad-mysql mysqladmin ping -h 127.0.0.1 -uroot -proot
docker exec proyectoseguridad-mysql mysql -uroot -proot -D mercauca -e "SHOW TABLES;"

# 2. Desde backend/: ejecutar suite automatizada del código (usa pool simulado en memoria, no toca MySQL)
cd ~/ProyectoSeguridad/backend
node --test tests/*.test.js

# 3. Comprobar HTTP local (Node en :5048), puertos escuchando e IP de la interfaz Puente
curl -i http://127.0.0.1:5048/api/health
curl -s http://127.0.0.1:5048/api/productos/catalogos
curl -I http://127.0.0.1:5048/
ss -tulpn | grep -E "5048|3308|3306"
ip -4 addr show
```

### 10.2 Comprobación desde otra computadora física conectada por cable Ethernet RJ45 (Pendiente en VM)

> **Estado actual:** Las pruebas desde una segunda computadora física conectada por cable Ethernet en el Laboratorio 4 están **pendientes de ejecutarse en la VM real** (no afirmes que funcionan hasta validarlas in situ). No confundir esta prueba con el acceso local Host-Only desde la máquina anfitriona que aloja VirtualBox.

Una vez configurada la VM en **Adaptador Puente** sobre la interfaz Ethernet del laboratorio y anotada la `<IP_VM>` obtenida con `ip -4 addr show`:

1. **Verificar sitio web y API desde la otra computadora física (en su navegador o terminal):**
   - Abrir `http://<IP_VM>:5048/` (debe cargar el catálogo de MercaUca).
   - Comprobar `http://<IP_VM>:5048/api/health` (esperado: `HTTP/1.1 200 OK` con `status: "online"`).
2. **Verificar flujo web de autenticación con cuentas de prueba:** iniciar sesión en `http://<IP_VM>:5048/login.html` con `U001` (`Comprador`) usando la contraseña asignada en el Paso 8 y comprobar que la sesión persiste (`COOKIE_SECURE=false` en HTTP).
3. **Verificar exposición del puerto MySQL (`3306/TCP`) desde la otra computadora física:**
   - Requisito previo: la VM debe usar **Adaptador Puente**, tener MySQL escuchando en `0.0.0.0:3306` (`DB_PORT=3306 docker compose up -d` o MySQL nativo) y el firewall de Ubuntu (`ufw`/`nftables`) permitiendo `3306/TCP`.
   - Desde la segunda laptop física conectada por cable Ethernet, comprobar si el socket TCP `<IP_VM>:3306` acepta conexiones externas mediante cliente MySQL (`mysql -h <IP_VM> -P 3306 -u <usuario> -p`) o comprobación de conectividad TCP al puerto `3306`.
   - Al concluir la evaluación del laboratorio, cerrar el acceso externo (`sudo ufw deny 3306/tcp` y/o volver al puerto `3308` ligado a `127.0.0.1`).
