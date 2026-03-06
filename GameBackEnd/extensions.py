"""
Flask extension singletons.

Instantiated here without an app so they can be imported by blueprints
before create_app() runs. The actual Flask app is attached via
limiter.init_app(app) inside create_app().
"""
from flask import request as _flask_request
from flask_limiter import Limiter
from werkzeug.exceptions import TooManyRequests


def _get_real_ip() -> str:
    """
    Extrae la IP real del cliente desde X-Forwarded-For.
    En Azure App Service, Next.js propaga este header con la IP original
    del usuario, evitando que todos los requests se limiten bajo la IP
    del recurso Azure del frontend.
    Se toma el primer valor (más a la izquierda) que corresponde al cliente
    original antes de atravesar cualquier proxy.
    Si el header no llega, se rechaza con 429 para evitar que peticiones
    directas al backend sin proxy evadan el rate limiting por usuario.
    """
    xff = _flask_request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    raise TooManyRequests("X-Forwarded-For header is required")


limiter = Limiter(
    key_func=_get_real_ip,
    default_limits=["10000 per day", "2000 per hour"],
)
