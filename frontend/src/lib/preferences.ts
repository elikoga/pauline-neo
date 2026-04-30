import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { writableLocalStorageStore } from './localStorageStore';
import { authState } from './auth';

export type AppPreferences = {
  sidebarAutoHide: boolean;
};

const defaultPreferences: AppPreferences = {
  sidebarAutoHide: false
};

// --- Server sync -----------------------------------------------------------

const apiUrl = (path: string): URL => {
  const base = import.meta.env.VITE_PAULINE_API;
  if (!base || base === true) {
    throw new Error('VITE_PAULINE_API is not set');
  }
  const url = base.startsWith('/') ? new URL(base, window.location.origin) : new URL(base);
  url.pathname += path;
  return url;
};

const authHeaders = (): HeadersInit => {
  const token = get(authState).token;
  if (!token) throw new Error('Kein Konto angemeldet.');
  return { authorization: `Bearer ${token}` };
};

const clearAuthOn401 = (status: number): void => {
  if (status === 401) {
    authState.set({ account: null, token: null });
  }
};

export const loadPreferencesFromServer = async (): Promise<AppPreferences | null> => {
  if (!get(authState).token) return null;
  const response = await fetch(apiUrl('/preferences'), { headers: authHeaders() });
  if (response.status === 401) { clearAuthOn401(response.status); return null; }
  if (!response.ok) return null;
  const data = (await response.json()) as { preferences: Record<string, unknown> };
  return { ...defaultPreferences, ...data.preferences } as AppPreferences;
};

export const savePreferencesToServer = async (prefs: AppPreferences): Promise<void> => {
  if (!get(authState).token) return;
  const response = await fetch(apiUrl('/preferences'), {
    method: 'PUT',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ preferences: prefs })
  });
  if (response.status === 401) { clearAuthOn401(response.status); }
};

// --- Stores ----------------------------------------------------------------

const storedSidebarAutoHide = writableLocalStorageStore<boolean>('pref:sidebarAutoHide', 100, false);

export const sidebarAutoHide = browser ? storedSidebarAutoHide : writable<boolean>(false);

// --- Server reconciliation on login ----------------------------------------

let loadedAccountId: number | null = null;
let saveTimer: NodeJS.Timeout | undefined;

const buildPrefs = (): AppPreferences => ({
  sidebarAutoHide: get(sidebarAutoHide)
});

const applyServerPrefs = (prefs: AppPreferences): void => {
  sidebarAutoHide.set(prefs.sidebarAutoHide);
};

const persistToServer = (): void => {
  if (!get(authState).token) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    savePreferencesToServer(buildPrefs()).catch((err) => {
      console.error('Failed to save preferences:', err);
    });
  }, 500);
};

if (browser) {
  sidebarAutoHide.subscribe(persistToServer);

  authState.subscribe(async ($authState) => {
    const accountId = $authState.account?.id ?? null;
    if (!accountId || !$authState.token) {
      loadedAccountId = null;
      return;
    }
    if (loadedAccountId === accountId) return;
    loadedAccountId = accountId;

    try {
      const serverPrefs = await loadPreferencesFromServer();
      if (serverPrefs) applyServerPrefs(serverPrefs);
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  });
}
