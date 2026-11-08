# Taller Mecanico - Frontend (Angular)

Aplicacion web del taller mecanico. Consume la API REST del backend Spring Boot (`taller-mecanico-backend`) en `http://localhost:8080`.

Este es un **repositorio independiente**. Se abre y ejecuta por separado del backend.

## Stack

| Componente | Version |
| --- | --- |
| Angular | 22.2.x (standalone, sin NgModules) |
| TypeScript | 6.0 |
| Node.js | 22.22+ / 24.15+ / 26+ |
| Estilos | SCSS con diseno global en `src/styles.scss` |

## Arquitectura

```
src/app
├── components/layout      # sidebar + topbar + router-outlet
├── models                 # contratos TypeScript de la API
├── pages                  # login, dashboard, clientes, vehiculos, citas, ordenes, mecanicos, paquetes, insumos, reportes
├── services               # AuthService, TallerService, interceptor JWT, guards, api.config
├── app.config.ts          # provideRouter, provideHttpClient + interceptor, app initializer
├── app.routes.ts          # rutas lazy con loadComponent
└── app.ts / app.html      # componente raiz (solo router-outlet)
```

Reglas aplicadas:

- Componentes **standalone** (cero `NgModule`).
- Estado con **Signals** y `computed`.
- Formularios **reactivos** con `inject(FormBuilder)`.
- Plantillas y estilos en archivos separados (`.html` / `.scss`), sin estilos inline.
- Sesion JWT persistida en `localStorage`; el interceptor agrega `Authorization: Bearer` y cierra sesion ante un `401`.

## Requisitos

- Node.js 22.22+ (probado con Node 26).
- Backend levantado en `http://localhost:8080`.

## Inicio rapido (desarrollo)

1. En el repositorio del backend:

```bat
ejecutar.cmd -Build
```

2. En este repositorio:

```bat
npm install
npm start
```

3. Abrir `http://localhost:4200` (use `localhost`, no `127.0.0.1`, porque el backend habilita CORS para `http://localhost:4200`).

Credenciales: **admin / admin123**.

## Comandos

| Comando | Descripcion |
| --- | --- |
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Build de produccion en `dist/frontend/browser` |
| `npm test` | Pruebas unitarias (Vitest, una pasada) |

En PowerShell invoque `npm.cmd` si `npm` esta bloqueado por la politica de scripts.

## Configuracion de la API

La URL esta centralizada en `src/app/services/api.config.ts`:

```ts
// En ng serve (puerto 4200) apunta al backend en 8080.
// En el modo demo el frontend se sirve desde el mismo backend y usa el mismo origen.
```

No hay que cambiar nada al pasar de desarrollo a demo.

## Integracion con el modo demo

Para la presentacion no se ejecuta `npm start`. El build de Angular se copia dentro del backend y Spring Boot sirve la aplicacion completa en `http://localhost:8080`.

Flujo para actualizar la demo:

```bat
REM 1) En este repositorio
npm.cmd run build

REM 2) En el repositorio del backend
copiar-frontend.cmd
preparar-demo.cmd
```

`preparar-demo.cmd` genera en el escritorio la carpeta `Taller-Mecanico-Demo` con Java incluido, lista para copiar a un USB.

## Pantallas incluidas

| Ruta | Estado |
| --- | --- |
| `/login` | Completa |
| `/dashboard` | Completa (indicadores, ordenes recientes, recordatorios) |
| `/clientes` | Completa (CRUD con busqueda) |
| `/vehiculos` | Completa (CRUD con filtro por cliente) |
| `/citas` | Completa (crear, confirmar, cancelar, eliminar) |
| `/ordenes` | Completa (listado y filtros) |
| `/ordenes/:id` | Completa (checklist, consumos, adicionales, pagos, evidencias, cambio de estado) |
| `/mecanicos` | Completa (CRUD, busqueda y filtro por estado) |
| `/paquetes` | Completa (CRUD con editor de puntos de inspeccion) |
| `/insumos` | Completa (CRUD, filtros, stock critico y valor de inventario) |
| `/reportes` | Completa (historial por placa, recordatorios y productividad) |

## Si Angular no arranca en la PC de la universidad

El modo demo no necesita Node: el frontend viaja compilado dentro del backend. Si aun asi necesita editar o ejecutar Angular en otro equipo, puede abrir este repositorio en **GitHub Codespaces** y ejecutar `npm start` alli.

## Notas academicas

- El proyecto prioriza la separacion frontend/backend y el uso de Angular moderno (standalone + signals) sobre caracteristicas avanzadas de UI.
- No se usan NgModules, ni estilos inline, ni formularios por plantilla.
