import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor to attach JWT token and active workspace ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cofound_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const workspaceId = localStorage.getItem('cofound_workspace_id');
  if (workspaceId) {
    config.headers['x-workspace-id'] = workspaceId;
  }

  return config;
});

// Interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Clear token if expired
      localStorage.removeItem('cofound_token');
    }
    return Promise.reject(error);
  }
);

export default api;
