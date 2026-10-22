import { useEffect } from 'react';
import { claimDailyIfDue, useShop } from './shopStore';

/** Applies the equipped cursor and accent to <html>, and grants the daily coin bonus on load. */
export function useApplyCosmetics(): void {
  const { equipped } = useShop();
  useEffect(() => {
    claimDailyIfDue();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cursor = equipped.cursor;
    root.dataset.accent = equipped.accent;
  }, [equipped.cursor, equipped.accent]);
}
