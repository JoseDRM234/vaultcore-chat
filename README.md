# VaultCore Chat

Plataforma corporativa de mensajería segura en tiempo real basada en el principio fundamental de **"Cartero Ciego" (Blind Courier)** y **Cifrado de Extremo a Extremo (E2EE)**. El servidor jamás tiene acceso al contenido en claro de las conversaciones ni a las claves privadas de los usuarios; actúa como un intermediario ciego que enruta texto cifrado (*ciphertext*), garantizando estricta confidencialidad y trazabilidad inmutable de auditoría.

---

## 🏛️ Arquitectura del Sistema

```
                     ┌──────────────────────────────────────────────┐
                     │          Navegador Web (Frontend React)      │
                     │  - Generación de claves (Web Crypto API)     │
                     │  - Cifrado / Descifrado local en memoria     │
                     │  - Clave privada protegida en IndexedDB      │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTPS (REST) / WSS (Socket.IO)
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            Backend NestJS (API)              │
                     │       "Cartero Ciego" (Blind Courier)        │
                     │  - Enrutamiento de Ciphertext e IVs          │
                     │  - Gateway WebSocket en tiempo real          │
                     │  - Control de accesos RBAC y Auditoría       │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                             ┌──────────────────────────────┐
                             │    PostgreSQL 16+ (Docker)   │
                             │  - Users, Roles, Workspaces  │
                             │  - Channels, Public Keys     │
                             │  - Messages (Ciphertext)     │
                             │  - Audit Events (Inmutables) │
                             └──────────────────────────────┘
```

---

## 🚀 Stack Tecnológico

* **Monorepo / Package Manager:** `pnpm` (v10 / v12)
* **Backend (`api/`):**
  * NestJS v11 (Monolito Modular)
  * TypeORM con **migraciones 100% manuales** en SQL crudo (`synchronize: false`)
  * PostgreSQL 16+ (Docker)
  * WebSockets (Socket.IO Gateway con autenticación JWT)
  * Autenticación JWT con roles RBAC (`admin`, `member`, `auditor`) y contraseñas bcrypt
* **Frontend (`frontend/`):**
  * React 19 + Vite
  * Tailwind CSS
  * Lucide React + Shadcn / Base UI
  * React Router DOM
  * Web Crypto API (`window.crypto.subtle` - RSA-OAEP / AES-256-GCM / PBKDF2)

---

## 📋 Requisitos Previos

* **Node.js:** v22 o superior
* **pnpm:** v10 o v12 instalado globalmente (`npm install -g pnpm` o `corepack enable`)
* **Docker:** Con contenedor de PostgreSQL en ejecución en el puerto `5432`

---

## ⚡ Guía de Inicio Rápido

### 1. Base de Datos (PostgreSQL)

Asegúrate de que tu contenedor de PostgreSQL esté corriendo y la base de datos `vaultcore_chat` exista:

```bash
docker exec -i postgres psql -U postgres -c "CREATE DATABASE vaultcore_chat;"
```

### 2. Configurar y Levantar el Backend (API)

```bash
cd api

# Instalar dependencias
pnpm install

# Configurar variables de entorno (ajustar credenciales de Postgres si difieren)
cp .env.example .env

# Ejecutar las migraciones manuales (esquema + semillas demo)
pnpm migration:run

# Iniciar en modo desarrollo
pnpm start:dev
```
La API estará disponible en `http://localhost:4000/api/v1` y el WebSocket en `http://localhost:4000`.

### 3. Levantar el Frontend

En una terminal separada:

```bash
cd frontend

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```
La aplicación web se abrirá en `http://localhost:5173`.

---

## 🧪 Pruebas Automatizadas de la API

La API cuenta con una suite completa de **pruebas de integración reales** (sin mocks de base de datos) que valida de punta a punta autenticación, RBAC, criptografía E2EE, persistencia de *ciphertext*, auditoría y WebSockets en vivo.

```bash
cd api
pnpm test:api
```
*(También se puede ejecutar desde la raíz con `pnpm --filter api test:api`)*.

---

## 🔑 Cuentas Demo Pre-configuradas

Tras ejecutar `pnpm migration:run`, la base de datos cuenta con los siguientes usuarios de prueba:

| Correo | Contraseña | Rol | Acceso en Frontend |
| :--- | :--- | :--- | :--- |
| `admin@vaultcore.test` | `password123` | `admin` | Panel de Control Administrativo (`/admin/*`) |
| `member@vaultcore.test` | `password123` | `member` | Chat E2EE y Grupos (`/app/*`) |
| `auditor@vaultcore.test` | `password123` | `auditor` | Trazabilidad y Logs de Auditoría (`/app/audit`) |

---

## 📁 Estructura del Repositorio

```text
vaultcore-chat/
├── .agents/                    # Documentación arquitectónica y planes de desarrollo
│   ├── Actividad 3 Arquitectura de mi Sistema.pdf
│   ├── Primer_Parcial_DevOps_Multicloud_VaultCoreChat.pdf
│   └── plan/
│       ├── README.md           # Índice maestro del plan
│       ├── api.md              # Especificación del backend NestJS
│       ├── modificaciones-front.md  # Plan de integración del frontend E2EE
│       └── ci-cd-docker.md     # Pipeline DevOps y arquitectura multicloud
├── api/                        # Backend NestJS
│   ├── src/
│   │   ├── core/database/      # DataSource y migraciones manuales
│   │   ├── common/             # Decoradores, enums y roles
│   │   └── modules/            # Auth, Users, Channels, Messages, Audit, Gateway, Admin
│   ├── scripts/test-api.mjs    # Suite automatizada de pruebas E2E
│   └── package.json
├── frontend/                   # Frontend React 19 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Componentes UI
│   │   ├── layouts/            # AppLayout y AdminLayout
│   │   ├── pages/              # Login, Chats, Users, Groups, Audit, Dashboard
│   │   └── services/           # Clientes HTTP y estado
│   └── package.json
└── README.md
```

---

## 🛡️ Principios de Seguridad

1. **Zero-Knowledge:** Las claves privadas se generan y custodian exclusivamente en el navegador del cliente mediante Web Crypto API.
2. **Cartero Ciego:** El servidor solo ve texto cifrado (`ciphertext`) y vectores de inicialización (`iv`).
3. **Auditoría Inmutable:** Cada login, creación de canal, cambio de rol o descarga queda registrada de forma inmutable en PostgreSQL para cumplimiento de normativas como ISO 27001.
