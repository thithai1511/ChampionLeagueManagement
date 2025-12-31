// Minimal apiClient for player portal usage
// You can replace this with your actual API client logic (e.g., axios instance)

const apiClient = {
  get: async (url, config) => {
    // Replace with real fetch/axios logic
    return fetch(url, { method: 'GET', ...config }).then(res => res.json());
  },
  post: async (url, data, config) => {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(config?.headers || {}) },
      body: JSON.stringify(data),
      ...config
    }).then(res => res.json());
  },
  // Add put, delete, etc. as needed
};

export default apiClient;
