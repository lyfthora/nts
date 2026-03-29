<h1 align="center">NTS — Notes</h1>

<p align="center">
  <b>Aplicación de notas de escritorio con almacenamiento 100% local, editor Markdown avanzado y lienzo de dibujo.</b><br/>
  Construida con Electron, React y CodeMirror 6.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.2.2-blue" />
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

**NTS** es una aplicación de escritorio para tomar notas diseñada para usuarios que valoran la **privacidad** y el **rendimiento**. Todos los datos se almacenan localmente en el sistema de archivos del usuario — sin servidores, sin la nube, sin telemetría. La interfaz oscura y minimalista con animaciones fluidas ofrece una experiencia moderna sin distracciones.



## Características Principales


### Editor de Texto
- **Editor Markdown avanzado** con CodeMirror 6 (autocompletado, resaltado de sintaxis, plegado de código)
- **Barra de herramientas Markdown** para formato rápido (negrita, cursiva, encabezados, listas, enlaces, código, etc.)
- **Vista previa en tiempo real** del Markdown renderizado con highlight.js
- **Checkboxes interactivos** en Markdown (`- [ ]` / `- [x]`)
- **Vista previa de imágenes inline** directamente en el editor
- **Tabla de contenidos** generada automáticamente desde los encabezados
- **Ir a línea** (`Ctrl+G`) para navegación rápida en documentos largos

### Lienzo de Dibujo
- **Notas tipo dibujo** con lienzo completo basado en `perfect-freehand`
- Herramientas: **lápiz, borrador, zoom** y barra de herramientas dedicada
- Fondos configurables: **negro, blanco o cuadrícula**
- Limpiar lienzo con confirmación

### Organización
- **Carpetas anidadas infinitas** con estructura de árbol expandible/colapsable
- **Drag & Drop** de notas entre carpetas y de carpetas para reorganizar la jerarquía
- **Sistema de etiquetas (Tags)** — permite crear, asignar y filtrar por etiquetas
- **Estados de nota**: `active`, `onhold`, `completed`, `dropped` — cada uno con su icono y color
- **Notas fijadas (Pinned)** que siempre aparecen primero
- **Papelera** con opción de restaurar o eliminar permanentemente
- **Menú contextual** (clic derecho) con acciones: fijar, mover a carpeta, cambiar estado, duplicar, eliminar

### Enlaces entre Notas
- **Wiki-links** (`[[Nombre de la Nota]]`) para enlazar notas entre sí
- **Backlinks** — panel que muestra qué notas enlazan a la nota actual
- **Forward Links** — panel que muestra a qué notas enlaza la nota actual
- **Nota enlazada en panel lateral** — vista side-by-side de notas vinculadas
- Click en un enlace para navegar directamente a la nota destino

### Imágenes
- **Drag & Drop** de imágenes directamente al editor
- Almacenamiento optimizado en carpeta `assets/` dedicada por nota
- **Limpieza automática** de assets no referenciados
- Previsualización inline en el editor

### Import / Export
- **Exportar a JSON** — incluye metadatos, contenido y assets (base64)
- **Exportar a Markdown** — con frontmatter YAML (nombre, color, tags, estado, fechas)
- **Exportar Markdown con imágenes → ZIP** (`.md` + carpeta `assets/`)
- **Importar** desde: `.json`, `.md`, `.txt`, `.zip` (Markdown + assets)

### Ventanas Múltiples
- **Abrir notas en ventanas independientes** (pop-out) para multitarea
- Sincronización bidireccional en tiempo real entre la ventana principal y las ventanas flotantes
- Barra de título personalizada (frameless) en todas las ventanas

### Búsqueda
- **Búsqueda global** (`Ctrl+K`) — busca por nombre y contenido de las notas
- **Búsqueda de carpetas** con modal dedicado para mover notas
- **Búsqueda dentro del editor** (`Ctrl+F`) con find & replace

### Auto-Actualización
- Detección automática de nuevas versiones en GitHub Releases
- Descarga e instalación con un clic (via `electron-updater`)
- Indicador visual de actualización disponible en la interfaz

---

## Stack Tecnológico

| Capa | Tecnología | Uso |
|------|-----------|-----|
| **Runtime** | [Electron 39](https://www.electronjs.org/) | Aplicación de escritorio multiplataforma |
| **Frontend** | [React 18](https://react.dev/) | UI con componentes funcionales y hooks |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) | Renderer tipado (el main process usa JavaScript) |
| **Editor** | [CodeMirror 6](https://codemirror.net/) | Editor de código/markdown avanzado |
| **Markdown Render** | [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/) | Renderizado HTML y syntax highlighting |
| **Dibujo** | [perfect-freehand](https://github.com/steveruizok/perfect-freehand) | Trazos naturales en el canvas de dibujo |
| **Animaciones** | [Framer Motion](https://www.framer.com/motion/) | Transiciones y animaciones fluidas |
| **Routing** | [React Router DOM 7](https://reactrouter.com/) | Navegación entre vistas (Dashboard / NoteWindow) |
| **Estilos** | CSS vanilla + CSS Variables | Tema oscuro personalizado |
| **Tipografía** | [Atkinson Hyperlegible](https://brailleinstitute.org/freefont) | Fuente diseñada para máxima legibilidad |
| **Bundler** | [esbuild](https://esbuild.github.io/) | Compilación ultrarrápida de TSX/CSS |
| **Almacenamiento** | JSON + sistema de archivos (Split JSON) | Sin base de datos — archivos en `AppData` |
| **Empaquetado** | [electron-builder](https://www.electron.build/) | Genera instaladores NSIS (Win) y AppImage (Linux) |
| **Actualizaciones** | [electron-updater](https://www.electron.build/auto-update) | Auto-update via GitHub Releases |
| **ZIP** | [archiver](https://github.com/archiverjs/node-archiver) + [adm-zip](https://github.com/cthackers/adm-zip) | Export/Import de ZIPs con assets |
| **Testing** | [Playwright](https://playwright.dev/) | Tests end-to-end de la app Electron |
| **CI/CD** | GitHub Actions | Build automatizado en Windows y Linux |

---

## Estructura del Proyecto

```
nts/
├── .github/
│   └── workflows/
│       └── release.yml            # CI/CD: build + release para Windows y Linux
├── scripts/
│   └── build.js                   # Script de build con esbuild (dev + watch)
├── src/
│   ├── main/                      # Proceso principal (Electron - Node.js)
│   │   ├── main.js                # Entry point: inicialización de la app
│   │   ├── preload.js             # Bridge seguro (contextBridge API)
│   │   ├── storage.js             # Sistema de almacenamiento Split JSON
│   │   ├── ipc/                   # Handlers IPC organizados por dominio
│   │   │   ├── index.js           # Registro centralizado de handlers
│   │   │   ├── noteHandlers.js    # CRUD de notas, assets, backlinks
│   │   │   ├── folderHandlers.js  # CRUD de carpetas (con cascada)
│   │   │   ├── exportHandlers.js  # Import/Export JSON, MD, ZIP
│   │   │   ├── updateHandlers.js  # Auto-updater (check, download, install)
│   │   │   └── windowHandlers.js  # Control de ventanas, pop-out de notas
│   │   ├── utils/
│   │   │   └── validation.js      # Validación de datos IPC
│   │   └── windows/
│   │       └── windowManager.js   # Creación y gestión de BrowserWindows
│   │
│   └── renderer/                  # Proceso de renderizado (React + TypeScript)
│       ├── index.html             # HTML base
│       ├── index.tsx              # Entry point React (ReactDOM.createRoot)
│       ├── App.tsx                # Router: Dashboard o NoteWindow
│       ├── styles/
│       │   └── global.css         # Reset, fuentes, tema base
│       ├── assets/
│       │   ├── fonts/             # Atkinson Hyperlegible (woff2)
│       │   └── icons/             # Iconos de la app y de estados
│       ├── types/
│       │   ├── models.ts          # Interfaces: Note, Folder, Tag, Stroke, DrawingData
│       │   ├── api.ts             # Tipado de la API IPC (WindowAPI)
│       │   ├── global.d.ts        # Declaraciones globales
│       │   └── images.d.ts        # Tipos para imports de imágenes
│       ├── pages/
│       │   ├── Dashboard.tsx      # Página principal: sidebar + lista + editor
│       │   ├── Dashboard.css
│       │   ├── NoteWindow.tsx     # Ventana independiente para una nota
│       │   └── NoteWindow.css
│       └── components/
│           ├── Sidebar.tsx / .css           # Panel lateral: navegación, carpetas, tags, estados
│           ├── NotesListPanel.tsx / .css     # Lista de notas filtrada y ordenada
│           ├── EditorPanel.tsx / .css        # Editor principal (texto + dibujo + paneles)
│           ├── FolderTree.tsx / .css         # Árbol de carpetas (recursivo, drag & drop)
│           ├── DrawingCanvas.tsx / .css      # Canvas de dibujo (perfect-freehand)
│           ├── DrawingToolbar.tsx / .css     # Barra de herramientas del canvas
│           ├── MarkdownToolbar.tsx / .css    # Barra de formato Markdown
│           ├── MarkdownPreview.tsx           # Vista previa renderizada del Markdown
│           ├── TableOfContents.tsx / .css    # TOC generado desde encabezados
│           ├── BacklinksPanel.tsx / .css     # Panel de backlinks
│           ├── ForwardLinksPanel.tsx / .css  # Panel de forward links
│           ├── LinkedNotePanel.tsx / .css    # Vista side-by-side de nota enlazada
│           ├── NoteInfoPanel.tsx / .css      # Info de la nota (fechas, carpeta, etc.)
│           ├── TagsEditor.tsx / .css         # Editor de etiquetas
│           ├── StatusDropdown.tsx / .css     # Selector de estado
│           ├── NoteContextMenu.tsx / .css    # Menú contextual (clic derecho)
│           ├── FolderSearchModal.tsx / .css  # Modal de búsqueda de carpetas
│           ├── InputModal.tsx / .css         # Modal genérico de input
│           ├── WindowBar.tsx / .css          # Barra de título personalizada
│           ├── UpdateIndicator.tsx / .css    # Indicador de actualización
│           ├── CheckboxWidget.ts            # Widget de checkboxes para CodeMirror
│           ├── ImagePreviewPlugin.ts        # Plugin de previsualización de imágenes
│           ├── NoteLinkPlugin.ts            # Plugin de wiki-links [[...]]
│           ├── EditorKeymaps.ts             # Atajos de teclado personalizados
│           └── customSetup.ts               # Configuración base de CodeMirror
├── tests/                         # Tests E2E con Playwright
│   ├── notes.spec.ts
│   ├── folders.spec.ts
│   ├── folders_advanced.spec.ts
│   ├── editor_formatting.spec.ts
│   ├── editor_advanced.spec.ts
│   ├── organization.spec.ts
│   ├── organization_advanced.spec.ts
│   └── system.spec.ts
├── package.json
├── tsconfig.json
└── playwright.config.ts
```

---

## Sistema de Almacenamiento (Split JSON)

NTS utiliza un sistema de almacenamiento propio basado en archivos JSON, sin necesidad de base de datos:

```
%APPDATA%/nts-data/          (producción)
%APPDATA%/nts-dev-data/      (desarrollo)
├── metadata.json             # Array de metadatos de todas las notas
├── folders.json              # Array de carpetas (estructura árbol)
├── notes/
│   ├── note-<id>.json        # Contenido de cada nota (content + drawingData)
│   └── ...
└── assets/
    ├── <noteId>/
    │   ├── imagen1.png       # Imágenes asociadas a la nota
    │   └── ...
    └── ...
```

- **`metadata.json`** contiene los metadatos de todas las notas (id, nombre, color, tags, estado, fechas, etc.) para carga rápida
- Cada nota tiene su **archivo individual** `note-<id>.json` con el contenido completo (texto o datos de dibujo)
- Los **assets** (imágenes) se organizan en subcarpetas por `noteId`
- Incluye **migración automática** desde `electron-store` (versiones antiguas)
- **Limpieza automática** de assets no referenciados en el contenido

---

## Requisitos Previos

- **Node.js** ≥ 18 (recomendado: 20 LTS)
- **npm** ≥ 9
- **Git**

### Requisitos adicionales por plataforma

#### Windows
- No se requiere nada adicional

#### Linux
- Paquetes de desarrollo necesarios para compilar módulos nativos:
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
npm install
```

### 3. Compilar el código (renderer)

```bash
npm run build
```

Esto compila el código TypeScript/React del renderer con esbuild y copia los assets a la carpeta `dist/`.

### 4. Iniciar la aplicación

```bash
npm start
```

> **Nota:** Siempre ejecuta `npm run build` antes de `npm start`. El proceso principal (Electron) carga los archivos compilados desde `dist/`.

### Modo desarrollo con watch

Para desarrollo activo, abre dos terminales:

```bash
# Terminal 1: Compilación con watch (recompila al guardar)
npm run dev

# Terminal 2: Iniciar Electron
npm start
```

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compila el renderer (TSX → JS) con esbuild |
| `npm run dev` | Compilación con watch (recompila al guardar cambios) |
| `npm start` | Inicia la aplicación Electron |
| `npm run dist` | Build + genera instalador con electron-builder |
| `npm run typecheck` | Verificación de tipos TypeScript (`tsc --noEmit`) |
| `npm test` | Ejecuta tests E2E con Playwright |
| `npm run clean:test` | Limpia datos de tests |
| `npm run clean:dist` | Limpia carpetas `dist/` y `release/` |

---

## Generar Instalador

### Windows (NSIS Installer)

```bash
npm run dist
```

El instalador `.exe` se genera en la carpeta `release/`.

### Linux (AppImage)

```bash
npm run build
npx electron-builder --linux
```

El archivo `.AppImage` se genera en `release/`.

### CI/CD Automático

Al crear un tag con formato `v*` (ej: `v1.2.2`) y hacer push, GitHub Actions ejecuta automáticamente:

1. Build en **Windows** → genera `.exe`
2. Build en **Linux** → genera `.AppImage`
3. Crea un **GitHub Release** con ambos binarios

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + N` | Crear nueva nota |
| `Ctrl + K` | Búsqueda global de notas |
| `Ctrl + G` | Ir a línea (en el editor) |
| `Ctrl + F` | Buscar en el editor |
| `Ctrl + H` | Buscar y reemplazar |
| `Ctrl + B` | Negrita |
| `Ctrl + I` | Cursiva |
| `Ctrl + E` | Código inline |
| `Ctrl + Shift + K` | Tachado |
| `Ctrl + Shift + .` | Cita (blockquote) |
| `Ctrl + Shift + 7` | Lista ordenada |
| `Ctrl + Shift + 8` | Lista desordenada |
| `Ctrl + Shift + 9` | Checkbox |
| `Ctrl + D` | Duplicar línea |
| `Alt + ↑/↓` | Mover línea arriba/abajo |
| `Tab` | Indentar |
| `Shift + Tab` | Des-indentar |

---

## Testing

El proyecto incluye tests E2E con Playwright que cubren:

- **Notas**: creación, edición, eliminación, papelera
- **Carpetas**: creación, anidamiento, eliminación en cascada
- **Editor**: formato Markdown, atajos de teclado, checkboxes
- **Organización**: etiquetas, estados, pins, filtros
- **Sistema**: almacenamiento, integridad de datos

```bash
# Ejecutar todos los tests
npm test

# Limpiar datos de tests previos
npm run clean:test
```

---

## Arquitectura

```
┌───────────────────────────────────────────────────────────┐
│                    Electron Main Process                  │
│                                                           │
│  main.js ──> windowManager.js ──> BrowserWindow(s)        │
│     │                                                     │
│     ├──> storage.js (Split JSON en AppData)               │
│     │                                                     │
│     └──> ipc/ (Handlers)                                  │
│           ├── noteHandlers.js                             │
│           ├── folderHandlers.js                           │
│           ├── exportHandlers.js                           │
│           ├── updateHandlers.js                           │
│           └── windowHandlers.js                           │
│                                                           │
│  preload.js ──> contextBridge.exposeInMainWorld("api")    │
└───────────────────────┬───────────────────────────────────┘
                        │ IPC (invoke/send)
┌───────────────────────▼────────────────────────────────────┐
│                  Electron Renderer Process                 │
│                                                            │
│  index.tsx ──> App.tsx                                     │
│                 ├── Dashboard.tsx (ventana principal)      │
│                 │     ├── Sidebar (nav + carpetas + tags)  │
│                 │     ├── NotesListPanel                   │
│                 │     ├── EditorPanel                      │
│                 │     │     ├── CodeMirror 6 (texto)       │
│                 │     │     ├── DrawingCanvas (dibujo)     │
│                 │     │     ├── MarkdownPreview            │
│                 │     │     ├── BacklinksPanel             │
│                 │     │     └── TableOfContents            │
│                 │     └── LinkedNotePanel                  │
│                 │                                          │
│                 └── NoteWindow.tsx (ventana pop-out)       │
│                       └── EditorPanel (misma funcional.)   │
└────────────────────────────────────────────────────────────┘
```

**Comunicación:** Todo el IPC entre main y renderer pasa por `preload.js` usando `contextBridge` con `contextIsolation: true` (sin `nodeIntegration`), siguiendo las mejores prácticas de seguridad de Electron.

---

## Contribuir

1. Fork el repositorio
2. Crea tu rama: `git checkout -b feature/mi-nueva-feature`
3. Commit tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push a tu rama: `git push origin feature/mi-nueva-feature`
5. Abre un Pull Request

---

## Licencia

Este proyecto está bajo la licencia **ISC**.

---

<p align="center">
  Hecho por <a href="https://github.com/lyfthora">lyfthora</a>
</p>
