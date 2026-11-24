"""The admin backend must not expose gameplay routes: they live only in GameBackEnd."""

import pytest


@pytest.mark.parametrize("method, url", [
    ("post", "/api/v1/battles"),
    ("post", "/api/v1/battles/boss"),
    ("post", "/api/v1/battles/x/guess"),
    ("get", "/api/v1/players/me"),
    ("get", "/api/v1/players/matchmaking"),
    ("get", "/api/v1/fortresses/me"),
    ("post", "/api/v1/store/buy"),
])
def test_gameplay_routes_are_not_served(client, method, url):
    assert getattr(client, method)(url, json={}).status_code == 404
