import axios from 'axios';

const api = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true 
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tl_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
