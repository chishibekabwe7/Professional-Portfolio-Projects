import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TrackingMap } from '../components/TrackingMap';

export default function TrackingPage() {
  const navigate = useNavigate();
  const { deviceId = '' } = useParams<{ deviceId: string }>();

  useEffect(() => {
    if (!deviceId) {
      return;
    }

    const previousTitle = document.title;
    document.title = `Tracking ${deviceId} — Elitrack`;

    return () => {
      document.title = previousTitle;
    };
  }, [deviceId]);

  if (!deviceId) {
    return (
      <div className="app-page">
        <main className="dashboard-main">
          <div className="dashboard-shell">
            <div className="card">
              <p style={{ marginBottom: 12 }}>Invalid tracker ID.</p>
              <button type="button" className="btn btn-dark" onClick={() => navigate('/devices')}>
                Back to Devices
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-dark btn-sm"
        onClick={() => navigate('/devices')}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
        }}
      >
        Back to Devices
      </button>

      <TrackingMap deviceId={deviceId} height="100vh" />
    </div>
  );
}
