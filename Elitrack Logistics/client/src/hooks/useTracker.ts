import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api';

type TrackerPoint = {
  lat: number;
  lng: number;
};

type CurrentPosition = {
  lat: number;
  lng: number;
  speed: number;
};

type HistoryRecord = {
  latitude: number;
  longitude: number;
};

type SocketLocationUpdate = {
  latitude: number;
  longitude: number;
  speed: number;
};

const MAX_HISTORY_POINTS = 1000;

const SOCKET_BASE_URL =
  process.env.REACT_APP_WS_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_NEST_API_URL ||
  'http://localhost:3001';

const SOCKET_NAMESPACE_URL = `${SOCKET_BASE_URL.replace(/\/+$/, '')}/tracking`;

export function useTracker(deviceId: string) {
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [history, setHistory] = useState<TrackerPoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async (): Promise<void> => {
      try {
        const response = await api.get<HistoryRecord[]>(`/locations/${deviceId}/history`);

        if (!isMounted) {
          return;
        }

        const points = (Array.isArray(response.data) ? response.data : [])
          .map((item) => ({
            lat: Number(item.latitude),
            lng: Number(item.longitude),
          }))
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

        setHistory(points);
      } catch (error) {
        console.error('Failed to load tracker history:', error);
      }
    };

    void fetchHistory();

    const socket = io(SOCKET_NAMESPACE_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      if (!isMounted) {
        return;
      }

      setIsConnected(true);
      socket.emit('subscribeToTracker', { deviceId });
    });

    socket.on('disconnect', () => {
      if (!isMounted) {
        return;
      }

      setIsConnected(false);
    });

    socket.on('locationUpdate', (data: SocketLocationUpdate) => {
      if (!isMounted) {
        return;
      }

      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      const speed = Number(data.speed);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      setCurrentPosition({
        lat: latitude,
        lng: longitude,
        speed: Number.isFinite(speed) ? speed : 0,
      });

      setHistory((previous) => {
        const next = [...previous, { lat: latitude, lng: longitude }];

        if (next.length <= MAX_HISTORY_POINTS) {
          return next;
        }

        return next.slice(next.length - MAX_HISTORY_POINTS);
      });

      setLastUpdated(new Date());
    });

    return () => {
      isMounted = false;
      socket.emit('unsubscribeFromTracker', { deviceId });
      socket.disconnect();
    };
  }, [deviceId]);

  return { currentPosition, history, isConnected, lastUpdated };
}