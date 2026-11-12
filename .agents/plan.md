# Plan de Implementación Integral: VaultCore Chat (API Backend & Frontend E2EE)

> **Documento:** Plan Maestro de Desarrollo e Integración  
> **Ubicación:** `.agents/plan.md`  
> **Basado en:** Especificaciones de Arquitectura de VaultCore Chat (*Actividad 3 Arquitectura de mi Sistema.pdf* y *Primer_Parcial_DevOps_Multicloud_VaultCoreChat.pdf*).

---

## 1. Resumen Ejecutivo y Diagnóstico del Proyecto

**VaultCore Chat** es una plataforma de mensajería empresarial segura basada en el principio fundamental de **"Cartero Ciego" (Blind Courier)** con **Cifrado de Extremo a Extremo (E2EE)**. El servidor jamás debe conocer el contenido en texto plano de las conversaciones ni las claves privadas de los usuarios; actúa únicamente como intermediario y enrutador de datos cifrados (*ciphertext*).

### Estado Actual del Repositorio:
* **Frontend (`/frontend`):**
  * Dispone de maquetación y diseño UI moderno (React 19 + Vite + Tailwind CSS + Lucide Icons).
  * Rutas configuradas en `react-router-dom` para Login (`/`), Panel Administrativo (`/admin/*`) e Interfaz de Miembro/Auditor (`/app/*`).
  * **Faltante Crítico:** La lógica es 100% estática / mock (usuarios en memoria en `auth-service.js`, listas cableadas en componentes, sin llamadas a API REST, sin conexión WebSocket, sin implementación criptográfica con `window.crypto.subtle`).
* **Backend (`/api`):**
  * Directorio completamente vacío. Requiere la inicialización y construcción de toda la API en **NestJS** (Monolito Modular en capas) con persistencia políglota (PostgreSQL, MongoDB, Redis, S3/MinIO).

---

## 2. Principios de Arquitectura y Seguridad E2EE

```
                     ┌──────────────────────────────────────────────┐
                     │          Navegador Web (Cliente React)       │
                     │  - Generación de claves (Web Crypto API)     │
                     │  - Cifrado / Descifrado local en memoria     │
                     │  - Clave privada en IndexedDB protegida      │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTPS (REST) / WSS (Socket.IO)
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            Backend NestJS (API)              │
                     │       "Cartero Ciego" (Blind Courier)        │
                     │  - Solo ve ciphertext, IVs y metadatos       │
                     │  - Enrutamiento WebSocket en tiempo real     │
                     │  - Control de accesos RBAC y Auditoría       │
                     └───────┬──────────────┬──────────────┬────────┘
                             │              │              │
                             ▼              ▼              ▼
                     ┌──────────────┐ ┌───────────┐ ┌───────────────┐
                     │  PostgreSQL  │ │  MongoDB  │ │ Redis / MinIO │
                     │ Users, Roles │ │ Ciphertext│ │ Presencia /   │
                     │ Public Keys  │ │ Messages  │ │ PubSub / S3   │
                     │ Workspaces   │ │ Receipts  │ │ Encrypted Files│
                     └──────────────┘ └───────────┘ └───────────────┘
```

1. **Zero-Knowledge / Cero Conocimiento:** La API almacena únicamente claves públicas (`publicKeyPem` / JWK) y texto cifrado. La clave privada se genera y reside exclusivamente en el dispositivo del usuario.
2. **Modelo de Claves:**
   * **Par de Claves de Identidad:** RSA-OAEP 2048/4096-bit o ECDH (P-256) generado en el cliente mediante `SubtleCrypto`.
   * **Cifrado Simétrico de Mensajes:** AES-256-GCM. Cada mensaje genera un IV (Vector de Inicialización) criptográficamente seguro de 12 bytes.
   * **Chats Grupales / Canales:** Cada canal posee una clave simétrica de grupo (*Channel Key* AES-256-GCM). Al agregar un miembro, el administrador o creador cifra la clave del canal con la clave pública del nuevo miembro y la almacena en el servidor (`encryptedChannelKeys`).
3. **Persistencia Políglota:**
   * **PostgreSQL:** Usuarios, Workspaces, Canales, Membresías, Claves Públicas, Registro inmutable de Auditoría.
   * **MongoDB:** Mensajes cifrados (*ciphertext*, *iv*, *senderId*, *channelId*, *timestamp*), acuses de recibo.
   * **Redis:** Caché de presencia (online/offline), eventos "escribiendo...", adaptador multi-instancia de Socket.IO (`@socket.io/redis-adapter`).
   * **MinIO / S3:** Archivos binarios (imágenes, documentos) cifrados en el cliente antes de ser cargados.

---

## 3. Plan de Implementación Backend (`/api`)

El backend se construirá como un **Monolito Modular en NestJS** con arquitectura limpia y orientada a eventos.

### 3.1 Inicialización y Configuración Base
1. Crear proyecto NestJS en `api/`:
   ```bash
   cd api
   npx @nestjs/cli new . --package-manager npm --strict
   ```
2. Instalar dependencias esenciales:
   * **Core & Config:** `@nestjs/config`, `class-validator`, `class-transformer`
   * **Seguridad & Auth:** `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`
   * **Persistencia Relacional:** `@nestjs/typeorm` (o Prisma) + `pg`
   * **Persistencia NoSQL:** `@nestjs/mongoose` + `mongoose`
   * **WebSockets & Tiempo Real:** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@socket.io/redis-adapter`, `ioredis`
   * **Almacenamiento S3:** `@aws-sdk/client-s3`, `multer`

### 3.2 Estructura Modular de NestJS
```text
api/src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/         # @CurrentUser, @Roles
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   ├── filters/            # GlobalExceptionFilter
│   └── interceptors/       # Logging & Audit Interceptor
├── config/                 # Configuración por variables de entorno
├── modules/
│   ├── auth/               # Login, Registro, JWT, validación de contraseñas
│   ├── users/              # Perfiles, carga/descarga de llaves públicas
│   ├── channels/           # Creación de canales 1-a-1 y grupos, miembros, distribución de llaves
│   ├── messages/           # CRUD de mensajes cifrados en MongoDB
│   ├── gateway/            # WebSocket Gateway (Socket.IO, Rooms, Relay de eventos)
│   ├── audit/              # Trazabilidad inmutable de eventos de seguridad
│   └── files/              # Carga de adjuntos cifrados a S3 / MinIO
└── database/
    ├── postgres/           # Migraciones y entidades TypeORM
    └── mongo/              # Esquemas Mongoose
```

### 3.3 Definición de Módulos del Backend

#### Módulo 1: `AuthModule` & `UsersModule`
* **Entidad `User` (PostgreSQL):**
  * `id`: UUID (PK)
  * `email`: String (Unique)
  * `passwordHash`: String (Bcrypt)
  * `fullName`: String
  * `role`: Enum (`ADMIN`, `MEMBER`, `AUDITOR`)
  * `status`: Enum (`ACTIVE`, `SUSPENDED`, `REVIEW_DUE`)
  * `publicKey`: Text (Clave pública en formato PEM/SPKI exportada por Web Crypto)
  * `firstAccess`: Boolean
  * `createdAt`, `updatedAt`
* **Endpoints:**
  * `POST /api/v1/auth/login` → Retorna `{ accessToken, user: { id, email, fullName, role, firstAccess } }`.
  * `POST /api/v1/auth/register` (o creación por admin) → Crea usuario y asigna rol.
  * `POST /api/v1/users/me/public-key` → Registra la clave pública generada por el navegador en el primer acceso.
  * `GET /api/v1/users` → Lista de usuarios del workspace (con soporte de búsqueda y roles).
  * `GET /api/v1/users/:id/public-key` → Obtiene la clave pública de un usuario para cifrarle mensajes o claves de canal.

#### Módulo 2: `ChannelsModule` (Grupos y Conversaciones Directas)
* **Entidades (PostgreSQL):**
  * `Channel`: `id`, `name`, `type` (`DIRECT` o `GROUP`), `policy` (`STANDARD`, `RESTRICTED`), `createdBy`, `createdAt`.
  * `ChannelMember`: `channelId`, `userId`, `role` (`OWNER`, `MEMBER`), `encryptedChannelKey` (clave simétrica del canal cifrada con la clave pública de este usuario en Base64).
* **Endpoints:**
  * `GET /api/v1/channels` → Canales a los que pertenece el usuario autenticado.
  * `POST /api/v1/channels` → Crea canal/grupo (crea la clave de canal en cliente, la cifra y la envía al backend para cada miembro inicial).
  * `POST /api/v1/channels/:id/members` → Añade miembros distribuyendo la `encryptedChannelKey`.
  * `GET /api/v1/channels/:id/members` → Lista de miembros y sus claves públicas/cifradas.
  * `POST /api/v1/channels/:id/rotate-key` → Rotación periódica de la clave del canal solicitada por admin o miembro autorizado.

#### Módulo 3: `MessagesModule` (Persistencia en MongoDB)
* **Esquema `Message` (MongoDB):**
  ```typescript
  {
    channelId: String,          // Index
    senderId: String,           // Index
    ciphertext: String,         // Mensaje cifrado con AES-GCM (Base64)
    iv: String,                 // Vector de inicialización (Base64)
    signature: String,          // Firma digital opcional para no repudio
    attachments: [
      { fileKey: String, fileName: String, mimeType: String, size: Number, iv: String }
    ],
    readBy: [{ userId: String, readAt: Date }],
    createdAt: Date             // Index
  }
  ```
* **Endpoints:**
  * `GET /api/v1/channels/:id/messages?limit=50&before=timestamp` → Recuperación paginada de mensajes cifrados.
  * `POST /api/v1/channels/:id/messages` → Envío por REST (o mediante WebSocket).
  * `POST /api/v1/messages/:id/read` → Acuse de lectura.

#### Módulo 4: `GatewayModule` (WebSocket / Socket.IO)
* Autenticación del handshake vía JWT (`auth: { token: '...' }`).
* Suscripción a salas por canal (`client.join('channel_${channelId}')`).
* **Eventos soportados:**
  * `message:send` → Valida pertenencia al canal, persiste en MongoDB, emite `message:new` a la sala del canal.
  * `typing:start` / `typing:stop` → Emite indicador efímero a la sala mediante Redis.
  * `presence:status` → Notifica conexión / desconexión de usuarios en el workspace.
  * `channel:member_added` → Notifica a un usuario que fue añadido a un grupo (con su clave cifrada).

#### Módulo 5: `AuditModule` (Trazabilidad Inmutable)
* **Entidad `AuditEvent` (PostgreSQL):**
  * `id`: UUID
  * `timestamp`: Timestamp con zona horaria
  * `actorId`: UUID (Usuario que ejecutó la acción)
  * `actorEmail`: String
  * `action`: String (`LOGIN_SUCCESS`, `USER_CREATED`, `ROLE_UPDATED`, `GROUP_CREATED`, `KEY_ROTATED`, `MEMBER_ADDED`, `EXPORT_REQUESTED`)
  * `targetResource`: String (e.g. `User:jon@northstar.io`, `Channel:Security Ops`)
  * `detail`: Text (Descripción operativa sin jamás incluir contenido de mensajes)
  * `ipAddress`: String
  * `userAgent`: String
* **Endpoints:**
  * `GET /api/v1/audit/events` → Accesible solo para rol `ADMIN` y `AUDITOR`. Soporta paginación, filtros por fecha y actor.
  * `POST /api/v1/audit/export` → Generación de reporte de cumplimiento (CSV / JSON estructurado).

#### Módulo 6: `FilesModule` (Adjuntos Cifrados)
* `POST /api/v1/files/upload-url` → Genera URL prefirmada (S3/MinIO) para subida directa de blobs binarios ya cifrados en el cliente.
* `GET /api/v1/files/:key/download-url` → URL de descarga de binarios cifrados.

---

## 4. Cambios y Adaptaciones Necesarias en el Frontend (`/frontend`)

Para transformar el frontend de una maqueta estática a un cliente criptográfico funcional, se deben realizar las siguientes acciones:

### 4.1 Nuevas Dependencias Requeridas
* `socket.io-client`: Comunicación en tiempo real con el gateway.
* `idb` (o manejo nativo de IndexedDB): Almacenamiento seguro en el cliente de la clave privada cifrada.
* `axios` (opcional, o wrapper `fetch` robusto): Para interceptores JWT y manejo homogéneo de errores.

### 4.2 Módulo Criptográfico Local (`src/lib/crypto.js`)
Implementar utilidades basadas en la Web Crypto API (`window.crypto.subtle`):
1. **Generación de Llaves de Identidad:**
   * Algoritmo: `RSA-OAEP`, modulusLength: 2048/4096, hash: `SHA-256`.
   * Exportar clave pública como SPKI (`ArrayBuffer` → Base64) para subirla a la API.
2. **Protección de la Clave Privada:**
   * Derivar una clave simétrica con `PBKDF2` (salt + password del usuario, 100,000 iteraciones SHA-256).
   * Cifrar la clave privada con `AES-GCM` y guardarla en IndexedDB del navegador.
   * En inicios de sesión futuros, la contraseña descifra la clave privada en memoria para la sesión activa.
3. **Cifrado/Descifrado de Mensajes (AES-GCM):**
   * Generar clave simétrica de 256 bits para canales o chats directos.
   * Cifrar texto: `encrypt({ name: 'AES-GCM', iv }, key, encodedText)`.
   * Descifrar texto: `decrypt({ name: 'AES-GCM', iv }, key, ciphertextBuffer)`.
4. **Envoltura y Distribución de Claves de Canal:**
   * Creador de grupo genera clave AES de grupo.
   * La "envuelve" (wrap/cifra) con la clave pública RSA de cada miembro: `encrypt({ name: 'RSA-OAEP' }, memberPublicKey, rawAesKey)`.
   * El miembro recibe la clave cifrada, la descifra con su clave privada RSA (`decrypt({ name: 'RSA-OAEP' }, myPrivateKey, encryptedChannelKey)`) y la almacena en memoria de la sesión para descifrar los mensajes del canal.

### 4.3 Arquitectura de Estado y Contextos
Crear contextos en `frontend/src/context/`:
1. **`AuthContext.jsx`:**
   * Manejo de token JWT en memoria/almacenamiento seguro.
   * Estado de usuario autenticado (`id`, `role`, `email`, `fullName`).
   * Desbloqueo y custodia en memoria de la clave privada del usuario durante la sesión activa.
   * Manejo de Logout (limpieza estricta de claves en memoria).
2. **`SocketContext.jsx`:**
   * Instancia única de `socket.io-client` conectada a `VITE_API_BASE_URL`.
   * Gestión automática de reconexión y emisión de eventos.
   * Manejo de presencia (usuarios conectados) e indicadores de escritura.
3. **`CryptoContext.jsx` / `useCrypto`:**
   * Caché en memoria de claves simétricas de canales (`channelKeysMap`).
   * Métodos helpers: `encryptMessage(channelId, text)`, `decryptMessage(channelId, ciphertext, iv)`.

### 4.4 Modificaciones Específicas por Pantalla y Componente

| Archivo | Cambios Necesarios |
| :--- | :--- |
| `src/services/auth-service.js` | Reemplazar el array estático `users` por llamadas HTTP reales a `POST /auth/login`. |
| `src/lib/vaultcore.js` | Conectar llamadas de auditoría y canales con la API REST (`/api/v1/*`). |
| `src/pages/LoginPage.jsx` | • Conectar formulario al `authService` real.<br>• Implementar paso `firstAccess`: generar par de claves RSA con `SubtleCrypto`, cifrar clave privada con contraseña y subir clave pública al backend vía `POST /users/me/public-key`.<br>• En logins regulares: descifrar clave privada desde IndexedDB. |
| `src/pages/app/ChatsPage.jsx` | • Conectar lista de conversaciones con `GET /channels`.<br>• Al seleccionar canal, obtener mensajes vía `GET /channels/:id/messages` y descifrarlos en el cliente con la clave del canal.<br>• Escuchar evento WebSocket `message:new`, descifrar al vuelo y anexar a la vista.<br>• Formulario de envío: cifrar mensaje con `AES-GCM` y emitir `message:send` vía socket o REST.<br>• Indicadores de presencia en vivo y "escribiendo...". |
| `src/pages/app/AppGroups.jsx` | Consumir `GET /channels` filtrado por grupos del usuario, mostrando estado de membresía real. |
| `src/pages/app/AppAudit.jsx` | Consumir `GET /audit/events` (modo solo lectura para rol auditor o miembros con permiso). |
| `src/pages/admin/UsersPage.jsx` | Conectar tabla a `GET /users`, implementar modal de "Invite user" con `POST /users`, selector de rol (`ADMIN`, `MEMBER`, `AUDITOR`) y activación/suspensión. |
| `src/pages/admin/GroupsPage.jsx` | Conectar a `GET /channels?type=group` y crear modal para crear grupo asignando miembros y distribuyendo claves cifradas. |
| `src/pages/admin/AuditPage.jsx` | Cargar eventos reales desde `GET /audit/events`, paginación, filtros por fecha y botón de exportación de reporte. |
| `src/pages/admin/AdminDashboard.jsx` | Reemplazar contadores estáticos (1,284 usuarios, 86 grupos, etc.) por endpoint `GET /admin/stats`. |
| `src/layouts/AppLayout.jsx` & `AdminLayout.jsx` | Mostrar información dinámica del usuario en sesión (`fullName`, iniciales, rol) y botón de cierre de sesión funcional. |
| `src/App.jsx` | Integrar componente `ProtectedRoute` que valide token JWT y rol requerido (`admin`, `member`, `auditor`), redirigiendo a `/` si no está autenticado o a vista 403. |

---

## 5. Entorno Local de Desarrollo (Docker Compose)

Para habilitar la persistencia políglota requerida en desarrollo local, se definirá un archivo `docker-compose.yml` en la raíz del repositorio:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: vaultcore-postgres
    environment:
      POSTGRES_DB: vaultcore_db
      POSTGRES_USER: vaultcore
      POSTGRES_PASSWORD: vaultcore_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  mongodb:
    image: mongo:7.0
    container_name: vaultcore-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodata:/data/db

  redis:
    image: redis:7-alpine
    container_name: vaultcore-redis
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    container_name: vaultcore-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadminpassword
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  mongodata:
  miniodata:
```

---

## 6. Fases de Ejecución y Roadmap de Implementación

### Fase 1: Infraestructura Local y Scaffold Backend (Semana 1)
- [ ] Configurar `docker-compose.yml` con PostgreSQL, MongoDB, Redis y MinIO.
- [ ] Inicializar proyecto NestJS en carpeta `api/`.
- [ ] Configurar conexiones TypeORM/PostgreSQL y Mongoose/MongoDB en NestJS.
- [ ] Implementar `AuditModule` para registrar eventos del sistema de forma inmutable.

### Fase 2: Autenticación, RBAC y Gestión de Claves Públicas (Semana 2)
- [ ] Implementar `AuthModule` (JWT, login, hashing de contraseñas, guards RBAC).
- [ ] Implementar `UsersModule` (CRUD de usuarios, endpoint para registrar y obtener claves públicas).
- [ ] Conectar `LoginPage.jsx` en frontend: generar par de claves RSA en primer acceso y guardar clave pública en backend.
- [ ] Implementar `ProtectedRoute` en frontend para restringir `/admin/*` y `/app/*`.

### Fase 3: Canales, Grupos y Distribución de Claves Cifradas (Semana 3)
- [ ] Implementar `ChannelsModule` (PostgreSQL) para canales directos y grupales.
- [ ] Implementar protocolo de envoltura de claves de canal (`encryptedChannelKey`) por usuario.
- [ ] Conectar `GroupsPage.jsx` y `UsersPage.jsx` (Admin) con endpoints de la API.
- [ ] Conectar `AppGroups.jsx` en frontend.

### Fase 4: Mensajería en Tiempo Real y Cifrado E2EE (Semana 4)
- [ ] Implementar `MessagesModule` (MongoDB) y `GatewayModule` (Socket.IO + Redis Adapter).
- [ ] Crear servicio `src/lib/crypto.js` en frontend con cifrado y descifrado AES-256-GCM.
- [ ] Conectar `ChatsPage.jsx`:
  * Descifrado de mensajes en tiempo real al recibirlos.
  * Cifrado local antes de emitir evento `message:send`.
  * Carga y descifrado del historial paginado.
  * Indicadores de presencia y "escribiendo...".

### Fase 5: Auditoría, Archivos Cifrados y Pulido de Perfiles (Semana 5)
- [ ] Implementar subida y descarga de archivos cifrados (`FilesModule` + MinIO).
- [ ] Conectar `AuditPage.jsx` y `AppAudit.jsx` con paginación y exportación.
- [ ] Conectar perfiles (`AdminProfile.jsx`, `AppProfile.jsx`) con actualización de datos.
- [ ] Conectar `AdminDashboard.jsx` con métricas y estadísticas del sistema.

### Fase 6: Pruebas Automatizadas y Preparación Multicloud / DevOps (Semana 6)
- [ ] Pruebas unitarias y de integración en NestJS (Jest).
- [ ] Validación de seguridad: verificar que la base de datos de mensajes (MongoDB) jamás contenga texto plano ni claves de descifrado.
- [ ] Preparación de Dockerfiles (`frontend/Dockerfile` y `api/Dockerfile`) para despliegue en contenedores según el diseño DevOps multicloud.

---

## 7. Criterios de Aceptación y Verificación

1. **Blind Courier Verificado:** Inspeccionando MongoDB y el tráfico de red en devtools, ningún payload de mensaje viaja o se almacena en texto plano.
2. **Autenticación y Roles:** Usuarios con rol `member` no pueden acceder a `/admin/*`; usuarios con rol `auditor` tienen vista de solo lectura de eventos de auditoría y no pueden acceder al chat ni descifrar mensajes.
3. **Persistencia Criptográfica:** El usuario puede recargar el navegador sin perder el acceso a sus conversaciones mientras mantenga su sesión activa y clave privada descifrada.
4. **Sincronización en Tiempo Real:** Dos ventanas de navegador con usuarios distintos en un mismo canal intercambian mensajes cifrados instantáneamente vía WebSockets.
5. **Auditoría Estricta:** Cualquier acción administrativa (creación de usuario, cambio de rol, creación de grupo, rotación de claves) queda registrada de inmediato en la tabla de auditoría con su respectivo actor y marca de tiempo.
