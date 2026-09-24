const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_INTERVAL_MS = 1000;
const LOCATION_UNAVAILABLE = 'Location unavailable';

const geocodeCache = new Map<string, string>();
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAtMs = 0;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const toCacheKey = (lat: number, lng: number): string =>
  `${lat.toFixed(4)},${lng.toFixed(4)}`;

const shortenDisplayName = (displayName: string): string => {
  const parts = displayName
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return LOCATION_UNAVAILABLE;
  }

  return parts.join(', ');
};

const queueRequest = async <T>(task: () => Promise<T>): Promise<T> => {
  const scheduledTask = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAtMs;
    const waitMs = Math.max(0, REQUEST_INTERVAL_MS - elapsed);

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastRequestAtMs = Date.now();
    return task();
  });

  requestQueue = scheduledTask.then(
    () => undefined,
    () => undefined,
  );

  return scheduledTask;
};

const fetchReverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const searchParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    zoom: '16',
    addressdetails: '1',
  });

  const url = `${NOMINATIM_URL}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Elitrack-Logistics-App/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return LOCATION_UNAVAILABLE;
    }

    const payload = (await response.json()) as {
      display_name?: string;
    };

    if (!payload.display_name || typeof payload.display_name !== 'string') {
      return LOCATION_UNAVAILABLE;
    }

    return shortenDisplayName(payload.display_name);
  } catch (error) {
    return LOCATION_UNAVAILABLE;
  }
};

export function getCachedReverseGeocode(lat: number, lng: number): string | undefined {
  return geocodeCache.get(toCacheKey(lat, lng));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return LOCATION_UNAVAILABLE;
  }

  const cacheKey = toCacheKey(lat, lng);
  const cachedValue = geocodeCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const resolvedAddress = await queueRequest(() => fetchReverseGeocode(lat, lng));
  geocodeCache.set(cacheKey, resolvedAddress || LOCATION_UNAVAILABLE);

  return geocodeCache.get(cacheKey) ?? LOCATION_UNAVAILABLE;
}
