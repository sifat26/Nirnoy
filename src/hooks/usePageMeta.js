import { useEffect } from 'react';

const SITE = 'Nirnoy';

/**
 * Per-route document metadata for a client-rendered SPA. Sets the tab title,
 * upserts <meta name="description">, and points <link rel="canonical"> at the
 * current path. Helps Googlebot (which renders JS); social scrapers still read
 * the static site-level tags in index.html. No dependency (no react-helmet).
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE;

    if (description) {
      let descEl = document.querySelector('meta[name="description"]');
      if (!descEl) {
        descEl = document.createElement('meta');
        descEl.setAttribute('name', 'description');
        document.head.appendChild(descEl);
      }
      descEl.setAttribute('content', description);
    }

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + window.location.pathname);
  }, [title, description]);
}
