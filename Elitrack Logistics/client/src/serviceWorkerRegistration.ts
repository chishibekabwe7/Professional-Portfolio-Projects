export function registerServiceWorker() {
  // Service workers should only run in production builds.
  if (process.env.NODE_ENV !== 'production') return;

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[PWA] Service worker registered:', registration.scope);
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
}
