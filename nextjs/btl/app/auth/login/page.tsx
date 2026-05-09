'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/api/auth/login', { email, password });
      
      const { accessToken, user } = res.data;

      // 1. Lưu token vào Cookie để Middleware đọc được (Hạn 1 ngày)
      document.cookie = `token=${accessToken}; path=/; max-age=86400`;
      
      // 2. Điều hướng dựa trên Role
      if (user.role === 'ADMIN') router.push('/admin');
      else if (user.role === 'FARMER') router.push('/farmer');
      else if (user.role === 'PROCESSOR') router.push('/processor');
      else if (user.role === 'LOGISTICS') router.push('/logistics');
      
    } catch (error) {
      alert('Đăng nhập thất bại. Sai email hoặc mật khẩu!');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="p-8 bg-white rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-green-700">Đăng Nhập Hệ Sinh Thái</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          className="w-full mb-6 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
          Đăng Nhập
        </button>
      </form>
    </div>
  );
}