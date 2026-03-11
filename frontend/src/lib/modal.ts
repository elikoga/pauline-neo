import { writable } from 'svelte/store';
import type { ComponentType } from 'svelte';

export const modalStore = writable<ComponentType | null>(null);

