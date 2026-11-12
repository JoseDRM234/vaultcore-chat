# VaultCore Chat — Backend API (NestJS)

Backend modular en **NestJS** diseñado bajo el principio de **"Cartero Ciego" (Blind Courier)** y **Cifrado de Extremo a Extremo (E2EE)**. Actúa como intermediario seguro de enrutamiento y persistencia de texto cifrado (*ciphertext*), control de acceso basado en roles (RBAC) y auditoría inmutable.

---

## 🛠️ Tecnologías

* **Framework:** NestJS v11 (Monolito Modular)
* **Gestor de Paquetes:** `pnpm`
* **Base de Datos:** PostgreSQL 16+ con TypeORM
* **Estrategia de Migraciones:** **100% manuales** con SQL crudo (`synchronize: false`)
* **Tiempo Real:** WebSockets con Socket.IO Gateway
* **Seguridad:** JWT (`passport-jwt`), bcrypt, Class Validator y TypeORM UUIDs

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la carpeta `api/` a partir de `.env.example`:

```env
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123
DB_NAME=vaultcore_chat

JWT_SECRET=vaultcore_secret_key_2026_dev_environment
JWT_EXPIRES_IN=7d
```

---

## 🗄️ Migraciones de Base de Datos

Las migraciones son manuales y residen en `src/core/database/migrations/`:

```bash
# Ejecutar todas las migraciones pendientes
pnpm migration:run

# Revertir la última migración ejecutada
pnpm migration:revert
```

### Migraciones Incluidas:
1. `20261112113000-InitialSchema.ts`: Extensión UUID y tablas `users`, `workspaces`, `channels`, `channel_members`, `messages`, `audit_events` e índices.
2. `20261112113500-SeedDefaultUsers.ts`: Usuarios demo (`admin@vaultcore.test`, `member@vaultcore.test`, `auditor@vaultcore.test` con clave `password123`), workspace inicial y canales base.

---

## 🚀 Ejecución del Servidor

```bash
# Modo desarrollo con auto-reload
pnpm start:dev

# Compilar para producción
pnpm build

# Iniciar compilado de producción
pnpm start:prod
```

* **URL Base de la API REST:** `http://localhost:4000/api/v1`
* **Servidor WebSocket:** `ws://localhost:4000`

---

## 📡 Catálogo de Endpoints REST (`/api/v1`)

### Autenticación (`/auth`)
* `POST /auth/login`: Autentica email y contraseña, devuelve token JWT y datos de perfil.

### Usuarios e Identidad E2EE (`/users`)
* `GET /users/me`: Perfil del usuario en sesión.
* `POST /users/me/public-key`: Registra la clave pública RSA generada en el navegador.
* `GET /users`: Listado de usuarios del workspace (permite búsqueda con `?search=`).
* `GET /users/:id/public-key`: Obtiene la clave pública de otro usuario para cifrarle mensajes o claves de grupo.
* `POST /users`: Creación administrativa de usuarios (Rol: `admin`).
* `PATCH /users/:id`: Actualización de estado y rol de usuario (Rol: `admin`).

### Canales y Grupos (`/channels`)
* `GET /channels`: Canales a los que pertenece el usuario (incluye su `encryptedChannelKey`).
* `POST /channels`: Crea un nuevo grupo o canal directo distribuyendo la clave del grupo cifrada para cada miembro.
* `GET /channels/:id`: Detalle y metadatos del canal.
* `GET /channels/:id/members`: Lista de miembros del canal.
* `POST /channels/:id/members`: Añade un nuevo miembro al canal con su clave cifrada.

### Mensajería Cifrada (`/channels/:channelId/messages`)
* `GET /channels/:channelId/messages`: Historial paginado de mensajes cifrados (`ciphertext`, `iv`, `sender`, `createdAt`).
* `POST /channels/:channelId/messages`: Envía y persiste un mensaje cifrado con `ciphertext` e `iv`.

### Auditoría Inmutable (`/audit`)
* `GET /audit/events`: Registros inmutables de auditoría con paginación (Roles: `admin`, `auditor`).
* `POST /audit/export`: Exportación de la pista de auditoría en formato CSV (Roles: `admin`, `auditor`).

### Métricas de Administración (`/admin`)
* `GET /admin/stats`: Métricas en vivo de usuarios activos, grupos cifrados y total de eventos (Rol: `admin`).

---

## ⚡ Eventos WebSocket (Socket.IO)

* **Handshake:** Requiere `auth: { token: 'Bearer <token>' }`.
* **Eventos del Cliente:**
  * `channel:join` `{ channelId: string }`: Unirse a la sala del canal.
  * `channel:leave` `{ channelId: string }`: Salir de la sala del canal.
  * `message:send` `{ channelId, ciphertext, iv, signature? }`: Persiste y retransmite el mensaje cifrado.
  * `typing:start` / `typing:stop` `{ channelId: string }`: Indicador efímero de escritura.
* **Eventos del Servidor:**
  * `message:new`: Retransmite el mensaje cifrado persistido a todos los miembros de la sala.
  * `typing:update` `{ channelId, userId, userName, isTyping }`: Notifica si alguien está escribiendo.
  * `presence:status` `{ userId, status: 'online' | 'offline' }`: Notifica el estado de conexión de un usuario.

---

## 🧪 Pruebas Automatizadas E2E

Para ejecutar la suite completa de 17 pruebas de integración reales:

```bash
pnpm test:api
```
