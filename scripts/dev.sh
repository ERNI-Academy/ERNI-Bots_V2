#!/usr/bin/env bash
# ERNI-Bots V2 local development orchestrator (Windows Git Bash, macOS, Linux; bash 3.2+).
#
#   ./scripts/dev.sh                Start GameBackEnd (flask --debug) + web (next dev) + AdminPanelWeb (next dev)
#   ./scripts/dev.sh --agent=local  Also start Redis (Docker) + AgenticService (uvicorn --reload) and use it as guardian
#   ./scripts/dev.sh --agent=env    Use the agent configured in GameBackEnd/.env instead of the built-in mock
#   ./scripts/dev.sh db             Only prepare .venv, Python dependencies and the database (schema, migrations, seed)
#   ./scripts/dev.sh seed           Run GameBackEnd/scripts/seed.py again (idempotent)
#   ./scripts/dev.sh invite         Create an invitation code to register a player (extra args go to create_invitation.py)
#   ./scripts/dev.sh status         Show the state of every service
#   ./scripts/dev.sh stop           Stop leftover dev servers on the dev ports and the Redis container
#
# Idempotent: reuses .venv, node_modules and the database, and only installs or creates what is missing.
# Ports: DEV_API_PORT (5000), DEV_WEB_PORT (3000), DEV_ADMIN_PORT (3001), DEV_AGENT_PORT (8000). Venv: DEV_VENV (.venv).
# The agent defaults to the mock even if GameBackEnd/.env sets AGENT_MODE=http, so dev never talks to a deployed agent.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/GameBackEnd"
AGENT_DIR="$ROOT/AgenticService"
WEB_DIR="$ROOT/web"
ADMIN_DIR="$ROOT/AdminPanelWeb"
DEV_STATE_DIR="$ROOT/.dev"
VENV_DIR="${DEV_VENV:-$ROOT/.venv}"

API_PORT="${DEV_API_PORT:-5000}"
WEB_PORT="${DEV_WEB_PORT:-3000}"
ADMIN_PORT="${DEV_ADMIN_PORT:-3001}"
AGENT_PORT="${DEV_AGENT_PORT:-8000}"
REDIS_PORT=6379
REDIS_CONTAINER="${DEV_REDIS_CONTAINER:-erni-bots-redis}"
REDIS_IMAGE="redis:7-alpine"

# Flask and uvicorn listen on 127.0.0.1 only; Node may resolve "localhost" to ::1, so the backends are addressed by IP.
API_URL="http://127.0.0.1:$API_PORT"
API_HEALTH_URL="$API_URL/api/v1/config/"
AGENT_URL="http://127.0.0.1:$AGENT_PORT"
WEB_URL="http://localhost:$WEB_PORT"
ADMIN_URL="http://localhost:$ADMIN_PORT"
# GameBackEnd hardcodes its admin secret (GameBackEnd/routes/admin.py, _check_admin); AdminPanelWeb must send the same.
GAME_ADMIN_SECRET="erni-admin-2026"

AGENT_CHOICE="mock"

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) IS_WINDOWS=true ;;
  *) IS_WINDOWS=false ;;
esac

if [ -t 1 ]; then
  C_RESET=$'\033[0m' C_BOLD=$'\033[1m' C_DIM=$'\033[2m' C_RED=$'\033[31m' C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m' C_BLUE=$'\033[34m' C_MAGENTA=$'\033[35m' C_CYAN=$'\033[36m'
else
  C_RESET="" C_BOLD="" C_DIM="" C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_MAGENTA="" C_CYAN=""
fi

step() { printf '%s▸ %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }
ok() { printf '  %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die() {
  printf '%s✗ %s%s\n' "$C_RED" "$*" "$C_RESET" >&2
  exit 1
}

usage() { sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

require_tools() {
  local missing="" tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || missing="$missing $tool"
  done
  [ -z "$missing" ] || die "Missing required tools:$missing."
}

require_node() {
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null | tr -d '\r')"
  [ "${major:-0}" -ge 20 ] || die "Node.js 20+ is required by Next.js 16 (found $(node --version 2>/dev/null || echo none))."
}

random_hex() { od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'; }

# A random value generated once and kept in .dev/ so it survives restarts.
state_secret() {
  local file="$DEV_STATE_DIR/$1"
  mkdir -p "$DEV_STATE_DIR"
  if [ ! -s "$file" ]; then
    (umask 077 && random_hex "$2" >"$file")
  fi
  cat "$file"
}

# Asks a yes/no question on the terminal; answers "no" when there is no terminal (CI, piped input).
confirm() {
  local reply
  [ -t 0 ] || return 1
  read -r -p "  ${C_YELLOW}?${C_RESET} $1 [y/N] " reply || return 1
  case "$reply" in
    [yY] | [yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

# True when VAR is set in the shell or assigned (non-empty) in the given env file.
configured_in() {
  local file="$1" var="$2"
  printenv "$var" >/dev/null 2>&1 && return 0
  [ -f "$file" ] && grep -Eq "^[[:space:]]*(export[[:space:]]+)?$var=[^[:space:]]" "$file"
}

# --- Ports and processes ------------------------------------------------------------------------

# PIDs listening on a TCP port (Windows PIDs on Git Bash).
port_pids() {
  local port="$1"
  if [ "$IS_WINDOWS" = true ]; then
    # The state column is localized ("LISTENING", "ESCUCHANDO"...): listening sockets have a foreign port of 0.
    netstat -ano 2>/dev/null | tr -d '\r' |
      awk -v p=":$port" '$1 == "TCP" && substr($2, length($2) - length(p) + 1) == p && $3 ~ /:0$/ { print $5 }' |
      sort -u
  elif command -v lsof >/dev/null 2>&1; then
    lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u
  else
    ss -Hltnp "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
  fi
}

port_in_use() {
  [ -n "$(port_pids "$1")" ] && return 0
  # lsof/ss only see processes of the current user; a quick connect catches the rest.
  [ "$IS_WINDOWS" = false ] && (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

wait_port_free() {
  local _
  for _ in $(seq 1 20); do
    port_in_use "$1" || return 0
    sleep 0.5
  done
  return 1
}

process_command() {
  if [ "$IS_WINDOWS" = true ]; then
    tasklist //FI "PID eq $1" //FO CSV //NH 2>/dev/null | tr -d '\r' | head -n 1 | cut -d'"' -f2
  else
    ps -o command= -p "$1" 2>/dev/null | cut -c1-110
  fi
}

# Dev servers restart their app when it dies, so the watcher that launched the listener is stopped too.
DEV_PROCESS_PATTERN='python|node|flask|uvicorn|next|npm'
CONTAINER_RUNTIME_PATTERN='com\.docker|vpnkit|docker-proxy|wslrelay|limactl|colima|OrbStack|rancher'

# Listening processes plus, on macOS/Linux, their dev-server ancestors (flask reloader, next dev, npm run dev).
port_owner_pids() {
  local pid parent _
  for pid in $(port_pids "$1"); do
    echo "$pid"
    [ "$IS_WINDOWS" = true ] && continue # taskkill //T already takes the whole tree.
    for _ in 1 2 3 4 5; do
      parent="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
      [ -n "$parent" ] && [ "$parent" -gt 1 ] || break
      process_command "$parent" | grep -Eiq "$DEV_PROCESS_PATTERN" || break
      echo "$parent"
      pid="$parent"
    done
  done | awk '!seen[$0]++'
}

pids_alive() {
  local pid
  for pid in "$@"; do
    kill -0 "$pid" 2>/dev/null && return 0
  done
  return 1
}

kill_pids() {
  local pid signal _
  if [ "$IS_WINDOWS" = true ]; then
    for pid in "$@"; do
      taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
    done
    return 0
  fi
  # Flask's reloader and `next dev` shut down cleanly on SIGINT; escalate if a process ignores it.
  for signal in INT TERM KILL; do
    pids_alive "$@" || return 0
    kill "-$signal" "$@" 2>/dev/null || true
    for _ in $(seq 1 10); do
      pids_alive "$@" || return 0
      sleep 0.5
    done
  done
  ! pids_alive "$@"
}

# Makes sure a port this script needs is free. If it is taken, shows who holds it and offers to stop it.
ensure_port_free() {
  local port="$1" usual_owner="$2" containers pids pid
  port_in_use "$port" || return 0

  containers=""
  if command -v docker >/dev/null 2>&1; then
    containers="$(docker ps --filter "publish=$port" --format '{{.Names}}' 2>/dev/null | tr '\n' ' ' | sed 's/ *$//' || true)"
  fi
  if [ -n "$containers" ]; then
    warn "Port $port is in use by Docker container(s): $containers"
    confirm "Stop them to start ERNI-Bots?" || die "Port $port is already in use ($usual_owner)."
    # shellcheck disable=SC2086 # One argument per container name.
    docker stop $containers >/dev/null
    wait_port_free "$port" || die "Port $port is still in use after stopping $containers."
    ok "Stopped $containers"
    return
  fi

  pids="$(port_owner_pids "$port" | tr '\n' ' ' | sed 's/ *$//')"
  [ -n "$pids" ] || die "Port $port is already in use ($usual_owner) by a process of another user; free it manually."

  warn "Port $port is already in use ($usual_owner):"
  for pid in $pids; do
    printf '      PID %-7s %s\n' "$pid" "$(process_command "$pid")" >&2
  done
  for pid in $pids; do
    [ "$pid" -gt 4 ] || die "Port $port is held by the operating system; choose another port (DEV_*_PORT)."
    if process_command "$pid" | grep -Eq "$CONTAINER_RUNTIME_PATTERN"; then
      die "Port $port is forwarded by the container runtime; stop the container that publishes it instead."
    fi
    if process_command "$pid" | grep -Eq 'ControlCe'; then
      die "Port $port is taken by macOS AirPlay Receiver; disable it in System Settings or use DEV_API_PORT=5050."
    fi
  done
  confirm "Kill it to start ERNI-Bots?" || die "Port $port is already in use ($usual_owner)."

  # shellcheck disable=SC2086 # One argument per PID.
  kill_pids $pids || die "Could not stop PID(s) $pids (owned by another user?)."
  wait_port_free "$port" || die "Port $port is still in use."
  ok "Freed port $port"
}

# --- Python -------------------------------------------------------------------------------------

PY=""

venv_python() {
  if [ -x "$VENV_DIR/Scripts/python.exe" ]; then
    echo "$VENV_DIR/Scripts/python.exe"
  elif [ -x "$VENV_DIR/bin/python" ]; then
    echo "$VENV_DIR/bin/python"
  fi
}

python_ok() { "$@" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; }

# Prints the command of a Python 3.10+ interpreter (3.12 preferred, as in CI).
find_system_python() {
  local candidate
  if command -v py >/dev/null 2>&1; then
    for candidate in 3.12 3; do
      if python_ok py "-$candidate"; then
        echo "py -$candidate"
        return
      fi
    done
  fi
  for candidate in python3.12 python3 python; do
    # On Windows "python" may be the Microsoft Store alias, which fails the version check.
    if command -v "$candidate" >/dev/null 2>&1 && python_ok "$candidate"; then
      echo "$candidate"
      return
    fi
  done
}

ensure_venv() {
  step "Python ($(basename "$VENV_DIR"))"
  PY="$(venv_python)"
  local venv_args=""
  if [ -n "$PY" ] && ! python_ok "$PY"; then
    # A venv only links to its base interpreter; once that Python is uninstalled the venv is unusable.
    warn "$VENV_DIR is broken (its base Python is gone or too old); recreating it."
    PY=""
    venv_args="--clear"
  elif [ -z "$PY" ] && [ -e "$VENV_DIR/pyvenv.cfg" ]; then
    die "$VENV_DIR has no interpreter for this OS (created on another platform?); remove it and run again."
  fi
  if [ -z "$PY" ]; then
    local system_python
    system_python="$(find_system_python)"
    [ -n "$system_python" ] || die "Python 3.10+ not found (3.12 recommended)."
    # shellcheck disable=SC2086 # "py -3.12" is a command plus an argument; venv_args may be empty.
    (cd "$ROOT" && $system_python -m venv $venv_args "$VENV_DIR")
    PY="$(venv_python)"
    [ -n "$PY" ] || die "Could not create the virtual environment in $VENV_DIR."
    rm -f "$DEV_STATE_DIR"/pip-*.stamp
    ok "Created $VENV_DIR"
  fi
  local version
  version="$("$PY" --version 2>&1 | tr -d '\r')"
  ok "$version"
  case "$version" in
    "Python 3.12."*) ;;
    *) warn "CI and Azure use Python 3.12; $version may behave differently." ;;
  esac
}

# Installs a requirements file (path relative to the repo root) when it changed since the last install.
pip_install() {
  local requirements="$1" name stamp sum log
  name="$(dirname "$requirements")"
  stamp="$DEV_STATE_DIR/pip-$name.stamp"
  sum="$(cat "$ROOT/$requirements" | cksum) $PY"
  if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$sum" ]; then
    ok "$name dependencies up to date"
    return
  fi

  mkdir -p "$DEV_STATE_DIR"
  log="$DEV_STATE_DIR/pip.log"
  printf '  %sinstalling %s dependencies…%s\n' "$C_DIM" "$name" "$C_RESET"
  if ! (cd "$ROOT" && "$PY" -m pip install --disable-pip-version-check -r "$requirements") >"$log" 2>&1; then
    tail -n 30 "$log" >&2
    die "pip install -r $requirements failed (full log in .dev/pip.log)."
  fi
  printf '%s' "$sum" >"$stamp"
  ok "$name dependencies installed"
}

# --- GameBackEnd --------------------------------------------------------------------------------

# Environment of GameBackEnd and its scripts. Values in GameBackEnd/.env still apply unless overridden here.
backend_env() {
  export PYTHONUNBUFFERED=1 PYTHONUTF8=1
  if ! configured_in "$BACKEND_DIR/.env" CORS_ORIGINS; then
    export CORS_ORIGINS="$WEB_URL,$ADMIN_URL"
  fi
  case "$AGENT_CHOICE" in
    mock) export AGENT_MODE=mock ;;
    local)
      export AGENT_MODE=http AGENT_BASE_URL="$AGENT_URL"
      AGENT_INTERNAL_KEY="$(state_secret agent-internal-key 24)"
      export AGENT_INTERNAL_KEY
      ;;
    env) ;;
  esac
}

# Runs a GameBackEnd script with GameBackEnd/.env loaded, like app.py does (the scripts do not load it themselves).
backend_script() {
  (
    cd "$BACKEND_DIR" && backend_env &&
      "$PY" -c 'import runpy, sys
from dotenv import load_dotenv
load_dotenv()
sys.argv = sys.argv[1:]
runpy.run_path(sys.argv[0], run_name="__main__")' "$@"
  )
}

backend_eval() {
  (cd "$BACKEND_DIR" && backend_env && "$PY" -c "from dotenv import load_dotenv; load_dotenv(); $1")
}

ensure_database() {
  step "Database (GameBackEnd)"
  local log="$DEV_STATE_DIR/db.log" migration
  mkdir -p "$DEV_STATE_DIR"

  if ! backend_script create_db.py >"$log" 2>&1; then
    cat "$log" >&2
    die "Creating the schema failed."
  fi
  # Every migration listed in the Azure startup script, in its order, including the commented-out ones: Azure
  # already applied those, but a local dev.db can be older. They are idempotent (they check before altering).
  for migration in $(sed -n 's/^#\{0,1\} *python \(scripts\/migrate_[A-Za-z0-9_]*\.py\).*/\1/p' "$BACKEND_DIR/startup.sh"); do
    if ! backend_script "$migration" >>"$log" 2>&1; then
      cat "$log" >&2
      die "Migration $migration failed."
    fi
  done
  ok "Schema and migrations up to date"

  local protocols
  protocols="$(backend_eval 'from db import SessionLocal; from db.models import Protocol; s = SessionLocal(); print(s.query(Protocol).count()); s.close()' 2>/dev/null | tail -n 1 | tr -d '\r')"
  if [ "$protocols" = "0" ]; then
    run_seed
  else
    ok "Seed data present"
  fi
}

run_seed() {
  local log="$DEV_STATE_DIR/seed.log"
  mkdir -p "$DEV_STATE_DIR"
  printf '  %sseeding the database…%s\n' "$C_DIM" "$C_RESET"
  if ! backend_script scripts/seed.py >"$log" 2>&1; then
    tail -n 30 "$log" >&2
    die "Seed failed (full log in .dev/seed.log)."
  fi
  # Plain invitation codes are only printed once; show them and keep them in .dev/seed.log.
  awk '/INVITACI/ { show = 1 } /Seed completado/ { show = 0 } show && NF { print "    " $0 }' "$log"
  ok "Seed loaded (output in .dev/seed.log; './scripts/dev.sh invite' creates a code to register)"
}

# --- AgenticService (optional) ------------------------------------------------------------------

agent_env() {
  export PYTHONUNBUFFERED=1 PYTHONUTF8=1
  INTERNAL_API_KEY="$(state_secret agent-internal-key 24)"
  export INTERNAL_API_KEY
}

ensure_agent() {
  step "AgenticService"
  local missing="" var
  for var in AZURE_OPENAI_ENDPOINT AZURE_OPENAI_KEY DEPLOYMENT_PVP DEPLOYMENT_BOSS; do
    configured_in "$AGENT_DIR/.env" "$var" || missing="$missing $var"
  done
  [ -z "$missing" ] || die "AgenticService needs Azure OpenAI settings in AgenticService/.env:$missing."
  ok "Azure OpenAI configured"
  pip_install AgenticService/requirements.txt

  if configured_in "$AGENT_DIR/.env" REDIS_HOST &&
    ! grep -Eq '^[[:space:]]*REDIS_HOST=(localhost|127\.0\.0\.1)[[:space:]]*$' "$AGENT_DIR/.env" 2>/dev/null &&
    ! printenv REDIS_HOST | grep -Eqx 'localhost|127\.0\.0\.1'; then
    ok "Using the Redis configured in AgenticService/.env"
    return
  fi
  ensure_redis
}

ensure_redis() {
  step "Redis ($REDIS_CONTAINER)"
  local state
  state="$(docker inspect -f '{{.State.Status}}' "$REDIS_CONTAINER" 2>/dev/null || echo missing)"
  case "$state" in
    running) ;;
    missing)
      if port_in_use "$REDIS_PORT"; then
        ok "Using the Redis already listening on localhost:$REDIS_PORT"
        return
      fi
      docker info >/dev/null 2>&1 || die "Docker is not running; start Docker Desktop (needed for Redis)."
      docker run -d --name "$REDIS_CONTAINER" -p "127.0.0.1:$REDIS_PORT:6379" "$REDIS_IMAGE" >/dev/null
      ok "Created container"
      ;;
    *)
      ensure_port_free "$REDIS_PORT" "another Redis?"
      docker start "$REDIS_CONTAINER" >/dev/null
      ok "Started existing container"
      ;;
  esac
  ok "Listening on localhost:$REDIS_PORT"
}

# --- Frontends ----------------------------------------------------------------------------------

ensure_node_app() {
  local dir="$1" name
  name="$(basename "$dir")"
  if [ ! -f "$dir/node_modules/.package-lock.json" ] || [ "$dir/package-lock.json" -nt "$dir/node_modules/.package-lock.json" ]; then
    printf '  %sinstalling %s dependencies (npm ci)…%s\n' "$C_DIM" "$name" "$C_RESET"
    (cd "$dir" && npm ci --ignore-scripts --no-audit --no-fund) || die "npm ci failed in $name."
  fi
  ok "$name dependencies installed"
}

# The shell environment wins over .env.local in Next.js, so the frontends always reach the local backend.
web_env() { export API_URL NEXT_TELEMETRY_DISABLED=1; }

admin_env() {
  export API_URL NEXT_TELEMETRY_DISABLED=1
  if ! configured_in "$ADMIN_DIR/.env.local" ADMIN_SECRET; then
    export ADMIN_SECRET="$GAME_ADMIN_SECRET"
  fi
}

# --- Processes ----------------------------------------------------------------------------------

SERVICE_PIDS=""

prefix() {
  # The log prefixer ignores INT/TERM so it keeps draining output while the service shuts down.
  (
    trap '' INT TERM
    exec awk -v tag="$1" -v color="$2" -v reset="$C_RESET" '{ sub(/\r$/, ""); printf "%s%-5s%s %s\n", color, tag, reset, $0; fflush() }'
  )
}

# start_service TAG COLOR DIR ENV_FUNCTION COMMAND...
start_service() {
  local tag="$1" color="$2" dir="$3" env_function="$4"
  shift 4
  # stdin from /dev/null: background jobs that read the terminal get stopped (SIGTTIN) under job control.
  (cd "$dir" && "$env_function" && "$@" </dev/null 2>&1 | prefix "$tag" "$color") &
  SERVICE_PIDS="$SERVICE_PIDS $!"
}

all_services_alive() {
  local pid
  for pid in $SERVICE_PIDS; do
    kill -0 "$pid" 2>/dev/null || return 1
  done
  return 0
}

any_service_alive() {
  local pid
  for pid in $SERVICE_PIDS; do
    kill -0 "$pid" 2>/dev/null && return 0
  done
  return 1
}

service_ports() {
  echo "$API_PORT $WEB_PORT $ADMIN_PORT"
  [ "$AGENT_CHOICE" != local ] || echo "$AGENT_PORT"
}

# Kills dev servers (python/node) still listening on our ports, e.g. orphans of a killed Windows process tree.
kill_port_leftovers() {
  local port pid
  for port in $(service_ports); do
    for pid in $(port_pids "$port"); do
      if process_command "$pid" | grep -Eiq "$DEV_PROCESS_PATTERN"; then
        kill_pids "$pid" || true
      fi
    done
  done
}

stop_services() {
  trap - INT TERM EXIT
  [ -n "$SERVICE_PIDS" ] || return 0
  printf '\n'
  step "Stopping services"

  local pid winpid signal _
  if [ "$IS_WINDOWS" = true ]; then
    # Native python.exe/node.exe ignore POSIX signals: kill each service's Windows process tree.
    for pid in $SERVICE_PIDS; do
      winpid="$(cat "/proc/$pid/winpid" 2>/dev/null || true)"
      [ -z "$winpid" ] || taskkill //F //T //PID "$winpid" >/dev/null 2>&1 || true
      kill "$pid" 2>/dev/null || true
    done
  else
    # Each service runs in its own process group (set -m): signal the whole group, including python/node children.
    for signal in INT TERM KILL; do
      any_service_alive || break
      for pid in $SERVICE_PIDS; do
        kill "-$signal" -- "-$pid" 2>/dev/null || true
      done
      for _ in $(seq 1 20); do
        any_service_alive || break
        sleep 0.5
      done
    done
  fi
  kill_port_leftovers
  wait 2>/dev/null || true
  if [ "$AGENT_CHOICE" = local ]; then
    ok "Stopped (Redis keeps running; './scripts/dev.sh stop' to stop it)"
  else
    ok "Stopped"
  fi
}

# Any HTTP answer (redirects included) means the server is up; next dev compiles the first page on demand.
http_up() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$1" 2>/dev/null || true)"
  [ -n "$code" ] && [ "$code" != "000" ]
}

wait_for_url() {
  local url="$1" name="$2" _
  for _ in $(seq 1 90); do
    http_up "$url" && return 0
    all_services_alive || return 1
    sleep 2
  done
  warn "$name did not respond at $url after 180s"
  return 1
}

run_services() {
  ensure_port_free "$API_PORT" "is GameBackEnd (or AdminPanel) already running?"
  ensure_port_free "$WEB_PORT" "is web already running?"
  ensure_port_free "$ADMIN_PORT" "is AdminPanelWeb already running?"
  [ "$AGENT_CHOICE" != local ] || ensure_port_free "$AGENT_PORT" "is AgenticService already running?"

  step "Starting services — Ctrl+C to stop"
  [ "$IS_WINDOWS" = true ] || set -m
  trap 'stop_services; exit 130' INT TERM
  trap stop_services EXIT

  if [ "$AGENT_CHOICE" = local ]; then
    start_service agent "$C_CYAN" "$AGENT_DIR" agent_env \
      "$PY" -m uvicorn main:app --reload --host 127.0.0.1 --port "$AGENT_PORT"
  fi
  start_service api "$C_BLUE" "$BACKEND_DIR" backend_env \
    "$PY" -m flask --app app run --debug --port "$API_PORT"
  start_service web "$C_MAGENTA" "$WEB_DIR" web_env npm run dev -- --port "$WEB_PORT"
  start_service admin "$C_YELLOW" "$ADMIN_DIR" admin_env npm run dev -- --port "$ADMIN_PORT"

  local ready=true
  if [ "$AGENT_CHOICE" = local ]; then
    wait_for_url "$AGENT_URL/health" "AgenticService" || ready=false
  fi
  if [ "$ready" = true ] && wait_for_url "$API_HEALTH_URL" "GameBackEnd" &&
    wait_for_url "$WEB_URL/onboarding" "web" && wait_for_url "$ADMIN_URL/" "AdminPanelWeb"; then
    printf '\n%s  ERNI-Bots is up%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '    Game (web)      %s\n' "$WEB_URL"
    printf '    Admin panel     %s\n' "$ADMIN_URL"
    printf '    GameBackEnd     %s/api/v1  (SQLite/DB from GameBackEnd/.env)\n' "$API_URL"
    case "$AGENT_CHOICE" in
      mock) printf '    Agent           mock (--agent=local or --agent=env for a real LLM)\n' ;;
      local) printf '    AgenticService  %s  (Redis localhost:%s)\n' "$AGENT_URL" "$REDIS_PORT" ;;
      env) printf '    Agent           as configured in GameBackEnd/.env\n' ;;
    esac
    printf '    Invitation      ./scripts/dev.sh invite\n\n'
  fi

  while all_services_alive; do
    sleep 1
  done
  warn "A service exited; stopping the others."
  exit 1
}

# --- Commands -----------------------------------------------------------------------------------

print_state() {
  if http_up "$2"; then
    printf '  %-15s %sup%s   %s\n' "$1" "$C_GREEN" "$C_RESET" "$2"
  else
    printf '  %-15s %sdown%s\n' "$1" "$C_DIM" "$C_RESET"
  fi
}

cmd_status() {
  print_state GameBackEnd "$API_HEALTH_URL"
  print_state web "$WEB_URL/onboarding"
  print_state AdminPanelWeb "$ADMIN_URL/"
  print_state AgenticService "$AGENT_URL/health"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    printf '  %-15s %s (%s)\n' Redis "$(docker inspect -f '{{.State.Status}}' "$REDIS_CONTAINER" 2>/dev/null || echo 'not created')" "$REDIS_CONTAINER"
  fi
}

cmd_stop() {
  AGENT_CHOICE=local # Include the AgenticService port.
  kill_port_leftovers
  ok "No dev servers left on ports $(service_ports | tr '\n' ' ')"
  if command -v docker >/dev/null 2>&1 && [ "$(docker inspect -f '{{.State.Status}}' "$REDIS_CONTAINER" 2>/dev/null)" = "running" ]; then
    docker stop "$REDIS_CONTAINER" >/dev/null
    ok "Stopped $REDIS_CONTAINER"
  fi
}

prepare_backend() {
  ensure_venv
  pip_install GameBackEnd/requirements.txt
  ensure_database
}

main() {
  local command="" arg
  local -a extra=()
  while [ $# -gt 0 ]; do
    arg="$1"
    shift
    case "$arg" in
      --agent) AGENT_CHOICE=local ;;
      --agent=*) AGENT_CHOICE="${arg#--agent=}" ;;
      -h | --help | help)
        usage
        exit 0
        ;;
      *)
        if [ -z "$command" ]; then command="$arg"; else extra+=("$arg"); fi
        ;;
    esac
  done
  case "$AGENT_CHOICE" in
    mock | local | env) ;;
    *) die "--agent must be mock, local or env." ;;
  esac

  case "${command:-up}" in
    up)
      require_tools node npm curl
      [ "$AGENT_CHOICE" != local ] || require_tools docker
      require_node
      prepare_backend
      [ "$AGENT_CHOICE" != local ] || ensure_agent
      step "Frontends"
      ensure_node_app "$WEB_DIR"
      ensure_node_app "$ADMIN_DIR"
      run_services
      ;;
    db) prepare_backend ;;
    seed)
      ensure_venv
      pip_install GameBackEnd/requirements.txt
      step "Seed"
      run_seed
      ;;
    invite)
      ensure_venv
      backend_script scripts/create_invitation.py --created-by dev ${extra[@]+"${extra[@]}"}
      ;;
    status) cmd_status ;;
    stop) cmd_stop ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
