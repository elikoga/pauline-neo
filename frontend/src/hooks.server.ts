import type { Handle, HandleFetch } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Default to the FastAPI process on its standard dev port; overridden at
// runtime by the PRIVATE_BASE_URL env var injected by frontend.py.
const DEFAULT_PRIVATE_BASE_URL = 'http://127.0.0.1:8000';

function resolvePrivateBaseUrl(): URL {
  const raw = env.PRIVATE_BASE_URL ?? DEFAULT_PRIVATE_BASE_URL;
  const url = new URL(raw);
  const loopback = ['localhost', '127.0.0.1', '::1'];
  if (!(url.protocol === 'http:' && loopback.some((h) => url.hostname === h))) {
    console.warn(
      `PRIVATE_BASE_URL "${raw}" is not a loopback http URL — falling back to ${DEFAULT_PRIVATE_BASE_URL}`
    );
    return new URL(DEFAULT_PRIVATE_BASE_URL);
  }
  return url;
}

const privateBaseUrl = resolvePrivateBaseUrl();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event, {
    // Forward content-type so SvelteKit can serialise server load data correctly.
    filterSerializedResponseHeaders: (name) => name === 'content-type'
  });
};

// During SSR, rewrite /api fetch calls to hit the FastAPI process directly
// over loopback rather than making an external round-trip through the public URL.
export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
  const reqUrl = new URL(request.url);
  if (
    event.url.host === reqUrl.host &&
    reqUrl.pathname.startsWith('/api')
  ) {
    reqUrl.host = privateBaseUrl.host;
    reqUrl.protocol = privateBaseUrl.protocol;
    request = new Request(reqUrl, request);
  }
  return fetch(request);
};
