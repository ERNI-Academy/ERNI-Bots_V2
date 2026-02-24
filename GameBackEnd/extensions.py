"""
Flask extension singletons.

Instantiated here without an app so they can be imported by blueprints
before create_app() runs. The actual Flask app is attached via
limiter.init_app(app) inside create_app().
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per day", "200 per hour"],
)
