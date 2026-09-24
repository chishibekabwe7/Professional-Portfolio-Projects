import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { io } from 'socket.io-client';
import api from '../api';
import { ScoreBadge } from '../components/ScoreBadge';
import './DeviceList.css';

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

type DailyScore = {
  id: number;
  deviceImei: string;
  date: string;
  score: number;
  speedViolations: number;
  idleMinutes: number;
  totalKm: number;
  totalTrips: number;
  harshEvents: number;
};

type FleetScoreEntry = {
  device: TrackerDevice;
  score: DailyScore | null;
};

type DeviceCard = {
  device: TrackerDevice;
  score: number;
  scoreLabel: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  statusRank: number;
  speed: number;
  lastSeenAt: string | null;
  scoreBorderColor: string;
};

type SocketLocationUpdate = {
  imei: string;
  speed: number;
  timestamp: string | Date;
};

type ChartPoint = {
  dateLabel: string;
  score: number;
  speedViolations: number;
  idleMinutes: number;
  harshEvents: number;
  totalKm: number;
  totalTrips: number;
  fill: string;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const IDLE_SPEED_KMH = 5;

const SOCKET_BASE_URL =
  process.env.REACT_APP_WS_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_NEST_API_URL ||
  'http://localhost:3001';

const SOCKET_NAMESPACE_URL = `${SOCKET_BASE_URL.replace(/\/+$/, '')}/tracking`;

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

const scoreColor = (score: number): string => {
  if (score >= 90) {
    return '#16a34a';
  }

  if (score >= 70) {
    return '#f59e0b';
  }

  if (score >= 50) {
    return '#f97316';
  }

  return '#ef4444';
};

const scoreLabel = (score: number): string => {
  if (score >= 90) {
    return 'Excellent';
  }

  if (score >= 70) {
    return 'Good';
  }

  if (score >= 50) {
    return 'Fair';
  }

  return 'Poor';
};

const statusRankMap: Record<DeviceCard['status'], number> = {
  ONLINE: 0,
  IDLE: 1,
  OFFLINE: 2,
};

const isDeviceFresh = (lastSeenAt: string | null): boolean => {
  if (!lastSeenAt) {
    return false;
  }

  const time = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(time)) {
    return false;
  }

  return Date.now() - time <= ONLINE_WINDOW_MS;
};

function ScoreTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const data = props.payload[0].payload;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(148, 163, 184, 0.35)',
        borderRadius: 10,
        padding: '10px 12px',
        color: '#f8fafc',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <div>Score: {data.score}</div>
      <div>Speed violations: {data.speedViolations}</div>
      <div>Idle minutes: {data.idleMinutes}</div>
      <div>Harsh brakes: {data.harshEvents}</div>
      <div>Distance: {data.totalKm.toFixed(1)} km</div>
      <div>Trips: {data.totalTrips}</div>
    </div>
  );
}

export default function DeviceList() {
  const navigate = useNavigate();
  const [fleetData, setFleetData] = useState<FleetScoreEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedImei, setSelectedImei] = useState<string>('');
  const [scoreHistory, setScoreHistory] = useState<DailyScore[]>([]);
  const [todayScore, setTodayScore] = useState<DailyScore | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [liveSpeedMap, setLiveSpeedMap] = useState<Record<string, number>>({});
  const [liveSeenMap, setLiveSeenMap] = useState<Record<string, string>>({});

  const fleetImeis = useMemo(
    () => Array.from(new Set(fleetData.map((item) => item.device.imei))),
    [fleetData],
  );

  const fetchFleetScores = async (): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<FleetScoreEntry[]>('/locations/fleet/scores');
      const entries = Array.isArray(response.data) ? response.data : [];
      setFleetData(entries);

      if (entries.length > 0) {
        setSelectedImei((previous) =>
          previous && entries.some((entry) => entry.device.imei === previous)
            ? previous
            : entries[0].device.imei,
        );
      }

      setLiveSpeedMap((previous) => {
        const next = { ...previous };

        for (const entry of entries) {
          if (next[entry.device.imei] === undefined) {
            next[entry.device.imei] = Number(entry.device.locations?.[0]?.speed ?? 0);
          }
        }

        return next;
      });

      setLiveSeenMap((previous) => {
        const next = { ...previous };

        for (const entry of entries) {
          const lastSeenAt = entry.device.lastSeenAt;

          if (lastSeenAt && !next[entry.device.imei]) {
            next[entry.device.imei] = lastSeenAt;
          }
        }

        return next;
      });
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load fleet scores.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFleetScores();

    const timer = window.setInterval(() => {
      void fetchFleetScores();
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (fleetImeis.length === 0) {
      return;
    }

    const socket = io(SOCKET_NAMESPACE_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      for (const imei of fleetImeis) {
        socket.emit('subscribeToTracker', { deviceId: imei });
      }
    });

    socket.on('locationUpdate', (data: SocketLocationUpdate) => {
      const imei = String(data.imei ?? '');

      if (!imei) {
        return;
      }

      const speed = Number(data.speed);
      const timestamp = new Date(data.timestamp);

      setLiveSpeedMap((previous) => ({
        ...previous,
        [imei]: Number.isFinite(speed) ? speed : 0,
      }));

      if (!Number.isNaN(timestamp.getTime())) {
        setLiveSeenMap((previous) => ({
          ...previous,
          [imei]: timestamp.toISOString(),
        }));
      }
    });

    return () => {
      for (const imei of fleetImeis) {
        socket.emit('unsubscribeFromTracker', { deviceId: imei });
      }

      socket.disconnect();
    };
  }, [fleetImeis.join('|')]);

  const sortedCards = useMemo<DeviceCard[]>(() => {
    return fleetData
      .map((entry) => {
        const imei = entry.device.imei;
        const speed = Number(
          liveSpeedMap[imei] ?? entry.device.locations?.[0]?.speed ?? 0,
        );
        const lastSeenAt = liveSeenMap[imei] ?? entry.device.lastSeenAt;
        const score = Math.max(0, Math.min(100, Math.round(entry.score?.score ?? 100)));

        let status: DeviceCard['status'] = 'OFFLINE';

        if (isDeviceFresh(lastSeenAt)) {
          status = speed <= IDLE_SPEED_KMH ? 'IDLE' : 'ONLINE';
        }

        return {
          device: entry.device,
          score,
          scoreLabel: scoreLabel(score),
          status,
          statusRank: statusRankMap[status],
          speed: Number.isFinite(speed) ? speed : 0,
          lastSeenAt,
          scoreBorderColor: scoreColor(score),
        };
      })
      .sort((a, b) => {
        if (a.statusRank !== b.statusRank) {
          return a.statusRank - b.statusRank;
        }

        if (a.score !== b.score) {
          return b.score - a.score;
        }

        return a.device.label.localeCompare(b.device.label);
      });
  }, [fleetData, liveSeenMap, liveSpeedMap]);

  useEffect(() => {
    if (sortedCards.length === 0) {
      return;
    }

    if (!selectedImei || !sortedCards.some((item) => item.device.imei === selectedImei)) {
      setSelectedImei(sortedCards[0].device.imei);
    }
  }, [selectedImei, sortedCards]);

  useEffect(() => {
    if (!selectedImei) {
      setScoreHistory([]);
      setTodayScore(null);
      return;
    }

    let isMounted = true;

    const fetchScoreHistory = async (): Promise<void> => {
      setLoadingHistory(true);

      try {
        const [historyResponse, todayResponse] = await Promise.all([
          api.get<DailyScore[]>(`/locations/${selectedImei}/score/history`, {
            params: { days: 30 },
          }),
          api.get<DailyScore | null>(`/locations/${selectedImei}/score/today`),
        ]);

        if (!isMounted) {
          return;
        }

        setScoreHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
        setTodayScore(todayResponse.data ?? null);
      } catch (historyError) {
        if (!isMounted) {
          return;
        }

        const message = historyError instanceof Error ? historyError.message : 'Failed to load score history.';
        setError(message);
        setScoreHistory([]);
        setTodayScore(null);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    void fetchScoreHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedImei]);

  const selectedCard = sortedCards.find((card) => card.device.imei === selectedImei) ?? null;

  const chartData = useMemo<ChartPoint[]>(() => {
    return scoreHistory.map((item) => {
      const date = new Date(item.date);
      const dateLabel = Number.isNaN(date.getTime())
        ? 'N/A'
        : date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });

      const fill = item.score > 80 ? '#16a34a' : item.score >= 60 ? '#f59e0b' : '#ef4444';

      return {
        dateLabel,
        score: Math.max(0, Math.min(100, Math.round(item.score))),
        speedViolations: item.speedViolations,
        idleMinutes: item.idleMinutes,
        harshEvents: item.harshEvents,
        totalKm: item.totalKm,
        totalTrips: item.totalTrips,
        fill,
      };
    });
  }, [scoreHistory]);

  const todayBreakdown = todayScore ?? (scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : null);

  return (
    <div className="fleet-page">
      <div className="fleet-shell">
        <header className="fleet-header">
          <div>
            <h1 className="fleet-title">Fleet Overview</h1>
            <div className="fleet-subtitle">
              Live device status and driver behaviour scoring across your fleet.
            </div>
          </div>

          <button
            type="button"
            className="fleet-refresh-btn"
            onClick={() => {
              void fetchFleetScores();
            }}
          >
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="fleet-state">Loading fleet dashboard...</div>
        ) : sortedCards.length === 0 ? (
          <div className="fleet-state">No fleet devices found.</div>
        ) : (
          <section className="fleet-grid">
            {sortedCards.map((card) => (
              <article
                key={card.device.id}
                className={`fleet-card ${selectedImei === card.device.imei ? 'is-selected' : ''}`}
                style={{ borderColor: card.scoreBorderColor }}
                onClick={() => setSelectedImei(card.device.imei)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedImei(card.device.imei);
                  }
                }}
              >
                <div className="fleet-card__header">
                  <div>
                    <h3 className="fleet-card__name">{card.device.label}</h3>
                    <div className="fleet-card__imei">{card.device.imei}</div>
                  </div>

                  <span
                    className={`fleet-status ${
                      card.status === 'ONLINE'
                        ? 'is-online'
                        : card.status === 'IDLE'
                          ? 'is-idle'
                          : 'is-offline'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div className="fleet-card__stats">
                  <div className="fleet-card__speed">Speed: {Math.round(card.speed)} km/h</div>
                  <div className="fleet-card__last-seen">
                    Last seen: {formatRelativeTime(card.lastSeenAt)}
                  </div>
                </div>

                <div className="fleet-card__score">
                  <ScoreBadge score={card.score} size="md" />
                  <div className="fleet-card__score-meta">
                    <span className="fleet-card__score-label">Driver score</span>
                    <span className="fleet-card__score-grade">{card.scoreLabel}</span>
                  </div>
                </div>

                <div className="fleet-card__actions">
                  <button
                    type="button"
                    className="fleet-track-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/track/${card.device.imei}`);
                    }}
                  >
                    Track
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="fleet-chart-card">
          <div>
            <h2 className="fleet-chart-title">
              {selectedCard ? `Score History - ${selectedCard.device.label}` : 'Score History'}
            </h2>
            <div className="fleet-chart-subtitle">Last 30 days</div>
          </div>

          {error && <div className="fleet-subtitle">{error}</div>}

          {loadingHistory ? (
            <div className="fleet-state">Loading score history...</div>
          ) : chartData.length === 0 ? (
            <div className="fleet-state">No score history available for this device.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                  <XAxis dataKey="dateLabel" stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#cbd5e1" tick={{ fontSize: 11 }} />
                  <Tooltip content={<ScoreTooltip />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((item, index) => (
                      <Cell key={`${item.dateLabel}-${index}`} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="fleet-breakdown-grid">
            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Speed violations</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.speedViolations ?? 0}</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Idle time</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.idleMinutes ?? 0} min</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Harsh brakes</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.harshEvents ?? 0}</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Distance</div>
              <div className="fleet-breakdown-value">{(todayBreakdown?.totalKm ?? 0).toFixed(1)} km</div>
            </div>

            <div className="fleet-breakdown-tile">
              <div className="fleet-breakdown-label">Trips</div>
              <div className="fleet-breakdown-value">{todayBreakdown?.totalTrips ?? 0}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
