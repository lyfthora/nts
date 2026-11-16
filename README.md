<h1 align="center">NTS — Notes</h1>

<p align="center">
  <b>Aplicación de notas de escritorio con editor Markdown avanzado, lienzo de dibujo y sincronización offline-first.</b><br/>
  Construida con Electron, React y CodeMirror 6 sobre una API REST propia.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.2.6-blue" />
  <img alt="License" src="https://img.shields.io/badge/license-ISC-green" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-39-9feaf9" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb" />
</p>

<p align="center">
  <a href="https://deepwiki.com/lyfthora/nts">
    <img alt="Ask DeepWiki" src="https://deepwiki.com/badge.svg" />
  </a>
</p>

## Descripción

**NTS** es una aplicación de escritorio para tomar notas. La interfaz está hecha con **Electron + React + CodeMirror 6** y los datos viven en una **API REST propia** (`nts-api`, desplegada en Render):

```
https://nts-api-3e8i.onrender.com/api
```

Para entrar hace falta una cuenta (email/contraseña o GitHub). Sobre esa base, la app funciona **offline-first**: mantiene una copia local por cuenta en disco y una cola de operaciones pendientes, así que podés abrir, leer y editar notas sin conexión y los cambios se sincronizan solos cuando vuelve la red.

> **Nota:** la app **no** es 100% local ni funciona sin servidor. Sin sesión válida no se pasa de la pantalla de login, y la suscripción/premium se valida contra la API.

---

## Características

### Cuenta y sesión
- **Registro y login** con email/contraseña (`POST /auth/register`, `POST /auth/login`).
- **OAuth con GitHub** por deep link `nts://` (`GET /auth/github`); el token vuelve por el protocolo `nts://` y lo captura el main process.
- **JWT cifrado en disco** con `safeStorage` de Electron, dentro de `electron-store` (`nts_secure_token`). Nunca se guarda en `localStorage`.
- **Refresh automático** del token cuando faltan ≤ 5 minutos (`POST /auth/refresh`); un `401` limpia sesión y caché y recarga la ventana.
- **Logout** manual; la caché por cuenta se conserva para el próximo login.

### Suscripción / Premium
- Estado en `GET /subscription/status`.
  - `active`, `trial`, `trialing` → acceso.
  - `expired`, `canceled`, `unpaid`, `incomplete` → bloqueado.
  - Cualquier otro estado, o un fallo de red, → acceso con aviso.
- **Checkout y portal de pago** (`POST /subscription/checkout`, `POST /subscription/portal`) se abren en el navegador; el retorno llega por `nts://payment-success` / `nts://payment-cancel`.
- **Funciones premium**: exportar/importar una nota y exportar todo el contenido como ZIP de Markdown.

### Sincronización offline-first
- **Caché por cuenta** en `electron-store` (store `offline-sync`): `accounts[accountId] = { notes, folders, pending }`. El identificador de cuenta sale del claim `sub` del JWT (o del email normalizado como fallback), así que dos cuentas nunca comparten datos.
- **Cola de operaciones** FIFO con `Idempotency-Key` (UUID v4) por operación y un campo `revision` para no perder ediciones hechas mientras otra request está en vuelo.
- **IDs temporales negativos** para notas y carpetas creadas offline; cuando el `POST` confirma, se guarda el `remoteId` y las escrituras dependientes se reescriben al ID real del servidor.
- **Reintentos con backoff exponencial** (1,5 s → 60 s máx.). `408`, `429`, `5xx`, timeouts y JSON inválido se reintentan; `400`/`403` quedan retenidos exponiendo `lastError`; `401` espera una sesión válida.
- **Flush coalescido**: varias llamadas concurrentes comparten una única ejecución.
- **Estado visible** en la UI: `getSyncStatus()` devuelve `{ pending, lastError }`.
- Los `flush` se disparan al iniciar sesión, al guardar y por temporizador; también manualmente desde la UI (`retryPendingSync`).

### Editor de texto
- **Editor Markdown** con CodeMirror 6: resaltado, autocompletado, plegado de código, búsqueda y `goto line`.
- **Barra de herramientas** de formato (negrita, cursiva, encabezados, listas, enlaces, código, citas) y atajos `Alt+…`.
- **Vista previa** renderizada con `marked` + `highlight.js`.
- **Checkboxes interactivos** (`- [ ]` / `- [x]`) y **previsualización de imágenes inline**.
- **Tabla de contenidos** generada desde los encabezados.
- **Wiki-links** (`[[Nota]]`), panel de **backlinks**, panel de **forward links** y vista lateral de la **nota enlazada**.

### Grafo de notas (Brain view)
- Vista **3D/2D de las conexiones** entre notas con Three.js, colorizada por tag/estado y con búsqueda dentro del grafo.
- Los tags del sidebar filtran el grafo cuando estás en esa vista.
- Click en un nodo abre la nota.

### Lienzo de dibujo
- Notas de tipo dibujo con canvas basado en `perfect-freehand`.
- Herramientas de lápiz, borrador y zoom; fondos negro, blanco o cuadrícula.
- Limpiar lienzo con confirmación.

### Organización
- **Carpetas anidadas** con árbol expandible y **drag & drop**.
- **Tags** con creación, asignación y filtrado.
- **Estados de nota**: `active`, `onhold`, `completed`, `dropped`.
- **Notas fijadas**, **papelera** con restaurar y eliminar permanentemente.
- **Menú contextual** (fijar, mover, estado, duplicar, exportar, eliminar).
- **Vistas**: All Notes, Brain, Pinned, Trash, por estado y por tag.
- **Modo enfoque** y búsqueda de carpetas y de notas.

### Imágenes
- **Drag & drop** de imágenes al editor.
- Subida a la API (`POST /assets/upload`) y limpieza de assets no referenciados (`POST /assets/clean`).

### Import / Export
- **Exportar nota a JSON** (metadatos + contenido).
- **Exportar nota a Markdown** con frontmatter YAML.
- **Exportar nota a Markdown + imágenes en ZIP** (`.md` + `assets/`).
- **Exportar todas las notas** como ZIP de Markdown.
- **Importar** `.json`, `.md`, `.txt` y `.zip`, con progreso por evento (`export-import-progress`).

### Ventanas múltiples
- **Pop-out de notas** en ventanas independientes (`?mode=note-window`).
- **Sincronización bidireccional** en tiempo real entre dashboard y ventanas flotantes.
- Barra de título propia (frameless) en todas las ventanas.

### Auto-actualización
- `electron-updater` contra GitHub Releases, chequeo al arrancar y descarga/instalación con confirmación.
- Solo activo en builds empaquetados (`app.isPackaged`).

---

## Stack Tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| **Runtime** | [Electron 39](https://www.electronjs.org/) | Aplicación de escritorio multiplataforma |
| **Frontend** | [React 18](https://react.dev/) | UI con componentes funcionales y hooks |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | Renderer tipado (el main process es JavaScript) |
| **Editor** | [CodeMirror 6](https://codemirror.net/) | Editor de Markdown, keymaps, búsqueda y plugins |
| **Markdown** | [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/) | Render HTML y syntax highlighting |
| **Grafo** | [Three.js](https://threejs.org/) | Vista 3D/2D de conexiones entre notas |
| **Dibujo** | [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | Trazos naturales en el canvas |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) | Transiciones de UI |
| **Estilos** | CSS vanilla + variables CSS | Tema oscuro personalizado |
| **Tipografía** | [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) | Máxima legibilidad |
| **Bundler** | [esbuild](https://esbuild.github.io/) | Build del renderer (bundle + splitting) |
| **Persistencia local** | [electron-store](https://github.com/sindresorhus/electron-store) + `localStorage` | Token cifrado, caché por cuenta y contenido |
| **Backend** | API REST propia (`nts-api`, Render) | Auth, notas, carpetas, assets, suscripción |
| **Empaquetado** | [electron-builder](https://www.electron.build/) | NSIS (Windows) y AppImage (Linux) |
| **Actualizaciones** | [electron-updater](https://www.electron.build/auto-update) | Auto-update vía GitHub Releases |
| **ZIP** | [archiver](https://github.com/archiverjs/node-archiver) + [adm-zip](https://github.com/cthackers/adm-zip) | Export/Import de ZIPs con assets |
| **Testing** | Node `node:test` + [Playwright](https://playwright.dev/) | Tests unitarios y E2E de Electron |
| **CI/CD** | GitHub Actions + pnpm 11 | Build y release en Windows y Linux |

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                      Electron Main Process                   │
│                                                              │
│  main.js                                                     │
│   ├── deep links nts:// (OAuth, payment-success/cancel)       │
│   ├── single instance lock + open-external                    │
│   └── windows/windowManager.js → dashboard + note windows     │
│                                                              │
│  ipc/index.js                                                │
│   ├── windowHandlers.js   (min/close, pop-out, sync ventanas) │
│   ├── updateHandlers.js   (auto-updater)                      │
│   ├── exportHandlers.js   (JSON / MD / ZIP, import, progress) │
│   └── noteHandlers.js     (stub vacío: el CRUD vive en sync)   │
│                                                              │
│  offlineSync.js  ─ cache por cuenta + cola + reintentos       │
│  apiProxy.js     ─ fetch a la API con el token seguro         │
│  secureStorage.js─ JWT cifrado con safeStorage (electron-store)│
│  utils/validation.js                                          │
│                                                              │
│  preload.js → contextBridge.exposeInMainWorld("api")          │
└───────────────────────────┬──────────────────────────────────┘
                            │ IPC (invoke / send / events)
┌───────────────────────────▼──────────────────────────────────┐
│                    Electron Renderer Process                 │
│                                                              │
│  App.tsx                                                     │
│   ├── AuthScreen        (login, registro, OAuth GitHub)       │
│   ├── Dashboard         (ventana principal)                  │
│   │    ├── Sidebar           (nav, carpetas, tags, estados)  │
│   │    ├── NotesListPanel    (lista, filtros, contexto)      │
│   │    ├── EditorPanel       (CodeMirror, dibujo, preview)   │
│   │    │    ├── MarkdownPreview / TableOfContents            │
│   │    │    ├── BacklinksPanel / ForwardLinksPanel           │
│   │    │    ├── DrawingCanvas / DrawingToolbar               │
│   │    │    └── NoteInfoPanel, TagsEditor, StatusDropdown    │
│   │    ├── BrainGraph        (three.js, brain/*)             │
│   │    └── LinkedNotePanel                                   │
│   └── NoteWindow         (?mode=note-window, ventana pop-out) │
│                                                              │
│  services/apiClient.ts   (fetch directo: auth, suscripción)   │
│  utils/authUtils.ts      (decode/expiración de JWT)           │
│  utils/contentCache.ts   (caché de contenido en localStorage) │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS (Bearer JWT)
                 ┌──────────▼──────────┐
                 │   nts-api (Render)  │
                 └─────────────────────┘
```

**Seguridad:** `contextIsolation: true`, `nodeIntegration: false`, y todo el IPC expuesto explícitamente desde `preload.js` con `contextBridge`. El token nunca se expone al renderer más allá de `getAuthToken()`.

---

## Dónde se guardan los datos

No hay base de datos local ni archivos JSON por nota. La persistencia local es esta:

| Dónde | Qué guarda |
|-------|-----------|
| `electron-store` (config por defecto) | Token JWT cifrado con `safeStorage` bajo la clave `nts_secure_token` |
| `electron-store` (`offline-sync`) | `accounts[accountId] = { notes, folders, pending }` — caché y cola por cuenta |
| `localStorage` del renderer | Contenido ya cargado de cada nota (`nts_content_<id>`, `nts_drawing_<id>`) como caché de lectura |
| API (`nts-api`) | Fuente de verdad: notas, carpetas, assets y estado de suscripción |

La ruta de datos del usuario la maneja `electron-store` (por defecto `%APPDATA%/nts` en Windows y `~/.config/nts` en Linux).

---

## API

Base URL: un único módulo la resuelve (`src/shared/apiConfig.js`), con override por variable de entorno.

```bash
# main process y preload la leen en runtime;
# el renderer la recibe inyectada en build (esbuild), así que hay que recompilar
NTS_API_URL=http://localhost:5099/api pnpm run build
pnpm start
```

Por defecto (sin la variable):

```
https://nts-api-3e8i.onrender.com/api
```

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/auth/register`, `/auth/login` | Registro y login |
| `GET` | `/auth/github` | Inicio de OAuth (se abre en el navegador) |
| `POST` | `/auth/refresh` | Renovar JWT |
| `GET` | `/notes/all` | Todas las notas y carpetas |
| `GET` | `/notes/:id/content` | Contenido / `drawingData` de una nota |
| `POST` | `/notes` | Crear nota |
| `PUT` | `/notes/:id` | Actualizar nota |
| `DELETE` | `/notes/:id` | Enviar a papelera (soft delete) |
| `POST` | `/notes/:id/restore` | Restaurar desde papelera |
| `DELETE` | `/notes/:id/permanent` | Eliminar definitivamente |
| `GET` | `/notes/:name/backlinks` | Notas que enlazan a `:name` |
| `GET` | `/folders` | Listar carpetas |
| `POST` | `/folders` | Crear carpeta |
| `PUT` | `/folders/:id` | Actualizar carpeta |
| `DELETE` | `/folders/:id` | Eliminar carpeta |
| `POST` | `/assets/upload` | Subir imagen (base64) |
| `POST` | `/assets/clean` | Limpiar assets no referenciados |
| `GET` | `/subscription/status` | Estado de la suscripción |
| `POST` | `/subscription/checkout` | Crear sesión de pago |
| `POST` | `/subscription/portal` | Abrir portal de facturación |

Todas las llamadas autenticadas envían `Authorization: Bearer <jwt>`; las de la cola de sync añaden `Idempotency-Key`.

---

## Requisitos Previos

- **Node.js** ≥ 20 (el CI usa **22**)
- **pnpm 11** (el proyecto usa pnpm; hay `pnpm-lock.yaml`)
- **Git**

### Requisitos adicionales por plataforma

#### Windows
- No se requiere nada adicional

#### Linux
- Paquetes necesarios para Electron:
  ```bash
  # Debian/Ubuntu
  sudo apt install build-essential libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1

  # Arch Linux
  sudo pacman -S base-devel nss at-spi2-atk libdrm libxkbcommon
  ```

---

## Instalación y Desarrollo

### 1. Clonar el repositorio

```bash
git clone https://github.com/lyfthora/nts.git
cd nts
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Compilar el renderer

```bash
pnpm run build
```

esbuild genera el bundle en `dist/` (con splitting, CSS, fuentes e iconos) y copia `index.html`.

### 4. Iniciar la aplicación

```bash
pnpm start
```

> **Nota:** el main process carga siempre `dist/index.html`, así que hay que correr `pnpm run build` antes de `pnpm start`.

### Modo desarrollo con watch

```bash
# Terminal 1: recompila al guardar
pnpm run dev

# Terminal 2: inicia Electron
pnpm start
```

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm run build` | Compila el renderer con esbuild |
| `pnpm run dev` | Build con watch |
| `pnpm start` | Inicia Electron |
| `pnpm run dist` | Build + instalador con electron-builder (salida en `release/`) |
| `pnpm run typecheck` | `tsc --noEmit` sobre el renderer |
| `pnpm test` | Tests E2E de Playwright (`tests/offline/*.spec.js`) |
| `pnpm run test:unit` | Tests unitarios con `node:test` (`tests/offline/*.test.js`) |
| `pnpm run clean:test` | Borra directorios `test-data-*` |
| `pnpm run clean:dist` | Borra `dist/` y `release/` |

---

## Testing

El proyecto tiene dos suites, ambas en `tests/offline/`:

| Archivo | Tipo | Cobertura |
|---------|------|-----------|
| `offlineSync.test.js` | `node:test` | Caché offline, cola y reintentos, resolución de IDs locales → remotos, aislamiento por cuenta, coalescencia de flush, manejo de 400/401/403/408/429/5xx |
| `apiProxy.test.js` | `node:test` | Token Bearer, propagación de status HTTP y de JSON inválido |
| `electron-offline.spec.js` | Playwright + Electron | E2E: editar offline, arrastrar/mover a carpeta, renombrar, reiniciar la app, reconectar y sincronizar de forma idempotente contra una API simulada |

```bash
# Unitarios (rápidos, sin Electron)
pnpm run test:unit

# E2E (levanta la app)
pnpm test

# Limpiar datos de tests
pnpm run clean:test
```

---

## Generar Instalador

### Windows (NSIS)

```bash
pnpm run dist
```

El instalador `.exe` queda en `release/`.

### Linux (AppImage)

```bash
pnpm run build
pnpm exec electron-builder --linux
```

### CI/CD automático

Al pushear un tag `v*`, GitHub Actions (`.github/workflows/release.yml`):

1. Compila en **Windows** → `.exe`
2. Compila en **Linux** → `.AppImage`
3. Publica un **GitHub Release** con ambos binarios (`softprops/action-gh-release`)

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + F` | Abrir la búsqueda de carpetas (dashboard) |
| `Ctrl + Shift + D` | Crear nota de dibujo |
| `Ctrl + Shift + N` | Activar/desactivar modo enfoque |
| `Ctrl + G` | Ir a línea (editor) |
| `Ctrl + P` | Mostrar/ocultar vista previa (editor) |
| `Ctrl + Shift + M` | Mostrar/ocultar barra de herramientas (editor y ventana pop-out) |
| `Alt + B` / `Alt + I` | Negrita / cursiva |
| `Alt + H` | Encabezado H1 |
| `Alt + K` | Enlace |
| `Alt + E` | Código inline |
| `Alt + T` | Bloque de código |
| `Alt + U` | Tachado |
| `Alt + .` | Cita |
| `Alt + 8` / `Alt + 9` / `Alt + 7` | Lista desordenada / ordenada / checkbox |
| `Ctrl + +` / `Ctrl + -` / `Ctrl + 0` | Zoom in / out / reset (lienzo de dibujo) |
| `Ctrl + Shift + P` | Ver solo preview (ventana pop-out) |
| `Esc` | Cerrar modales y paneles de búsqueda |

---

## Estructura del Proyecto

```
nts/
├── .github/
│   └── workflows/
│       └── release.yml             # CI/CD: build + release Windows/Linux
├── scripts/
│   └── build.js                    # Build del renderer con esbuild (dev + watch)
├── src/
│   ├── main/                       # Proceso principal (Node.js)
│   │   ├── main.js                 # Entry point: deep links, single instance, IPC global
│   │   ├── preload.js              # Puente contextBridge: window.api
│   │   ├── apiProxy.js             # fetch a la API con el token seguro
│   │   ├── offlineSync.js          # Caché por cuenta, cola y sincronización
│   │   ├── secureStorage.js        # JWT cifrado con safeStorage + electron-store
│   │   ├── ipc/
│   │   │   ├── index.js            # Registro centralizado de handlers
│   │   │   ├── noteHandlers.js     # Sin handlers (el CRUD de notas vive en offlineSync)
│   │   │   ├── windowHandlers.js   # Ventanas, pop-out y sync entre ventanas
│   │   │   ├── updateHandlers.js   # Auto-updater
│   │   │   └── exportHandlers.js   # Export/Import JSON, Markdown y ZIP
│   │   ├── utils/
│   │   │   └── validation.js       # Validadores de payloads IPC
│   │   └── windows/
│   │       └── windowManager.js    # BrowserWindows (dashboard + notas)
│   │
│   └── renderer/                   # Proceso de renderizado (React + TypeScript)
│       ├── index.html
│       ├── index.tsx               # Entry point React
│       ├── App.tsx                 # Sesión, suscripción y ruteo dashboard/note-window
│       ├── styles/global.css
│       ├── assets/                 # Fuentes (Atkinson Hyperlegible) e iconos
│       ├── types/
│       │   ├── models.ts           # Note, Folder, Tag, Stroke, DrawingData, SubscriptionStatus
│       │   ├── api.ts              # Tipado de window.api
│       │   ├── global.d.ts
│       │   └── images.d.ts
│       ├── services/
│       │   └── apiClient.ts        # Llamadas directas: auth refresh, notas, assets, suscripción
│       ├── utils/
│       │   ├── authUtils.ts        # decodeJwt, expiración y refresh window
│       │   ├── contentCache.ts     # Caché de contenido en localStorage
│       │   └── subscription.ts     # Mapeo de estados y textos de suscripción
│       ├── brain/                  # Grafo: brain-shape, layout, graph-core, renderer, colors, theme
│       ├── pages/
│       │   ├── Dashboard.tsx / .css
│       │   └── NoteWindow.tsx / .css
│       └── components/
│           ├── AuthScreen                  # Login, registro, OAuth GitHub
│           ├── Sidebar, NotesListPanel     # Navegación y listado
│           ├── EditorPanel                 # Editor, preview, paneles laterales
│           ├── BrainGraph                  # Vista de grafo
│           ├── FolderTree, FolderSearchModal
│           ├── DrawingCanvas, DrawingToolbar
│           ├── MarkdownToolbar, MarkdownPreview, TableOfContents
│           ├── BacklinksPanel, ForwardLinksPanel, LinkedNotePanel
│           ├── NoteInfoPanel, TagsEditor, StatusDropdown, NoteContextMenu
│           ├── SubscriptionModal
│           ├── InputModal, ConfirmModal, ProgressToast, UpdateIndicator, WindowBar
│           └── CheckboxWidget, ImagePreviewPlugin, NoteLinkPlugin,
│               EditorKeymaps, customSetup   # Extensiones de CodeMirror
├── tests/
│   └── offline/
│       ├── offlineSync.test.js
│       ├── apiProxy.test.js
│       └── electron-offline.spec.js
├── package.json
├── playwright.config.js
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

---

## Contribuir

1. Fork el repositorio
2. Crea tu rama: `git checkout -b feature/mi-nueva-feature`
3. Commit tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push a tu rama: `git push origin feature/mi-nueva-feature`
5. Abre un Pull Request

Antes de abrir el PR conviene correr:

```bash
pnpm run typecheck
pnpm run test:unit
pnpm run build
```

---

## Licencia

Este proyecto está bajo la licencia **ISC**.

---

<p align="center">
  Hecho por <a href="https://github.com/lyfthora">lyfthora</a>
</p>
