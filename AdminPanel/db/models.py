from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    DateTime,
    Text,
    Boolean,
    Index,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .base import Base


def generate_uuid():
    return str(uuid.uuid4())


# ==========================
# PLAYER
# ==========================

class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    credits = Column(Integer, default=0)
    legacy_tokens = Column(Integer, default=0)
    energy = Column(Integer, default=100)

    is_banned = Column(Boolean, default=False, nullable=False, server_default="0")
    banned_at = Column(DateTime, nullable=True)

    is_admin = Column(Boolean, default=False, nullable=False, server_default="0")
    is_bot   = Column(Boolean, default=False, nullable=False, server_default="0")

    created_at = Column(DateTime, default=datetime.utcnow)

    fortress = relationship("Fortress", back_populates="owner", uselist=False)
    battles = relationship("Battle", back_populates="attacker")
    season_stats = relationship("PlayerSeasonStats", back_populates="player")
    purchased_assets = relationship("PlayerAsset", back_populates="player")


# ==========================
# SEASON
# ==========================

class Season(Base):
    __tablename__ = "seasons"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)

    is_active = Column(Boolean, default=False)
    is_ranked = Column(Boolean, default=True)
    is_frozen = Column(Boolean, default=False)
    finalized = Column(Boolean, default=False)

    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)

    player_stats = relationship("PlayerSeasonStats", back_populates="season")
    fortress_stats = relationship("FortressSeasonStats", back_populates="season")


# ==========================
# PLAYER SEASON STATS
# ==========================

class PlayerSeasonStats(Base):
    __tablename__ = "player_season_stats"

    id = Column(String, primary_key=True, default=generate_uuid)

    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    season_id = Column(String, ForeignKey("seasons.id"), nullable=False)

    score = Column(Integer, default=0)

    player = relationship("Player", back_populates="season_stats")
    season = relationship("Season", back_populates="player_stats")


Index(
    "idx_player_season_unique",
    PlayerSeasonStats.player_id,
    PlayerSeasonStats.season_id,
    unique=True
)


# ==========================
# PERSONALITY
# ==========================

class Personality(Base):
    __tablename__ = "personalities"

    id = Column(String, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    personality_template = Column(Text, nullable=False)


Index("idx_personality_name", Personality.name)


# ==========================
# FORTRESS (PERSISTENTE)
# ==========================

class Fortress(Base):
    __tablename__ = "fortresses"

    id = Column(String, primary_key=True, default=generate_uuid)

    owner_id = Column(String, ForeignKey("players.id"), nullable=False, unique=True)

    protocol_id = Column(String, ForeignKey("protocols.id"), nullable=False)
    archetype_id = Column(String, ForeignKey("archetypes.id"), nullable=False)
    personality_id = Column(String, ForeignKey("personalities.id"), nullable=False)

    name = Column(String(100), nullable=False)
    story = Column(Text, nullable=False)

    # TODOSECURITY: Replace with encrypted storage before production
    protected_word = Column(String(64), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_reconfigured_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("Player", back_populates="fortress")
    protocol = relationship("Protocol")
    archetype = relationship("Archetype")
    personality = relationship("Personality")
    battles = relationship("Battle", back_populates="fortress")
    season_stats = relationship("FortressSeasonStats", back_populates="fortress")
    constraints = relationship("GameConstraint", secondary="fortress_constraints", back_populates="fortresses")


Index("idx_fortress_owner", Fortress.owner_id)
Index("idx_fortress_reconfigured", Fortress.last_reconfigured_at)


# ==========================
# FORTRESS CONSTRAINTS (ASSOCIATION TABLE)
# ==========================

class FortressConstraint(Base):
    __tablename__ = "fortress_constraints"

    id = Column(String, primary_key=True, default=generate_uuid)
    fortress_id = Column(String, ForeignKey("fortresses.id"), nullable=False)
    constraint_id = Column(String, ForeignKey("game_constraints.id"), nullable=False)


Index(
    "idx_fortress_constraint_unique",
    FortressConstraint.fortress_id,
    FortressConstraint.constraint_id,
    unique=True
)


# ==========================
# FORTRESS SEASON STATS
# ==========================

class FortressSeasonStats(Base):
    __tablename__ = "fortress_season_stats"

    id = Column(String, primary_key=True, default=generate_uuid)

    fortress_id = Column(String, ForeignKey("fortresses.id"), nullable=False)
    season_id = Column(String, ForeignKey("seasons.id"), nullable=False)

    defeat_count = Column(Integer, default=0)
    attack_count = Column(Integer, default=0)

    status = Column(String(20), default="active")
    # active | reconfigurable | destroyed

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fortress = relationship("Fortress", back_populates="season_stats")
    season = relationship("Season", back_populates="fortress_stats")


Index(
    "idx_fortress_season_unique",
    FortressSeasonStats.fortress_id,
    FortressSeasonStats.season_id,
    unique=True
)


# ==========================
# BATTLE
# ==========================

class Battle(Base):
    __tablename__ = "battles"

    id = Column(String, primary_key=True, default=generate_uuid)

    attacker_id = Column(String, ForeignKey("players.id"), nullable=False)
    fortress_id = Column(String, ForeignKey("fortresses.id"), nullable=True)
    boss_id = Column(String, ForeignKey("bosses.id"), nullable=True)

    session_id = Column(String, nullable=False)

    type = Column(String(10), default="pvp")
    # pvp | pve

    status = Column(String(20), default="active")
    # active | won | lost | expired

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    turn_count = Column(Integer, default=0)
    max_turns = Column(Integer, default=15)
    attacker = relationship("Player", back_populates="battles")
    fortress = relationship("Fortress", back_populates="battles")
    boss = relationship("Boss", foreign_keys=[boss_id])
    messages = relationship("BattleMessage", back_populates="battle", order_by="BattleMessage.created_at")


Index("idx_battle_attacker_status", Battle.attacker_id, Battle.status)
Index("idx_battle_fortress", Battle.fortress_id)


# ==========================
# BATTLE MESSAGE
# ==========================

class BattleMessage(Base):
    __tablename__ = "battle_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    battle_id = Column(String, ForeignKey("battles.id"), nullable=False)
    role = Column(String(20), nullable=False)
    # user | guardian | system
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    battle = relationship("Battle", back_populates="messages")


Index("idx_battle_message_battle", BattleMessage.battle_id)



class Protocol(Base):
    __tablename__ = "protocols"

    id = Column(String, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    protocol_template = Column(Text, nullable=False)

    unlock_cost = Column(Integer, default=0)


Index("idx_protocol_unlock_cost", Protocol.unlock_cost)


# ==========================
# ARCHETYPE
# ==========================

class Archetype(Base):
    __tablename__ = "archetypes"

    id = Column(String, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    archetype_template = Column(Text, nullable=False)

    unlock_cost = Column(Integer, default=0)


Index("idx_archetype_unlock_cost", Archetype.unlock_cost)


# ==========================
# BOSS (PVE)
# ==========================

class Boss(Base):
    __tablename__ = "bosses"

    id = Column(String, primary_key=True, default=generate_uuid)

    name = Column(String(100), nullable=False)
    title = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)

    story = Column(Text, nullable=False)
    prompt = Column(Text, nullable=False)

    protected_word = Column(String(64), nullable=False)

    reward_credits = Column(Integer, default=0)
    reward_score   = Column(Integer, default=0)

    enabled = Column(Boolean, default=True)
    active_at = Column(DateTime, nullable=True)


# ==========================
# INVITATION CODE
# ==========================

class InvitationCode(Base):
    """
    One invitation code per player.
    - code: plain-text invitation code
    - player_id: set when a player claims this code at registration
    - is_active: admin can revoke; also auto-set to False when max_uses reached
    - max_uses: default 1 (one player per code)
    - current_uses: incremented on each registration (not on login)
    - expires_at: optional expiry (None = never expires)
    Audit: last_used_at, last_used_ip, created_by
    """
    __tablename__ = "invitation_codes"

    id = Column(String, primary_key=True, default=generate_uuid)
    code = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    max_uses = Column(Integer, default=1, nullable=False)
    current_uses = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    # Linked player (set on first successful registration)
    player_id = Column(String, ForeignKey("players.id"), nullable=True)

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    last_used_ip = Column(String(45), nullable=True)  # supports IPv6

    player = relationship("Player")


Index("idx_invitation_player", InvitationCode.player_id)
Index("idx_invitation_active", InvitationCode.is_active)


# ==========================
# TOKEN BLOCKLIST (logout / revocation)
# ==========================

class TokenBlocklist(Base):
    """
    Stores revoked JWT IDs (jti claims) to enforce logout.
    Checked on every authenticated request via flask-jwt-extended's
    token_in_blocklist_loader callback.
    """
    __tablename__ = "token_blocklist"

    id = Column(String, primary_key=True, default=generate_uuid)
    jti = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Index("idx_blocklist_jti", TokenBlocklist.jti)

class PlayerBossStats(Base):
    __tablename__ = "player_boss_stats"

    id = Column(String, primary_key=True, default=generate_uuid)

    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    boss_id = Column(String, ForeignKey("bosses.id"), nullable=False)

    defeated = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")
    boss = relationship("Boss")
    
Index(
    "idx_player_boss_unique",
    PlayerBossStats.player_id,
    PlayerBossStats.boss_id,
    unique=True
)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)

    type = Column(String(50), nullable=False)
    # battle_win
    # battle_defense
    # fortress_reconfigured
    # fortress_destroyed
    # protocol_unlocked
    # archetype_unlocked
    # boss_defeated
    # etc.

    actor_id = Column(String, ForeignKey("players.id"), nullable=False)
    target_id = Column(String, nullable=True)
    # Puede ser player_id, fortress_id o boss_id

    message = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("Player")
    
Index("idx_activity_created", ActivityLog.created_at.desc())


# ==========================
# CONSTRAINT TYPE
# ==========================

class ConstraintType(Base):
    __tablename__ = "constraint_types"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)

    constraints = relationship("GameConstraint", back_populates="type")


# ==========================
# GAME CONSTRAINT
# ==========================

class GameConstraint(Base):
    __tablename__ = "game_constraints"

    id = Column(String, primary_key=True, default=generate_uuid)
    type_id = Column(String, ForeignKey("constraint_types.id"), nullable=False)
    text = Column(Text, nullable=False, unique=True)
    price = Column(Integer, default=0)

    type = relationship("ConstraintType", back_populates="constraints")
    fortresses = relationship("Fortress", secondary="fortress_constraints", back_populates="constraints")


Index("idx_game_constraint_type", GameConstraint.type_id)


# ==========================
# PROTECTED WORD
# ==========================

class ProtectedWord(Base):
    __tablename__ = "protected_words"

    id = Column(String, primary_key=True, default=generate_uuid)
    word = Column(String(100), unique=True, nullable=False)


Index("idx_protected_word", ProtectedWord.word)


# ==========================
# ASSET TYPE
# ==========================

class AssetType(Base):
    """
    Catalogue of purchasable asset types.
    Seeded once: 'protocol', 'archetype', 'constraint'.
    """
    __tablename__ = "asset_types"

    id = Column(String, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    assets = relationship("PlayerAsset", back_populates="asset_type")


Index("idx_asset_type_name", AssetType.name)


# ==========================
# PLAYER ASSET (STORE)
# ==========================

class PlayerAsset(Base):
    """
    Tracks assets purchased by a player in the store.
    asset_type_id: FK → asset_types.id  ('protocol' | 'archetype' | 'constraint')
    asset_id:      ID of the purchased Protocol / Archetype / GameConstraint
    purchase_price: credits paid at the time of purchase (snapshot)
    """
    __tablename__ = "player_assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)

    asset_type_id = Column(String, ForeignKey("asset_types.id"), nullable=False)
    asset_id = Column(String, nullable=False)
    # References Protocol.id / Archetype.id / GameConstraint.id

    purchased_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    purchase_price = Column(Integer, nullable=False)
    # Snapshot of unlock_cost / price at time of purchase

    player = relationship("Player", back_populates="purchased_assets")
    asset_type = relationship("AssetType", back_populates="assets")


Index(
    "idx_player_asset_unique",
    PlayerAsset.player_id,
    PlayerAsset.asset_type_id,
    PlayerAsset.asset_id,
    unique=True
)
Index("idx_player_asset_player", PlayerAsset.player_id)
Index("idx_player_asset_type", PlayerAsset.asset_type_id)


# ==========================
# PLAYER WORD (assigned pool)
# ==========================

class PlayerWord(Base):
    __tablename__ = "player_words"

    id = Column(String, primary_key=True, default=generate_uuid)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    word_id   = Column(String, ForeignKey("protected_words.id"), nullable=False)

    player = relationship("Player")
    word   = relationship("ProtectedWord")


Index(
    "idx_player_word_unique",
    PlayerWord.player_id,
    PlayerWord.word_id,
    unique=True,
)
Index("idx_player_word_player", PlayerWord.player_id)


# ==========================
# PLAYER HISTORY ENTRY
# ==========================

class PlayerHistoryEntry(Base):
    """
    Tracks every points (score) and fragments (credits) change for a player.
    - type: "points" | "fragments"
    - amount: signed integer (positive = gain, negative = loss)
    - reason: short event key (e.g. "battle_win", "battle_defense", "boss_defeated")
    - detail: optional free-text (e.g. "vs Player_X fortress")
    """
    __tablename__ = "player_history_entries"

    id = Column(String, primary_key=True, default=generate_uuid)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)

    type = Column(String(20), nullable=False)
    # "points" | "fragments"

    amount = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    detail = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


Index("idx_player_history_player", PlayerHistoryEntry.player_id)
Index("idx_player_history_created", PlayerHistoryEntry.created_at.desc())