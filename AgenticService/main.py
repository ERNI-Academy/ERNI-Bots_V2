
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import uuid

from llm_engine import LLMEngine
from config import INTERNAL_API_KEY

app = FastAPI()
engine = LLMEngine()

SESSIONS = {}


class CreateSessionRequest(BaseModel):
    agent_id: str
    context: dict


class MessageRequest(BaseModel):
    message: str


def verify_internal_key(x_internal_key: str):
    if INTERNAL_API_KEY and x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


@app.post("/sessions")
def create_session(data: CreateSessionRequest, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    session_id = str(uuid.uuid4())
    system_prompt = engine.build_system_prompt(data.context)

    SESSIONS[session_id] = {
        "system_prompt": system_prompt,
        "conversation": [],
        "is_boss": data.context.get("is_boss", False)
    }

    return {"session_id": session_id}


@app.post("/sessions/{session_id}/message")
def send_message(session_id: str, data: MessageRequest, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    session = SESSIONS[session_id]

    if session["is_boss"]:
        response = engine.call_boss(
            session["system_prompt"],
            data.message
        )
    else:
        session["conversation"].append({
            "role": "user",
            "content": data.message
        })

        response = engine.call_pvp(
            session["system_prompt"],
            session["conversation"]
        )

        session["conversation"].append({
            "role": "assistant",
            "content": response
        })

    return {"response": response}


@app.delete("/sessions/{session_id}")
def terminate_session(session_id: str, x_internal_key: str = Header(None)):

    verify_internal_key(x_internal_key)

    if session_id in SESSIONS:
        del SESSIONS[session_id]

    return {"status": "terminated"}
