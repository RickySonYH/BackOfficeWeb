// [advice from AI] 데이터 초기화 전용 API 서비스 (포트 6000)
import axios from 'axios';

const DATA_INIT_API_BASE_URL = 'http://localhost:2000';

const dataInitApi = axios.create({
  baseURL: DATA_INIT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

dataInitApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

dataInitApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default dataInitApi;
