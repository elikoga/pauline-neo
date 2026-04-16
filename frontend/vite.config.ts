import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiTarget = process.env.PRIVATE_BASE_URL ?? 'http://localhost:8000';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: apiTarget,
				changeOrigin: true,
				secure: false
			}
		}
	}
});
