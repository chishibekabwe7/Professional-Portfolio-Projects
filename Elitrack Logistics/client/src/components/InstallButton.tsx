import { useEffect, useState } from 'react';

type InstallPromptOutcome = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallPromptOutcome>;
};

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
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
      className="install-btn"
    >
      Install App
    </button>
  );
}
