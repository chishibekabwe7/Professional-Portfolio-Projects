import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
      console.log('[PWA] App installed');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    console.log('[PWA] Install choice:', choice.outcome);
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <button
      onClick={installApp}
      type="button"
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 2000,
        background: '#30BDEC',
        color: '#ffffff',
        border: 'none',
        borderRadius: 10,
        padding: '12px 16px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      }}
    >
      Install App
    </button>
  );
}
