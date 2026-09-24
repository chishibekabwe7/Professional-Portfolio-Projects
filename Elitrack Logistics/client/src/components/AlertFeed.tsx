import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useTracker } from '../hooks/useTracker';
import './AlertFeed.css';

type AlertFeedProps = {
  deviceId: string;
};

type FeedAlert = {
  id: string;
  type: 'speed' | 'idle';
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  limit?: number;
  duration?: number;
};

type DeviceSettings = {
  speedLimitKmh: number;
  idleThresholdMinutes: number;
};

const DEFAULT_SETTINGS: DeviceSettings = {
  speedLimitKmh: 80,
  idleThresholdMinutes: 5,
};

const formatClock = (date: Date): string =>
  date.toLocaleTimeString('en-GB', { hour12: false });

export function AlertFeed({ deviceId }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<FeedAlert[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  const { latestSpeedAlert, latestIdleAlert } = useTracker(deviceId, {
    loadHistory: false,
    trackLocation: false,
  });

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        const response = await api.get<{
          speedLimitKmh?: number;
          idleThresholdMinutes?: number;
        }>(`/locations/${deviceId}/settings`);

        setSettings({
          speedLimitKmh: Number(response.data.speedLimitKmh ?? DEFAULT_SETTINGS.speedLimitKmh),
          idleThresholdMinutes: Number(
            response.data.idleThresholdMinutes ?? DEFAULT_SETTINGS.idleThresholdMinutes,
          ),
        });
      } catch (error) {
        console.error('Failed to load alert settings:', error);
      }
    };

    void loadSettings();
  }, [deviceId]);

  useEffect(() => {
    if (!latestSpeedAlert) {
      return;
    }

    const speed = Number(latestSpeedAlert.speed);
    const limit = Number(latestSpeedAlert.limit);
    const lat = Number(latestSpeedAlert.lat);
    const lng = Number(latestSpeedAlert.lng);

    if (
      !Number.isFinite(speed) ||
      !Number.isFinite(limit) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    setAlerts((previous) => {
      const nextAlert: FeedAlert = {
        id: `speed-${latestSpeedAlert.triggeredAt.getTime()}-${Math.random()}`,
        type: 'speed',
        speed,
        limit,
        lat,
        lng,
        timestamp: latestSpeedAlert.triggeredAt,
      };

      return [nextAlert, ...previous].slice(0, 20);
    });

    setIsOpen(true);
  }, [latestSpeedAlert]);

  useEffect(() => {
    if (!latestIdleAlert) {
      return;
    }

    const duration = Number(latestIdleAlert.duration);
    const lat = Number(latestIdleAlert.lat);
    const lng = Number(latestIdleAlert.lng);

    if (!Number.isFinite(duration) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    setAlerts((previous) => {
      const nextAlert: FeedAlert = {
        id: `idle-${latestIdleAlert.triggeredAt.getTime()}-${Math.random()}`,
        type: 'idle',
        duration,
        lat,
        lng,
        timestamp: latestIdleAlert.triggeredAt,
      };

      return [nextAlert, ...previous].slice(0, 20);
    });

    setIsOpen(true);
  }, [latestIdleAlert]);

  const onFlyTo = (lat: number, lng: number): void => {
    window.dispatchEvent(
      new CustomEvent('elitrack:fly-to', {
        detail: {
          lat,
          lng,
          zoom: 16,
        },
      }),
    );
  };

  const onSaveSettings = async (): Promise<void> => {
    setIsSavingSettings(true);

    try {
      const payload = {
        speedLimitKmh: Math.max(1, Math.floor(settings.speedLimitKmh)),
        idleThresholdMinutes: Math.max(1, Math.floor(settings.idleThresholdMinutes)),
      };

      const response = await api.put<{
        speedLimitKmh: number;
        idleThresholdMinutes: number;
      }>(`/locations/${deviceId}/settings`, payload);

      setSettings({
        speedLimitKmh: Number(response.data.speedLimitKmh),
        idleThresholdMinutes: Number(response.data.idleThresholdMinutes),
      });

      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save alert settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const alertCountLabel = useMemo(() => `${alerts.length}`, [alerts.length]);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="alert-feed__open-tab"
          onClick={() => setIsOpen(true)}
        >
          Alerts {alertCountLabel}
        </button>
      )}

      <aside className={`alert-feed ${isOpen ? 'is-open' : 'is-closed'}`}>
        <header className="alert-feed__header">
          <h3>Live Alerts</h3>

          <div className="alert-feed__header-actions">
            <button
              type="button"
              className="alert-feed__icon-btn"
              onClick={() => setShowSettings((previous) => !previous)}
              title="Alert settings"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.14 12.94a7.68 7.68 0 0 0 .05-.94 7.68 7.68 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.31 7.31 0 0 0-1.63-.94L14.5 2.8a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.36 2.52c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.6 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.68 7.68 0 0 0-.05.94c0 .32.02.63.05.94L2.72 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.52c.04.24.25.4.5.4h4c.25 0 .46-.16.5-.4l.36-2.52c.58-.23 1.12-.54 1.63-.94l2.39.96c.2.1.47.01.6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
                />
              </svg>
            </button>

            <button
              type="button"
              className="alert-feed__icon-btn"
              onClick={() => setIsOpen(false)}
              title="Close panel"
            >
              x
            </button>
          </div>
        </header>

        {showSettings && (
          <section className="alert-feed__settings">
            <label>
              Speed limit (km/h)
              <input
                type="number"
                min={1}
                value={settings.speedLimitKmh}
                onChange={(event) => {
                  setSettings((previous) => ({
                    ...previous,
                    speedLimitKmh: Number(event.target.value),
                  }));
                }}
              />
            </label>

            <label>
              Idle threshold (minutes)
              <input
                type="number"
                min={1}
                value={settings.idleThresholdMinutes}
                onChange={(event) => {
                  setSettings((previous) => ({
                    ...previous,
                    idleThresholdMinutes: Number(event.target.value),
                  }));
                }}
              />
            </label>

            <button
              type="button"
              className="alert-feed__save-btn"
              disabled={isSavingSettings}
              onClick={() => {
                void onSaveSettings();
              }}
            >
              {isSavingSettings ? 'Saving...' : 'Save'}
            </button>
          </section>
        )}

        <section className="alert-feed__list" role="log" aria-live="polite">
          {alerts.length === 0 && (
            <div className="alert-feed__empty">No alerts yet</div>
          )}

          {alerts.map((alert) => {
            const isSpeed = alert.type === 'speed';

            return (
              <article
                key={alert.id}
                className={`alert-feed__row ${isSpeed ? 'is-speed' : 'is-idle'}`}
              >
                <button
                  type="button"
                  className="alert-feed__pin"
                  onClick={() => onFlyTo(alert.lat, alert.lng)}
                  title="Go to alert location"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 2a7 7 0 0 0-7 7c0 5.18 6.15 12.2 6.41 12.5a.8.8 0 0 0 1.18 0C12.85 21.2 19 14.18 19 9a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
                    />
                  </svg>
                </button>

                <div className="alert-feed__text">
                  {isSpeed ? (
                    <>
                      Speeding: {Math.round(alert.speed ?? 0)}km/h (limit:{' '}
                      {Math.round(alert.limit ?? 0)}km/h) at {formatClock(alert.timestamp)}
                    </>
                  ) : (
                    <>
                      Idling for {Math.max(0, Math.round(alert.duration ?? 0))}s at{' '}
                      {formatClock(alert.timestamp)}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </aside>
    </>
  );
}
