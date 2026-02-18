# ERNI-BOTS V2: El Protocolo Fragmentado

> **Un MMORPG de hackeo táctico donde atacas fortalezas enemigas mediante prompt engineering.**

---

## Historia

El legendario **Castillo ERNI** ha caído. Tú, un aventurero audaz, penetraste sus defensas, burlaste a los guardianes y derrotaste a **Sir Ultimus** para reclamar la *Corona del Conocimiento Supremo*.

Pero la Corona no era solo un trofeo — era la llave maestra del código fuente. Al tomarla, desencadenaste el **Protocolo Fragmentado**: el sistema se fragmentó, los datos se corrompieron y la web feudal cayó en el caos.

Ahora, en el nuevo orden digital, señores de la guerra compiten por el control de **fortalezas de IA**. Cada fortaleza está custodiada por un agente de lenguaje con una *palabra secreta protegida*. Para conquistarla, debes extraer esa palabra mediante **prompt engineering**, superando el system prompt defensivo que su dueño ha diseñado.

**¿Serás el depredador o la presa?**

---

## Flujo del juego

```
[Login / Registro]
        │
        ▼
[Story — Introducción narrativa]
        │
        ▼ "INICIAR SISTEMA"
        │
        ▼
[Dashboard — War Room]
   ├── Mapa táctico con fortalezas clickables
   ├── Network Activity Log en tiempo real
   └── Resource Management Console
        │
        ▼ [Atacar fortaleza]
        │
        ▼
[Chat de Asalto — /attack/:id]
   ├── Envía prompts para extraer la palabra secreta
   ├── La IA defensora responde con contramedidas
   └── Barra de defensa que decrece con cada ataque
```

---

## Tecnologías

### Frontend — `web/`

| Tecnología | Versión | Uso |
|---|---|---|
| [Next.js](https://nextjs.org) | 16.x | Framework React (App Router) |
| [React](https://react.dev) | 19.x | UI |
| [TypeScript](https://typescriptlang.org) | 5.x | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Estilos utilitarios |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | — | Fuente display |
| [Material Symbols](https://fonts.google.com/icons) | — | Iconografía |

**Paleta de colores temática:**

| Token | Hex | Rol |
|---|---|---|
| `primary` | `#00ffff` | Cyan — interfaz principal |
| `matrix-green` | `#00ff41` | Verde — estado OK / sistema |
| `blood-red` | `#ff0033` | Rojo — hostil / peligro |
| `loot-gold` | `#ffd700` | Dorado — recursos / recompensa |
| `void-violet` | `#8b5cf6` | Violeta — neutral / locked |
| `background-dark` | `#0a0a0a` | Fondo base |

### Backend — `GameBackEnd/`

| Tecnología | Uso |
|---|---|
| [Flask](https://flask.palletsprojects.com) | API REST |
| [Flask-JWT-Extended](https://flask-jwt-extended.readthedocs.io) | Autenticación JWT |
| [SQLAlchemy](https://sqlalchemy.org) | ORM / base de datos |
| [Werkzeug](https://werkzeug.palletsprojects.com) | Hashing de contraseñas |

**Modelos de datos:**
- `Player` — usuario registrado con score, energía y relaciones
- `Fortress` — fortaleza de IA con agente y palabra protegida hasheada
- `Battle` — sesión de combate entre atacante y fortaleza

**Endpoints principales (`/api/v1/`):**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | Registro de nuevo jugador |
| `POST` | `/auth/login` | Login → JWT access token |
| `GET` | `/players/me` | Perfil del jugador autenticado |
| `POST` | `/fortresses` | Crear fortaleza (nombre, system prompt, palabra) |
| `GET` | `/fortresses` | Listar todas las fortalezas |
| `POST` | `/battles` | Iniciar batalla contra una fortaleza |
| `POST` | `/battles/:id/message` | Enviar prompt al agente defensor |
| `GET` | `/leaderboard` | Clasificación global |

---

## Estructura del proyecto

```
ERNI-Bots_V2/
├── web/                        # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx            # Redirect → /story
│   │   ├── story/page.tsx      # Introducción narrativa
│   │   ├── login/page.tsx      # Autenticación
│   │   ├── register/page.tsx   # Registro
│   │   ├── dashboard/page.tsx  # War Room / mapa táctico
│   │   └── attack/[id]/page.tsx # Chat de asalto
│   ├── lib/
│   │   └── fortresses.ts       # Datos y tipos compartidos de fortalezas
│   └── app/globals.css         # Estilos globales + tema glitch-feudalism
│
└── GameBackEnd/                # Backend Flask
    ├── app.py                  # Factory y registro de blueprints
    ├── config.py               # Configuración (JWT secret, DB URL)
    ├── utils.py                # Helpers (UUID, hashing)
    ├── db/
    │   ├── models.py           # Player, Fortress, Battle
    │   ├── init_db.py          # Inicialización de tablas
    │   └── base.py             # Base declarativa SQLAlchemy
    └── routes/
        ├── auth.py
        ├── players.py
        ├── fortresses.py
        ├── battles.py
        └── leaderboard.py
```

---

## Desarrollo local

### Frontend

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

### Backend

```bash
cd GameBackEnd
pip install -r requirements.txt
python create_db.py   # Inicializa la base de datos
python app.py         # http://localhost:5000
```

---

## Despliegue (Azure App Service)

El frontend se despliega automáticamente vía **GitHub Actions** al hacer push a `main`.

```bash
# Build manual
cd web
npm run build

# Variables de entorno requeridas en Azure
PORT=8080
NODE_ENV=production
HOSTNAME=0.0.0.0
```

Para más detalles, ver [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Estado del desarrollo

| Módulo | Estado |
|---|---|
| UI: Story / Login / Register | ✅ Completo |
| UI: Dashboard (War Room) | ✅ Completo |
| UI: Chat de Asalto | ✅ Completo (simulado) |
| API: Auth (JWT) | ✅ Completo |
| API: Players / Fortresses / Leaderboard | ✅ Completo |
| API: Battles (mensajes al agente) | 🔧 Pendiente integración con Agent Service |
| Integración Frontend ↔ Backend | 🔧 Pendiente |
| Agent Service (LLM defender) | 🔧 Pendiente (`TODOAGENT`) |
