import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load .env if present (compose passes envs; this is a safe extra)
load_dotenv(override=False)

def _getenv(name: str, default: str | None = None, required: bool = False) -> str:
    val = os.getenv(name, default)
    if required and (val is None or str(val).strip() == ""):
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val if val is not None else ""

@dataclass(frozen=True)
class Settings:
    app_env: str
    database_url: str
    cors_origins: list[str]

def get_settings() -> Settings:
    app_env = _getenv("APP_ENV", default="production")
    database_url = _getenv("DATABASE_URL", required=True)

    cors_raw = _getenv("CORS_ORIGINS", default="")
    cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()] if cors_raw else []

    return Settings(
        app_env=app_env,
        database_url=database_url,
        cors_origins=cors_origins,
    )

settings = get_settings()
