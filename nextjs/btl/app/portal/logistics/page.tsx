'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Shipment {
  id: number;
  batchId: number;
  batchCode: string;
  productName: string;
  origin: string;
  destination: string;
  vehicleNumber: string;
  departedAt: string | null;
  arrivedAt: string | null;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
}

interface UpdateForm {
  location: string;
  temperature: string;
  humidity: string;
  note: string;
}

const STATUS_CFG = {
  PENDING:    { label: 'Chờ vận chuyển', color: 'bg-slate-100 text-slate-700 border-slate-300',   dot: 'bg-slate-400',   icon: '🕐' },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: 'bg-blue-50 text-blue-800 border-blue-200',      dot: 'bg-blue-500',    icon: '🚛' },
  DELIVERED:  { label: 'Đã giao hàng',   color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', icon: '✅' },
};

// ─── Helper ────────────────────────────────────────────────────────────────
function getDriverIdFromToken(): number | null {
  try {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
    if (!cookie) return null;
    const p = JSON.parse(atob(cookie.split('=')[1].split('.')[1]));
    return p.sub ?? p.id ?? p.userId ?? null;
  } catch { return null; }
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold
      ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function LogisticsDashboard() {
  const router = useRouter();
  const [driverId, setDriverId]             = useState<number | null>(null);
  const [shipments, setShipments]           = useState<Shipment[]>([]);
  const [selected, setSelected]             = useState<Shipment | null>(null);
  const [tab, setTab]                       = useState<'info' | 'update'>('info');
  const [toast, setToast]                   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [filterStatus, setFilterStatus]     = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');

  const [form, setForm] = useState<UpdateForm>({
    location: '', temperature: '', humidity: '', note: '',
  });

  const labelCls = 'block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5';
  const inputCls = 'w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white';

  useEffect(() => {
    const id = getDriverIdFromToken();
    if (!id) { router.push('/login'); return; }
    setDriverId(id);
    fetchShipments(id);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchShipments = async (id: number) => {
    try {
      const res = await apiClient.get(`/api/logistics/shipments/${id}`);
      setShipments(res.data);
    } catch (e: any) { console.error('Lỗi fetch shipments:', e?.response?.status); }
  };

  // Cập nhật vị trí + điều kiện bảo quản → ghi vào tracking_events
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !driverId) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/logistics/update', {
        shipmentId:  selected.id,
        batchId:     selected.batchId,
        actorId:     driverId,
        location:    form.location,
        temperature: form.temperature ? Number(form.temperature) : null,
        humidity:    form.humidity    ? Number(form.humidity)    : null,
        note:        form.note,
        eventName:   `Cập nhật vị trí: ${form.location}`,
      });
      showToast('Cập nhật thành công! Timeline đã được ghi.', 'success');
      setForm({ location: '', temperature: '', humidity: '', note: '' });
      setTab('info');
      if (driverId) fetchShipments(driverId);
    } catch { showToast('Lỗi khi cập nhật', 'error'); }
    finally { setIsSubmitting(false); }
  };

  // Bắt đầu / kết thúc chuyến hàng
  const handleChangeStatus = async (newStatus: 'IN_TRANSIT' | 'DELIVERED') => {
    if (!selected || !driverId) return;
    try {
      await apiClient.patch(`/api/logistics/shipments/${selected.id}/status`, {
        status: newStatus, actorId: driverId,
      });
      showToast(
        newStatus === 'IN_TRANSIT' ? '🚛 Bắt đầu vận chuyển!' : '✅ Đã xác nhận giao hàng!',
        'success',
      );
      if (driverId) fetchShipments(driverId);
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    } catch { showToast('Lỗi cập nhật trạng thái', 'error'); }
  };

  const filtered = filterStatus === 'ALL' ? shipments : shipments.filter(s => s.status === filterStatus);

  const stats = [
    { label: 'Tổng chuyến',      value: shipments.length,                                         icon: '📦', color: 'text-slate-900' },
    { label: 'Đang vận chuyển',  value: shipments.filter(s => s.status === 'IN_TRANSIT').length,  icon: '🚛', color: 'text-blue-800'  },
    { label: 'Đã giao thành công', value: shipments.filter(s => s.status === 'DELIVERED').length, icon: '✅', color: 'text-emerald-800'},
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {toast && <Toast {...toast} />}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-sm">🚛</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 leading-none tracking-wide uppercase">Hệ sinh thái nông sản</p>
            <h1 className="text-base font-black text-slate-900 leading-tight tracking-tight">Quản lý vận chuyển</h1>
          </div>
        </div>
        <button onClick={() => { document.cookie = 'token=; path=/; max-age=0'; router.push('/login'); }}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Đăng xuất
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className={`text-4xl font-black tracking-tight ${s.color}`}>{s.value}</p>
              <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Danh sách chuyến hàng ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-slate-900 tracking-tight mb-3">Danh sách chuyến hàng</h2>
              {/* Filter tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['ALL','PENDING','IN_TRANSIT','DELIVERED'] as const).map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all
                      ${filterStatus === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {f === 'ALL' ? 'Tất cả' : STATUS_CFG[f].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="text-5xl mb-3">📭</span>
                  <p className="text-sm font-bold text-slate-400">Không có chuyến hàng nào</p>
                </div>
              ) : filtered.map(ship => {
                const s = STATUS_CFG[ship.status];
                const isSelected = selected?.id === ship.id;
                return (
                  <button key={ship.id} onClick={() => { setSelected(ship); setTab('info'); }}
                    className={`w-full text-left px-6 py-4 transition-all flex items-center justify-between group ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-14 rounded-full transition-all ${isSelected ? 'bg-blue-500' : 'bg-slate-200 group-hover:bg-slate-300'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-sm tracking-tight">{ship.batchCode}</p>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                            {ship.productName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs font-semibold text-slate-600">{ship.origin}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-xs font-semibold text-slate-600">{ship.destination}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">🚗 {ship.vehicleNumber}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${s.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel phải ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              {selected ? (
                <>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{selected.productName}</p>
                  <h2 className="font-black text-slate-900 tracking-tight">{selected.batchCode}</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">🚗 {selected.vehicleNumber}</p>
                </>
              ) : (
                <h2 className="font-bold text-slate-400">Chọn chuyến hàng để thao tác</h2>
              )}

              {selected && (
                <div className="flex gap-1 mt-3 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setTab('info')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${tab === 'info' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                    📋 Chi tiết
                  </button>
                  <button onClick={() => setTab('update')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${tab === 'update' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                    📡 Cập nhật
                  </button>
                </div>
              )}
            </div>

            {/* Trạng thái rỗng */}
            {!selected && (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-slate-300">
                <span className="text-5xl mb-3">👈</span>
                <p className="text-sm font-bold text-slate-400">Chọn chuyến để xem chi tiết</p>
              </div>
            )}

            {/* Tab: Chi tiết */}
            {selected && tab === 'info' && (
              <div className="flex-1 p-5 overflow-y-auto">
                {/* Hành trình */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Hành trình</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-black mx-auto mb-1">A</div>
                      <p className="text-xs font-bold text-slate-800">{selected.origin}</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex-1 h-0.5 bg-slate-200" />
                      <span className="text-xl mx-1">🚛</span>
                      <div className="flex-1 h-0.5 bg-slate-200" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-black mx-auto mb-1">B</div>
                      <p className="text-xs font-bold text-slate-800">{selected.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Thông tin chi tiết */}
                <div className="space-y-2 mb-5">
                  {[
                    { label: 'Trạng thái', value: STATUS_CFG[selected.status].label },
                    { label: 'Biển số xe', value: selected.vehicleNumber },
                    { label: 'Khởi hành', value: selected.departedAt ? new Date(selected.departedAt).toLocaleString('vi-VN') : '—' },
                    { label: 'Đến nơi',   value: selected.arrivedAt  ? new Date(selected.arrivedAt).toLocaleString('vi-VN')  : '—' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{row.label}</span>
                      <span className="text-xs font-bold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  {selected.status === 'PENDING' && (
                    <button onClick={() => handleChangeStatus('IN_TRANSIT')}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                      🚛 Bắt đầu vận chuyển
                    </button>
                  )}
                  {selected.status === 'IN_TRANSIT' && (
                    <>
                      <button onClick={() => setTab('update')}
                        className="w-full py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-sm font-black transition-all">
                        📡 Cập nhật vị trí & điều kiện
                      </button>
                      <button onClick={() => handleChangeStatus('DELIVERED')}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all">
                        ✅ Xác nhận đã giao hàng
                      </button>
                    </>
                  )}
                  {selected.status === 'DELIVERED' && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-lg">✅</span>
                      <span className="text-sm font-black text-emerald-800">Chuyến hàng hoàn tất</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Cập nhật */}
            {selected && tab === 'update' && (
              <form onSubmit={handleUpdate} className="flex flex-col flex-1 p-5 gap-4 overflow-y-auto">

                {/* Vị trí */}
                <div>
                  <label className={labelCls}>📍 Vị trí hiện tại <span className="text-red-500 normal-case tracking-normal">*</span></label>
                  <input type="text" required
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="VD: Trạm thu phí Hòa Lạc, Hà Nội"
                    className={inputCls} />
                </div>

                {/* Nhiệt độ + Độ ẩm */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>🌡️ Nhiệt độ (°C)</label>
                    <input type="number" step="0.1"
                      value={form.temperature}
                      onChange={e => setForm({ ...form, temperature: e.target.value })}
                      placeholder="VD: 18.5"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>💧 Độ ẩm (%)</label>
                    <input type="number" step="0.1" min="0" max="100"
                      value={form.humidity}
                      onChange={e => setForm({ ...form, humidity: e.target.value })}
                      placeholder="VD: 75"
                      className={inputCls} />
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="flex-1">
                  <label className={labelCls}>📝 Ghi chú</label>
                  <textarea
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    rows={3}
                    placeholder="VD: Hàng nguyên vẹn, xe chạy đúng lịch trình..."
                    className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                  {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  📡 Ghi nhận & cập nhật Timeline
                </button>
              </form>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}