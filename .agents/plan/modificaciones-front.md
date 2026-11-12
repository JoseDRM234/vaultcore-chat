# Plan de Modificaciones para el Frontend (React 19 + E2EE)

> **Ubicación:** `.agents/plan/modificaciones-front.md`  
> **Gestor de paquetes:** `pnpm` (dentro de `frontend/`)  
> **Stack:** React 19 + Vite + Tailwind CSS + Web Crypto API (SubtleCrypto) + Socket.IO Client  
> **API Backend:** `http://localhost:4000/api/v1` | **WebSocket:** `http://localhost:4000`

---

## 1. Diagnóstico del Estado Actual en `frontend/`

El frontend cuenta con una excelente base visual y de componentes UI (diseño oscuro/claro, navegación completa con `react-router-dom`, maquetación de chats, tablas y paneles administrativos), pero se encuentra completamente en estado mock:
1. `src/services/auth-service.js` valida credenciales contra un diccionario estático en memoria (`admin@vaultcore.test`, etc.).
2. `src/pages/LoginPage.jsx` tiene un comentario explícito: `// TODO: Generate a local RSA key pair and PBKDF2-encrypt the private key with Web Crypto.`
3. `src/pages/app/ChatsPage.jsx` tiene arrays fijos de personas y mensajes; el formulario no envía ni cifra nada.
4. Las vistas administrativas (`UsersPage`, `GroupsPage`, `AuditPage`, `AdminDashboard`) renderizan datos estáticos.
5. No hay gestión global de estado de autenticación, sesión, WebSocket ni claves criptográficas en memoria.

---

## 2. Instalación de Dependencias con `pnpm`

Dentro del directorio `/frontend`:

```bash
cd /home/zelecto/my-proyects/vaultcore-chat/frontend

# Añadir cliente WebSocket y almacenamiento local IndexedDB
pnpm add socket.io-client idb
```

---

## 3. Implementación Criptográfica E2EE (`src/lib/crypto.js`)

Utiliza de forma nativa la **Web Crypto API** (`window.crypto.subtle`) del navegador sin dependencias externas pesadas:

```
                    ┌───────────────────────────────────────────────┐
                    │               Flujo de Claves                 │
                    └───────────────────────┬───────────────────────┘
                                            │
        ┌───────────────────────────────────┴───────────────────────────────────┐
        ▼                                                                       ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│     Identidad del Usuario     │                       │       Canal / Grupo           │
│  (Par RSA-OAEP 2048-bit)      │                       │     (Clave AES-256-GCM)       │
├───────────────────────────────┤                       ├───────────────────────────────┤
│ • Clave Pública:              │                       │ • Generada por creador        │
│   Exportada a SPKI/Base64     │                       │ • Cifrada con clave pública   │
│   y almacenada en la API.     │                       │   de cada miembro (RSA-OAEP)  │
│ • Clave Privada:              │                       │ • Descifrada por cada miembro │
│   Cifrada localmente con      │                       │   con su clave privada RSA    │
│   AES-GCM derivado de PBKDF2  │                       │ • Reside en memoria para      │
│   (password) y guardada en    │                       │   cifrar/descifrar mensajes   │
│   IndexedDB.                  │                       │                               │
└───────────────────────────────┘                       └───────────────────────────────┘
```

### Funciones Principales a Implementar en `src/lib/crypto.js`:
1. `generateUserKeyPair()`:
   * Genera par de claves `RSA-OAEP` (modulusLength: 2048, publicExponent: [1, 0, 1], hash: 'SHA-256').
   * Exporta clave pública en formato SPKI/Base64 para enviarla a la API.
2. `deriveKeyFromPassword(password, salt)`:
   * Aplica `PBKDF2` (SHA-256, 100,000 iteraciones) sobre la contraseña del usuario para generar una clave `AES-GCM` de 256 bits para protección local.
3. `storePrivateKeyLocally(privateKey, password)`:
   * Exporta la clave privada a formato PKCS8, genera un salt aleatorio de 16 bytes y un IV de 12 bytes.
   * Cifra la clave privada con `AES-GCM` y la almacena en IndexedDB (mediante `idb`).
4. `loadPrivateKeyLocally(password)`:
   * Recupera el blob cifrado, el salt y el IV desde IndexedDB, deriva la clave y descifra la clave privada en memoria para la sesión activa.
5. `generateChannelKey()`:
   * Genera clave simétrica `AES-GCM` de 256 bits para el grupo/canal.
6. `encryptChannelKeyForMember(channelKey, memberPublicKeySpkiBase64)`:
   * Importa la clave pública SPKI del miembro y cifra la clave simétrica del canal con `RSA-OAEP`.
   * Retorna la clave cifrada en formato Base64 (`encryptedChannelKey`).
7. `decryptChannelKey(encryptedChannelKeyBase64, myPrivateKey)`:
   * Descifra la clave simétrica del canal recibida de la API usando la clave privada `RSA-OAEP` local del usuario.
8. `encryptMessage(channelKey, plainText)`:
   * Genera un IV aleatorio de 12 bytes (`window.crypto.getRandomValues(new Uint8Array(12))`).
   * Cifra el texto plano con `AES-GCM`.
   * Retorna `{ ciphertext: base64, iv: base64 }`.
9. `decryptMessage(channelKey, ciphertextBase64, ivBase64)`:
   * Convierte ciphertext e IV de Base64 a `Uint8Array`.
   * Descifra el mensaje con `AES-GCM` y lo decodifica con `TextDecoder`.

---

## 4. Arquitectura de Estado y Contextos

Crear en `src/context/`:

### 4.1 `AuthContext.jsx`
* Estado:
  * `token`: JWT retornado por `POST /api/v1/auth/login` (guardado en `sessionStorage`).
  * `user`: Objeto con `{ id, email, fullName, role, status, firstAccess, publicKey }`.
  * `privateKey`: Clave privada RSA descifrada en memoria (destruida al cerrar sesión).
* Métodos:
  * `login(email, password)`:
    1. Llama a `POST /api/v1/auth/login`.
    2. Si `user.firstAccess === true`, genera el par de claves RSA, guarda la clave privada cifrada en IndexedDB y sube la clave pública a `POST /api/v1/users/me/public-key`.
    3. Si `user.firstAccess === false`, descifra la clave privada desde IndexedDB con la contraseña.
    4. Guarda token y usuario en estado y redirige según su rol.
  * `logout()`: Borra el token, destruye la clave privada en memoria y redirige a `/`.

### 4.2 `SocketContext.jsx`
* Gestiona la conexión única con el backend usando `socket.io-client`:
  ```javascript
  const socket = io('http://localhost:4000', {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
  ```
* Se conecta automáticamente al detectar un `token` válido y se desconecta al hacer logout.
* Eventos emitidos:
  * `channel:join` `{ channelId }`
  * `channel:leave` `{ channelId }`
  * `message:send` `{ channelId, ciphertext, iv, signature }`
  * `typing:start` / `typing:stop` `{ channelId }`
* Eventos escuchados:
  * `message:new` (nuevo mensaje cifrado retransmitido)
  * `presence:status` (`{ userId, status: 'online' | 'offline' }`)
  * `typing:update` (`{ channelId, userId, userName, isTyping }`)

### 4.3 `CryptoContext.jsx`
* Administra una caché en memoria de claves simétricas de canales: `Map<channelId, CryptoKey>`.
* Cuando el usuario entra a un canal:
  * Si la clave ya está en caché, la utiliza directamente.
  * Si no está en caché, toma la `encryptedChannelKey` del canal recibida de la API, la descifra con su `privateKey` y la almacena en el mapa.
* Métodos expuestos: `encryptText(channelId, text)`, `decryptText(channelId, ciphertext, iv)`.

---

## 5. Modificaciones Detalladas por Pantalla y Archivo

### 5.1 `src/services/api-client.js` y `src/services/auth-service.js`
* Crear cliente HTTP (`apiClient`) que:
  * Prefijo base: `http://localhost:4000/api/v1`.
  * Inyecte automáticamente `Authorization: Bearer <token>`.
  * Maneje respuestas 401 limpiando la sesión.
* Reemplazar el diccionario estático de usuarios por:
  * `authService.login(email, password)` → `POST /api/v1/auth/login`.
  * `authService.uploadPublicKey(publicKey)` → `POST /api/v1/users/me/public-key`.

### 5.2 `src/pages/LoginPage.jsx`
* Conectar el formulario al nuevo `AuthContext.login(email, password)`.
* Mostrar feedback de error si las credenciales fallan o si la cuenta está suspendida.
* Mantener la animación de "Inicializando cifrado..." durante el primer acceso mientras `generateUserKeyPair()` se ejecuta en segundo plano.

### 5.3 `src/pages/app/ChatsPage.jsx`
* **Sidebar de Conversaciones:**
  * Consumir `GET /api/v1/channels` para listar los canales y grupos del usuario autenticado.
  * Mostrar indicador de presencia en tiempo real (punto verde) basado en el evento `presence:status` del socket.
* **Área de Conversación:**
  * Al hacer click en un canal, unirse vía socket: `socket.emit('channel:join', { channelId })`.
  * Consultar historial paginado: `GET /api/v1/channels/:id/messages`.
  * Descifrar cada mensaje al vuelo en el cliente con `decryptText(channelId, msg.ciphertext, msg.iv)`.
  * Escuchar `socket.on('message:new')`: descifrar instantáneamente y agregar al feed de mensajes.
* **Barra de Envío:**
  * Emitir `typing:start` y `typing:stop` con debounce mientras el usuario teclea.
  * Al presionar enviar:
    1. Cifrar el texto plano con la clave simétrica del canal (`encryptText`).
    2. Emitir evento WebSocket `message:send` con `{ channelId, ciphertext, iv }` (o fallback a `POST /api/v1/channels/:id/messages`).
    3. Limpiar el input sin congelar la interfaz.

### 5.4 `src/pages/admin/UsersPage.jsx`
* Consumir `GET /api/v1/users` con soporte de buscador en tiempo real.
* Implementar modal de "Invite user" conectado a `POST /api/v1/users`:
  * Campos: Nombre completo, email corporativo, contraseña temporal y selección de rol (`admin`, `member`, `auditor`).
* Botón de acciones por fila: suspender o reactivar usuario vía `PATCH /api/v1/users/:id`.

### 5.5 `src/pages/admin/GroupsPage.jsx` y `src/pages/app/AppGroups.jsx`
* **En Admin (`GroupsPage.jsx`):**
  * Listar grupos desde `GET /api/v1/channels?type=group`.
  * Modal "Crear Grupo":
    1. Nombre y política (`standard` o `restricted`).
    2. Selector de miembros participantes.
    3. Generar una clave de canal (`generateChannelKey()`).
    4. Cifrar la clave para cada miembro usando su clave pública (`GET /api/v1/users/:id/public-key`).
    5. Enviar payload consolidado a `POST /api/v1/channels`.
* **En App (`AppGroups.jsx`):**
  * Mostrar la lista dinámica de grupos a los que pertenece el miembro y su rol (`owner` o `member`).

### 5.6 `src/pages/admin/AuditPage.jsx` y `src/pages/app/AppAudit.jsx`
* Consumir `GET /api/v1/audit/events` con paginación y visualización del actor, acción, recurso y fecha.
* Conectar el botón de "Export requested" con descarga directa del archivo CSV mediante `POST /api/v1/audit/export`.
* Garantizar que la vista de auditoría para el rol `auditor` sea estrictamente de solo lectura.

### 5.7 `src/pages/admin/AdminDashboard.jsx`
* Conectar los contadores (`Active users`, `Encrypted groups`, `Audit events`, `System status`) directamente a `GET /api/v1/admin/stats`.

### 5.8 `src/layouts/AdminLayout.jsx` y `src/layouts/AppLayout.jsx`
* Mostrar nombre, email e iniciales dinámicas del usuario en sesión (`user.fullName`, `user.email`).
* Implementar botón de Cerrar Sesión (`Logout`) funcional.

### 5.9 `src/App.jsx` y `src/components/ProtectedRoute.jsx`
* Crear componente `ProtectedRoute` que valide token activo y rol permitido (`admin`, `member`, `auditor`).
* Si el usuario no está autenticado, redirigir a `/`.
* Si intenta acceder a una ruta que no le corresponde (por ejemplo, un `member` entrando a `/admin/*`), redirigir a su vista autorizada (`/app/chats`).
