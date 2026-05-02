const isPreview =
  typeof window !== 'undefined' && window.location.hostname.includes('preview');

/** Debug logger gated to preview deployments. No-op in production. */
export const dbg = (...args: unknown[]): void => {
  if (isPreview) console.log('[Pauline]', ...args);
};
