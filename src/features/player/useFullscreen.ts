import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * Real fullscreen where the browser supports it for page elements; otherwise
 * (e.g. iPhone Safari) an "expanded" mode that fills the window. Esc exits either.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onChange = () => setNative(!!document.fullscreenElement && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const toggle = useCallback(() => {
    if (native) {
      void document.exitFullscreen?.();
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    const el = ref.current;
    if (el && document.fullscreenEnabled && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => setExpanded(true));
    } else {
      setExpanded(true);
    }
  }, [native, expanded, ref]);

  return { isFull: native || expanded, expanded, mode: (expanded ? 'expanded' : 'native') as 'native' | 'expanded', toggle };
}
