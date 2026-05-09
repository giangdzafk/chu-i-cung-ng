'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); 
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'FARMER', 
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin 
        ? 'http://127.0.0.1:3005/identity/login' 
        : 'http://127.0.0.1:3005/identity/register';

      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra!');
      }

      if (isLogin) {
        document.cookie = `token=${data.accessToken}; path=/; max-age=86400`;

        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        const role = payload.role; 

        const roleRoutes: Record<string, string> = {
          ADMIN: '/portal/admin',
          FARMER: '/portal/farmer',
          PROCESSOR: '/portal/processor',
          LOGISTICS: '/portal/logistics',
          RETAILER: '/portal/retailer',
        };

        const destination = roleRoutes[role] ?? '/traceability';
        router.push(destination);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-100 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header - giữ nền xanh nhưng chữ phụ đổi sang trắng đậm hơn */}
        <div className="p-8 text-center bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-2xl">🌱</div>
          <h1 className="text-2xl font-black text-white mb-1">Hệ Sinh Thái Nông Sản</h1>
          <p className="text-white/90 text-sm font-medium">{isLogin ? 'Chào mừng quay lại!' : 'Tham gia cùng chúng tôi'}</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Họ và Tên</label>
                <input
                  type="text" name="fullName" required
                  value={formData.fullName} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500"
                  placeholder="Nguyễn Văn Nông"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
              <input
                type="email" name="email" required
                value={formData.email} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500"
                placeholder="nongdan@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Mật khẩu</label>
              <input
                type="password" name="password" required
                value={formData.password} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Bạn là ai?</label>
                <select
                  name="role" value={formData.role} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="FARMER">Nông dân (Farmer)</option>
                  <option value="PROCESSOR">Nhà chế biến (Processor)</option>
                  <option value="LOGISTICS">Đơn vị vận chuyển (Logistics)</option>
                  <option value="CONSUMER">Khách hàng (Consumer)</option>
                </select>
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
            >
              {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}