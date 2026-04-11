import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import api from '../api';
import { useTracker } from '../hooks/useTracker';

type Geofence = {
  id: number;
  deviceImei: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
};

type GeofenceAlertToast = {
  message: string;
  type: 'entered' | 'exited';
};

type GeofenceLayerProps = {
  deviceId: string;
};

const BEEP_AUDIO_SRC =
  'data:audio/wav;base64,UklGRvwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdgAAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAA';

function MapOverlayPortal({ children }: { children: ReactNode }) {
  const map = useMap();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(map.getContainer());
  }, [map]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}

function DrawClickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function GeofenceLayer({ deviceId }: GeofenceLayerProps) {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);
  const [draftRadius, setDraftRadius] = useState<number>(500);
  const [draftName, setDraftName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<GeofenceAlertToast | null>(null);

  const { latestGeofenceAlert } = useTracker(deviceId, {
    loadHistory: false,
    trackLocation: false,
  });

  const loadGeofences = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<Geofence[]>(`/locations/${deviceId}/geofences`);
      const rows = Array.isArray(response.data) ? response.data : [];
      setGeofences(rows);
    } catch (error) {
      console.error('Failed to load geofences:', error);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadGeofences();
  }, [loadGeofences]);

  useEffect(() => {
    if (!latestGeofenceAlert) {
      return;
    }

    const message =
      latestGeofenceAlert.type === 'entered'
        ? `Vehicle entered ${latestGeofenceAlert.geofenceName}`
        : `Vehicle exited ${latestGeofenceAlert.geofenceName}`;

    setToast({
      message,
      type: latestGeofenceAlert.type,
    });

    const audio = new Audio(BEEP_AUDIO_SRC);
    audio.volume = 0.2;
    void audio.play().catch(() => {
      // Ignore autoplay restrictions.
    });

    const hideTimer = window.setTimeout(() => {
      setToast(null);
    }, 8000);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [latestGeofenceAlert]);

  const onToggleDrawMode = (): void => {
    setDrawMode((previous) => {
      const next = !previous;

      if (!next) {
        setDraftCenter(null);
        setDraftName('');
        setDraftRadius(500);
      }

      return next;
    });
  };

  const onSave = async (): Promise<void> => {
    if (!draftCenter || !draftName.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await api.post(`/locations/${deviceId}/geofences`, {
        name: draftName.trim(),
        centerLat: draftCenter[0],
        centerLng: draftCenter[1],
        radiusMeters: draftRadius,
      });

      setDraftCenter(null);
      setDraftName('');
      setDraftRadius(500);
      setDrawMode(false);
      await loadGeofences();
    } catch (error) {
      console.error('Failed to save geofence:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteGeofence = async (id: number): Promise<void> => {
    setDeletingId(id);

    try {
      await api.delete(`/locations/${deviceId}/geofences/${id}`);
      setGeofences((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete geofence:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const drawButtonLabel = useMemo(
    () => (drawMode ? 'Drawing: ON' : 'Draw geofence'),
    [drawMode],
  );

  return (
    <>
      <DrawClickHandler
        enabled={drawMode}
        onPick={(lat, lng) => {
          setDraftCenter([lat, lng]);
        }}
      />

      {geofences.map((geofence) => (
        <Circle
          key={geofence.id}
          center={[geofence.centerLat, geofence.centerLng]}
          radius={geofence.radiusMeters}
          pathOptions={{ color: '#f59e0b', fillOpacity: 0.15 }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{geofence.name}</strong>
              <div>Radius: {geofence.radiusMeters}m</div>
              <button
                type="button"
                style={{ marginTop: 8 }}
                disabled={deletingId === geofence.id}
                onClick={() => {
                  void onDeleteGeofence(geofence.id);
                }}
              >
                {deletingId === geofence.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Popup>
        </Circle>
      ))}

      {draftCenter && (
        <Circle
          center={draftCenter}
          radius={draftRadius}
          pathOptions={{ color: '#f59e0b', dashArray: '8 8', fillOpacity: 0.12 }}
        />
      )}

      <MapOverlayPortal>
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            width: 300,
            background: 'rgba(17, 24, 39, 0.92)',
            color: '#ffffff',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={onToggleDrawMode}
            style={{
              width: '100%',
              minHeight: 40,
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              background: drawMode ? '#f59e0b' : '#111827',
              color: '#ffffff',
            }}
          >
            {drawButtonLabel}
          </button>

          {drawMode && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Click map to set center
              </div>

              <label style={{ display: 'block', marginTop: 10, fontSize: 13 }}>
                Radius: {draftRadius}m
              </label>
              <input
                type="range"
                min={100}
                max={10000}
                step={50}
                value={draftRadius}
                onChange={(event) => {
                  setDraftRadius(Number(event.target.value));
                }}
                style={{ width: '100%' }}
              />

              <input
                type="text"
                placeholder="Geofence name"
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  minHeight: 38,
                  borderRadius: 8,
                  border: '1px solid #374151',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '0 10px',
                }}
              />

              <button
                type="button"
                disabled={!draftCenter || !draftName.trim() || isSaving}
                onClick={() => {
                  void onSave();
                }}
                style={{
                  width: '100%',
                  marginTop: 10,
                  minHeight: 40,
                  border: 0,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: '#f59e0b',
                  color: '#111827',
                  fontWeight: 800,
                  opacity: !draftCenter || !draftName.trim() || isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? 'Saving...' : 'Save geofence'}
              </button>
            </div>
          )}
        </div>

        {toast && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1200,
              minWidth: 280,
              maxWidth: '90%',
              padding: '12px 16px',
              borderRadius: 10,
              color: '#ffffff',
              fontWeight: 800,
              textAlign: 'center',
              boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)',
              background: toast.type === 'entered' ? '#16a34a' : '#f59e0b',
              pointerEvents: 'none',
            }}
          >
            {toast.message}
          </div>
        )}
      </MapOverlayPortal>
    </>
  );
}
