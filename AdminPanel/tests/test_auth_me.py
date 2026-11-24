"""/auth/me exposes the flags the admin web needs to authorize admin API calls."""

from flask_jwt_extended import create_access_token

from db.models import Player


def _me(app, client, player):
    with app.app_context():
        token = create_access_token(identity=player.id)
    return client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).get_json()


def test_me_reports_admin_and_banned_flags(client, db):
    admin = Player(username="boss", email="boss@test.local", password_hash="x", is_admin=True)
    banned = Player(username="gone", email="gone@test.local", password_hash="x", is_banned=True)
    db.add_all([admin, banned])
    db.commit()
    app = client.application

    assert (_me(app, client, admin)["is_admin"], _me(app, client, admin)["is_banned"]) == (True, False)
    assert (_me(app, client, banned)["is_admin"], _me(app, client, banned)["is_banned"]) == (False, True)


def test_me_requires_a_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401
