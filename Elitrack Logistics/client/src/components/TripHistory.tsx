import { useEffect, useState } from 'react';
import api from '../api';
import './TripHistory.css';

type TripHistoryProps = {
  deviceId: string;
};

type TripSummary = {
  id: number;
  deviceImei: string;
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  durationSecs: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startLat: number;
  startLng: number;
  endLat: number | null;
  endLng: number | null;
  isComplete: boolean;
};

type ReplayResponse = {
  trip: TripSummary;
  locations: Array<{
    latitude: number;
    longitude: number;
  }>;
};

const formatTripDate = (startedAt: string): string => {
  const date = new Date(startedAt);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDuration = (durationSecs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(durationSecs));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

export function TripHistory({ deviceId }: TripHistoryProps) {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTrips = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await api.get<TripSummary[]>(`/locations/${deviceId}/trips`, {
          params: { limit: 30 },
        });

        if (!isMounted) {
          return;
        }

        setTrips(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load trip history:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchTrips();

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  const onPlayTrip = async (tripId: number): Promise<void> => {
    setActiveTripId(tripId);

    try {
      const response = await api.get<ReplayResponse>(`/locations/${deviceId}/trips/${tripId}/replay`);

      const replayLocations = (Array.isArray(response.data.locations) ? response.data.locations : [])
        .map((item) => ({
          lat: Number(item.latitude),
          lng: Number(item.longitude),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

      if (replayLocations.length === 0) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent('elitrack:trip-playback', {
          detail: {
            trip: response.data.trip,
            locations: replayLocations,
          },
        }),
      );
    } catch (error) {
      console.error('Failed to load trip replay:', error);
    } finally {
      setActiveTripId(null);
    }
  };

  return (
    <aside className="trip-history">
      <header className="trip-history__header">
        <h3>Trip History</h3>
        <span>{trips.length}</span>
      </header>

      <section className="trip-history__list" role="list">
        {isLoading && <div className="trip-history__state">Loading trips...</div>}

        {!isLoading && trips.length === 0 && (
          <div className="trip-history__state">No completed trips yet</div>
        )}

        {!isLoading &&
          trips.map((trip) => (
            <article key={trip.id} className="trip-history__card" role="listitem">
              <div className="trip-history__time">{formatTripDate(trip.startedAt)}</div>

              <div className="trip-history__meta">
                <span>{formatDuration(trip.durationSecs)}</span>
                <span>{trip.distanceKm.toFixed(1)} km</span>
              </div>

              <div className="trip-history__speed">
                Avg {trip.avgSpeedKmh.toFixed(1)} km/h | Max {trip.maxSpeedKmh.toFixed(1)} km/h
              </div>

              <button
                type="button"
                className="trip-history__play"
                onClick={() => {
                  void onPlayTrip(trip.id);
                }}
                disabled={activeTripId === trip.id}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path fill="currentColor" d="M8 5v14l11-7z" />
                </svg>
                {activeTripId === trip.id ? 'Loading...' : 'Play'}
              </button>
            </article>
          ))}
      </section>
    </aside>
  );
}
