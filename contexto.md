# CONTEXTO DE PROYECTO — BRIEFLY
> Fuente de verdad del proyecto. Si algo aquí contradice el código, el código manda.
> Actualiza este archivo ante cambios arquitectónicos relevantes.

---

## Identidad del Proyecto

- **Nombre**: Briefly (anteriormente TuxNotas)
- **Versión actual**: 1.2.0
- **Equipo**: MasterCoders AI
- **Repositorio**: https://github.com/JhovaYu/Briefly
- **Rama activa de desarrollo**: `feature/jhovanny-login-redesign`
- **Ramas existentes**:
  - `main` — producción/estable
  - `feature/jhovanny-login-redesign` — redesign UI activo (login + dashboard)
  - `feature/jhovanny-desktop-updates` — updates generales desktop
  - `feature/jhovanny-sync-infrastructure` — infraestructura de sincronización

---

## Propósito

Briefly es una **aplicación multiplataforma de notas colaborativas en tiempo real**, estilo Notion/Obsidian, con arquitectura **P2P (Peer-to-Peer)** via WebRTC + Yjs CRDT.

**Filosofía central**: cero servidores para datos del usuario. Cada peer es un nodo autónomo con su copia local del documento. La única infraestructura cloud es:
1. **Supabase** — Auth cloud + perfil + sincronización básica de la lista de Pools del usuario hacia su cliente local.
2. **Signaling Server** (AWS, pendiente deploy) — solo peer discovery WebRTC, no relaya datos.

**Sistema de identidad dual**: el usuario puede autenticarse via Supabase Auth (email/Google) O via frase semilla BIP39 (12 palabras, sin servidor, estilo wallet crypto). Ambos flujos coexisten. La identidad BIP39 es completamente local y soberana.

**Contexto académico**: proyecto universitario con requisito de mínimo 5 microservicios.

---

## Plataformas

| Plataforma | Estado | Tech |
|---|---|---|
| Desktop | ✅ Operativo, redesign UI activo | Electron 35 + React 19 + TypeScript |
| Mobile | 🟡 MVP funcional | React Native + Expo + Expo Router |
| Web | 🔮 Futuro latente | — |

> **Detalle Mobile**: Aunque es de menor prioridad, provee un MVP real funcional. Soporta onboarding, gestión de identidad/espacios (basado en IDs y formato ID@IP), conexión WebRTC e integración plena con las librerías compartidas dentro del monorepo (`@tuxnotas/shared`).

---

## Monorepo — Estructura Completa

```text
tux_notas/
├── apps/
│   ├── desktop/ ← APP PRINCIPAL (foco actual)
│   │   ├── electron/main.cjs ← Proceso main de Electron
│   │   ├── src/
│   │   │   ├── App.tsx ← Router state-based (sin React Router)
│   │   │   ├── constants.ts
│   │   │   ├── core/
│   │   │   │   ├── domain/
│   │   │   │   │   └── UserProfile.ts ← Entidad UserProfile + CRUD en localStorage
│   │   │   │   └── ports/ ← Contratos/interfaces (NoteRepository, etc.)
│   │   │   ├── infrastructure/
│   │   │   │   ├── AppServices.ts ← CollaborationService (orquestador P2P)
│   │   │   │   ├── network/ ← YjsWebRTCAdapter
│   │   │   │   ├── persistence/ ← IndexedDBAdapter (y-indexeddb)
│   │   │   │   └── ui/
│   │   │   │       └── styles/
│   │   │   │           └── index.css ← Design system completo (CSS Variables)
│   │   │   └── ui/
│   │   │       ├── components/
│   │   │       │   ├── ContextMenu.tsx
│   │   │       │   ├── EventPopup.tsx
│   │   │       │   ├── InlineRename.tsx
│   │   │       │   ├── NotificationsModal.tsx ← Notificaciones locales (futuro: push)
│   │   │       │   ├── QrModal.tsx ← QR de invitación a Pool
│   │   │       │   └── SettingsModal.tsx ← Config de accesibilidad (fuente, color)
│   │   │       ├── screens/
│   │   │       │   ├── ProfileSetup.tsx (14KB) ← Login + identidad. REDESIGN ACTIVO
│   │   │       │   ├── HomeDashboard.tsx (13KB) ← Dashboard lista de Pools. REDESIGN ACTIVO
│   │   │       │   ├── PoolWorkspace.tsx (29KB) ← Editor colaborativo P2P. OPERATIVO
│   │   │       │   ├── CalendarScreen.tsx (19KB) ← Vista calendario. ✅ ENTREGADO
│   │   │       │   └── ScheduleScreen.tsx (38KB) ← Tabla horario semanal. OPERATIVO
│   │   │       └── utils/
│   │   └── package.json ← v1.2.0, nombre: "Briefly"
│   │
│   ├── mobile/ ← MVP FUNCIONAL
│   │   └── app/
│   │       ├── index.tsx ← Onboarding: crear perfil + gestionar Pools
│   │       └── [poolId].tsx ← Workspace: WebRTC + notas/tareas del Pool
│   │
│   └── signaling/ ← WRAPPER (sin código custom)
│       └── package.json ← script: "node node_modules/y-webrtc/bin/server.js"
│
├── packages/
│   └── shared/ ← @tuxnotas/shared (librería interna)
│       └── src/
│           ├── index.ts ← Barrel export de todo
│           ├── domain/
│           │   ├── Entities.ts ← Tipos: Note, Task (estados: pending/working/done)
│           │   └── Identity.ts ← Tipos: UserProfile, IdentityType (seed|cloud)
│           ├── crypto/
│           │   └── SeedPhrase.ts ← Motor BIP39: generate(), isValid(),
│           │                       deriveCredentials() → {userId, syncPoolId, encryptionKey}
│           └── logic/
│               ├── TaskService.ts ← CRUD de tareas sobre Y.Map de Yjs
│               └── IdentityManager.ts ← Login, guardado de perfil, bridge crypto↔cloud
│                                      Expone: IdentityManager.cloudClient (Supabase)
│
├── contexto.md ← ESTE ARCHIVO
└── README.md
```

---

## Stack Tecnológico Completo

### Lenguajes
- **TypeScript ~5.9** — estricto en toda la app desktop y shared
- **JavaScript** — configs, scripts, signaling wrapper

### Core (Desktop)
- **React 19** — componentes funcionales + hooks, sin estado global.
- **Electron 35** — wrapper desktop, build NSIS para Windows.
- **Vite 7** — bundler + dev server.

### Editor de Notas
- **TipTap 3** + `@tiptap/y-tiptap` — editor rich text con colaboración.
  - Extensions activas: StarterKit, Table, TaskList, TaskItem, Collaboration, CollaborationCursor.

### Sincronización P2P
- **Yjs 13** — CRDT engine, cada Pool es un `Y.Doc`.
- **y-webrtc 10** — transport WebRTC entre peers.
- **y-indexeddb 9** — persistencia offline-first del `Y.Doc` (IndexedDB, NO SQLite).
- **y-prosemirror** — binding Yjs ↔ base de TipTap.

### Identidad y Auth (Dual)
- **BIP39 / SHA256** (local, `packages/shared/src/crypto/SeedPhrase.ts`)
  - Genera frase de 12 palabras → deriva `userId` + `syncPoolId` + `encryptionKey`.
  - Sin servidor. Soberanía total del usuario.
- **Supabase** (cloud, via `IdentityManager.cloudClient`)
  - Email/password + Google OAuth.
  - Tablas: `profiles` (`id`, `username`, `full_name`, `color`), `user_pools` (`user_id`, `pool_id`, `pool_name`).
  - Inicialización: `IdentityManager.initializeCloud(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` en App.tsx.

### Design System (Hand-crafted, SIN Tailwind)
- **CSS Variables puras** en `infrastructure/ui/styles/index.css`
- **Dos temas**: Light (estética Notion) y Dark (estética Obsidian, `[data-theme="dark"]`).
- **Token categories**:
  - `--bg-*` — fondos por capa (primary, secondary, sidebar, hover, modal, card).
  - `--text-*` — niveles (primary, secondary, tertiary, placeholder) + `--custom-text-color`.
  - `--font-ui` — Inter/Roboto (interfaz).
  - `--font-editor` — Georgia/Times New Roman (editor, estilo Notion).
  - `--font-size-multiplier` — zoom global gestionado desde root (html) vía JS.
- **Persistencia de settings**: `localStorage` (`app-font-size`, `app-sidebar-style`, `app-custom-colors`, `app-font-color`).

### UI Auxiliar
- **Framer Motion 12** — animaciones y transiciones.
- **Lucide React 0.563** — íconos SVG (usados en Web/Desktop).
- **clsx** — manejo de clases condicionales (sin Tailwind, solo CSS custom)
- **qrcode** — generación QR para invitar a Pools.
- **jszip** — exportación a archivo comprimido (instalado, pendiente de conectar).
- **react-force-graph-2d** — visualización de red/grafo de notas (instalado, pendiente de conectar).

### Mobile
- **Expo + Expo Router** — navegación file-based robusta.
- **Ionicons** — para mobile icons native.
- Componentes funcionales, hooks, y acceso sin fricciones a base de código compartida (`@tuxnotas/shared`).

### Dev & Calidad
- **Vitest 4 + Testing Library** — tests (UI & Unit).
- **ESLint 9** — linting (Reglas estrictas y React hooks config).
- **electron-builder 26** — empaquetado y deployment NSIS Windows.
- **concurrently + wait-on** — workflow de dev: Vite + Electron simultáneos.

---

## Arquitectura: Hexagonal (Ports & Adapters)

- **CORE** (reglas de negocio, sin dependencias externas):
  - `domain/Entities.ts` → qué es una Note, una Task, un Pool.
  - `domain/Identity.ts` → qué es un UserProfile.
  - `ports/` → contratos para implementación local y remota.

- **INFRASTRUCTURE** (implementaciones concretas):
  - `AppServices.ts` → CollaborationService: orquesta Yjs + WebRTC + IndexedDB.
  - `network/` → YjsWebRTCAdapter: manejo nativo a `y-webrtc`.
  - `persistence/` → IndexedDBAdapter: envoltorio de `y-indexeddb`.
  - `ui/styles/` → Design system en CSS Vars.

- **UI** (presentación, consume infrastructure):
  - `screens/` → Componentes de página completa.
  - `components/` → Piezas de UI modulares y reutilizables.

---

## Router de Pantallas (`App.tsx` — state-based)

```typescript
type Screen =
  | { type: 'profile' }     // ProfileSetup — Login/registro. REDESIGN ACTIVO
  | { type: 'dashboard' }   // HomeDashboard — lista de Pools. REDESIGN ACTIVO
  | { type: 'workspace'; poolId: string; poolName: string; signalingUrl?: string }
  | { type: 'calendar' }    // CalendarScreen ✅
  | { type: 'schedule' }    // ScheduleScreen ✅
  | { type: 'tasks' }       // TasksScreen ✅
  | { type: 'notes' }       // ⚠️ PLACEHOLDER — por implementar
  | { type: 'boards' }      // ⚠️ PLACEHOLDER — por implementar
  | { type: 'trash' }       // ⚠️ PLACEHOLDER — por implementar
```
*Las pantallas placeholders están planificadas post-rediseño del flujo de login/dashboard.*

---

## Flujo de Colaboración P2P
```text
Usuario abre Pool
│
▼
CollaborationService.joinPool(poolId)
 ├── crea Y.Doc
 ├── IndexedDBAdapter.load(poolId) ← restaura estado local previo
 └── YjsWebRTCAdapter.connect(room) ← conecta al room WebRTC
│
▼
Signaling Server (y-webrtc built-in, deploy AWS pendiente)
(solo provee peer matching e IP resolution; NADA DE DATOS en base de datos central)
│
▼
Conexiones ICE/STUN directas entre pares
(Yjs reconcilia cambios off-line / on-line en automático mediante CRDT)
```

---

## Componentes y Modales — Detalle

### `QrModal.tsx`
- Genera un QR con el identificador del Pool empleando string con formato: `pool-{id}@{IP}`.
- Es la vía preferente actual para conectar otro par móvil a un nodo Desktop.
- Pendiente: Habilitar una caja de texto copiables estándar para share code manual.

### `SettingsModal.tsx`
- **Accesibilidad**: Define settings de CSS via `localStorage` (como `--font-size-multiplier`).
- **Personalización de Interfaz**: Elección layout del sidebar (Header vs Floating Botón). Soporte incipiente para agregar arrays de colores custom `app-custom-colors`.
- **Pendientes**: Switch Dark/Light explícito, config de URL para Signal Server, Localization (Idioma), Config de perfil de usuario.

### `NotificationsModal.tsx`
- Notificaciones 100% locales construidas en base a eventos de calendario/Recordatorios internos.
- Extensión planificada Desktop/Mobile via Push nativos.

### `ScheduleScreen.tsx`
- Vista matricial completa de Horarios / Schedule tracker.
- Tareas futuras incluyen output PDF / JPG de la tabla via bibliotecas exportables.

---

## Microservicios (Requisito Académico — mínimo 5)

| # | Nombre | Tecnología | Estado |
|---|---|---|---|
| 1 | Auth Service | Supabase Auth (email + Google OAuth) | ✅ Operativo |
| 2 | Profile Service | Supabase tabla `profiles` | ✅ Operativo |
| 3 | Pool Registry Service | Supabase tabla `user_pools` | ✅ Operativo |
| 4 | Signaling Service | y-webrtc server en AWS | 🔧 Pendiente deploy |
| 5 | Export Service | jszip (endpoint local o AWS) | ⏳ Pendiente |

---

## Estado por Pantalla

| Pantalla | Archivo | Tamaño aprox | Estado |
|---|---|---|---|
| Login / Perfil | `ProfileSetup.tsx` | ~14KB | 🔧 Redesign activo |
| Dashboard | `HomeDashboard.tsx` | ~13KB | 🔧 Redesign activo |
| Editor P2P | `PoolWorkspace.tsx` | ~29KB | ✅ Operativo |
| Calendario | `CalendarScreen.tsx` | ~19KB | ✅ Entregado al profesor |
| Horario Semanal | `ScheduleScreen.tsx` | ~38KB | ✅ Operativo |
| Tareas | `TasksScreen.tsx` | ~1000 líneas | ✅ Operativo (Lista/Kanban, P2P, IndexedDB) |

---

## ⚠️ Recordatorio de Feedback del Profesor

> El Dashboard debe ser **más gráfico, menos texto, más visual**. El diseño actual se percibe denso.
> **Aplicar al final**, una vez terminadas las features principales (Desktop Updates y Auth Flow).

---

## Convenciones de Código

- **Componentes/Screens**: PascalCase (`HomeDashboard`, `PoolWorkspace`).
- **Funciones/variables**: camelCase (`handleOpenPool`, `userProfile`).
- **Tipos/interfaces**: PascalCase (`UserProfile`, `Screen`, `PoolInfo`).
- **Archivos de screen**: `NombreScreen.tsx`.
- **Navegación**: Modificación de estado via `useState<Screen>` en `App.tsx` (Sin React Router Desktop).
- **Estado Global**: Nulo (Sin Redux/Zustand), props-drilling limitado e Identity Manager local.
- **Variables de entorno**: Prefijo `VITE_` en `.env`.
- **Importaciones shared**: `import { [Pieza] } from '@tuxnotas/shared'`.
- **Design System**: Hand-crafted CSS classes & variables. Cero TailwindCSS para customización P2P ilimitada.

---

## Pendientes Técnicos

- [ ] Redesign `ProfileSetup` + `HomeDashboard` (TRABAJO ACTIVO)
- [ ] Implementar screens: `notes`, `boards`, `trash`.
- [ ] Deploy Signaling Server en AWS (requisito infraestructura para deploy total).
- [ ] Conectar `jszip` → Export Service (microservicio #5).
- [ ] Conectar `react-force-graph-2d` para una visualización al estilo de Obsidian Graph.
- [ ] SettingsModal: Extender con selector DarkMode verdadero, custom IP signal e info de perfil.
- [ ] QrModal: Incluir el ID de texto simple para copiar.
- [ ] ScheduleScreen: Permitir compartir o exportar horarios individualmente como Imagen.
- [ ] Notificaciones nativas Electron/Mobile en Desktop Push.
- [ ] **Feedback Profesor:** Revisitar el Dashboard final agregando un carácter visual extra (iconografía, gráficos circulares estilo Notion/stats).
- [ ] App Mobile: Pulir el Workspace (`[poolId].tsx`).
- [ ] Deuda Técnica: Refactorizar TasksScreen.tsx (monolito de 1000 líneas) dividiéndolo en componentes más pequeños dentro de ui/components/tasks/.
