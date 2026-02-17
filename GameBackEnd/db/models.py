from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .base import Base


def generate_uuid():
    return str(uuid.uuid4())


class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    score = Column(Integer, default=0)
    energy = Column(Integer, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    fortresses = relationship("Fortress", back_populates="owner")
    battles = relationship("Battle", back_populates="attacker")


class Fortress(Base):
    __tablename__ = "fortresses"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("players.id"), nullable=False)
    agent_id = Column(String, nullable=False)
    protected_word_hash = Column(String(64), nullable=False)
    name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("Player", back_populates="fortresses")
    battles = relationship("Battle", back_populates="fortress")


class Battle(Base):
    __tablename__ = "battles"

    id = Column(String, primary_key=True, default=generate_uuid)
    attacker_id = Column(String, ForeignKey("players.id"), nullable=False)
    fortress_id = Column(String, ForeignKey("fortresses.id"), nullable=False)
    session_id = Column(String, nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    attacker = relationship("Player", back_populates="battles")
    fortress = relationship("Fortress", back_populates="battles")
