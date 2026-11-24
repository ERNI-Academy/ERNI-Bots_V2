# Spec — Equipos y temporadas por equipos

| | |
|---|---|
| **Estado** | Aprobada (2026-11-24) |
| **Fecha** | 2026-11-24 |
| **Alcance** | GameBackEnd · AdminPanel · web · AdminPanelWeb |

---

## 1. Contexto

Hoy ERNI Bots es 100 % individual:

- La puntuación vive en `PlayerSeasonStats` (jugador × temporada). Se suma en `GameBackEnd/routes/battles.py` en cuatro sitios: victoria PvP (+5/+3), defensa por turnos agotados (+1), defensa por palabra incorrecta (+1) y victoria contra boss (`reward_score`).
- Los créditos (fragmentos) son globales del jugador (`Player.credits`).
- Solo hay una temporada activa a la vez (`Season.is_active`), con estados `is_frozen` y `finalized`.
- El matchmaking (`GET /players/matchmaking`) empareja por cercanía de puntuación individual.
- La configuración editable desde el admin (`AppConfig`, `admin_config.py`) solo admite booleanos `true`/`false`.

Esta feature añade **equipos persistentes** y un **modo de temporada** (`individual` | `team`).

## 2. Objetivos

1. Un jugador puede crear un equipo o unirse a uno (como máximo uno a la vez), al registrarse o más tarde.
2. El tamaño máximo de equipo se configura desde el admin.
3. Al crear una temporada se elige si es individual o por equipos.
4. En una temporada por equipos se compite por puntuación de equipo, sin fuego amigo.
5. El admin puede crear, editar y disolver equipos, mover jugadores y bloquear la creación, la entrada y la salida de equipos.
6. Los premios pueden asignarse a un jugador o a un equipo.

## 3. Fuera de alcance

- Chat de equipo, notificaciones o mensajería entre miembros.
- Roles dentro del equipo (capitán, oficiales…). Todos los miembros son iguales.
- Solicitudes de entrada con aprobación. Solo se entra con código.
- Créditos o tienda compartidos por el equipo. Los fragmentos siguen siendo individuales.
- Avatares o escudos de equipo.
- Ataques cooperativos (varios miembros en la misma batalla).

## 4. Glosario

| Término | Definición |
|---|---|
| **Equipo** | Grupo persistente de jugadores. Sobrevive entre temporadas hasta que se disuelve. |
| **Código de equipo** | Cadena secreta que permite unirse a un equipo. |
| **Temporada por equipos** | `Season.mode = 'team'`. |
| **Temporada por equipos en curso** | Hay una temporada con `is_active = true` y `mode = 'team'`, congelada o no. Es la condición que bloquea los cambios de equipo. |
| **Participante** | En una temporada por equipos: un jugador con equipo, o un bot. |
| **Equipo disuelto** | Equipo con `dissolved_at` no nulo. No tiene miembros y no admite entradas, pero conserva su histórico. |

## 5. Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| D1 | Persistencia | Equipos persistentes. El admin puede disolverlos, uno a uno o todos a la vez. |
| D2 | Puntuación de equipo | Los puntos se atribuyen **al equipo al que pertenece el jugador en el momento de ganarlos**. Al cambiar de equipo, los puntos ya ganados se quedan en el equipo anterior. |
| D3 | Fuego amigo | No. Los compañeros no aparecen en el matchmaking y no se pueden atacar. |
| D4 | Unirse | Solo mediante código de equipo (o enlace con el código). |
| D5 | Cambios en temporada | Durante una temporada por equipos en curso no se puede salir ni cambiar de equipo. Los jugadores **sin equipo** sí pueden crear uno o unirse a uno con hueco. El admin no tiene esta restricción. |
| D6 | Roles | Ninguno: todos los miembros son iguales y ningún miembro puede expulsar a otro. |
| D7 | Gestión del equipo | Cambiar el nombre o regenerar el código: lo puede hacer **cualquier miembro** o **solo el admin**, según el interruptor `team_self_management_enabled`. |
| D8 | Sin equipo en temporada por equipos | No juega: no puede atacar ni fortalezas ni bosses, y su fortaleza no aparece en el matchmaking. Sí puede configurar su fortaleza, comprar en la tienda y unirse a un equipo. |
| D9 | Bots | Excepción a D8: las fortalezas bot siguen siendo atacables (si `bot_fortresses_enabled`) y vencerlas da puntos al equipo del atacante. |
| D10 | Modo de temporada | Se elige al crearla y solo se puede editar mientras la temporada no se haya activado nunca. |
| D11 | Ranking | En temporadas por equipos: ranking de equipos por defecto y una pestaña con el ranking individual. El matchmaking empareja por puntuación de equipo. |
| D12 | Interruptores del admin | `team_creation_enabled`, `team_joining_enabled`, `team_leaving_enabled`, `team_self_management_enabled` y `team_max_size` (numérico). |
| D13 | Bajar el máximo | Los equipos que ya superan el nuevo máximo se respetan, pero no admiten miembros nuevos. El panel los señala. |
| D14 | Registro | Después de registrarse aparece una pantalla con «Crear equipo», «Unirme con código» y «Ahora no». |
| D15 | Premios | Un premio se asigna a un jugador o a un equipo. |

## 6. Reglas de negocio

### 6.1 Pertenencia

- **RN-01** Un jugador pertenece como mucho a un equipo activo.
- **RN-02** Un equipo activo tiene entre 1 y `team_max_size` miembros. Puede tener más si ya los tenía antes de que se bajara el máximo (D13).
- **RN-03** Si el último miembro sale, el equipo se disuelve automáticamente (`dissolved_at = now`, motivo `empty`).
- **RN-04** Los jugadores bot (`is_bot = true`) no pueden pertenecer a equipos.
- **RN-05** Los jugadores baneados siguen siendo miembros y cuentan para el tamaño. El admin puede sacarlos.

### 6.2 Crear un equipo (jugador)

- **RN-10** Requiere `team_creation_enabled = true` y que el jugador no tenga equipo.
- **RN-11** Se puede crear durante una temporada por equipos en curso, porque el jugador no tenía equipo (D5).
- **RN-12** El creador queda como miembro. No adquiere ningún privilegio (D6).
- **RN-13** Nombre: de 3 a 32 caracteres después de `trim`, con letras (incluidas tildes y ñ), dígitos, espacio, `-` y `_`, y sin espacios dobles. Es único **sin distinguir mayúsculas ni tildes** entre los equipos no disueltos; se guarda una columna normalizada para comprobarlo.
- **RN-14** El código se genera al crear el equipo: 8 caracteres del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin caracteres ambiguos), sin distinguir mayúsculas, y único entre los equipos no disueltos.

### 6.3 Unirse a un equipo (jugador)

- **RN-20** Requiere `team_joining_enabled = true`, que el jugador no tenga equipo, que el código corresponda a un equipo no disuelto y que el equipo tenga `miembros < team_max_size`.
- **RN-21** Está permitido durante una temporada por equipos en curso (D5). Si la temporada está en curso, se crea la fila de roster del jugador para esa temporada (ver §7.5).
- **RN-22** El límite de tamaño se comprueba dentro de la transacción, con la fila del equipo bloqueada (`SELECT … FOR UPDATE` en PostgreSQL; en SQLite las escrituras ya van en serie), para que dos entradas simultáneas no superen el máximo.
- **RN-23** Los intentos con código incorrecto tienen rate limit (10/min por jugador) y la respuesta es genérica: no se distingue entre «no existe» y «disuelto».

### 6.4 Salir del equipo (jugador)

- **RN-30** Requiere `team_leaving_enabled = true` y que **no** haya una temporada por equipos en curso.
- **RN-31** Al salir, los puntos ya ganados se quedan en el equipo (D2). Se aplica RN-03.
- **RN-32** Para cambiar de equipo, el jugador sale y después se une a otro. No hay una operación de «cambiar» para el jugador.

### 6.5 Gestión del equipo (jugador)

- **RN-40** Si `team_self_management_enabled = true`, cualquier miembro puede cambiar el nombre (siguiendo RN-13) y regenerar el código (el anterior deja de valer al momento). Si es `false`, solo lo hace el admin.
- **RN-41** Todos los miembros ven el código del equipo y la lista de miembros.
- **RN-42** Cambiar el nombre y regenerar el código está permitido también durante una temporada por equipos en curso.

### 6.6 Acciones del admin

- **RN-50** El admin no tiene las restricciones de los interruptores ni del bloqueo por temporada: puede crear equipos, cambiar el nombre, regenerar el código, añadir, quitar y mover miembros, y disolver equipos.
- **RN-51** El admin **sí** respeta RN-01, RN-04 y el tamaño máximo al añadir o mover jugadores (D16).
- **RN-52** Al mover un jugador durante una temporada por equipos en curso, los puntos ya ganados se quedan en el equipo anterior, y desde ese momento los nuevos puntos van al equipo nuevo.
- **RN-53** Al disolver un equipo, todos sus miembros quedan sin equipo (motivo `dissolved_by_admin`). El equipo conserva su histórico y su puntuación en las temporadas pasadas y en la temporada en curso; en el ranking aparece como «(disuelto)».
- **RN-54** «Disolver todos los equipos» solo está disponible si **no** hay una temporada por equipos en curso, y pide escribir una confirmación.
- **RN-55** Todas las acciones del admin sobre equipos quedan registradas en `team_membership_log` (§7.3) con `actor = 'admin'`.

### 6.7 Temporadas

- **RN-60** `Season.mode ∈ {'individual', 'team'}`, con valor por defecto `'individual'`. Todas las temporadas existentes se migran a `individual`.
- **RN-61** El modo se puede editar mientras `first_activated_at IS NULL`. Después devuelve 409.
- **RN-62** Al activar una temporada por equipos, en la misma transacción se crea una fila de roster (§7.5) con `score = 0` por cada miembro actual de cada equipo activo.
- **RN-63** Al reactivar una temporada finalizada se aplica RN-62 solo para los pares (equipo, jugador) que todavía no tengan fila.
- **RN-64** Borrar una temporada: además de las comprobaciones actuales, se bloquea si tiene filas de roster con `score > 0`. Las filas con `score = 0` se borran en cascada.
- **RN-65** En una temporada individual los equipos existen y se pueden gestionar según los interruptores, pero no influyen en el juego.

### 6.8 Juego en una temporada por equipos en curso

- **RN-70** **Atacar una fortaleza** (`POST /battles`): devuelve 403 si
  - el atacante no tiene equipo → `team_required`;
  - el dueño de la fortaleza no es bot y no tiene equipo → `target_not_participating`;
  - el dueño de la fortaleza es del mismo equipo → `same_team`.
- **RN-71** **Atacar un boss** (`POST /battles/boss`): devuelve 403 `team_required` si el atacante no tiene equipo.
- **RN-72** **Al reanudar una batalla, enviar un mensaje o adivinar**, se vuelven a comprobar RN-70 y RN-71, porque el admin puede haber movido o sacado a alguien. Si ya no se cumplen, la batalla pasa a `expired` sin puntos para nadie y se devuelve 409 `battle_invalidated`.
- **RN-73** **Atribución de puntos.** Cada vez que un jugador gana puntos de temporada:
  1. se suma a `PlayerSeasonStats.score`, igual que ahora (el ranking individual sigue funcionando);
  2. si la temporada es por equipos y el jugador tiene equipo, se suma la misma cantidad a su fila de roster `(team_id, season_id, player_id)`;
  3. se guarda el `team_id` en `PlayerHistoryEntry`.

  Esto vale para la victoria PvP, las dos defensas y la victoria contra boss. Los puntos de defensa van al equipo del **defensor**. Los bots nunca suman a un equipo.
- **RN-74** Los créditos (fragmentos) no cambian: siguen siendo individuales.
- **RN-75** **Matchmaking:**
  - excluye a los compañeros de equipo;
  - excluye a los dueños no bot sin equipo;
  - incluye bots según `bot_fortresses_enabled`;
  - para candidatos humanos, la cercanía se calcula entre la puntuación de **equipo** del atacante y la del equipo del candidato; para bots, entre la puntuación **individual** del atacante y la del bot;
  - se mantiene el resto de la lógica (fortalezas destruidas, ya vencidas y no reconfiguradas, ampliación del delta).
- **RN-76** Si el atacante no tiene equipo, el matchmaking devuelve `[]` y el front muestra el aviso de unirse a un equipo.

### 6.9 Ranking

- **RN-80** Puntuación de un equipo en una temporada = `SUM(score)` de sus filas de roster en esa temporada.
- **RN-81** Orden del ranking de equipos: `score DESC` y, en caso de empate, `team_name ASC`. Incluye los equipos disueltos que tengan filas en la temporada, marcados como disueltos.
- **RN-82** El ranking individual en una temporada por equipos funciona como ahora y añade el nombre del equipo de cada jugador (su equipo actual).

### 6.10 Premios

- **RN-90** Un premio tiene como mucho un ganador: un jugador (`winner_username`, como ahora) o un equipo (`winner_team_id`). Si llegan los dos, se devuelve 400.
- **RN-91** `/premios` muestra el nombre del equipo y sus miembros. Se muestran los miembros actuales del equipo (D19).

## 7. Modelo de datos

Hay que cambiar **las dos copias** de `models.py` (GameBackEnd y AdminPanel).

### 7.1 `teams` (nueva)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | String PK | uuid |
| `name` | String(32) | Nombre visible |
| `name_normalized` | String(64) | lower + sin tildes + espacios colapsados |
| `join_code` | String(8) | Mayúsculas |
| `created_at` | DateTime | |
| `created_by_player_id` | String FK players, nullable | `null` si lo creó el admin |
| `updated_at` | DateTime | |
| `dissolved_at` | DateTime, nullable | |
| `dissolved_reason` | String(30), nullable | `empty` \| `admin` \| `admin_bulk` |

Índices: unicidad parcial de `name_normalized` y de `join_code` `WHERE dissolved_at IS NULL` (SQLite y PostgreSQL admiten índices parciales; si da problemas, se comprueba en la aplicación dentro de la transacción).

### 7.2 `players.team_id` (columna nueva)

`String FK teams.id, nullable`. Es el equipo actual. Con una columna en el jugador, RN-01 se cumple por construcción. Índice `idx_player_team`.

### 7.3 `team_membership_log` (nueva, auditoría)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | String PK | |
| `team_id` | FK teams | |
| `player_id` | FK players, nullable | `null` en eventos del equipo (cambio de nombre, regenerar código) |
| `event` | String(30) | `created` \| `joined` \| `left` \| `removed` \| `moved_in` \| `moved_out` \| `renamed` \| `code_regenerated` \| `dissolved` |
| `actor` | String(10) | `player` \| `admin` \| `system` |
| `actor_player_id` | FK players, nullable | |
| `detail` | Text, nullable | p. ej. nombre anterior |
| `created_at` | DateTime | |

### 7.4 `seasons` (columnas nuevas)

- `mode` String(10), not null, `server_default 'individual'`.
- `first_activated_at` DateTime, nullable. Se rellena en la primera activación.

### 7.5 `team_season_members` (nueva: roster y puntos por miembro)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | String PK | |
| `team_id` | FK teams | |
| `season_id` | FK seasons | |
| `player_id` | FK players | |
| `score` | Integer, default 0 | Puntos que este jugador aportó a este equipo en esta temporada |
| `joined_at` | DateTime | |

Unicidad en `(team_id, season_id, player_id)`. Índice en `(season_id, team_id)`.

Esta tabla sirve a la vez de roster histórico (quién estuvo en el equipo esa temporada) y de fuente de la puntuación de equipo (RN-80). Un jugador movido por el admin a mitad de temporada tiene dos filas, una por equipo.

### 7.6 Columnas en tablas existentes

- `player_history_entries.team_id`: FK teams, nullable (RN-73).
- `prizes.winner_team_id`: FK teams, nullable (RN-90).

### 7.7 Configuración (`app_config`)

| Clave | Tipo | Valor por defecto | Pública (`GET /config`) |
|---|---|---|---|
| `team_max_size` | int (1–50) | `5` | sí |
| `team_creation_enabled` | bool | `true` | sí |
| `team_joining_enabled` | bool | `true` | sí |
| `team_leaving_enabled` | bool | `true` | sí |
| `team_self_management_enabled` | bool | `true` | sí |

Cambios necesarios en `admin_config.py` y `config.py`:

- Pasar de la lista de claves a un **registro tipado**: `{key: {type: 'bool'|'int', default, min, max, description}}`.
- El valor por defecto deja de ser `"true"` para todas las claves.
- El PATCH valida según el tipo de la clave.

`GET /config` añade además `season_mode` (`individual` | `team` | `null`), plano como `season_status`.

## 8. API del juego (GameBackEnd, `/api/v1`, JWT)

Blueprint nuevo `routes/teams.py`. Errores con el formato `{ "error": "<mensaje legible>", "code": "<código>" }`.

| Método y ruta | Descripción | Errores |
|---|---|---|
| `GET /teams/me` | Mi equipo: `{id, name, join_code, members:[{username, first_name, last_name, joined_at}], member_count, max_size, can_manage, can_leave}`. Si no tengo equipo, `{team: null, can_create, can_join}`. | — |
| `POST /teams` `{name}` | Crear un equipo (RN-10..14). 201 + equipo. | 403 `team_creation_disabled`, 409 `already_in_team`, 409 `name_taken`, 400 `invalid_name` |
| `GET /teams/preview?code=` | Para el enlace de invitación: `{name, member_count, max_size, is_full}`. Rate limit compartido con RN-23. | 404 `invalid_code` |
| `POST /teams/join` `{code}` | Unirse (RN-20..23). | 403 `team_joining_disabled`, 409 `already_in_team`, 404 `invalid_code`, 409 `team_full` |
| `POST /teams/me/leave` | Salir (RN-30..31). | 403 `team_leaving_disabled`, 409 `season_locked`, 409 `not_in_team` |
| `PATCH /teams/me` `{name}` | Cambiar el nombre (RN-40). | 403 `self_management_disabled`, 409 `name_taken`, 400 `invalid_name` |
| `POST /teams/me/regenerate-code` | Regenerar el código (RN-40). | 403 `self_management_disabled` |

Cambios en endpoints existentes:

| Endpoint | Cambio |
|---|---|
| `GET /players/me` | Añade `team: {id, name} \| null`. |
| `GET /players/matchmaking` | RN-75 y RN-76. |
| `POST /battles`, `POST /battles/boss`, `POST /battles/<id>/message`, `/guess`, `/hint` | RN-70..72. |
| `GET /leaderboard` | Nuevo parámetro `type=players\|teams`. Por defecto vale `teams` si la temporada es por equipos y `players` si no. Respuesta para equipos: `items:[{rank, team_id, name, score, member_count, dissolved}]` con la misma paginación. Para jugadores en temporada por equipos se añade `team_name`. Si se pide `type=teams` en una temporada individual: 400 `not_team_season`. |
| `GET /leaderboard/teams/<team_id>` | Detalle de un equipo en la temporada activa: miembros del roster con su aportación (`score`). |
| `GET /prizes` | Añade `winner_team: {name, members:[username]} \| null`. |
| `GET /config` | §7.7. |

Proxies nuevos en Next.js (`web/app/api/teams/...`) siguiendo el patrón actual: cookie httpOnly → `Authorization: Bearer`.

## 9. API del admin (AdminPanel, `/api/v1/admin`, `X-Admin-Secret`)

Blueprint nuevo `routes/admin_teams.py`.

| Método y ruta | Descripción |
|---|---|
| `GET /teams?status=active\|dissolved\|all&q=` | Lista: `id, name, join_code, member_count, over_max (bool), created_at, dissolved_at, score_active_season`. |
| `POST /teams` `{name, member_ids?: []}` | Crear un equipo, con miembros iniciales opcionales (RN-51). |
| `GET /teams/<id>` | Detalle: miembros, puntos por temporada, log de pertenencia. |
| `PATCH /teams/<id>` `{name}` | Cambiar el nombre. |
| `POST /teams/<id>/regenerate-code` | Regenerar el código. |
| `POST /teams/<id>/members` `{player_id}` | Añadir un jugador sin equipo. 409 si ya tiene equipo (para eso se usa «mover»), si es bot o si el equipo está lleno. |
| `DELETE /teams/<id>/members/<player_id>` | Sacar a un jugador (RN-03 si era el último). |
| `POST /teams/<id>/members/<player_id>/move` `{target_team_id}` | Mover a otro equipo (RN-52). |
| `POST /teams/<id>/dissolve` | Disolver un equipo (RN-53). |
| `POST /teams/dissolve-all` `{confirm: "DISOLVER"}` | Disolver todos los equipos (RN-54). |

Cambios en endpoints existentes:

| Endpoint | Cambio |
|---|---|
| `POST/PUT /seasons` | Campo `mode` (RN-60, RN-61). `_season_to_dict` añade `mode` y `first_activated_at`. |
| `POST /seasons/<id>/activate`, `/reactivate` | Rellenan `first_activated_at` y aplican RN-62 y RN-63. |
| `DELETE /seasons/<id>` | RN-64. |
| `GET/PATCH /config` | Registro tipado (§7.7). |
| `PUT /prizes/<id>` | `winner_team_id` (RN-90). |
| Endpoints de jugadores del admin | Añaden `team: {id, name} \| null`. |

## 10. Interfaz del juego (web)

### 10.1 Después del registro

- `register/page.tsx`: hoy hace `router.push("/dashboard")`. Pasa a llevar a `/team/welcome`.
- `/team/welcome` muestra tres tarjetas: **Crear equipo** (formulario con el nombre), **Unirme con código** (campo con el código y la vista previa del equipo antes de confirmar) y **Ahora no**.
  - Una tarjeta se oculta o desactiva si su interruptor está apagado, con un texto que explica por qué.
  - «Ahora no» no aparece si hay una temporada por equipos en curso.
  - Si los dos interruptores (crear y unirse) están apagados, la pantalla se salta.

### 10.2 `/team` (gestión)

- **Sin equipo:** las mismas opciones que en el registro.
- **Con equipo:** nombre, miembros (n / máx.), código con botones «Copiar código» y «Copiar enlace» (`/team/join/<code>`), y botones de **cambiar nombre** y **regenerar código** (solo si `can_manage`) y de **salir** (solo si `can_leave`; si no, un tooltip con el motivo: temporada en curso o salida desactivada).
- `/team/join/[code]`: vista previa y botón «Unirme». Si el usuario no ha iniciado sesión, va a login o registro y vuelve después a esta página.

### 10.3 Dashboard y batalla

- Temporada por equipos en curso y jugador sin equipo: banner fijo «Esta temporada es por equipos. Únete a un equipo para jugar» con un CTA a `/team`. Los botones de atacar fortalezas y bosses están desactivados.
- La cabecera muestra el nombre del equipo del jugador.
- La pantalla de batalla trata los códigos `team_required`, `same_team`, `target_not_participating` y `battle_invalidated` con mensajes claros.

### 10.4 Scoreboard

- Temporada por equipos: pestañas **Equipos** (por defecto) e **Individual**. Al pulsar un equipo se despliegan los miembros con su aportación. La pestaña individual muestra el equipo de cada jugador.
- Temporada individual: igual que ahora.

### 10.5 Premios

- Si el ganador es un equipo: nombre del equipo y lista de miembros (RN-91).

### 10.6 Navegación

- Nueva entrada «Equipo» en el menú.

## 11. Panel de administración (AdminPanelWeb, Fluent UI v9)

### 11.1 Página nueva «Equipos» (`/teams`)

- Tabla con nombre, miembros (n / máx., con un badge de aviso si `over_max`), código, puntos en la temporada activa, fecha de creación y estado. Filtros por estado y búsqueda.
- Acciones: **Crear equipo** (diálogo con el nombre y un selector de jugadores sin equipo), **Disolver todos** (botón destructivo, desactivado si hay una temporada por equipos en curso, con diálogo que pide escribir `DISOLVER`).
- **Detalle** (`/teams/[id]`): cambiar el nombre, regenerar el código, añadir miembro (buscador de jugadores sin equipo), y para cada miembro, **sacar** y **mover a…** (selector de equipo). También el botón **Disolver** y las pestañas de puntos por temporada y log de pertenencia.
- Si se mueve o se saca a alguien durante una temporada por equipos en curso, el diálogo avisa de que los puntos ya ganados se quedan en el equipo actual.

### 11.2 Temporadas

- El diálogo de crear o editar temporada tiene el selector de **modo** (Individual / Por equipos). Está desactivado, con tooltip, si `first_activated_at` no es nulo.
- La lista muestra un badge con el modo.

### 11.3 Configuración

- Nueva sección «Equipos» con un campo numérico para el **tamaño máximo** (1–50) y los cuatro interruptores. Al guardar un máximo menor que algún equipo actual, se avisa de cuántos equipos lo superan (D13).

### 11.4 Jugadores y premios

- La ficha de un jugador muestra su equipo con un enlace y la acción «Cambiar de equipo».
- En el diálogo de premio, el ganador puede ser un **Jugador** o un **Equipo**, cada uno con su selector.

## 12. Implementación técnica

### 12.1 Atribución de puntos centralizada

Ahora hay cuatro bloques repetidos en `battles.py` que hacen `stats.score += n` y añaden un `PlayerHistoryEntry`. Se sustituyen por un helper:

```python
award_points(db, player, season, amount, reason, detail) -> None
# 1. PlayerSeasonStats += amount
# 2. si season.mode == 'team' y player.team_id y not player.is_bot:
#      get_or_create TeamSeasonMember(team_id, season_id, player_id).score += amount
# 3. PlayerHistoryEntry(type='points', team_id=player.team_id, ...)
```

Los fragmentos siguen con su lógica actual. Los checks de equipo (RN-70..72) van en un helper `check_team_battle_rules(db, season, attacker, fortress_owner|None)` que reutilizan todos los endpoints de batalla y el matchmaking.

### 12.2 Helpers de equipos

`services/teams.py` en GameBackEnd con `is_team_season_running`, `get_team_config`, `normalize_name`, `generate_join_code`, `add_member` (con bloqueo de fila y RN-21) y `remove_member` (con RN-03). AdminPanel necesita la misma lógica. Como ya pasa con `models.py`, se duplica en `AdminPanel/services/teams.py` y se deja anotado en la deuda técnica (D20).

### 12.3 Migración

- `GameBackEnd/scripts/migrate_teams.py`: idempotente, compatible con SQLite y PostgreSQL, siguiendo el patrón de los `migrate_*.py` actuales.
  - Crea `teams`, `team_membership_log` y `team_season_members`.
  - Añade `players.team_id`, `seasons.mode` (`individual`), `seasons.first_activated_at`, `player_history_entries.team_id` y `prizes.winner_team_id`.
  - Rellena `first_activated_at = start_date` en las temporadas que estén activas, finalizadas o con `PlayerSeasonStats`.
  - Crea las claves de `app_config` de §7.7.
- `seed.py` y el script de desarrollo: generan algunos equipos de ejemplo y una temporada por equipos simulada, para poder ver los dashboards en local.
- `openapi.yaml` y el `README` (secciones de API y de flujo) se actualizan.

### 12.4 Feed de actividad

Nuevos tipos en `ActivityLog`: `team_created` y `team_joined`. Las acciones del admin no van al feed público.

## 13. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Dos jugadores entran a la vez en el último hueco | Uno entra y el otro recibe 409 `team_full` (RN-22). |
| El admin baja el máximo de 5 a 3 y un equipo tiene 4 | El equipo sigue con 4, `over_max = true`, y los intentos de entrar dan `team_full`. |
| El único miembro sale fuera de temporada | El equipo se disuelve (`empty`). Su código y su nombre quedan libres. |
| El admin mueve al defensor A al equipo del atacante B a mitad de batalla | En la siguiente acción de B, la batalla pasa a `expired` y se devuelve `battle_invalidated` (RN-72). |
| El admin saca a un jugador con una batalla activa | Igual que el anterior: en su siguiente acción la batalla queda invalidada (`team_required`). |
| Se activa una temporada por equipos con batallas `active` de la temporada anterior | Al reanudarlas se aplica RN-72. |
| Temporada por equipos congelada | Sigue contando como «en curso»: no se puede salir. Las batallas ya están bloqueadas por `is_frozen`. |
| Se finaliza la temporada por equipos | Se levanta el bloqueo y los equipos pueden reorganizarse. El ranking de esa temporada queda fijo. |
| Se disuelve un equipo con puntos en la temporada en curso | Sus puntos se mantienen en el ranking con la marca «(disuelto)». Sus exmiembros pueden unirse a otro equipo y sumar ahí desde ese momento. |
| Un jugador intenta adivinar códigos | Rate limit de 10/min y respuesta genérica (RN-23). |
| Nombre «Los Hackers» frente a «los hackérs» | Conflicto `name_taken` (RN-13). |
| `team_max_size = 1` | Equipos de un solo jugador: funciona como el modo individual, pero con ranking de equipos. |

## 14. Criterios de aceptación

```gherkin
Feature: Equipos

  Background:
    Given team_max_size = 3
    And team_creation_enabled, team_joining_enabled, team_leaving_enabled = true

  Scenario: Crear un equipo tras registrarse
    Given acabo de registrarme
    When elijo "Crear equipo" con el nombre "Red Lancers"
    Then pertenezco al equipo "Red Lancers"
    And el equipo tiene un código de 8 caracteres

  Scenario: Unirse con código hasta llenar el equipo
    Given el equipo "Red Lancers" tiene 2 miembros
    When un jugador sin equipo se une con su código
    Then el equipo tiene 3 miembros
    When otro jugador sin equipo usa el mismo código
    Then recibe el error "team_full"

  Scenario: Creación bloqueada por el admin
    Given team_creation_enabled = false
    When un jugador intenta crear un equipo
    Then recibe 403 "team_creation_disabled"
    But el admin sí puede crear un equipo desde el panel

  Scenario: No se puede salir durante una temporada por equipos
    Given hay una temporada por equipos activa
    And pertenezco a "Red Lancers"
    When intento salir del equipo
    Then recibo 409 "season_locked"

  Scenario: Sin equipo no se juega en una temporada por equipos
    Given hay una temporada por equipos activa
    And no tengo equipo
    When intento atacar una fortaleza o un boss
    Then recibo 403 "team_required"
    And el matchmaking me devuelve una lista vacía

  Scenario: Sin fuego amigo
    Given hay una temporada por equipos activa
    And A y B son de "Red Lancers"
    Then la fortaleza de B no aparece en el matchmaking de A
    And si A ataca la fortaleza de B recibe 403 "same_team"

  Scenario: Los puntos se quedan en el equipo en el que se ganaron
    Given hay una temporada por equipos activa
    And A es de "Red Lancers" y gana 5 puntos
    When el admin mueve a A a "Blue Wardens"
    And A gana 3 puntos más
    Then "Red Lancers" tiene 5 puntos de A
    And "Blue Wardens" tiene 3 puntos de A
    And la puntuación individual de A es 8

  Scenario: Los puntos de defensa van al equipo del defensor
    Given hay una temporada por equipos activa
    When un atacante falla la palabra contra la fortaleza de B
    Then el equipo de B suma 1 punto

  Scenario: Las fortalezas bot siguen siendo atacables
    Given hay una temporada por equipos activa
    And bot_fortresses_enabled = true
    Then las fortalezas bot aparecen en el matchmaking
    And vencerlas suma puntos al equipo del atacante

  Scenario: El modo queda fijo tras la primera activación
    Given una temporada por equipos que ya se activó alguna vez
    When el admin intenta cambiar su modo a individual
    Then recibe 409

  Scenario: Gestión del equipo restringida al admin
    Given team_self_management_enabled = false
    When un miembro intenta cambiar el nombre del equipo
    Then recibe 403 "self_management_disabled"

  Scenario: Disolver un equipo
    When el admin disuelve "Red Lancers"
    Then sus miembros quedan sin equipo
    And el código del equipo deja de funcionar
    And sus puntos en temporadas anteriores siguen en el ranking histórico

  Scenario: Premio para un equipo
    When el admin asigna el premio "Campeones" al equipo "Red Lancers"
    Then /premios muestra "Red Lancers" y sus miembros
```

Además de estos escenarios, se exigen tests unitarios o de integración de `award_points`, `check_team_battle_rules`, la concurrencia de RN-22 y la idempotencia de la migración.

## 15. Decisiones complementarias (confirmadas)

Los supuestos de la revisión quedan confirmados tal cual:

| # | Decisión |
|---|---|
| D16 | El admin **respeta** el tamaño máximo al añadir o mover jugadores (RN-51). |
| D17 | No hay tamaño **mínimo**: un equipo de 1 jugador compite y puntúa. |
| D18 | Valores por defecto: `team_max_size = 5`, nombre de 3 a 32 caracteres, código de 8 caracteres. |
| D19 | `Prize` no tiene `season_id`. Un premio de equipo muestra los **miembros actuales** del equipo (RN-91 sin roster por temporada). |
| D20 | La lógica de equipos se **duplica** en GameBackEnd y AdminPanel, como `models.py`. Se anota como deuda técnica. |
| D21 | Los equipos disueltos **siguen** en el ranking con la marca «(disuelto)» (RN-53, RN-81). |
| D22 | Sin moderación de nombres más allá del formato (RN-13). El admin puede cambiarlos. |
| D23 | Rutas del front en inglés: `/team`, `/team/welcome`, `/team/join/[code]`. |

## 16. Plan de entrega por fases

1. **Modelo y migración:** modelos en las dos copias, `migrate_teams.py`, registro tipado de configuración y seed.
2. **Backend del juego:** `teams.py`, `award_points`, reglas de batalla, matchmaking, leaderboard, `/players/me`, `/config` y `/prizes`. Con tests.
3. **Backend del admin:** `admin_teams.py`, temporadas (modo y activación), configuración y premios. Con tests.
4. **Web:** `/team/welcome`, `/team`, `/team/join/[code]`, banner y bloqueos en dashboard y batalla, scoreboard con pestañas y premios.
5. **AdminPanelWeb:** páginas de equipos, modo en temporadas, sección de configuración, ficha de jugador y premios.
6. **Documentación:** `openapi.yaml`, `README` y la tabla de estado del desarrollo.
