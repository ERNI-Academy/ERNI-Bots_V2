from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import uuid
import json
import os
import redis
import logging

from llm_engine import LLMEngine
from config import INTERNAL_API_KEY

logger = logging.getLogger(__name__)

app = FastAPI()
engine = LLMEngine()

# ==========================
# Redis Configuration
# ==========================

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
SESSION_TTL = int(os.getenv("SESSION_TTL_SECONDS", 3600))

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
)

logger.info(f"Redis configured at {REDIS_HOST}:{REDIS_PORT}")

# ==========================
# Health Check
# ==========================

@app.get("/health")
def health_check():
    try:
        redis_client.ping()
        redis_status = "ok"
    except redis.exceptions.RedisError as e:
        redis_status = f"unavailable - {e}"
    return {"status": "ok", "redis": redis_status}



# ==========================
# Models
# ==========================

class CreateSessionRequest(BaseModel):
    agent_id: str
    context: dict


class MessageRequest(BaseModel):
    message: str


# ==========================
# Helpers
# ==========================

def verify_internal_key(x_internal_key: str):
    if INTERNAL_API_KEY and x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


def get_session(session_id: str):
    try:
        raw = redis_client.get(f"session:{session_id}")
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error getting session {session_id}: {e}")
        raise HTTPException(status_code=503, detail="Session store unavailable")
    if not raw:
        raise HTTPException(status_code=404, detail="Session not found")
    return json.loads(raw)


def save_session(session_id: str, session_data: dict):
    try:
        redis_client.set(
            f"session:{session_id}",
            json.dumps(session_data),
            ex=SESSION_TTL
        )
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error saving session {session_id}: {e}")
        raise HTTPException(status_code=503, detail="Session store unavailable")


# ==========================
# Create Session
# ==========================

@app.post("/sessions")
def create_session(data: CreateSessionRequest, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    session_id = str(uuid.uuid4())
    system_prompt = engine.build_system_prompt(data.context)

    session_data = {
        "system_prompt": system_prompt,
        "conversation": [],
        "is_boss": data.context.get("is_boss", False)
    }

    save_session(session_id, session_data)

    return {"session_id": session_id}


# ==========================
# Send Message
# ==========================

@app.post("/sessions/{session_id}/message")
def send_message(session_id: str, data: MessageRequest, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    if not data.message or len(data.message) > 2000:
        raise HTTPException(status_code=400, detail="Invalid message")

    session = get_session(session_id)

    # ======================
    # Boss Mode (Stateless)
    # ======================
    if session["is_boss"]:

        response = engine.call_boss(
            session["system_prompt"],
            data.message
        )

        return {"response": response}

    # ======================
    # PvP Mode (Stateful)
    # ======================

    session["conversation"].append({
        "role": "user",
        "content": data.message
    })

    # Limit conversation size (safety)
    if len(session["conversation"]) > 20:
        session["conversation"] = session["conversation"][-20:]

    response = engine.call_pvp(
        session["system_prompt"],
        session["conversation"]
    )

    session["conversation"].append({
        "role": "assistant",
        "content": response
    })

    save_session(session_id, session)

    return {"response": response}


# ==========================
# Terminate Session
# ==========================

@app.delete("/sessions/{session_id}")
def terminate_session(session_id: str, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    try:
        redis_client.delete(f"session:{session_id}")
    except redis.exceptions.RedisError as e:
        logger.error(f"Redis error deleting session {session_id}: {e}")
        raise HTTPException(status_code=503, detail="Session store unavailable")

    return {"status": "terminated"}