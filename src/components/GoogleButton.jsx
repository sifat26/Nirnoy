import { useEffect, useRef, useState } from 'react';

/**
 * "Continue with Google" button backed by Google Identity Services (GIS).
 *
 * Lazily loads the GIS script, renders Google's official branded button, and
 * hands the resulting ID token (`response.credential`) to `onCredential`. That
 * token is verified server-side by POST /api/auth/google — the client never
 * trusts it directly.
 *
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is unset, so local dev without a
 * key (and any environment where Google login isn't configured) just works.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Load the GIS script once and share the promise across every button instance.
let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null; // allow a later retry
      reject(new Error('Failed to load Google sign-in.'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
}

export default function GoogleButton({ onCredential, text = 'continue_with' }) {
  const containerRef = useRef(null);
  // Keep the latest callback without re-running the effect on every render.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const { google } = window;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredentialRef.current?.(response.credential);
          },
        });
        const width = Math.min(400, Math.max(240, containerRef.current.offsetWidth || 320));
        containerRef.current.innerHTML = '';
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  if (failed) {
    return <p className="text-xs text-slate-400 text-center">Google sign-in is unavailable right now.</p>;
  }
  return <div ref={containerRef} className="flex justify-center min-h-[44px]" />;
}
