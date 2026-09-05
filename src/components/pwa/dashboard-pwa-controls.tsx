'use client';

import { useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export default function DashboardPwaControls() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'denied' | 'granted'>('default');
  const [installDismissed, setInstallDismissed] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const shouldShowInstall = Boolean(installEvent) && !installDismissed;
  const shouldShowNotifications = notificationPermission === 'default';
  const shouldRenderCard = shouldShowInstall || shouldShowNotifications;

  const cardText = useMemo(() => {
    if (shouldShowInstall && shouldShowNotifications) {
      return 'Install DukaNest and enable push notifications for mobile-first updates.';
    }
    if (shouldShowInstall) {
      return 'Install DukaNest for a faster app-like dashboard on your phone.';
    }
    return 'Enable push notifications to get order and stock alerts in real time.';
  }, [shouldShowInstall, shouldShowNotifications]);

  async function handleInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  async function handleEnableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    setNotificationBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          ...(vapidKey ? { applicationServerKey: urlBase64ToArrayBuffer(vapidKey) } : {}),
        }));

      await fetch('/api/notifications/web/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
    } finally {
      setNotificationBusy(false);
    }
  }

  if (!shouldRenderCard) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 px-4 md:hidden">
      <div className="mx-auto max-w-md rounded-xl border border-[#d1d5dc] bg-white p-4 shadow-lg">
        <p className="text-sm text-[#374151]">{cardText}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {shouldShowInstall && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Install App
            </button>
          )}
          {shouldShowNotifications && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={notificationBusy}
              className="rounded-md border border-[#d1d5dc] px-3 py-2 text-sm font-medium text-[#374151] disabled:opacity-60"
            >
              {notificationBusy ? 'Enabling...' : 'Enable Alerts'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setInstallDismissed(true)}
            className="rounded-md px-3 py-2 text-sm text-[#6b7280]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
