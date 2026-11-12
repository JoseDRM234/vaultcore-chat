# VaultCore Chat — Frontend (React 19 + E2EE)

Interfaz web moderna construida con **React 19**, **Vite** y **Tailwind CSS**, preparada para operar con cifrado de extremo a extremo mediante la **Web Crypto API** (`window.crypto.subtle`) y comunicación en tiempo real con WebSockets (Socket.IO).

---

## 🚀 Características Principales

* **Inicio de Sesión y Criptografía:** Flujo de acceso con generación de identidad local RSA-OAEP en primer acceso y custodia de la clave privada cifrada en IndexedDB.
* **Área de Miembros (`/app/*`):**
  * **Chats:** Mensajería en tiempo real con cifrado AES-256-GCM y recepción de eventos Socket.IO.
  * **Grupos:** Consulta de membresías y políticas de canal.
  * **Auditoría (Modo Auditor):** Inspección de eventos de seguridad en modo solo lectura.
  * **Perfil:** Información del usuario y estado de identidad en el dispositivo.
* **Panel de Administración (`/admin/*`):**
  * **Dashboard:** Métricas globales en vivo (`/admin/stats`).
  * **Usuarios:** Gestión de cuentas, roles (`admin`, `member`, `auditor`) y estados.
  * **Grupos:** Creación de grupos y distribución de claves de canal cifradas.
  * **Auditoría:** Registro inmutable y exportación de reportes en CSV.

---

## 🛠️ Stack Tecnológico

* React 19
* Vite 8
* Gestor de Paquetes: `pnpm`
* React Router DOM v7
* Tailwind CSS v4
* Lucide React
* Shadcn / Base UI
* Web Crypto API (`window.crypto.subtle`)
* Socket.IO Client

---

## 📋 Requisitos e Instalación

* **Node.js:** v22 o superior
* **pnpm:** v10 o v12 instalado

```bash
cd frontend

# Instalar dependencias con pnpm
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```
La aplicación correrá normalmente en `http://localhost:5173`.

---

## 🔗 Conexión con el Backend

El frontend se comunica con:
* **API REST:** `http://localhost:4000/api/v1`
* **WebSocket Gateway:** `ws://localhost:4000`

---

## 🏗️ Compilación para Producción

```bash
# Compilar bundle de producción
pnpm build

# Previsualizar build localmente
pnpm preview
```
