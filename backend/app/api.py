from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from starlette.middleware.cors import CORSMiddleware
from app.config import api_settings

from app.routes.api_v1.api import api_router

app = FastAPI(
    title=api_settings.PROJECT_NAME, openapi_url=f"{api_settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if api_settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in api_settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# configure openapi
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=f"{api_settings.PROJECT_NAME} API Specification",
        version="0.1",
        description=
        f"The project {api_settings.PROJECT_NAME} is not associated with PAUL at Paderborn University. "
        f"See the official <a href='https://git.cs.uni-paderborn.de/pauline'>repository</a> for more information.",
        routes=app.routes,
    )

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

app.include_router(api_router, prefix=api_settings.API_V1_STR)
