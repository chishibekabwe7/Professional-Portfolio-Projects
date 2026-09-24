import { useEffect, useRef, useState } from 'react';
import api from '../api';
import {
    exportTripCSV,
    exportTripPDF,
    type Trip as ExportableTrip,
    type LocationLog,
} from '../utils/exportTrip';
import { reverseGeocode } from '../utils/geocode';
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
    recordedAt: string;
    latitude: number;
    longitude: number;
    speed: number;
  }>;
};

type TrackerDeviceSummary = {
  imei: string;
  label: string;
};

type TripAction = 'play' | 'csv' | 'pdf' | null;

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
  const [tripActions, setTripActions] = useState<Record<number, TripAction>>({});
  const [tripAddresses, setTripAddresses] = useState<Record<number, string>>({});
  const [visibleTripIds, setVisibleTripIds] = useState<Record<number, boolean>>({});
  const [replayCache, setReplayCache] = useState<Record<number, ReplayResponse>>({});
  const [deviceLabel, setDeviceLabel] = useState<string>(deviceId);

  const listRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const requestedAddressIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;

    setTripActions({});
    setTripAddresses({});
    setVisibleTripIds({});
    setReplayCache({});
    requestedAddressIdsRef.current = new Set();

    const fetchDeviceLabel = async (): Promise<void> => {
      try {
        const response = await api.get<TrackerDeviceSummary[]>('/locations/devices');
        const devices = Array.isArray(response.data) ? response.data : [];
        const selectedDevice = devices.find((device) => device.imei === deviceId);

        if (!isMounted) {
          return;
        }

        setDeviceLabel(selectedDevice?.label || deviceId);
      } catch (error) {
        if (isMounted) {
          setDeviceLabel(deviceId);
        }
      }
    };

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

    void fetchDeviceLabel();
    void fetchTrips();

    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  useEffect(() => {
    const root = listRef.current;

    if (!root || trips.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleTripIds((previous) => {
          const next = { ...previous };
          let changed = false;

          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }

            const tripId = Number((entry.target as HTMLElement).dataset.tripId);

            if (!Number.isFinite(tripId)) {
              continue;
            }

            if (!next[tripId]) {
              next[tripId] = true;
              changed = true;
            }
          }

          return changed ? next : previous;
        });
      },
      {
        root,
        threshold: 0.2,
      },
    );

    cardRefs.current.forEach((card) => {
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, [trips]);

  useEffect(() => {
    let isMounted = true;

    const resolveVisibleAddresses = async (): Promise<void> => {
      const pendingTrips = trips.filter(
        (trip) =>
          visibleTripIds[trip.id] &&
          !tripAddresses[trip.id] &&
          !requestedAddressIdsRef.current.has(trip.id),
      );

      for (const trip of pendingTrips) {
        requestedAddressIdsRef.current.add(trip.id);
        const address = await reverseGeocode(trip.startLat, trip.startLng);

        if (!isMounted) {
          return;
        }

        setTripAddresses((previous) => ({
          ...previous,
          [trip.id]: address,
        }));
      }
    };

    void resolveVisibleAddresses();

    return () => {
      isMounted = false;
    };
  }, [trips, tripAddresses, visibleTripIds]);

  const setTripCardRef =
    (tripId: number) =>
    (node: HTMLElement | null): void => {
      if (node) {
        cardRefs.current.set(tripId, node);
        return;
      }

      cardRefs.current.delete(tripId);
    };

  const setTripAction = (tripId: number, action: TripAction): void => {
    setTripActions((previous) => ({
      ...previous,
      [tripId]: action,
    }));
  };

  const toExportTrip = (trip: TripSummary): ExportableTrip => ({
    id: trip.id,
    deviceImei: trip.deviceImei,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    distanceKm: trip.distanceKm,
    durationSecs: trip.durationSecs,
    avgSpeedKmh: trip.avgSpeedKmh,
    maxSpeedKmh: trip.maxSpeedKmh,
  });

  const toExportLocations = (
    locations: ReplayResponse['locations'],
  ): LocationLog[] =>
    locations.map((location) => ({
      recordedAt: location.recordedAt,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      speed: Number(location.speed),
    }));

  const fetchReplayData = async (tripId: number): Promise<ReplayResponse | null> => {
    const cachedReplay = replayCache[tripId];

    if (cachedReplay) {
      return cachedReplay;
    }

    try {
      const response = await api.get<ReplayResponse>(`/locations/${deviceId}/trips/${tripId}/replay`);

      const normalizedLocations = (Array.isArray(response.data.locations)
        ? response.data.locations
        : []
      )
        .map((location) => ({
          recordedAt: location.recordedAt,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          speed: Number(location.speed),
        }))
        .filter(
          (location) =>
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude) &&
            typeof location.recordedAt === 'string',
        );

      const normalizedReplay: ReplayResponse = {
        trip: response.data.trip,
        locations: normalizedLocations,
      };

      setReplayCache((previous) => ({
        ...previous,
        [tripId]: normalizedReplay,
      }));

      return normalizedReplay;
    } catch (error) {
      console.error('Failed to load trip replay:', error);
      return null;
    }
  };

  const onPlayTrip = async (trip: TripSummary): Promise<void> => {
    setTripAction(trip.id, 'play');

    try {
      const replay = await fetchReplayData(trip.id);

      if (!replay) {
        return;
      }

      const replayLocations = replay.locations
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
            trip: replay.trip,
            locations: replayLocations,
          },
        }),
      );
    } catch (error) {
      console.error('Failed to load trip replay:', error);
    } finally {
      setTripAction(trip.id, null);
    }
  };

  const onExportCsv = async (trip: TripSummary): Promise<void> => {
    setTripAction(trip.id, 'csv');

    try {
      const replay = await fetchReplayData(trip.id);

      if (!replay) {
        return;
      }

      exportTripCSV(toExportTrip(trip), toExportLocations(replay.locations));
    } finally {
      setTripAction(trip.id, null);
    }
  };

  const onExportPdf = async (trip: TripSummary): Promise<void> => {
    setTripAction(trip.id, 'pdf');

    try {
      const replay = await fetchReplayData(trip.id);

      if (!replay) {
        return;
      }

      await exportTripPDF(
        toExportTrip(trip),
        toExportLocations(replay.locations),
        deviceLabel,
      );
    } finally {
      setTripAction(trip.id, null);
    }
  };

  return (
    <aside className="trip-history">
      <header className="trip-history__header">
        <h3>Trip History</h3>
        <span>{trips.length}</span>
      </header>

      <section className="trip-history__list" role="list" ref={listRef}>
        {isLoading && <div className="trip-history__state">Loading trips...</div>}

        {!isLoading && trips.length === 0 && (
          <div className="trip-history__state">No completed trips yet</div>
        )}

        {!isLoading &&
          trips.map((trip) => (
            <article
              key={trip.id}
              className="trip-history__card"
              role="listitem"
              data-trip-id={trip.id}
              ref={setTripCardRef(trip.id)}
            >
              <div className="trip-history__time">{formatTripDate(trip.startedAt)}</div>

              <div className="trip-history__meta">
                <span>{formatDuration(trip.durationSecs)}</span>
                <span>{trip.distanceKm.toFixed(1)} km</span>
              </div>

              <div className="trip-history__from">
                From:{' '}
                {tripAddresses[trip.id] ||
                  (visibleTripIds[trip.id] ? 'Resolving location...' : 'Address loads when visible')}
              </div>

              <div className="trip-history__speed">
                Avg {trip.avgSpeedKmh.toFixed(1)} km/h | Max {trip.maxSpeedKmh.toFixed(1)} km/h
              </div>

              <div className="trip-history__actions">
                <button
                  type="button"
                  className="trip-history__play"
                  onClick={() => {
                    void onPlayTrip(trip);
                  }}
                  disabled={(tripActions[trip.id] ?? null) !== null}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path fill="currentColor" d="M8 5v14l11-7z" />
                  </svg>
                  {tripActions[trip.id] === 'play' ? 'Loading...' : 'Play'}
                </button>

                <button
                  type="button"
                  className="trip-history__export"
                  onClick={() => {
                    void onExportCsv(trip);
                  }}
                  disabled={(tripActions[trip.id] ?? null) !== null}
                >
                  {tripActions[trip.id] === 'csv' ? 'Exporting...' : 'CSV'}
                </button>

                <button
                  type="button"
                  className={`trip-history__export ${tripActions[trip.id] === 'pdf' ? 'is-loading' : ''}`}
                  onClick={() => {
                    void onExportPdf(trip);
                  }}
                  disabled={(tripActions[trip.id] ?? null) !== null}
                >
                  {tripActions[trip.id] === 'pdf' ? (
                    <>
                      <span className="trip-history__spinner" aria-hidden="true" />
                      PDF...
                    </>
                  ) : (
                    'PDF'
                  )}
                </button>
              </div>
            </article>
          ))}
      </section>
    </aside>
  );
}
