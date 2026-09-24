import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import './EngineControl.css';

type EngineStatus = 'cut' | 'restored' | 'unknown';

type EngineStatusResponse =
  | EngineStatus
  | {
      status: EngineStatus;
      lastActionAt?: string | null;
      requestedBy?: string | null;
    };

type EngineActionResponse = {
  success: boolean;
  message: string;
};

type EngineControlProps = {
  deviceId: string;
  isDeviceOnline: boolean;
};

type ToastState = {
  message: string;
  variant: 'cut' | 'restore';
} | null;

const POLL_INTERVAL_MS = 10000;

const formatActionTime = (date: Date | null): string => {
  if (!date) {
    return 'never';
  }

  return date.toLocaleTimeString('en-GB', { hour12: false });
};

export function EngineControl({ deviceId, isDeviceOnline }: EngineControlProps) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('unknown');
  const [lastActionAt, setLastActionAt] = useState<Date | null>(null);
  const [lastActionBy, setLastActionBy] = useState<string>('system');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [cutConfirmOpen, setCutConfirmOpen] = useState<boolean>(false);
  const [cutCountdown, setCutCountdown] = useState<number>(3);
  const [toast, setToast] = useState<ToastState>(null);

  const isCut = engineStatus === 'cut';

  const runningLabel = isCut ? 'ENGINE CUT' : 'ENGINE RUNNING';

  const cutDisabled = loadingAction || isCut || !isDeviceOnline;
  const restoreDisabled = loadingAction || engineStatus === 'restored';

  const cutButtonTitle = useMemo(() => {
    if (!isDeviceOnline) {
      return 'Device is offline';
    }

    if (isCut) {
      return 'Engine already cut';
    }

    return 'Cut engine';
  }, [isCut, isDeviceOnline]);

  const fetchEngineStatus = async (): Promise<void> => {
    try {
      const response = await api.get<EngineStatusResponse>(`/locations/${deviceId}/engine/status`);
      const payload = response.data;

      if (typeof payload === 'string') {
        setEngineStatus(payload);
        return;
      }

      setEngineStatus(payload.status || 'unknown');
      setLastActionAt(payload.lastActionAt ? new Date(payload.lastActionAt) : null);
      setLastActionBy(payload.requestedBy || 'system');
    } catch (error) {
      console.error('Failed to fetch engine status:', error);
    }
  };

  useEffect(() => {
    void fetchEngineStatus();

    const pollTimer = window.setInterval(() => {
      void fetchEngineStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(pollTimer);
    };
  }, [deviceId]);

  useEffect(() => {
    if (!cutConfirmOpen) {
      setCutCountdown(3);
      return;
    }

    setCutCountdown(3);

    const countdownTimer = window.setInterval(() => {
      setCutCountdown((previous) => {
        if (previous <= 1) {
          window.clearInterval(countdownTimer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownTimer);
    };
  }, [cutConfirmOpen]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const runEngineAction = async (action: 'cut' | 'restore'): Promise<void> => {
    setLoadingAction(true);

    try {
      const endpoint = action === 'cut'
        ? `/locations/${deviceId}/engine/cut`
        : `/locations/${deviceId}/engine/restore`;

      const response = await api.post<EngineActionResponse>(endpoint);
      const payload = response.data;

      if (payload.success) {
        setEngineStatus(action === 'cut' ? 'cut' : 'restored');
        setLastActionAt(new Date());
      }

      setToast({
        message: payload.message,
        variant: action === 'cut' ? 'cut' : 'restore',
      });

      await fetchEngineStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Engine command failed';

      setToast({
        message,
        variant: action === 'cut' ? 'cut' : 'restore',
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCutConfirm = async (): Promise<void> => {
    if (cutCountdown > 0) {
      return;
    }

    await runEngineAction('cut');
    setCutConfirmOpen(false);
  };

  const handleRestore = async (): Promise<void> => {
    await runEngineAction('restore');
  };

  return (
    <>
      {toast && (
        <div className={`engine-control__toast engine-control__toast--${toast.variant}`}>
          {toast.message}
        </div>
      )}

      <div className="engine-control">
        <section className={`engine-control__panel ${isCut ? 'is-cut' : 'is-running'}`}>
          <div className="engine-control__status-row">
            <span className={`engine-control__status-dot ${isCut ? 'is-cut' : 'is-running'}`} />
            <div>
              <p className="engine-control__status-title">{runningLabel}</p>
              <p className="engine-control__status-subtitle">
                Last action: {formatActionTime(lastActionAt)} by {lastActionBy}
              </p>
            </div>
          </div>

          <div className="engine-control__actions">
            <button
              type="button"
              className="engine-control__btn engine-control__btn--cut"
              disabled={cutDisabled}
              title={cutButtonTitle}
              onClick={() => setCutConfirmOpen(true)}
            >
              {loadingAction ? <span className="engine-control__spinner" /> : 'CUT ENGINE'}
            </button>

            <button
              type="button"
              className="engine-control__btn engine-control__btn--restore"
              disabled={restoreDisabled}
              onClick={handleRestore}
            >
              {loadingAction ? <span className="engine-control__spinner" /> : 'RESTORE ENGINE'}
            </button>
          </div>
        </section>
      </div>

      {cutConfirmOpen && (
        <div className="engine-control__modal-overlay">
          <div className="engine-control__modal">
            <div className="engine-control__warning-icon">!</div>
            <h2>CONFIRM ENGINE CUT</h2>
            <p>
              This will immediately stop the vehicle engine for device {deviceId}. This action
              cannot be undone remotely unless you send a restore command.
            </p>

            <div className="engine-control__modal-actions">
              <button
                type="button"
                className="engine-control__modal-btn engine-control__modal-btn--cancel"
                onClick={() => setCutConfirmOpen(false)}
                disabled={loadingAction}
              >
                CANCEL
              </button>

              <button
                type="button"
                className={`engine-control__modal-btn engine-control__modal-btn--confirm ${cutCountdown > 0 ? 'is-counting' : ''}`}
                onClick={handleCutConfirm}
                disabled={loadingAction || cutCountdown > 0}
              >
                {cutCountdown > 0 ? `Wait ${cutCountdown}s...` : 'YES, CUT ENGINE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}