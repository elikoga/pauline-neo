import type { DateTimeOptions } from 'luxon';
import { DateTime } from 'luxon';

const fromISOcache: Record<string, DateTime> = {};

export const fromISO: typeof DateTime.fromISO = (text: string, opts?: DateTimeOptions) => {
  if (opts) {
    return DateTime.fromISO(text, opts);
  }
  if (text in fromISOcache) {
    return fromISOcache[text];
  }
  const dt = DateTime.fromISO(text);
  fromISOcache[text] = dt;
  return dt;
};
