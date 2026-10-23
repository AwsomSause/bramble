import { AdminGate } from './AdminGate';
import { useAdminOpen } from './useAdmin';

/** Mounted once at the app root; shows the admin overlay when the raspberry knock opens it. */
export function AdminHost() {
  return useAdminOpen() ? <AdminGate /> : null;
}
