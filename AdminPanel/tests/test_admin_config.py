import pytest

from conftest import ADMIN_HEADERS
from db.models import AppConfig
from settings_registry import SETTINGS


def _entries(client):
    response = client.get("/api/v1/admin/config", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    return {entry["key"]: entry for entry in response.get_json()}


def test_requires_admin_secret(client):
    assert client.get("/api/v1/admin/config").status_code == 403
    assert client.patch("/api/v1/admin/config/team_max_size", json={"value": 3}).status_code == 403


def test_lists_every_setting_in_registry_order_with_type_and_defaults(client):
    response = client.get("/api/v1/admin/config", headers=ADMIN_HEADERS)
    body = response.get_json()

    assert [entry["key"] for entry in body] == [s.key for s in SETTINGS]
    entries = {entry["key"]: entry for entry in body}
    assert entries["team_max_size"] | {"description": None} == {
        "key": "team_max_size", "value": "5", "type": "int", "default": "5",
        "min": 1, "max": 50, "description": None, "updated_at": None,
    }
    assert entries["team_creation_enabled"]["type"] == "bool"
    assert entries["team_creation_enabled"]["value"] == "true"
    assert entries["invitations_enabled"]["value"] == "true"


def test_patch_int_setting(client, db):
    response = client.patch("/api/v1/admin/config/team_max_size", json={"value": 3}, headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.get_json()["value"] == "3"
    assert db.get(AppConfig, "team_max_size").value == "3"
    assert _entries(client)["team_max_size"]["value"] == "3"


@pytest.mark.parametrize("value", [0, 51, "abc", True, "2.5"])
def test_patch_int_setting_rejects_invalid_values(client, value):
    response = client.patch("/api/v1/admin/config/team_max_size", json={"value": value}, headers=ADMIN_HEADERS)

    assert response.status_code == 400
    assert _entries(client)["team_max_size"]["value"] == "5"


def test_patch_bool_setting_keeps_legacy_string_contract(client):
    response = client.patch("/api/v1/admin/config/team_creation_enabled", json={"value": "false"}, headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.get_json()["value"] == "false"
    assert _entries(client)["team_creation_enabled"]["value"] == "false"


@pytest.mark.parametrize("value", ["1", "yes", 3])
def test_patch_bool_setting_rejects_non_booleans(client, value):
    response = client.patch("/api/v1/admin/config/team_creation_enabled", json={"value": value}, headers=ADMIN_HEADERS)
    assert response.status_code == 400


def test_patch_requires_value_and_known_key(client):
    assert client.patch("/api/v1/admin/config/team_max_size", json={}, headers=ADMIN_HEADERS).status_code == 400
    assert client.patch("/api/v1/admin/config/unknown_key", json={"value": "true"}, headers=ADMIN_HEADERS).status_code == 404
