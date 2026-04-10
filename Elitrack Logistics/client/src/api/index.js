import axios from 'axios';

const API_CACHE_PREFIX = 'tl_api_cache_v1:';
const API_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const parseBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }

  return fallback;
};

const USE_NEST_API = parseBoolean(
  process.env.REACT_APP_USE_NEST_API ?? process.env.USE_NEST_API,
  true
);

const EXPRESS_API_BASE_URL = process.env.REACT_APP_EXPRESS_API_URL || '/api';
const NEST_API_BASE_URL = process.env.REACT_APP_NEST_API_URL || 'http://localhost:4001';
const NORMALIZED_EXPRESS_API_BASE_URL = EXPRESS_API_BASE_URL.replace(/\/+$/, '');
const NORMALIZED_NEST_API_BASE_URL = NEST_API_BASE_URL.replace(/\/+$/, '');

const isAdminEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    return false;
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return false;
  }

  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');
};

const resolveApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  return USE_NEST_API ? NORMALIZED_NEST_API_BASE_URL : NORMALIZED_EXPRESS_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl().replace(/\/+$/, '');

export const buildApiUrl = (path) => {
  const endpoint = String(path || '');

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetBaseUrl = isAdminEndpoint(normalizedPath)
    ? NORMALIZED_NEST_API_BASE_URL
    : API_BASE_URL;

  return `${targetBaseUrl}${normalizedPath}`;
};

const getCacheKey = (config) => {
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${API_CACHE_PREFIX}${url}?${params}`;
};

const readCache = (key) => {
  if (!key) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || typeof parsed.data === 'undefined') return null;

    if (Date.now() - parsed.savedAt > API_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  if (!key) return;

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      })
    );
  } catch {
    // Ignore quota and serialization errors.
  }
};

const notifyApiStatus = (eventName, message) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { message } }));
};

const api = axios.create({ 
  baseURL: API_BASE_URL,
  withCredentials: true 
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;

  if (isAdminEndpoint(cfg.url || '')) {
    cfg.baseURL = NORMALIZED_NEST_API_BASE_URL;
  }

  if ((cfg.method || 'get').toLowerCase() === 'get') {
    cfg.__cacheKey = getCacheKey(cfg);
  }

  return cfg;
});

api.interceptors.response.use(
  (response) => {
    if ((response.config.method || 'get').toLowerCase() === 'get') {
      writeCache(response.config.__cacheKey, response.data);
    }

    notifyApiStatus('api-online', '');
    return response;
  },
  (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();

    if (!error.response) {
      const cached = method === 'get' ? readCache(config.__cacheKey) : null;

      if (cached !== null) {
        notifyApiStatus('api-offline', 'You are offline. Showing recently cached data.');
        return Promise.resolve({
          data: cached,
          status: 200,
          statusText: 'OK (cache)',
          headers: { 'x-cache': 'HIT' },
          config,
          request: null,
        });
      }

      error.userMessage = 'Cannot reach the server. Check your internet connection and try again.';
      notifyApiStatus('api-offline', error.userMessage);
      return Promise.reject(error);
    }

    if (error.response.status >= 500) {
      error.userMessage = 'Server error. Please try again in a moment.';
      notifyApiStatus('api-offline', error.userMessage);
    } else {
      error.userMessage = error.response.data?.error || 'Request failed. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default api;
