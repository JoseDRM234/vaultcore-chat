# Plan de Implementación de la API (Backend NestJS)

> **Ubicación:** `.agents/plan/api.md`  
> **Gestor de paquetes:** `pnpm`  
> **Runtime:** Node.js v22+  
> **Framework:** NestJS (Monolito Modular en Capas + Eventos)

---

## 1. Visión y Principio "Cartero Ciego" (Blind Courier)

El backend de **VaultCore Chat** opera bajo el principio estricto de **cero conocimiento (*zero-knowledge*)**:
* El servidor **nunca** almacena ni procesa texto plano de los mensajes.
* El servidor **nunca** recibe ni almacena claves privadas de los usuarios.
* El servidor actúa como intermediario confiable de enrutamiento y almacenamiento de texto cifrado (*ciphertext*), vectores de inicialización (*IVs*), metadatos de mensajería (remitente, canal, timestamp) y registros de auditoría inmutables.

---

## 2. Inicialización del Proyecto con `pnpm`

En la carpeta `/api`:

```bash
cd /home/zelecto/my-proyects/vaultcore-chat/api

# Inicialización con NestJS CLI y pnpm
pnpm dlx @nestjs/cli new . --package-manager pnpm --strict
```

### 2.1 Dependencias Requeridas

```bash
# Dependencias principales de producción
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/mongoose mongoose
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter ioredis
pnpm add uuid

# [TODO - Opcional para fase de archivos] MinIO / S3 SDK
# pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Dependencias de desarrollo y tipos
pnpm add -D @types/passport-jwt @types/bcrypt @types/uuid
# pnpm add -D @types/multer
```

---

## 3. Arquitectura y Persistencia Políglota

El backend utiliza una estrategia de persistencia adaptada al entorno académico actual, separando el desarrollo local funcional de las definiciones de nube:

```
                                  ┌───────────────────────────────┐
                                  │      API NestJS (Modular)     │
                                  └───────────────┬───────────────┘
                     ┌────────────────┬───────────┴────┬────────────────┐
                     ▼                ▼                ▼                ▼
             ┌──────────────┐ ┌───────────────┐ ┌─────────────┐ ┌──────────────┐
             │  PostgreSQL  │ │   MongoDB     │ │    Redis    │ │ [TODO] S3    │
             │   (TypeORM)  │ │  (Mongoose)   │ │  (ioredis)  │ │ / MinIO      │
             ├──────────────┤ ├───────────────┤ ├─────────────┤ ├──────────────┤
             │ • Users      │ │ • Messages    │ │ • Socket.IO │ │ • Adjuntos   │
             │ • Roles/RBAC │ │   (Ciphertext)│ │   Adapter   │ │   cifrados   │
             │ • Workspaces │ │ • Read        │ │ • Presence  │ │   (Fase      │
             │ • Channels   │ │   Receipts    │ │ • Typing    │ │   avanzada   │
             │ • Memberships│ │               │ │ • Session   │ │   o extra)   │
             │ • Public Keys│ │ *Local Docker │ │   Cache     │ │              │
             │ • Audit Logs │ │ [TODO en AWS] │ │             │ │              │
             └──────────────┘ └───────────────┘ └─────────────┘ └──────────────┘
```

> **Nota para el equipo de desarrollo estudiantil:**
> * **MongoDB:** Es fundamental y **sí se implementa** porque almacena los mensajes cifrados (*ciphertext*). En la fase actual correrá localmente mediante Docker (`mongodb:7.0`). La decisión de cómo alojarlo en AWS (MongoDB Atlas Free Tier vs DocumentDB vs contenedor en EC2) queda marcada como **`[TODO - Por definir para AWS]`**.
> * **MinIO / S3:** Queda marcado como **`[TODO / Opcional]`**. No es bloqueante para el alcance inicial del chat seguro E2EE ni para la entrega académica. Se implementará únicamente si el tiempo del proyecto lo permite.

---

## 4. Estructura de Directorios del Backend

```text
api/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── src/
│   ├── main.ts                     # Bootstrap, CORS, validation pipe global, Swagger
│   ├── app.module.ts               # Módulo raíz que importa módulos de dominio y base de datos
│   ├── common/
│   │   ├── decorators/             # @CurrentUser, @Roles, @Public
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard
│   │   ├── filters/                # GlobalExceptionFilter
│   │   ├── interceptors/           # AuditInterceptor, LoggingInterceptor
│   │   └── utils/                  # Formateadores, constantes criptográficas
│   ├── config/                     # Variables de entorno validadas con Joi / class-validator
│   ├── database/
│   │   ├── postgres/               # Configuración TypeORM y migraciones
│   │   └── mongo/                  # Configuración Mongoose
│   └── modules/
│       ├── auth/                   # Autenticación, JWT, hashing, registro, login
│       ├── users/                  # CRUD de usuarios, custodia de claves públicas
│       ├── channels/               # Canales directos y grupos, membresías, claves cifradas
│       ├── messages/               # Persistencia y paginación de mensajes cifrados (MongoDB)
│       ├── gateway/                # WebSocket Gateway (Socket.IO, salas, Redis adapter)
│       ├── audit/                  # Registro y consulta inmutable de eventos de seguridad
│       └── files/                  # URLs prefirmadas para adjuntos cifrados en S3/MinIO
```

---

## 5. Especificación Detallada de Módulos y Entidades

### 5.1 Módulo `AuthModule`
* **Responsabilidad:** Autenticar usuarios, emitir tokens JWT, validar contraseñas con bcrypt y controlar acceso por roles.
* **Estrategia:** `JwtStrategy` con extracción de Bearer Token en cabeceras HTTP y handshake de WebSockets.
* **Roles del Sistema (RBAC):**
  * `ADMIN`: Acceso completo a `/admin/*`, gestión de usuarios, canales, auditoría global y métricas.
  * `MEMBER`: Acceso a `/app/chats`, `/app/groups`, perfil y envío/recepción de mensajes cifrados.
  * `AUDITOR`: Acceso de solo lectura a `/app/audit` y `/admin/audit` para inspección de eventos inmutables de cumplimiento. No tiene acceso al chat ni a descifrar conversaciones.

### 5.2 Módulo `UsersModule`
* **Entidad TypeORM `User` (`users` en PostgreSQL):**
  * `id`: `uuid` (Primary Key).
  * `email`: `varchar(255)` (Unique, Indexed).
  * `passwordHash`: `varchar(255)`.
  * `fullName`: `varchar(255)`.
  * `role`: `enum` (`admin`, `member`, `auditor`).
  * `status`: `enum` (`active`, `suspended`, `review_due`).
  * `publicKey`: `text` (Clave pública RSA-OAEP o ECDH en formato PEM/SPKI exportada por el navegador del usuario).
  * `firstAccess`: `boolean` (indica si el usuario debe inicializar su identidad criptográfica).
  * `createdAt`, `updatedAt`: `timestamp`.

### 5.3 Módulo `ChannelsModule`
* **Entidad `Channel` (`channels` en PostgreSQL):**
  * `id`: `uuid` (PK).
  * `name`: `varchar(255)` (Nombre del grupo o identificador de chat directo).
  * `type`: `enum` (`direct`, `group`).
  * `policy`: `enum` (`standard`, `restricted`).
  * `createdBy`: `uuid` (FK -> `User.id`).
  * `createdAt`, `updatedAt`: `timestamp`.
* **Entidad `ChannelMember` (`channel_members` en PostgreSQL):**
  * `id`: `uuid` (PK).
  * `channelId`: `uuid` (FK -> `Channel.id`, Indexed).
  * `userId`: `uuid` (FK -> `User.id`, Indexed).
  * `role`: `enum` (`owner`, `admin`, `member`).
  * `encryptedChannelKey`: `text` (La clave simétrica AES-256-GCM del canal, cifrada con la clave pública RSA de este usuario específico en Base64).
  * `joinedAt`: `timestamp`.

### 5.4 Módulo `MessagesModule` (Persistencia en MongoDB)
* **Esquema Mongoose `Message`:**
  ```typescript
  import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
  import { Document } from 'mongoose';

  @Schema({ timestamps: true, collection: 'messages' })
  export class Message extends Document {
    @Prop({ required: true, index: true })
    channelId: string;

    @Prop({ required: true, index: true })
    senderId: string;

    @Prop({ required: true })
    ciphertext: string; // Payload cifrado con AES-GCM (Base64)

    @Prop({ required: true })
    iv: string; // Vector de Inicialización de 12 bytes (Base64)

    @Prop({ required: false })
    signature?: string; // Firma digital opcional del emisor para no repudio

    @Prop({
      type: [
        {
          fileKey: String,
          fileName: String,
          fileSize: Number,
          mimeType: String,
          iv: String,
        },
      ],
      default: [],
    })
    attachments: Array<{
      fileKey: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      iv: string;
    }>;

    @Prop({
      type: [{ userId: String, readAt: { type: Date, default: Date.now } }],
      default: [],
    })
    readBy: Array<{ userId: string; readAt: Date }>;
  }

  export const MessageSchema = SchemaFactory.createForClass(Message);
  MessageSchema.index({ channelId: 1, createdAt: -1 });
  ```

### 5.5 Módulo `GatewayModule` (Socket.IO + Redis)
* Servidor WebSocket configurado con `@WebSocketGateway({ cors: { origin: '*' } })`.
* Integración del adaptador Redis `@socket.io/redis-adapter` para soporte de múltiples réplicas en Kubernetes (AWS EKS).
* **Gestión de Salas:** Cada usuario se une a una sala personal `user_${userId}` y a salas por canal `channel_${channelId}` al conectarse.
* **Control de Presencia:** Manejado con claves temporales en Redis con TTL de latido (heartbeat).

### 5.6 Módulo `AuditModule` (Trazabilidad Inmutable)
* **Entidad `AuditEvent` (`audit_events` en PostgreSQL):**
  * `id`: `uuid` (PK).
  * `timestamp`: `timestamp with time zone` (Default: `now()`).
  * `actorId`: `uuid` (Nullable para intentos fallidos anónimos).
  * `actorEmail`: `varchar(255)`.
  * `action`: `varchar(100)` (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `USER_CREATED`, `ROLE_UPDATED`, `GROUP_CREATED`, `KEY_ROTATED`, `MEMBER_ADDED`, `EXPORT_REQUESTED`).
  * `targetResource`: `varchar(255)` (Ej. `User:usr_member`, `Channel:sec-ops`).
  * `detail`: `text` (Detalle operativo sin contenido sensible).
  * `ipAddress`: `varchar(45)`.
  * `userAgent`: `varchar(500)`.

### 5.7 [TODO / Opcional] Módulo `FilesModule` (MinIO / S3)
* *Estado:* **Postergado / Opcional**. Para la entrega académica, el enfoque prioritario es el chat en tiempo real cifrado, autenticación, usuarios, canales y auditoría.
* *Alcance futuro:* Si se requiere soportar adjuntos, proporcionará endpoints para generar URLs prefirmadas de subida y descarga contra MinIO local o Amazon S3 con blobs cifrados con AES-GCM en el cliente.

---

## 6. Especificación de Endpoints REST y Eventos WebSocket

### 6.1 Endpoints REST (`/api/v1`)

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público | Autenticación con email/contraseña. Devuelve JWT y perfil. |
| `POST` | `/api/v1/auth/register` | `ADMIN` | Registro administrativo de usuarios. |
| `GET` | `/api/v1/users/me` | Autenticado | Obtener información del usuario en sesión. |
| `POST` | `/api/v1/users/me/public-key` | `MEMBER`, `ADMIN` | Registrar la clave pública del usuario (primer acceso). |
| `GET` | `/api/v1/users` | `ADMIN`, `MEMBER` | Listar directorio de usuarios del workspace. |
| `GET` | `/api/v1/users/:id/public-key` | `MEMBER`, `ADMIN` | Obtener clave pública de un usuario para cifrarle claves/mensajes. |
| `GET` | `/api/v1/channels` | `MEMBER`, `ADMIN` | Listar canales a los que pertenece el usuario autenticado. |
| `POST` | `/api/v1/channels` | `MEMBER`, `ADMIN` | Crear nuevo canal/grupo con sus miembros y claves cifradas iniciales. |
| `POST` | `/api/v1/channels/:id/members`| `ADMIN`, `MEMBER` | Añadir miembro al canal con su `encryptedChannelKey`. |
| `GET` | `/api/v1/channels/:id/messages`| `MEMBER` | Obtener historial paginado de mensajes cifrados (desde MongoDB local). |
| `POST` | `/api/v1/channels/:id/rotate-key`| `ADMIN` | Distribuir nueva clave de canal cifrada tras expulsión/rotación. |
| `GET` | `/api/v1/audit/events` | `ADMIN`, `AUDITOR` | Listado paginado de logs de auditoría con filtros. |
| `POST` | `/api/v1/audit/export` | `ADMIN`, `AUDITOR` | Exportar registros de auditoría en formato CSV/JSON. |
| `GET` | `/api/v1/admin/stats` | `ADMIN` | Métricas generales para el dashboard (usuarios, grupos, eventos). |
| `POST` | `/api/v1/files/upload-url` | `MEMBER` | `[TODO / Opcional]` URL prefirmada para adjuntos cifrados. |

### 6.2 Eventos WebSocket (Socket.IO)

#### Del Cliente al Servidor:
* `channel:join` `{ channelId: string }` → Se suscribe a la sala del canal.
* `channel:leave` `{ channelId: string }` → Abandona la sala del canal.
* `message:send` `{ channelId: string, ciphertext: string, iv: string, attachments?: [] }` → Envía mensaje cifrado.
* `typing:start` `{ channelId: string }` → Indica inicio de escritura.
* `typing:stop` `{ channelId: string }` → Indica fin de escritura.

#### Del Servidor al Cliente:
* `message:new` `{ id, channelId, senderId, ciphertext, iv, attachments, createdAt }` → Retransmite mensaje cifrado a los miembros del canal.
* `channel:member_added` `{ channelId, encryptedChannelKey }` → Notifica al usuario que fue añadido y entrega su clave de canal cifrada.
* `presence:status` `{ userId, status: 'online' | 'offline' }` → Estado de presencia de usuarios.
* `typing:update` `{ channelId, userId, isTyping: boolean }` → Estado de escritura en el canal.

---

## 7. Scripts en `package.json` de la API

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "pnpm typeorm migration:generate -d src/database/postgres/data-source.ts",
    "migration:run": "pnpm typeorm migration:run -d src/database/postgres/data-source.ts"
  }
}
```
