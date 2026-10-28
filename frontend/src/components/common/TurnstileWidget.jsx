import React, { useEffect, useRef } from 'react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function TurnstileWidget({ onVerify, onError, onExpire, theme = 'light' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  // Keep refs updated without triggering re-renders or effect re-runs
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;
    let attempts = 0;

    const renderTurnstile = () => {
      if (!isMounted || widgetIdRef.current !== null || !containerRef.current) return;

      if (window.turnstile && typeof window.turnstile.render === 'function') {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }

        try {
          // Clear container before rendering
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme,
            callback: (token) => {
              if (isMounted) onVerifyRef.current?.(token);
            },
            'error-callback': (code) => {
              if (isMounted) onErrorRef.current?.(code);
            },
            'expired-callback': () => {
              if (isMounted) onExpireRef.current?.();
            },
          });
        } catch (err) {}
      }
    };

    if (window.turnstile && typeof window.turnstile.render === 'function') {
      renderTurnstile();
    } else {
      pollTimer = setInterval(() => {
        attempts += 1;
        if (window.turnstile && typeof window.turnstile.render === 'function') {
          renderTurnstile();
        } else if (attempts > 30) {
          if (pollTimer) clearInterval(pollTimer);
        }
      }, 300);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [theme]); // Only re-run if theme changes, NOT on every keystroke!

  return (
    <div className="flex justify-center my-3 min-h-[65px] items-center w-full">
      <div ref={containerRef} className="cf-turnstile-container" />
    </div>
  );
}
