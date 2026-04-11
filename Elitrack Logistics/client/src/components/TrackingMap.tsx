import L, { type DivIcon } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
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
  enabled: boolean;
};

type ReplayPoint = {
  lat: number;
  lng: number;
};

type PlaybackMapUpdaterProps = {
  isPlaybackMode: boolean;
  playbackLocations: ReplayPoint[] | null;
  playbackIndex: number;
};

type PlaybackSpeed = 1 | 2 | 5;

const PLAYBACK_SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 5];

const DEFAULT_CENTER: [number, number] = [-12.9667, 28.6333];
const DEFAULT_ZOOM = 13;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapUpdater({ currentPosition, enabled }: MapUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !currentPosition) {
      return;
    }

    map.flyTo([currentPosition.lat, currentPosition.lng], map.getZoom(), {
      animate: true,
      duration: 1,
    });
  }, [currentPosition, enabled, map]);

  return null;
}

function PlaybackMapUpdater({
  isPlaybackMode,
  playbackLocations,
  playbackIndex,
}: PlaybackMapUpdaterProps): null {
  const map = useMap();

  useEffect(() => {
    if (!isPlaybackMode || !playbackLocations || playbackLocations.length === 0) {
      return;
    }

    if (playbackLocations.length === 1) {
      map.flyTo([playbackLocations[0].lat, playbackLocations[0].lng], 16, {
        animate: true,
        duration: 0.8,
      });
      return;
    }

    const bounds = L.latLngBounds(
      playbackLocations.map((point) => [point.lat, point.lng] as [number, number]),
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      animate: true,
    });
  }, [isPlaybackMode, map, playbackLocations]);

  useEffect(() => {
    if (!isPlaybackMode || !playbackLocations || playbackLocations.length === 0) {
      return;
    }

    const point = playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)];

    map.panTo([point.lat, point.lng], {
      animate: true,
      duration: 0.2,
    });
  }, [isPlaybackMode, map, playbackIndex, playbackLocations]);

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
  const [playbackLocations, setPlaybackLocations] = useState<ReplayPoint[] | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState<boolean>(false);

  const isPlaybackMode = Boolean(playbackLocations && playbackLocations.length > 0);

  useEffect(() => {
    const onTripPlayback = (event: Event): void => {
      const customEvent = event as CustomEvent<{
        locations?: Array<{
          lat?: number;
          lng?: number;
          latitude?: number;
          longitude?: number;
        }>;
      }>;

      const rawLocations = Array.isArray(customEvent.detail?.locations)
        ? customEvent.detail.locations
        : [];

      const normalizedLocations = rawLocations
        .map((item) => ({
          lat: Number(item.lat ?? item.latitude),
          lng: Number(item.lng ?? item.longitude),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      if (normalizedLocations.length === 0) {
        return;
      }

      setPlaybackLocations(normalizedLocations);
      setPlaybackIndex(0);
      setPlaybackSpeed(1);
      setIsPlaybackPlaying(true);
    };

    window.addEventListener('elitrack:trip-playback', onTripPlayback as EventListener);

    return () => {
      window.removeEventListener('elitrack:trip-playback', onTripPlayback as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isPlaybackMode || !isPlaybackPlaying || !playbackLocations) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlaybackIndex((previous) => {
        const next = previous + playbackSpeed;
        const finalIndex = playbackLocations.length - 1;

        if (next >= finalIndex) {
          setIsPlaybackPlaying(false);
          return finalIndex;
        }

        return next;
      });
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaybackMode, isPlaybackPlaying, playbackLocations, playbackSpeed]);

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

  const playbackIcon: DivIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tracking-marker-wrapper',
        html: '<span class="tracking-marker-dot is-playback"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -14],
      }),
    [],
  );

  const markerPosition: [number, number] | null = currentPosition
    ? [currentPosition.lat, currentPosition.lng]
    : null;

  const playbackMarkerPoint: [number, number] | null =
    playbackLocations && playbackLocations.length > 0
      ? [
          playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)].lat,
          playbackLocations[Math.min(playbackIndex, playbackLocations.length - 1)].lng,
        ]
      : null;

  const mapCenter: [number, number] =
    playbackMarkerPoint ?? markerPosition ?? DEFAULT_CENTER;

  const historyPositions: [number, number][] = history.map((point) => [
    point.lat,
    point.lng,
  ]);

  const playbackPositions: [number, number][] = (playbackLocations ?? []).map((point) => [
    point.lat,
    point.lng,
  ]);

  const playbackMaxIndex = Math.max(0, (playbackLocations?.length ?? 1) - 1);

  const onSeekPlayback = (value: number): void => {
    if (!playbackLocations || playbackLocations.length === 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(0, Math.floor(value)), playbackLocations.length - 1);
    setPlaybackIndex(nextIndex);
  };

  const onExitPlayback = (): void => {
    setPlaybackLocations(null);
    setPlaybackIndex(0);
    setPlaybackSpeed(1);
    setIsPlaybackPlaying(false);
  };

  return (
    <div className="tracking-map-wrapper" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!isPlaybackMode && history.length > 1 && (
          <Polyline
            positions={historyPositions}
            pathOptions={{ color: '#1D9E75', weight: 3, opacity: 0.7 }}
          />
        )}

        {isPlaybackMode && playbackPositions.length > 1 && (
          <Polyline
            positions={playbackPositions}
            pathOptions={{ color: '#64748b', weight: 4, opacity: 0.95 }}
          />
        )}

        {!isPlaybackMode && markerPosition && currentPosition && (
          <Marker position={markerPosition} icon={liveIcon}>
            <Popup>
              <div>Device: {deviceId}</div>
              <div>Speed: {currentPosition.speed} km/h</div>
              <div>Last update: {formatTime(lastUpdated)}</div>
            </Popup>
          </Marker>
        )}

        {isPlaybackMode && playbackMarkerPoint && (
          <Marker position={playbackMarkerPoint} icon={playbackIcon}>
            <Popup>
              <div>Playback point</div>
              <div>
                Step {Math.min(playbackIndex + 1, playbackMaxIndex + 1)} / {playbackMaxIndex + 1}
              </div>
            </Popup>
          </Marker>
        )}

        <MapUpdater currentPosition={currentPosition} enabled={!isPlaybackMode} />
        <PlaybackMapUpdater
          isPlaybackMode={isPlaybackMode}
          playbackLocations={playbackLocations}
          playbackIndex={playbackIndex}
        />
        <ExternalFlyToHandler />
        <GeofenceLayer deviceId={deviceId} />
      </MapContainer>

      {!isPlaybackMode && (
        <>
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
        </>
      )}

      {isPlaybackMode && (
        <>
          <div className="playback-banner">PLAYBACK MODE</div>

          <div className="playback-controls">
            <button
              type="button"
              className="playback-controls__button"
              onClick={() => setIsPlaybackPlaying((previous) => !previous)}
            >
              {isPlaybackPlaying ? 'Pause' : 'Play'}
            </button>

            <label className="playback-controls__speed">
              Speed
              <select
                value={playbackSpeed}
                onChange={(event) => {
                  const nextSpeed = Number(event.target.value);

                  if (nextSpeed === 1 || nextSpeed === 2 || nextSpeed === 5) {
                    setPlaybackSpeed(nextSpeed);
                  }
                }}
              >
                {PLAYBACK_SPEED_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}x
                  </option>
                ))}
              </select>
            </label>

            <input
              className="playback-controls__range"
              type="range"
              min={0}
              max={playbackMaxIndex}
              value={Math.min(playbackIndex, playbackMaxIndex)}
              onChange={(event) => {
                onSeekPlayback(Number(event.target.value));
              }}
            />

            <span className="playback-controls__progress">
              {Math.min(playbackIndex + 1, playbackMaxIndex + 1)} / {playbackMaxIndex + 1}
            </span>

            <button
              type="button"
              className="playback-controls__button is-exit"
              onClick={onExitPlayback}
            >
              Exit playback
            </button>
          </div>
        </>
      )}
    </div>
  );
}