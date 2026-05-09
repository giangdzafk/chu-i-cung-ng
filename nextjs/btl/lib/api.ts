import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:3005', // Đổi cổng nếu NestJS của bạn chạy cổng khác
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động nhét Token vào mọi Request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Lấy token từ cookie bằng regex đơn giản
    const match = document.cookie.match(/(^| )token=([^;]+)/);
    const token = match ? match[2] : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});