# Plan Maestro de Desarrollo e Integración — VaultCore Chat

> **Ubicación:** `.agents/plan/README.md`  
> **Gestor de paquetes:** `pnpm` en todo el proyecto  
> **Arquitectura:** Cifrado de Extremo a Extremo (E2EE), Monolito Modular NestJS, React 19, Multicloud (AWS + Azure + On-Premise)

---

## 1. Estructura del Plan

Este plan de trabajo está dividido en tres documentos detallados e independientes para facilitar la implementación por áreas de especialidad:

| Documento | Enfoque | Alcance Principal |
| :--- | :--- | :--- |
| **[api.md](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/api.md)** | **Backend (API)** | Monolito Modular NestJS, persistencia (PostgreSQL, MongoDB local para ciphertext, Redis), RBAC, WebSocket Gateway (Socket.IO + Redis Adapter), contratos REST y eventos. *(MinIO / S3 y despliegue cloud de Mongo en AWS marcados en TODO)*. |
| **[modificaciones-front.md](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/modificaciones-front.md)** | **Frontend (React)** | Adopción de `pnpm`, implementación criptográfica nativa con Web Crypto API (SubtleCrypto RSA-OAEP / AES-256-GCM / PBKDF2), IndexedDB, Socket.IO Client, Contextos de autenticación/cripto y conexión de todas las vistas. |
| **[ci-cd-docker.md](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/ci-cd-docker.md)** | **DevOps & CI/CD** | Dockerfiles multi-stage con `pnpm`, `docker-compose.yml` para desarrollo local (PostgreSQL, MongoDB, Redis), pipeline DevSecOps con GitHub Actions, escaneo de dependencias (SCA/SAST) y diseño multicloud para entrega académica. |

> **Nota de Alcance para el Equipo Estudiantil:**
> * **MongoDB:** Es indispensable para almacenar los mensajes cifrados (*ciphertext*) y se ejecuta localmente mediante Docker en `docker-compose.yml`. Cómo se desplegará en AWS (si mediante Atlas Free Tier, DocumentDB o EC2) queda catalogado como **`[TODO - Por definir para AWS]`**.
> * **MinIO / S3 (Archivos adjuntos):** Queda catalogado como **`[TODO / Opcional]`**. No es requisito bloqueante para la entrega académica del chat seguro, por lo que el equipo puede concentrarse en la mensajería de texto en tiempo real, la criptografía E2EE en el navegador y la auditoría.

---

## 2. Convención del Gestor de Paquetes (`pnpm`)

Todo el repositorio utilizará **`pnpm`** de forma consistente:

```bash
# Frontend
cd frontend
pnpm install
pnpm dev
pnpm build
pnpm test

# Backend API
cd api
pnpm install
pnpm dev
pnpm build
pnpm test
```

---

## 3. Secuencia Recomendada de Implementación

```
  ┌─────────────────────────────────────────────────────────────┐
  │  1. Infraestructura Local: docker-compose.yml (DBs & Redis) │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │  2. Scaffold API NestJS + Módulos Auth, Users y PostgreSQL  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │  3. Frontend: Módulo Crypto (Web Crypto) + Flujo Real Login │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │  4. API: Messages (MongoDB) + Gateway (Socket.IO + Redis)    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │  5. Frontend: Conexión de ChatsPage con Cifrado E2EE        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
  ┌──────────────────────────────▼──────────────────────────────┐
  │  6. Paneles Admin/Auditoría + Pipeline CI/CD con GitHub     │
  └─────────────────────────────────────────────────────────────┘
```

Para consultar las especificaciones técnicas completas de cada parte, accede directamente a:
* [Detalle de la API NestJS](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/api.md)
* [Detalle de Modificaciones del Frontend](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/modificaciones-front.md)
* [Detalle de CI/CD, Docker y Multicloud](file:///home/zelecto/my-proyects/vaultcore-chat/.agents/plan/ci-cd-docker.md)
