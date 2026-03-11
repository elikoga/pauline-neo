import type { AppointmentCollection } from './api';

export const appointmentCollectionEquals = (
  a: AppointmentCollection,
  b: AppointmentCollection
): boolean => {
  return a.cid === b.cid && a.name === b.name;
};
