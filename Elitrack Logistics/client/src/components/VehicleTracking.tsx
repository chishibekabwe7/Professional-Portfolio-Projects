import {
    faBroadcastTower,
    faCamera,
    faGaugeHigh,
    faRoad,
    faSatellite,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

// Ensure map markers load correctly when Leaflet is bundled by React.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Coordinate = [number, number];

const HUB_COORDS: Record<string, Coordinate> = {
  kitwe: [-12.8167, 28.2],
  ndola: [-12.9667, 28.6333],
  solwezi: [-12.1833, 26.4],
  chingola: [-12.5333, 27.85],
};

function FlyToPosition({ center }: { center: Coordinate | null }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 13, { duration: 1.25 });
    }
  }, [center, map]);

  return null;
}

const seededOffset = (seed: string, maxDelta: number): number => {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((hash % 100) / 100 - 0.5) * maxDelta;
};

export default function VehicleTracking({ vehicle, lastBookedHub, bookingMeta }) {
  const [speed, setSpeed] = useState(0);
  const [route, setRoute] = useState<Coordinate[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCenter = useMemo<Coordinate>(() => {
    const hubKey = String(lastBookedHub || '').toLowerCase();
    const hub = HUB_COORDS[hubKey];

    if (hub) {
      return [
        hub[0] + seededOffset(String(vehicle.id), 0.02),
        hub[1] + seededOffset(String(vehicle.plate_number || vehicle.id), 0.02),
      ] as Coordinate;
    }

    return [-12.95 + seededOffset(String(vehicle.id), 0.03), 28.1 + seededOffset(String(vehicle.vehicle_name || ''), 0.03)] as Coordinate;
  }, [lastBookedHub, vehicle.id, vehicle.plate_number, vehicle.vehicle_name]);

  useEffect(() => {
    setRoute([startCenter]);
    setSpeed(Math.floor(Math.random() * 12) + 38);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setRoute((previous) => {
        const current = previous[previous.length - 1] || startCenter;
        const nextPoint: Coordinate = [
          current[0] + (Math.random() - 0.5) * 0.004,
          current[1] + (Math.random() - 0.5) * 0.004,
        ];

        const updated = [...previous, nextPoint];
        return updated.slice(-16);
      });

      setSpeed(Math.floor(Math.random() * 22) + 44);
    }, 3200);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCenter]);

  const activePoint = route[route.length - 1] || startCenter;

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Vehicle Telemetry</div>
        <div className="tracking-meta-grid">
          <div className="tracking-meta-item">
            <span><FontAwesomeIcon icon={faSatellite} /></span>
            <p>Vehicle</p>
            <strong>{vehicle.vehicle_name}</strong>
          </div>
          <div className="tracking-meta-item">
            <span><FontAwesomeIcon icon={faGaugeHigh} /></span>
            <p>Speed</p>
            <strong>{speed} km/h</strong>
          </div>
          <div className="tracking-meta-item">
            <span><FontAwesomeIcon icon={faRoad} /></span>
            <p>Status</p>
            <strong>{vehicle.tracking_enabled ? 'Active' : 'Inactive'}</strong>
          </div>
          <div className="tracking-meta-item">
            <span><FontAwesomeIcon icon={faBroadcastTower} /></span>
            <p>Route Points</p>
            <strong>{route.length}</strong>
          </div>
        </div>

        {bookingMeta && (
          <div className="tracking-booking-note">
            <div><strong>Dispatcher:</strong> {bookingMeta.dispatcher_name || 'Not assigned'}</div>
            <div><strong>ETA:</strong> {bookingMeta.eta ? new Date(bookingMeta.eta).toLocaleString() : 'Not available'}</div>
            <div><strong>Status Note:</strong> {bookingMeta.status_notes || 'No dispatcher notes yet.'}</div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">Route Visualization</div>
        <div className="map-panel tracking-map-panel">
          <MapContainer center={startCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FlyToPosition center={activePoint} />
            <Polyline positions={route} color="#30bdec" weight={4} />
            <Marker position={activePoint}>
              <Popup>
                <div>
                  <strong>{vehicle.vehicle_name}</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 12 }}>{vehicle.plate_number}</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      <div className="card">
        <div className="section-label">
          <FontAwesomeIcon icon={faCamera} style={{ marginRight: 8 }} />
          Live Feed (Simulated)
        </div>
        <div className="live-camera tracking-live-camera">
          <video
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            className="tracking-live-video"
          />
          <div className="tracking-live-overlay">LIVE FEED (SIMULATED)</div>
        </div>
      </div>
    </div>
  );
}
