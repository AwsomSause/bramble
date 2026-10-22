/**
 * Look-and-feel settings, saved in this browser. Applied as data-* attributes on <html>
 * so plain CSS can react to them (see styles/themes.css and styles/backgrounds.css).
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { KEYS } from '../../lib/stores';
import { readJSON, writeJSON } from '../../lib/storage';

export type Settings = {
  theme: 'classic' | 'midnight';
  background: 'plain' | 'berries' | 'leaves';
  motion: 'system' | 'reduce' | 'full';
  lowPerf: boolean;
  textScale: 1 | 1.15 | 1.3;
};

export const DEFAULT_SETTINGS: Settings = { theme: 'classic', background: 'plain', motion: 'system', lowPerf: false, textScale: 1 };

const isSettings = (v: unknown): v is Settings => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    ['classic', 'midnight'].includes(s.theme as string) &&
    ['plain', 'berries', 'leaves'].includes(s.background as string) &&
    ['system', 'reduce', 'full'].includes(s.motion as string) &&
    typeof s.lowPerf === 'boolean' &&
    [1, 1.15, 1.3].includes(s.textScale as number)
  );
};

let cache: Settings | undefined;
const listeners = new Set<() => void>();
export const getSettings = (): Settings => (cache ??= readJSON(KEYS.settings, DEFAULT_SETTINGS, isSettings));
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function resetSettingsCache() {
  cache = undefined;
}

export function applySettings(s: Settings, prefersReduced: boolean): void {
  const root = document.documentElement;
  const reduce = s.lowPerf || s.motion === 'reduce' || (s.motion === 'system' && prefersReduced);
  root.dataset.theme = s.theme;
  root.dataset.bg = s.lowPerf && s.background === 'leaves' ? 'plain' : s.background;
  root.dataset.motion = reduce ? 'reduce' : 'full';
  root.dataset.lowperf = String(s.lowPerf);
  root.style.setProperty('--text-scale', String(s.textScale));
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function applyStoredSettings(): void {
  applySettings(getSettings(), prefersReducedMotion());
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, getSettings);
  const update = useCallback((patch: Partial<Settings>) => {
    cache = { ...getSettings(), ...patch };
    writeJSON(KEYS.settings, cache);
    applySettings(cache, prefersReducedMotion());
    listeners.forEach((l) => l());
  }, []);
  return [settings, update];
}

/** Keeps <html> in sync with saved settings and the operating system's motion preference. */
export function useApplySettings(): void {
  const [settings] = useSettings();
  useEffect(() => {
    applySettings(settings, prefersReducedMotion());
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => applySettings(settings, mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings]);
}
