import { writable } from 'svelte/store';
import type { SvelteComponent } from 'svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modalStore = writable<typeof SvelteComponent<any> | null>(null);
