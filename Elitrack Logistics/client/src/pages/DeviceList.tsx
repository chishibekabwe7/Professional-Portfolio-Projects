import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

type DeviceLocation = {
  id: number;
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  recordedAt: string;
};

type TrackerDevice = {
  id: number;
  imei: string;
  label: string;
  ownerId: string;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  locations?: DeviceLocation[];
};

type RegisterFormState = {
  imei: string;
  label: string;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const formatRelativeTime = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'Never';
  }

  const timestamp = new Date(isoDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Unknown';
  }

  const deltaMs = Date.now() - timestamp;

  if (deltaMs < 5000) {
    return 'just now';
  }

  const totalSeconds = Math.floor(deltaMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'} ago`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? '' : 's'} ago`;
  }

  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays} day${totalDays === 1 ? '' : 's'} ago`;
};

export default function DeviceList() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<TrackerDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    imei: '',
    label: '',
  });

  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [devices]);

  const fetchDevices = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<TrackerDevice[]>('/locations/devices');
      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load devices.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDevices();
  }, []);

  const submitRegistration = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const imei = registerForm.imei.trim();
    const label = registerForm.label.trim();

    if (!imei || !label) {
      setError('IMEI and Label are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/locations/devices/register', { imei, label });
      setRegisterForm({ imei: '', label: '' });
      setShowRegisterForm(false);
      await fetchDevices();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to register device.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page">
      <main className="dashboard-main">
        <div className="dashboard-shell">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Fleet Devices</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Manage registered GPS trackers and launch live monitoring.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-gold"
                onClick={() => setShowRegisterForm((previous) => !previous)}
              >
                + Register device
              </button>
            </div>
          </div>

          {showRegisterForm && (
            <form className="card" style={{ marginBottom: 16 }} onSubmit={submitRegistration}>
              <div className="section-label">Register Tracker</div>

              <div className="form-group">
                <label>IMEI</label>
                <input
                  type="text"
                  value={registerForm.imei}
                  onChange={(event) => setRegisterForm((previous) => ({
                    ...previous,
                    imei: event.target.value,
                  }))}
                  placeholder="9170129590"
                />
              </div>

              <div className="form-group">
                <label>Label</label>
                <input
                  type="text"
                  value={registerForm.label}
                  onChange={(event) => setRegisterForm((previous) => ({
                    ...previous,
                    label: event.target.value,
                  }))}
                  placeholder="ST-901AL - Vehicle 1"
                />
              </div>

              <button type="submit" className="btn btn-dark" disabled={submitting}>
                {submitting ? 'Registering...' : 'Submit'}
              </button>
            </form>
          )}

          {loading ? (
            <div className="card"><div className="spinner" /></div>
          ) : error ? (
            <div className="card">
              <p style={{ marginBottom: 12, color: 'var(--danger)' }}>{error}</p>
              <button type="button" className="btn btn-dark" onClick={() => void fetchDevices()}>
                Retry
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="section-label">Registered Devices</div>
              {sortedDevices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No devices registered yet.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>IMEI</th>
                        <th>Last seen</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDevices.map((device) => {
                        const lastSeen = device.lastSeenAt;
                        const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0;
                        const isOnline = lastSeenMs > 0 && Date.now() - lastSeenMs <= ONLINE_WINDOW_MS;

                        return (
                          <tr key={device.id}>
                            <td>{device.label}</td>
                            <td className="mono">{device.imei}</td>
                            <td>{formatRelativeTime(lastSeen)}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: isOnline ? '#1d9e75' : '#6b7280',
                                  color: '#ffffff',
                                }}
                              >
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-dark btn-sm"
                                onClick={() => navigate(`/track/${device.imei}`)}
                              >
                                Track live
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
