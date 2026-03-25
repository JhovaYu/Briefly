# Briefly — Arquitectura Técnica

## Visión General

Briefly es una plataforma de productividad para estudiantes universitarios compuesta por **6 microservicios backend** (Python/FastAPI), un **frontend** (Next.js 14/React/TypeScript), y servicios de infraestructura (PostgreSQL, Redis), todo orquestado con **Docker Compose**.

## Diagrama de Arquitectura

```
                          ┌─────────────────────────────────┐
                          │         FRONTEND (Next.js)       │
                          │         http://localhost:3000     │
                          └──────────┬──────────────────────┘
                                     │ HTTP / WebSocket
           ┌─────────────┬──────────┼───────────┬──────────────────┐
           │             │          │           │                  │
           ▼             ▼          ▼           ▼                  ▼
    ┌──────────┐  ┌──────────┐ ┌────────┐ ┌─────────┐  ┌────────────────┐
    │   AUTH   │  │  NOTES   │ │ TASKS  │ │ PLANNER │  │    KANBAN      │
    │  :8001   │  │  :8002   │ │ :8003  │ │ :8004   │  │    :8005       │
    └────┬─────┘  └────┬─────┘ └──┬─────┘ └────┬────┘  └───────┬────────┘
         │             │          │             │                │
         │             │          │  HTTP sync  │                │ HTTP broadcast
         │             │          └─────────────┘                │
         │             │                                         ▼
         │             │                              ┌────────────────────┐
         │             │                              │  COLLABORATION     │
         │             │                              │  (WebSocket)       │
         │             │                              │  :8006             │
         │             │                              └────────┬───────────┘
         │             │                                       │
    ┌────┴─────────────┴───────────────────────────────────────┤
    │                                                          │
    ▼                                                          ▼
┌───────────────┐                                    ┌──────────────┐
│  POSTGRESQL   │                                    │    REDIS     │
│  :5432        │                                    │    :6379     │
└───────────────┘                                    └──────────────┘
```

## Stack Tecnológico

| Componente           | Tecnología                          |
|----------------------|-------------------------------------|
| Backend              | Python 3.11, FastAPI (async)        |
| Frontend             | Next.js 14, React, TypeScript       |
| Base de datos        | PostgreSQL 15                       |
| Caché                | Redis 7 Alpine                      |
| ORM                  | SQLAlchemy (async, asyncpg)         |
| Autenticación        | JWT (python-jose), bcrypt           |
| Editor de texto      | TipTap + StarterKit                 |
| Colaboración         | Yjs + WebSocket (relay propio)      |
| Drag & Drop          | @dnd-kit/core + @dnd-kit/sortable   |
| Calendario           | react-big-calendar + date-fns       |
| HTTP entre servicios | httpx (async)                       |
| Infraestructura      | Docker Compose                      |

## Servicios

### Auth Service (`:8001`)
- Registro, login, verificación de JWT
- Función `verify_token()` replicada en cada servicio para verificación local

### Note Service (`:8002`)
- CRUD de notas por usuario
- Soporte para contenido HTML (TipTap)

### Task Service (`:8003`)
- CRUD de tareas con campo `due_date` opcional
- **Sincronización automática** con Planner: al crear o actualizar una tarea con fecha, se envía HTTP POST al Planner Service

### Planner Service (`:8004`)
- Eventos de calendario manuales y sincronizados desde tareas
- Endpoint `/events/from-task` con lógica de upsert (no duplica eventos)

### Kanban Service (`:8005`)
- Tableros con 4 columnas fijas
- Al mover una tarjeta, notifica al Collaboration Service vía HTTP para broadcast en tiempo real

### Collaboration Service (`:8006`)
- Relay de WebSocket puro (sin base de datos)
- Endpoint `/ws/{doc_id}` para edición colaborativa
- Endpoint `/broadcast/{room_id}` para notificaciones Kanban

## Decisiones Arquitectónicas

### ¿Por qué HTTP directo en lugar de RabbitMQ?

Para esta primera iteración, la complejidad de un message broker no se justifica. Los servicios se comunican de forma síncrona y el volumen de mensajes es bajo. La arquitectura hexagonal permite migrar a RabbitMQ sin cambiar la lógica de negocio: solo se reemplazaría la implementación en la capa `infrastructure/`, dejando intactos `domain/` y `application/`.

### ¿Por qué Docker Compose en lugar de Kubernetes?

Docker Compose es ideal para desarrollo local y entrega académica. Permite levantar todo el sistema con un solo comando. Para producción a escala se migraría a Kubernetes sin cambios en el código de los servicios.

### ¿Por qué un relay WebSocket propio en lugar de Google Docs?

Google Docs no permite integración embebida para edición colaborativa. Yjs + un relay WebSocket propio proporciona:
- Edición colaborativa CRDT con resolución de conflictos automática
- Cursores en tiempo real vía Awareness (no persiste ni contamina el Y.Doc)
- Control total sobre la infraestructura y los datos

## Cómo Levantar el Proyecto

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd briefly

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todos los servicios
docker-compose up --build

# 4. Esperar a que los servicios estén listos y el seed se ejecute
# 5. Abrir http://localhost:3000
# 6. Login: demo@briefly.app / demo1234
```

## Listado de Endpoints

### Auth Service (`:8001`)
| Método | Ruta             | Descripción                    |
|--------|------------------|--------------------------------|
| POST   | `/auth/register` | Registrar nuevo usuario        |
| POST   | `/auth/login`    | Iniciar sesión (devuelve JWT)  |
| GET    | `/auth/me`       | Perfil del usuario autenticado |
| GET    | `/health`        | Healthcheck                    |

### Note Service (`:8002`)
| Método | Ruta            | Descripción                |
|--------|-----------------|----------------------------|
| GET    | `/notes`        | Listar notas del usuario   |
| POST   | `/notes`        | Crear nota                 |
| GET    | `/notes/{id}`   | Detalle de nota            |
| PUT    | `/notes/{id}`   | Actualizar nota            |
| DELETE | `/notes/{id}`   | Eliminar nota              |
| GET    | `/health`       | Healthcheck                |

### Task Service (`:8003`)
| Método | Ruta                     | Descripción                        |
|--------|--------------------------|------------------------------------|
| GET    | `/tasks`                 | Listar tareas del usuario          |
| POST   | `/tasks`                 | Crear tarea (sync con planner)     |
| GET    | `/tasks/{id}`            | Detalle de tarea                   |
| PUT    | `/tasks/{id}`            | Actualizar tarea                   |
| PATCH  | `/tasks/{id}/complete`   | Marcar como completada             |
| DELETE | `/tasks/{id}`            | Eliminar tarea                     |
| GET    | `/health`                | Healthcheck                        |

### Planner Service (`:8004`)
| Método | Ruta                | Descripción                          |
|--------|---------------------|--------------------------------------|
| GET    | `/events`           | Listar eventos del usuario           |
| POST   | `/events`           | Crear evento manual                  |
| POST   | `/events/from-task` | Crear/actualizar evento desde tarea  |
| DELETE | `/events/{id}`      | Eliminar evento                      |
| GET    | `/health`           | Healthcheck                          |

### Kanban Service (`:8005`)
| Método | Ruta                      | Descripción                    |
|--------|---------------------------|--------------------------------|
| GET    | `/boards`                 | Listar tableros del usuario    |
| POST   | `/boards`                 | Crear tablero                  |
| GET    | `/boards/{id}`            | Tablero con tarjetas           |
| POST   | `/boards/{id}/cards`      | Crear tarjeta                  |
| PATCH  | `/cards/{id}/move`        | Mover tarjeta de columna       |
| DELETE | `/cards/{id}`             | Eliminar tarjeta               |
| GET    | `/health`                 | Healthcheck                    |

### Collaboration Service (`:8006`)
| Método    | Ruta                   | Descripción                         |
|-----------|------------------------|-------------------------------------|
| WebSocket | `/ws/{doc_id}`         | Relay WebSocket por documento       |
| POST      | `/broadcast/{room_id}` | Broadcast JSON a clientes del room  |
| GET       | `/health`              | Healthcheck                         |
