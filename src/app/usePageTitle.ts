import { useEffect } from 'react';
import { siteConfig } from '../config';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} – ${siteConfig.name}` : `${siteConfig.name} – ${siteConfig.tagline}`;
  }, [title]);
}
