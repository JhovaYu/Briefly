import httpx
import time
import sys


AUTH_URL = "http://auth:8001"
NOTES_URL = "http://notes:8002"
TASKS_URL = "http://tasks:8003"
PLANNER_URL = "http://planner:8004"
KANBAN_URL = "http://kanban:8005"

# Override from env
import os
AUTH_URL = os.getenv("AUTH_URL", AUTH_URL)
NOTES_URL = os.getenv("NOTES_URL", NOTES_URL)
TASKS_URL = os.getenv("TASKS_URL", TASKS_URL)
PLANNER_URL = os.getenv("PLANNER_URL", PLANNER_URL)
KANBAN_URL = os.getenv("KANBAN_URL", KANBAN_URL)


def wait_for_services():
    """Wait until all services are healthy."""
    services = [
        (AUTH_URL, "/health"),
        (NOTES_URL, "/health"),
        (TASKS_URL, "/health"),
        (PLANNER_URL, "/health"),
        (KANBAN_URL, "/health"),
    ]
    for base, path in services:
        for attempt in range(30):
            try:
                r = httpx.get(f"{base}{path}", timeout=3)
                if r.status_code == 200:
                    print(f"  ✓ {base} is ready")
                    break
            except Exception:
                pass
            time.sleep(2)
        else:
            print(f"  ✗ {base} not ready after 60s, continuing anyway...")


def register_user(name, email, password):
    try:
        r = httpx.post(f"{AUTH_URL}/auth/register", json={
            "name": name, "email": email, "password": password
        }, timeout=10)
        if r.status_code == 201:
            print(f"  ✓ Registered {email}")
            return r.json()
        elif r.status_code == 409:
            print(f"  - {email} already exists (skipping)")
            return None
        else:
            print(f"  ✗ Failed to register {email}: {r.status_code} {r.text}")
            return None
    except Exception as e:
        print(f"  ✗ Error registering {email}: {e}")
        return None


def login_user(email, password):
    try:
        r = httpx.post(f"{AUTH_URL}/auth/login", json={
            "email": email, "password": password
        }, timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"  ✓ Logged in as {email}")
            return data["access_token"]
        else:
            print(f"  ✗ Login failed for {email}: {r.status_code}")
            return None
    except Exception as e:
        print(f"  ✗ Error logging in {email}: {e}")
        return None


def create_notes(token):
    headers = {"Authorization": f"Bearer {token}"}
    notes_data = [
        {
            "title": "Apuntes de Cálculo III — Integrales Múltiples",
            "content": "# Integrales Múltiples\n\n## Integral Doble\n\nSe define como el límite de sumas de Riemann sobre una región rectangular.\n\n$$\\iint_R f(x,y) \\, dA$$\n\n### Teorema de Fubini\nSi f es continua en R = [a,b] × [c,d], entonces:\n\n$$\\iint_R f(x,y) \\, dA = \\int_a^b \\int_c^d f(x,y) \\, dy \\, dx$$\n\n### Cambio a coordenadas polares\n- x = r cos(θ)\n- y = r sin(θ)\n- dA = r dr dθ"
        },
        {
            "title": "Resumen — Estructuras de Datos: Árboles",
            "content": "# Árboles Binarios de Búsqueda\n\n## Propiedades\n- Cada nodo tiene máximo 2 hijos\n- Hijo izquierdo < padre < hijo derecho\n- Búsqueda: O(log n) promedio, O(n) peor caso\n\n## Recorridos\n1. **Inorden** (izq → raíz → der): produce secuencia ordenada\n2. **Preorden** (raíz → izq → der): útil para copiar el árbol\n3. **Postorden** (izq → der → raíz): útil para eliminar\n\n## AVL\n- Árbol auto-balanceado\n- Factor de balance: |h(izq) - h(der)| ≤ 1\n- Rotaciones: simple y doble"
        },
        {
            "title": "Notas de Física — Electromagnetismo",
            "content": "# Ley de Gauss\n\n## Flujo eléctrico\nEl flujo a través de una superficie cerrada es proporcional a la carga encerrada.\n\n$$\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\varepsilon_0}$$\n\n## Aplicaciones\n- **Esfera conductora**: E = kQ/r² (exterior), E = 0 (interior)\n- **Plano infinito**: E = σ/(2ε₀)\n- **Cilindro infinito**: E = λ/(2πε₀r)\n\n### Importante para el examen\n- Siempre elegir una superficie gaussiana con simetría adecuada\n- El flujo solo depende de la carga *dentro* de la superficie"
        },
        {
            "title": "Proyecto Final — Ideas y Planificación",
            "content": "# Ideas para Proyecto Final\n\n## Opción 1: App de gestión de tareas\n- **Stack**: FastAPI + Next.js\n- **Pros**: Aplica lo aprendido en clase\n- **Cons**: Muy común, poca diferenciación\n\n## Opción 2: Plataforma de notas colaborativas\n- **Stack**: Python + React + WebSockets\n- **Pros**: Componente técnico interesante (tiempo real)\n- **Cons**: Más complejo de implementar\n\n## Decisión\n→ Ir con la Opción 2 y llamarla **Briefly** ✨\n\n## Próximos pasos\n- [x] Definir stack tecnológico\n- [x] Crear repositorio\n- [ ] Implementar autenticación\n- [ ] Crear editor colaborativo"
        },
        {
            "title": "Vocabulario — Inglés Técnico",
            "content": "# Technical English Vocabulary\n\n| Term | Definition |\n|------|------------|\n| Throughput | Rate of data processed per time unit |\n| Latency | Delay between action and response |\n| Middleware | Software layer between OS and application |\n| Payload | Data transmitted in a request body |\n| Endpoint | URL where API receives requests |\n| Idempotent | Operation that produces same result regardless of repetitions |\n\n## Useful phrases for presentations\n- \"As depicted in the diagram...\"\n- \"This approach mitigates the risk of...\"\n- \"The trade-off between X and Y is...\""
        },
    ]

    # Check if notes already exist
    try:
        r = httpx.get(f"{NOTES_URL}/notes", headers=headers, timeout=10)
        if r.status_code == 200 and len(r.json()) > 0:
            print("  - Notes already exist (skipping)")
            return
    except Exception:
        pass

    for note in notes_data:
        try:
            r = httpx.post(f"{NOTES_URL}/notes", json=note, headers=headers, timeout=10)
            if r.status_code == 201:
                print(f"  ✓ Created note: {note['title'][:40]}...")
            else:
                print(f"  ✗ Failed to create note: {r.status_code}")
        except Exception as e:
            print(f"  ✗ Error creating note: {e}")


def create_tasks(token):
    headers = {"Authorization": f"Bearer {token}"}
    from datetime import datetime, timedelta

    tasks_data = [
        {"title": "Entregar tarea de Cálculo III", "description": "Ejercicios 4.1 a 4.15 del libro de Stewart", "due_date": (datetime.utcnow() + timedelta(days=3)).isoformat()},
        {"title": "Estudiar para examen de Estructuras de Datos", "description": "Repasar árboles AVL, heaps y grafos", "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat()},
        {"title": "Presentación de Física", "description": "Preparar slides sobre electromagnetismo - Ley de Gauss", "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat()},
        {"title": "Reunión con el equipo del proyecto final", "description": "Revisar avances y asignar tareas pendientes", "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat()},
        {"title": "Leer capítulo 7 del libro de redes", "description": "Capa de aplicación - HTTP, FTP, SMTP", "due_date": None},
        {"title": "Practicar ejercicios de SQL", "description": "JOINs, subqueries y funciones de agregación", "due_date": None},
        {"title": "Configurar entorno de Docker", "description": "Instalar Docker Desktop y probar docker-compose", "due_date": None},
        {"title": "Revisar apuntes de clase de ayer", "description": "Completar las notas que faltan del tema de middleware", "due_date": None},
    ]

    # Check if tasks already exist
    try:
        r = httpx.get(f"{TASKS_URL}/tasks", headers=headers, timeout=10)
        if r.status_code == 200 and len(r.json()) > 0:
            print("  - Tasks already exist (skipping)")
            return
    except Exception:
        pass

    for task in tasks_data:
        try:
            r = httpx.post(f"{TASKS_URL}/tasks", json=task, headers=headers, timeout=10)
            if r.status_code == 201:
                print(f"  ✓ Created task: {task['title'][:40]}...")
            else:
                print(f"  ✗ Failed to create task: {r.status_code}")
        except Exception as e:
            print(f"  ✗ Error creating task: {e}")


def create_kanban_boards(token):
    headers = {"Authorization": f"Bearer {token}"}

    # Check if boards already exist
    try:
        r = httpx.get(f"{KANBAN_URL}/boards", headers=headers, timeout=10)
        if r.status_code == 200 and len(r.json()) > 0:
            print("  - Boards already exist (skipping)")
            return
    except Exception:
        pass

    boards_data = [
        {
            "title": "Proyecto Final — Briefly",
            "cards": [
                {"title": "Diseñar esquema de base de datos", "description": "Definir tablas para usuarios, notas, tareas y tableros", "column": "Completado"},
                {"title": "Implementar autenticación JWT", "description": "Register, login y middleware de verificación", "column": "Completado"},
                {"title": "Crear servicio de notas", "description": "CRUD completo con PostgreSQL", "column": "En progreso"},
                {"title": "Integrar editor TipTap", "description": "Configurar extensiones de Markdown y colaboración", "column": "En progreso"},
                {"title": "Crear vista de calendario", "description": "Usar react-big-calendar con sincronización de tareas", "column": "Por hacer"},
                {"title": "Implementar WebSockets", "description": "y-websocket para edición colaborativa en tiempo real", "column": "Por hacer"},
                {"title": "Escribir documentación", "description": "ARQUITECTURA.md con diagramas y guía de despliegue", "column": "Revisión"},
            ]
        },
        {
            "title": "Tareas del Semestre",
            "cards": [
                {"title": "Inscribirme al congreso de tecnología", "description": "Fecha límite: próximo viernes", "column": "Por hacer"},
                {"title": "Solicitar carta de recomendación", "description": "Pedir al profesor de BD", "column": "Por hacer"},
                {"title": "Actualizar CV", "description": "Agregar proyectos recientes y habilidades nuevas", "column": "En progreso"},
                {"title": "Revisar requisitos de servicio social", "description": "Verificar horas requeridas y opciones disponibles", "column": "Revisión"},
                {"title": "Terminar curso de Docker en Udemy", "description": "Secciones 8-12 pendientes", "column": "En progreso"},
                {"title": "Enviar solicitud de beca", "description": "Documentos ya preparados, faltan firmas", "column": "Completado"},
            ]
        },
    ]

    for board_data in boards_data:
        try:
            r = httpx.post(f"{KANBAN_URL}/boards", json={"title": board_data["title"]}, headers=headers, timeout=10)
            if r.status_code == 201:
                board = r.json()
                board_id = board["id"]
                print(f"  ✓ Created board: {board_data['title']}")

                for card in board_data["cards"]:
                    try:
                        rc = httpx.post(
                            f"{KANBAN_URL}/boards/{board_id}/cards",
                            json=card,
                            headers=headers,
                            timeout=10,
                        )
                        if rc.status_code == 201:
                            print(f"    ✓ Created card: {card['title'][:35]}...")
                    except Exception as e:
                        print(f"    ✗ Error creating card: {e}")
            else:
                print(f"  ✗ Failed to create board: {r.status_code}")
        except Exception as e:
            print(f"  ✗ Error creating board: {e}")


def main():
    print("\n" + "="*50)
    print("  BRIEFLY — Seed Script")
    print("="*50)

    print("\n[1/6] Waiting for services...")
    wait_for_services()

    print("\n[2/6] Registering users...")
    register_user("Demo User", "demo@briefly.app", "demo1234")
    register_user("Colaborador", "colaborador@briefly.app", "demo1234")

    print("\n[3/6] Logging in as demo user...")
    token = login_user("demo@briefly.app", "demo1234")
    if not token:
        print("  ✗ Cannot continue without a valid token")
        sys.exit(1)

    print("\n[4/6] Creating notes...")
    create_notes(token)

    print("\n[5/6] Creating tasks (with calendar sync)...")
    create_tasks(token)

    print("\n[6/6] Creating Kanban boards...")
    create_kanban_boards(token)

    print("\n" + "="*50)
    print("  ✅ Seed completado.")
    print("  Usuario demo: demo@briefly.app / demo1234")
    print("  Usuario colaborador: colaborador@briefly.app / demo1234")
    print("="*50 + "\n")


if __name__ == "__main__":
    main()
