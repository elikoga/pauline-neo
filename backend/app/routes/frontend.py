import asyncio
import logging
import os
import pathlib
import re
import socket
import subprocess
import sys

import fastapi
import httpx
import psutil
import starlette.requests
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask

from app.config import api_settings

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)


def _find_free_port() -> int:
    """Ask the OS for an available loopback port by binding to port 0."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# Chosen once at import time; stable for the lifetime of the process.
FRONTEND_PORT = _find_free_port()

# Resolved once; the frontend/ directory sits alongside backend/ in the monorepo.
_FRONTEND_DIR = pathlib.Path(__file__).parent.parent.parent.parent / "frontend"


def _is_reload_enabled() -> bool:
    return "--reload" in sys.argv


def _frontend_binary_path() -> str | None:
    return api_settings.FRONTEND_BINARY_PATH


def _detect_host_port() -> tuple[str, int]:
    """Determine the host/port uvicorn is listening on.

    Reads --host/--port CLI args first, then UVICORN_HOST/PORT env vars,
    then falls back to uvicorn's own defaults.  Translates wildcard bind
    addresses to their loopback equivalents so the frontend can reach the
    API over localhost.
    """
    wildcard_to_loopback = {"0.0.0.0": "127.0.0.1", "::": "::1"}

    def _arg_after(flag: str) -> str | None:
        idx = sys.argv.index(flag) if flag in sys.argv else -1
        return sys.argv[idx + 1] if idx >= 0 and idx + 1 < len(sys.argv) else None

    host = _arg_after("--host") or os.getenv("UVICORN_HOST") or "127.0.0.1"
    port = _arg_after("--port") or os.getenv("UVICORN_PORT") or "8000"
    host = wildcard_to_loopback.get(host, host)
    return host, int(port)


def _subprocess_env() -> dict[str, str]:
    """Environment variables injected into the frontend subprocess.

    - PUBLIC_BASE_URL  — public-facing URL; used by the SvelteKit app for
                         absolute link generation on the client.
    - PRIVATE_BASE_URL — loopback address of this FastAPI process; hooks.server.ts
                         rewrites SSR fetch calls for /api to hit this directly.
    - ORIGIN           — required by adapter-node for CSRF / cookie domain checks.
    - VITE_PAULINE_API — the API base path seen by the browser; always /api/v1
                         because the browser talks to FastAPI on the same origin.
    """
    host, port = _detect_host_port()
    return {
        "PUBLIC_BASE_URL": api_settings.BASE_URL,
        "PRIVATE_BASE_URL": f"http://{host}:{port}",
        "ORIGIN": api_settings.BASE_URL,
        "VITE_PAULINE_API": "/api/v1",
    }


class Frontend:
    def __init__(self) -> None:
        self.url = f"http://127.0.0.1:{FRONTEND_PORT}"
        self.process: asyncio.subprocess.Process | None = None
        self.started = asyncio.Event()
        self.stopped = False

    async def run(self) -> None:
        assert _FRONTEND_DIR.exists(), f"frontend directory not found: {_FRONTEND_DIR}"

        extra_env = {"PATH": os.environ["PATH"], **_subprocess_env()}

        if _is_reload_enabled() and not _frontend_binary_path():
            # Development: Vite dev server with HMR.
            self.process = await asyncio.create_subprocess_exec(
                "npm", "run", "dev", "--",
                "--host=127.0.0.1",
                f"--port={FRONTEND_PORT}",
                "--strictPort",
                "--clearScreen", "false",
                cwd=_FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=extra_env,
            )
        elif not _frontend_binary_path():
            # Preview: build then serve — useful for quick prod-like smoke tests.
            self.process = await asyncio.create_subprocess_exec(
                "sh", "-c",
                f"npm run build && npm run preview -- --host 127.0.0.1 --port {FRONTEND_PORT}",
                cwd=_FRONTEND_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={"PORT": str(FRONTEND_PORT), "HOST": "127.0.0.1", **extra_env},
            )
        else:
            # Production: pre-built adapter-node binary (e.g. from Nix).
            self.process = await asyncio.create_subprocess_exec(
                _frontend_binary_path(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={"PORT": str(FRONTEND_PORT), "HOST": "127.0.0.1", **_subprocess_env()},
            )

        asyncio.get_event_loop().create_task(self._watch_for_exit())

        async def _pipe(stream: asyncio.StreamReader, level: int = logging.INFO) -> None:
            while not stream.at_eof():
                line = await stream.readline()
                if line:
                    logger.log(level, "frontend: %s", line.decode().strip())

        async def _pipe_until_ready(stream: asyncio.StreamReader) -> None:
            """Log lines and set self.started once the server signals readiness."""
            while not stream.at_eof():
                line = await stream.readline()
                if not line:
                    continue
                logger.info("frontend: %s", line.decode().strip())
                text = line.decode()
                if _is_reload_enabled():
                    if re.search(r"Local: +http", text):
                        self.started.set()
                        break
                else:
                    if re.search(r"Listening on http(s)?://\d+\.\d+\.\d+\.\d+:\d+", text) or \
                            re.search(r"Local: +http", text):
                        self.started.set()
                        break
                    if re.search(r"WebSocket server error: Port already in use", text):
                        logger.error("frontend: port already in use")
                        await self.process.wait()
                        self.stopped = True
                        self.started.set()
            # Drain the rest of stdout after the readiness signal.
            await _pipe(stream)

        asyncio.create_task(_pipe_until_ready(self.process.stdout))
        asyncio.create_task(_pipe(self.process.stderr, level=logging.ERROR))

        await self.started.wait()

        if self.stopped:
            raise RuntimeError("frontend process stopped before signalling readiness")

    async def _watch_for_exit(self) -> None:
        return_code = await self.process.wait()
        self.stopped = True
        self.started.set()  # unblock run() if it's still waiting
        logger.error("frontend process exited with code %d", return_code)
        await asyncio.sleep(0.1)

    async def stop(self) -> None:
        if self.stopped:
            return
        self.stopped = True
        # Kill the process tree so npm→node children are all cleaned up.
        parent = psutil.Process(self.process.pid)
        for child in parent.children(recursive=True):
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
            await asyncio.sleep(0.1)
            if child.is_running():
                child.kill()
        try:
            parent.terminate()
        except psutil.NoSuchProcess:
            pass
        await asyncio.sleep(0.1)
        if parent.is_running():
            parent.kill()
        await self.process.wait()


# Module-level singletons wired into the FastAPI app.
frontend = Frontend()
_client = httpx.AsyncClient(base_url=frontend.url)
router = APIRouter()


async def _reverse_proxy(request: fastapi.Request) -> Response:
    url = httpx.URL(path=request.url.path, query=request.url.query.encode("utf-8"))
    rp_req = _client.build_request(
        request.method,
        url,
        headers=request.headers.raw,
        content=request.stream(),
        timeout=None,
    )
    try:
        rp_resp = await _client.send(rp_req, stream=True)
        return StreamingResponse(
            rp_resp.aiter_raw(),
            status_code=rp_resp.status_code,
            headers=rp_resp.headers,
            background=BackgroundTask(rp_resp.aclose),
        )
    except starlette.requests.ClientDisconnect as exc:
        logger.debug("client disconnected: %s", exc)
    except httpx.RemoteProtocolError as exc:
        logger.error("frontend remote protocol error: %s", exc)
    except httpx.ConnectError as exc:
        logger.error("failed to connect to frontend: %s", exc)
    except Exception as exc:
        logger.error("proxy error: %s", exc)
        raise
    return Response(status_code=500)


router.add_route(
    "/{path:path}",
    _reverse_proxy,
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
