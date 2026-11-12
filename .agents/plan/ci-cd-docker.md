# Plan de CI/CD, Dockerización y DevOps Multicloud

> **Ubicación:** `.agents/plan/ci-cd-docker.md`  
> **Gestor de paquetes:** `pnpm`  
> **Basado en:** *Primer_Parcial_DevOps_Multicloud_VaultCoreChat.pdf*  
> **Ecosistema:** Docker, Docker Compose, GitHub Actions, Terraform, AWS, Azure, On-Premise

---

## 1. Visión General de la Estrategia DevOps

VaultCore Chat requiere un ciclo de vida de desarrollo ágil y seguro (DevSecOps), garantizando que las pruebas automatizadas, los escaneos de vulnerabilidades y la entrega continua no comprometan jamás el cifrado de extremo a extremo ni la soberanía de los datos.

```
  ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌─────────┐     ┌─────────┐
  │ 1. Git │ ──> │2. Build│ ──> │3. Test │ ──> │4. Sec  │ ──> │5. Image │ ──> │6. Deploy│
  │ Commit │     │ (pnpm) │     │ (Jest) │     │ (SCA)  │     │(ECR/ACR)│     │  (EKS)  │
  └────────┘     └────────┘     └────────┘     └────────┘     └─────────┘     └─────────┘
```

---

## 2. Dockerización con `pnpm` (Multi-Stage Builds)

### 2.1 Backend: `api/Dockerfile`
Compilación multi-etapa para generar una imagen de producción mínima, sin dependencias de desarrollo y con usuario sin privilegios (`node`).

```dockerfile
# Etapa 1: Dependencias y Build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm prune --prod

# Etapa 2: Imagen Final Liviana de Producción
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Crear usuario de sistema no-root
RUN addgroup -S vaultgroup && adduser -S vaultuser -G vaultgroup

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER vaultuser
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### 2.2 Frontend: `frontend/Dockerfile`
Compilación de la SPA con Vite + `pnpm` y servicio estático mediante Nginx optimizado con compresión gzip y cabeceras de seguridad.

```dockerfile
# Etapa 1: Build de la SPA
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Etapa 2: Servidor Web Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Archivo `frontend/nginx.conf`
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Soporte para SPA con react-router-dom
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cabeceras de seguridad básicas
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

---

## 3. Entorno de Desarrollo Local (`docker-compose.yml`)

Ubicado en la raíz del repositorio (`/docker-compose.yml`), permite orquestar localmente todos los motores de persistencia políglota y los servicios:

```yaml
version: '3.8'

services:
  # Base de datos relacional para usuarios, canales, RBAC y auditoría
  postgres:
    image: postgres:16-alpine
    container_name: vaultcore-postgres
    environment:
      POSTGRES_DB: vaultcore_db
      POSTGRES_USER: vaultcore
      POSTGRES_PASSWORD: vaultcore_dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vaultcore -d vaultcore_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Base de datos documental para mensajes cifrados (ciphertext)
  # NOTA: En local corre en Docker. En AWS queda como [TODO - Por definir]
  mongodb:
    image: mongo:7.0
    container_name: vaultcore-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Bus en memoria para Socket.IO Redis Adapter, presencia y typing
  redis:
    image: redis:7-alpine
    container_name: vaultcore-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # [TODO / Opcional] Object storage compatible con S3 para adjuntos binarios
  # Se deja comentado para no saturar recursos en entorno local estudiantil
  # minio:
  #   image: minio/minio:latest
  #   container_name: vaultcore-minio
  #   command: server /data --console-address ":9001"
  #   environment:
  #     MINIO_ROOT_USER: minioadmin
  #     MINIO_ROOT_PASSWORD: minioadminpassword
  #   ports:
  #     - "9000:9000"
  #     - "9001:9001"
  #   volumes:
  #     - minio_data:/data

  # Backend API en modo desarrollo
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: builder
    container_name: vaultcore-api
    command: pnpm dev
    working_dir: /app
    volumes:
      - ./api:/app
      - /app/node_modules
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_USER: vaultcore
      POSTGRES_PASSWORD: vaultcore_dev_pass
      POSTGRES_DB: vaultcore_db
      MONGO_URI: mongodb://mongodb:27017/vaultcore_messages
      REDIS_HOST: redis
      REDIS_PORT: 6379
      # MINIO_ENDPOINT: http://minio:9000 # [TODO: Habilitar si se implementan adjuntos]
      JWT_SECRET: dev_super_secret_jwt_key_vaultcore_2026
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Frontend React en modo desarrollo
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: builder
    container_name: vaultcore-frontend
    command: pnpm dev --host
    working_dir: /app
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:4000
    depends_on:
      - api

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
  minio_data:
```

---

## 4. Pipeline de Integración y Entrega Continua (CI/CD)

Basado en la sección 6.3 y 12.4 de la arquitectura multicloud, implementado con **GitHub Actions** (`.github/workflows/ci-cd.yml`):

### 4.1 Fases del Pipeline Automatizado

1. **Linting y Formato:**
   * Ejecución de `pnpm lint` en frontend y backend.
   * Validación de estándares y chequeo de tipos TypeScript (`pnpm tsc --noEmit`).
2. **Pruebas Automatizadas:**
   * Pruebas unitarias de servicios NestJS con Jest (`pnpm test`).
   * Pruebas de integración de autenticación y WebSocket gateway (`pnpm test:e2e`).
3. **Escaneo de Seguridad DevSecOps:**
   * **SCA (Software Composition Analysis):** `pnpm audit` y Snyk para detectar librerías vulnerables.
   * **SAST (Static Application Security Testing):** Escaneo de código con SonarQube o Trivy.
   * Si se detectan vulnerabilidades de severidad Alta o Crítica, el pipeline se detiene automáticamente.
4. **Construcción y Empaquetado:**
   * Construcción de imágenes Docker con tags de versión semántica (`vMAJOR.MINOR.PATCH`).
   * Publicación simultánea en repositorios:
     * **Amazon ECR:** Para despliegue de cómputo en Amazon EKS.
     * **Azure ACR:** Repositorio espejo multicloud.
5. **Infraestructura como Código (IaC con Terraform):**
   * Validación de sintaxis (`terraform fmt -check`, `terraform validate`).
   * Generación y revisión de plan (`terraform plan`).
   * Despliegue automático a Staging ante merges a la rama `main`.
   * Despliegue a Producción condicionado a **aprobación manual** de un responsable de plataforma.
6. **Verificación Post-Despliegue (Smoke Tests):**
   * Pruebas de salud (`GET /health`) y validación de handshake de WebSockets.
   * Notificación automática de estado en el canal de Slack del equipo.

### 4.2 Definición del Workflow (`.github/workflows/ci-cd.yml`)

```yaml
name: VaultCore Chat CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate-and-test:
    name: Lint, Typecheck and Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Use Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: |
          cd api && pnpm install --frozen-lockfile
          cd ../frontend && pnpm install --frozen-lockfile

      - name: Lint and Format
        run: |
          cd api && pnpm lint
          cd ../frontend && pnpm lint

      - name: Run Backend Tests
        run: |
          cd api && pnpm test -- --coverage

      - name: Security Vulnerability Scan (SCA)
        run: |
          cd api && pnpm audit --audit-level=high
          cd ../frontend && pnpm audit --audit-level=high

  docker-build-push:
    name: Build and Push Images
    needs: validate-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Amazon ECR / Azure ACR
        run: echo "Configuración de credenciales OIDC para ECR/ACR"

      - name: Build and Push API Container
        uses: docker/build-push-action@v5
        with:
          context: ./api
          push: false
          tags: vaultcore/api:latest

      - name: Build and Push Frontend Container
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: false
          tags: vaultcore/frontend:latest
```

---

## 5. Distribución Multicloud e Infraestructura como Código (IaC)

Alineado con el documento de arquitectura del proyecto, con distinciones entre lo implementado en el entorno local/educativo y lo propuesto conceptualmente para la nube:

| Componente | Proveedor | Implementación Estudiantil vs Nube | Herramienta IaC / Config |
| :--- | :--- | :--- | :--- |
| **API NestJS + WebSocket Gateway** | **AWS (Amazon EKS)** | En local corre en Docker; despliegue cloud en EKS o EC2 según presupuesto. | Terraform (módulo cómputo) |
| **Mensajes Cifrados (MongoDB)** | **AWS / Nube** | **En local corre en Docker (`mongodb:7.0`).** En AWS queda como **`[TODO - Por definir]`** (Opciones: MongoDB Atlas Free Tier vs DocumentDB vs EC2 propio). | Terraform (módulo datos) / Atlas |
| **Caché y Bus Pub/Sub** | **AWS (ElastiCache / Redis)** | En local corre con imagen `redis:7-alpine`. | Terraform (módulo datos) |
| **Adjuntos Cifrados (MinIO / S3)** | **AWS (S3) / Local (MinIO)** | **`[TODO / Opcional]`** — Postergado para fase posterior. Prioridad actual en mensajes de texto E2EE. | Terraform (módulo storage) |
| **Gestión de Identidad y RBAC** | **Azure (Entra ID)** | En local se implementa con JWT y Auth Guards en NestJS (simulación de roles). | Terraform (módulo identidad) |
| **Observabilidad y Seguridad Central**| **Azure (Sentinel + Log Analytics)**| Logs estructurados en consola y Prometheus/Grafana en local. | Terraform (módulo observabilidad)|
| **Gestión de Secretos de la API** | **Azure Key Vault / AWS Secrets Mgr**| En local mediante variables de entorno en `.env`. | Terraform (módulo seguridad) |
| **Datos Regulados y Claves Maestras** | **On-Premise (PostgreSQL + HSM)** | En local corre con imagen `postgres:16-alpine`. | Ansible / Docker |

> **Nota para el equipo:**  
> Como estudiantes, la prioridad número 1 es tener el sistema 100% operativo en el entorno local (`docker-compose.yml` con Postgres, Mongo y Redis), demostrando el cifrado de extremo a extremo y la trazabilidad de auditoría. La estrategia en AWS para MongoDB y S3 se documenta a nivel de diseño arquitectónico y queda en estado **TODO** para su aprovisionamiento en la nube una vez se definan los costos y créditos de AWS.

---

## 6. Observabilidad y Trazabilidad Distribuida

* **Métricas en Tiempo Real:** Prometheus expone métricas de conexiones WebSocket activas y latencia p95 de entrega de mensajes (< 250 ms) visualizadas en paneles Grafana.
* **Trazabilidad con OpenTelemetry:** Cada petición genera un `traceId` único en el frontend React que se propaga por las cabeceras HTTP y eventos WebSocket hacia el backend NestJS, permitiendo depurar problemas de rendimiento sin comprometer ni exponer el contenido cifrado de las conversaciones.
