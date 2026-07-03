import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true, // Send HTTP-only cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor if needed
api.interceptors.request.use((config) => {
  // If we were using localstorage token (Bearer), it would go here.
  // With HTTP-only cookies, the browser handles it automatically if withCredentials is true.
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    // Optional: handle unauthorized globally (e.g. redirect to login)
    // Note: since this can run on server or client, be careful with window.location
    if (typeof window !== 'undefined') {
      // Avoid redirect loops on login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
});

export default api;
