"""
Season points (RN-73): the only place where season score is awarded.

Every gain updates the player's individual season score and, in a running team
season, the roster row of the team the player belongs to at that moment, so
points stay with the team they were earned for (D2). Fragments (credits) are
individual and handled by the callers.
"""

from db.models import PlayerHistoryEntry, PlayerSeasonStats, TeamSeasonMember
from services.season_stats import get_or_create_player_season_stats
from services.teams import ensure_team_season_member, is_team_season
from utils import generate_uuid


def award_points(db, player, season, amount: int, reason: str, detail: str | None = None) -> str | None:
    """
    Add `amount` season points to `player`. Returns the credited team id, or None.
    Increments are done in SQL (score = score + n) so concurrent awards never
    overwrite each other. The caller owns the transaction.
    """
    get_or_create_player_season_stats(db, player.id, season.id)
    db.query(PlayerSeasonStats).filter(
        PlayerSeasonStats.player_id == player.id,
        PlayerSeasonStats.season_id == season.id,
    ).update({PlayerSeasonStats.score: PlayerSeasonStats.score + amount}, synchronize_session="evaluate")

    team_id = None
    if is_team_season(season) and player.team_id and not player.is_bot:
        team_id = player.team_id
        ensure_team_season_member(db, team_id, season.id, player.id)
        db.query(TeamSeasonMember).filter(
            TeamSeasonMember.team_id == team_id,
            TeamSeasonMember.season_id == season.id,
            TeamSeasonMember.player_id == player.id,
        ).update({TeamSeasonMember.score: TeamSeasonMember.score + amount}, synchronize_session="evaluate")

    db.add(PlayerHistoryEntry(
        id=generate_uuid(),
        player_id=player.id,
        type="points",
        amount=amount,
        reason=reason,
        detail=detail,
        team_id=team_id,
    ))
    return team_id
