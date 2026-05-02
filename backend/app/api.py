import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn.logging
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi

from app.config import api_settings
from app.routes import frontend as frontend_module
from app.routes.api_v1.api import api_router

# Configure root logger with uvicorn-compatible formatter before any
# application code logs.  Matches the pattern used by thymis.
_ch = logging.StreamHandler()
_ch.setLevel(logging.INFO)
_formatter = uvicorn.logging.DefaultFormatter(
    fmt="%(levelprefix)s %(asctime)s: %(name)s: %(message)s"
)
_ch.setFormatter(_formatter)
logging.basicConfig(level=logging.INFO, handlers=[_ch])

logger = logging.getLogger(__name__)


def perform_db_upgrade():
    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(alembic_ini.parent / "alembic"))
    logger.info("running database migrations")
    command.upgrade(alembic_cfg, "head")
    logger.info("database migrations complete")


@asynccontextmanager
async def lifespan(app: FastAPI):
    perform_db_upgrade()
    logger.info("starting frontend")
    await frontend_module.frontend.run()
    logger.info("frontend ready at %s", api_settings.BASE_URL)

    yield  # server handles requests

    logger.info("stopping frontend")
    await frontend_module.frontend.stop()
    logger.info("frontend stopped")


app = FastAPI(
    title=api_settings.PROJECT_NAME,
    openapi_url=f"{api_settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    app.openapi_schema = get_openapi(
        title=f"{api_settings.PROJECT_NAME} API Specification",
        version="0.1",
        description=(
            f"The project {api_settings.PROJECT_NAME} is not associated with PAUL at "
            f"Paderborn University. See the official "
            f"<a href='https://github.com/elikoga/pauline-neo/'>repository</a> "
            f"for more information."
        ),
        routes=app.routes,
    )
    return app.openapi_schema


app.openapi = custom_openapi

# API routes first — they take priority over the catch-all proxy below.
app.include_router(api_router, prefix=api_settings.API_V1_STR)
# Catch-all: everything else is forwarded to the SvelteKit frontend subprocess.
app.include_router(frontend_module.router)


def main():
    import uvicorn

    host = os.environ.get("UVICORN_HOST", "127.0.0.1")
    port = int(os.environ.get("UVICORN_PORT", "8000"))
    reload = "--reload" in sys.argv

    uvicorn.run("app.api:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    main()
