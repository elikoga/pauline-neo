/**
 * Returns a short human-readable device identifier like "Chrome Windows"
 * derived from the browser's user-agent string.
 */
export const deviceIdentifier = (): string => {
  if (typeof navigator === 'undefined') return '';

  const ua = navigator.userAgent;

  // Browser
  let browser = 'Browser';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';

  // OS
  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return os ? `${browser} ${os}` : browser;
};
