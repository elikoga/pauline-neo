import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// No dev proxy needed: in development the browser connects to FastAPI
	// (port 8000), which reverse-proxies non-/api requests to this Vite
	// server.  API calls from the browser hit FastAPI directly on the same
	// origin.
});
