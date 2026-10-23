/** Tiny global toggle for the admin overlay, so the raspberry "knock" can open it from anywhere. */
import { useSyncExternalStore } from 'react';

let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openAdmin(): void {
  open = true;
  emit();
}
export function closeAdmin(): void {
  open = false;
  emit();
}

export function useAdminOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
  );
}
