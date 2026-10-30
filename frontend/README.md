# VaultCore Chat

VaultCore Chat es una aplicación web moderna construida con React + Vite para gestionar comunicación interna, administración de usuarios y auditoría de actividades dentro de una organización.

## Características principales

- Inicio de sesión con flujo principal en la raíz de la app.
- Panel administrativo con acceso a:
  - Dashboard
  - Usuarios
  - Grupos
  - Auditoría
  - Perfil
- Área de trabajo para miembros con acceso a:
  - Chats
  - Grupos
  - Auditoría
  - Perfil
- Interfaz responsiva con diseño moderno y componentes reutilizables.
- Enrutamiento por pestañas y rutas dedicadas para cada sección.

## Stack tecnológico

- React 19
- Vite 8
- React Router DOM
- Tailwind CSS
- Lucide React
- Shadcn / Base UI

## Requisitos

- Node.js 18 o superior
- npm o pnpm

## Instalación

```bash
cd frontend
npm install
```

## Ejecución en desarrollo

```bash
npm run dev
```

La aplicación se abrirá normalmente en `http://localhost:5173`.

## Compilación para producción

```bash
npm run build
```

## Vista previa de producción

```bash
npm run preview
```

## Estructura principal

```text
frontend/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
├── index.html
└── README.md
```

## Navegación

La app define dos grandes flujos:

- `/` → pantalla de inicio de sesión
- `/admin/*` → panel administrativo
- `/app/*` → experiencia para miembros y auditores

## Nota

Este proyecto está pensado como una base para un sistema de chat corporativo con enfoque administrativo y trazabilidad de actividades.
