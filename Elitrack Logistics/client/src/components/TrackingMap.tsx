import L, { type DivIcon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import {
    MapContainer,
    Marker,
    Polyline,
    Popup,
    TileLayer,
    useMap,
} from 'react-leaflet';
import { useTracker } from '../hooks/useTracker';
import { EngineControl } from './EngineControl';
import { GeofenceLayer } from './GeofenceLayer';
import './TrackingMap.css';

type TrackingMapProps = {
  deviceId: string;
  height?: string;
};

type MapUpdaterProps = {
  currentPosition: {
    lat: number;
    lng: number;
    speed: number;
  } | null;
};

const DEFAULT_CENTER: [number, number] = [-12.9667, 28.6333];
const DEFAULT_ZOOM = 13;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapUpdater({ currentPosition }: MapUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    map.flyTo([currentPosition.lat, currentPosition.lng], map.getZoom(), {
      animate: true,
      duration: 1,
    });
  }, [currentPosition, map]);

  return null;
}

function ExternalFlyToHandler(): null {
  const map = useMap();

  useEffect(() => {
    const onFlyTo = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        lat: number;
        lng: number;
        zoom?: number;
      }>;

      const lat = Number(customEvent.detail?.lat);
      const lng = Number(customEvent.detail?.lng);
      const zoom = Number(customEvent.detail?.zoom);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      map.flyTo([lat, lng], Number.isFinite(zoom) ? zoom : map.getZoom(), {
        animate: true,
        duration: 1,
      });
    };

    window.addEventListener('elitrack:fly-to', onFlyTo as EventListener);

    return () => {
      window.removeEventListener('elitrack:fly-to', onFlyTo as EventListener);
    };
  }, [map]);

  return null;
}

const formatTime = (date: Date | null): string => {
  if (!date) {
    return '--:--:--';
  }

  return date.toLocaleTimeString('en-GB', { hour12: false });
};

export function TrackingMap({ deviceId, height = '100vh' }: TrackingMapProps) {
  const { currentPosition, history, isConnected, lastUpdated } = useTracker(deviceId);

  const liveIcon: DivIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tracking-marker-wrapper',
        html: `<span class="tracking-marker-dot ${isConnected ? 'is-live' : 'is-offline'}"></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -14],
      }),
    [isConnected],
  );

  const markerPosition: [number, number] | null = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : null;

  const historyPositions: [number, number][] = history.map((point) => [
    point.lat,
    point.lng,
  ]);

  return (
    <div className="tracking-map-wrapper" style={{ height }}>
      <MapContainer
        center={markerPosition ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {history.length > 1 && (
          <Polyline
            positions={historyPositions}
            pathOptions={{ color: '#1D9E75', weight: 3, opacity: 0.7 }}
          />
        )}

        {markerPosition && currentPosition && (
          <Marker position={markerPosition} icon={liveIcon}>
            <Popup>
              <div>Device: {deviceId}</div>
              <div>Speed: {currentPosition.speed} km/h</div>
              <div>Last update: {formatTime(lastUpdated)}</div>
            </Popup>
          </Marker>
        )}

        <MapUpdater currentPosition={currentPosition} />
        <ExternalFlyToHandler />
        <GeofenceLayer deviceId={deviceId} />
      </MapContainer>

      <div className="tracking-status-bar">
        <span className={`tracking-badge ${isConnected ? 'is-live' : 'is-offline'}`}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
        <span className="tracking-status-item">
          Speed: {currentPosition?.speed ?? 0} km/h
        </span>
        <span className="tracking-status-item">
          Updated: {formatTime(lastUpdated)}
        </span>
      </div>

      <EngineControl deviceId={deviceId} isDeviceOnline={isConnected} />
    </div>
  );
}