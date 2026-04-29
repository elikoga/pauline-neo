import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { writableLocalStorageStore } from './localStorageStore';

export type Account = {
  id: number;
  email: string;
  display_name?: string | null;
  created_at: string;
};

export type AccountAuthEmailSent = {
  email: string;
};

export type AccountSession = {
  account: Account;
  token: string;
};

export type AccountAuthChallenge = {
  question: string;
  token: string;
};

type AuthState = {
  account: Account | null;
  token: string | null;
};

const defaultAuthState: AuthState = { account: null, token: null };
const preferredUpbDomains = [
  'mail.uni-paderborn.de',
  'campus.uni-paderborn.de',
  'mail.upb.de',
  'campus.upb.de'
];

const staffUpbDomains = ['uni-paderborn.de', 'upb.de'];

export const emailDomain = (email: string): string =>
  email.trim().toLowerCase().split('@')[1] ?? '';

export const isPreferredUpbEmail = (email: string): boolean =>
  preferredUpbDomains.includes(emailDomain(email));

export const isStaffUpbEmail = (email: string): boolean =>
  staffUpbDomains.includes(emailDomain(email));

export const isUpbEmail = (email: string): boolean =>
  isPreferredUpbEmail(email) || isStaffUpbEmail(email);

const storedAuth = writableLocalStorageStore<AuthState>('authState', 100, defaultAuthState);

export const authState = browser ? storedAuth : writable<AuthState>(defaultAuthState);

const apiUrl = (path: string): URL => {
  const base = import.meta.env.VITE_PAULINE_API;
  if (!base || base === true) {
    throw new Error('VITE_PAULINE_API is not set');
  }

  const url = base.startsWith('/') ? new URL(base, window.location.origin) : new URL(base);
  url.pathname += path;
  return url;
};


export const getAuthChallenge = async (): Promise<AccountAuthChallenge> => {
  const response = await fetch(apiUrl('/accounts/auth-challenge'));
  if (!response.ok) {
    throw new Error('Sicherheitsfrage konnte nicht geladen werden.');
  }

  return (await response.json()) as AccountAuthChallenge;
};


export const requestAuthLink = async (
  email: string,
  challengeToken: string,
  challengeAnswer: string
): Promise<AccountAuthEmailSent> => {
  const response = await fetch(apiUrl('/accounts/auth-link'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      challenge_token: challengeToken,
      challenge_answer: challengeAnswer
    })
  });

  if (!response.ok) {
    throw new Error(
      response.status === 502
        ? 'Anmeldelink konnte nicht per E-Mail verschickt werden. Bitte versuche es später erneut.'
        : 'Anmeldelink konnte nicht gesendet werden.'
    );
  }

  return (await response.json()) as AccountAuthEmailSent;
};


export const verifyAccount = async (token: string): Promise<AccountSession> => {
  const response = await fetch(apiUrl('/accounts/verify'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    throw new Error('Der Anmeldelink ist ungültig oder wurde bereits verwendet.');
  }

  const session = (await response.json()) as AccountSession;
  authState.set({ account: session.account, token: session.token });
  return session;
};

export const logoutAccount = (): void => {
  authState.set(defaultAuthState);
};
