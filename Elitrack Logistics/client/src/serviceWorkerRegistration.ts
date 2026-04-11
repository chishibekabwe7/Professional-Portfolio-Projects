type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/,
    ),
);

export function register(config?: Config): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);

  if (publicUrl.origin !== window.location.origin) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);

      navigator.serviceWorker.ready
        .then(() => {
          console.log('Elitrack PWA: service worker registered');
        })
        .catch((error: unknown) => {
          console.error('Elitrack PWA: service worker registration failed', error);
        });

      return;
    }

    registerValidSW(swUrl, config);
  });
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Elitrack PWA: service worker registered');

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (!installingWorker) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== 'installed') {
            return;
          }

          if (navigator.serviceWorker.controller) {
            console.log('Elitrack PWA: new version available');
            config?.onUpdate?.(registration);
          } else {
            config?.onSuccess?.(registration);
          }
        };
      };
    })
    .catch((error: unknown) => {
      console.error('Elitrack PWA: service worker registration failed', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config): void {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');

      if (
        response.status === 404 ||
        (contentType !== null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready
          .then((registration) => registration.unregister())
          .then(() => {
            window.location.reload();
          })
          .catch((error: unknown) => {
            console.error('Elitrack PWA: service worker unregister failed', error);
          });
        return;
      }

      registerValidSW(swUrl, config);
    })
    .catch((error: unknown) => {
      console.error('Elitrack PWA: service worker validation failed', error);
    });
}

export function unregister(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error: unknown) => {
      console.error('Elitrack PWA: service worker unregister failed', error);
    });
}
