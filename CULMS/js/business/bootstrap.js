import { LocalStorageAdapter } from '../data/storage/LocalStorageAdapter.js';
import { seedIfEmpty } from '../data/seed/seed.js';
import { createCULMS } from './index.js';
export function createBrowserCULMS() {
  const adapter = new LocalStorageAdapter();
  seedIfEmpty(adapter);
  const culms = createCULMS(adapter);
  culms.reservations.expireReservations();
  return culms;
}
