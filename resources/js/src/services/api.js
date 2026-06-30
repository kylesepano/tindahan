import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('commerce_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('commerce_token');
            localStorage.removeItem('commerce_user');
            if (!window.location.pathname.startsWith('/login')) {
                window.location.assign('/login');
            }
        }

        return Promise.reject(error);
    },
);
