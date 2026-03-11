import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.openapi.utils import get_openapi

from app.config import api_settings
from app.routes import frontend as frontend_module
from app.routes.api_v1.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
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
            f"<a href='https://git.cs.uni-paderborn.de/pauline'>repository</a> "
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
