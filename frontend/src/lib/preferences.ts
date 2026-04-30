import { writableLocalStorageStore } from './localStorageStore';
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const storedSidebarAutoHide = writableLocalStorageStore<boolean>('pref:sidebarAutoHide', 100, true);

export const sidebarAutoHide = browser ? storedSidebarAutoHide : writable<boolean>(true);
