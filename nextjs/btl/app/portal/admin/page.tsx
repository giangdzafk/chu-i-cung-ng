'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Overview {
  users:    { total: number; byRole: Record<string, number> };
  batches:  { total: number; byStatus: Record<string, number> };
  farms:    { total: number };
  products: { total: number };
  recentEvents: { batchCode: string; eventName: string; eventTime: string; location: string }[];
}
interface Product { id: number; name: string; description: string; category: string; }
interface Farm    { id: number; name: string; address: string; areaSize: number; farmerId: number; }
interface Batch   { id: number; batchCode: string; quantity: number; unit: string; currentStatus: string; product?: { name: string; category: string }; }

// ─── Config ─────────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ADMIN:     { label: 'Quản trị viên', icon: '⚙️', color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  FARMER:    { label: 'Nông dân',      icon: '👨‍🌾', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  PROCESSOR: { label: 'Chế biến',      icon: '🏭', color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
  LOGISTICS: { label: 'Vận chuyển',    icon: '🚛', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  RETAILER:  { label: 'Bán lẻ',        icon: '🏪', color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bar: string; dot: string }> = {
  PLANTED:       { label: 'Đang trồng',      color: 'text-blue-700',    bar: 'bg-blue-500',    dot: 'bg-blue-500' },
  HARVESTED:     { label: 'Đã thu hoạch',    color: 'text-amber-700',   bar: 'bg-amber-500',   dot: 'bg-amber-500' },
  IN_PROCESSING: { label: 'Đang chế biến',   color: 'text-orange-700',  bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  QC_FAILED:     { label: 'Không đạt QC',    color: 'text-red-700',     bar: 'bg-red-500',     dot: 'bg-red-500' },
  PACKAGED:      { label: 'Đã đóng gói',     color: 'text-purple-700',  bar: 'bg-purple-500',  dot: 'bg-purple-500' },
  IN_TRANSIT:    { label: 'Đang vận chuyển', color: 'text-indigo-700',  bar: 'bg-indigo-500',  dot: 'bg-indigo-500' },
  DELIVERED:     { label: 'Đã giao',         color: 'text-emerald-700', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
};

const CATEGORY_CFG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  'Thực vật': { icon: '🌿', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Động vật': { icon: '🐄', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  'Thủy sản': { icon: '🐟', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
};

const PIPELINE = ['PLANTED','HARVESTED','IN_PROCESSING','QC_FAILED','PACKAGED','IN_TRANSIT','DELIVERED'];

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2
      ${type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const router = useRouter();

  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Products
  const [products,        setProducts]        = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct,     setEditProduct]     = useState<Product | null>(null);
  const [productForm,     setProductForm]     = useState({ name: '', description: '', category: 'Thực vật' });
  const [savingProduct,   setSavingProduct]   = useState(false);

  // Farms + Batches
  const [farms,         setFarms]         = useState<Farm[]>([]);
  const [selectedFarm,  setSelectedFarm]  = useState<Farm | null>(null);
  const [farmBatches,   setFarmBatches]   = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchOverview();
    fetchProducts();
    fetchFarms();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/overview');
      setOverview(res.data);
    } catch {
      setOverview({
        users: { total: 0, byRole: {} }, batches: { total: 0, byStatus: {} },
        farms: { total: 0 }, products: { total: 0 }, recentEvents: [],
      });
    } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try { const res = await apiClient.get('/api/admin/products'); setProducts(res.data); } catch {}
  };

  const fetchFarms = async () => {
    try { const res = await apiClient.get('/api/admin/farms'); setFarms(res.data); } catch {}
  };

  const fetchFarmBatches = async (farmId: number) => {
    setLoadingBatches(true);
    try { const res = await apiClient.get(`/api/farm/batches/${farmId}`); setFarmBatches(res.data); }
    catch { setFarmBatches([]); }
    finally { setLoadingBatches(false); }
  };

  const handleSelectFarm = (farm: Farm) => {
    if (selectedFarm?.id === farm.id) { setSelectedFarm(null); setFarmBatches([]); return; }
    setSelectedFarm(farm);
    fetchFarmBatches(farm.id);
  };

  // ── Product CRUD ──────────────────────────────────────────────────────
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      if (editProduct) {
        await apiClient.put(`/api/admin/products/${editProduct.id}`, productForm);
        showToast('Cập nhật nông sản thành công!', 'success');
      } else {
        await apiClient.post('/api/admin/products', productForm);
        showToast('Thêm nông sản thành công!', 'success');
      }
      setShowProductModal(false);
      setEditProduct(null);
      setProductForm({ name: '', description: '', category: 'Thực vật' });
      fetchProducts();
      fetchOverview();
    } catch { showToast('Lỗi khi lưu nông sản', 'error'); }
    finally { setSavingProduct(false); }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setProductForm({ name: p.name, description: p.description, category: p.category });
    setShowProductModal(true);
  };

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  const totalBatches = overview?.batches.total ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast {...toast} />}

      {/* ── Modal thêm/sửa nông sản ── */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-800">
                  {editProduct ? 'Sửa nông sản' : 'Thêm nông sản mới'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Danh mục sản phẩm hệ thống</p>
              </div>
              <button onClick={() => { setShowProductModal(false); setEditProduct(null); setProductForm({ name: '', description: '', category: 'Thực vật' }); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-lg">✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className={labelCls}>Tên nông sản <span className="text-red-400">*</span></label>
                <input required value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="VD: Lúa gạo ST25" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nhóm nông sản</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CATEGORY_CFG).map(([cat, cfg]) => (
                    <button key={cat} type="button"
                      onClick={() => setProductForm({ ...productForm, category: cat })}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all
                        ${productForm.category === cat ? `${cfg.border} ${cfg.bg}` : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-xl">{cfg.icon}</span>
                      <span className={`text-xs font-bold ${productForm.category === cat ? cfg.color : 'text-slate-600'}`}>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Mô tả</label>
                <textarea rows={3} value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Mô tả đặc điểm, xuất xứ giống..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowProductModal(false); setEditProduct(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">Huỷ</button>
                <button type="submit" disabled={savingProduct}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingProduct && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editProduct ? 'Lưu thay đổi' : 'Thêm nông sản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl">⚙️</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-none">Hệ sinh thái nông sản</p>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Cổng quản trị hệ thống</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOverview}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all">
            🔄 Làm mới
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats ── */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tổng quan hệ thống</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />) : [
              { label: 'Người dùng', value: overview?.users.total ?? 0,    icon: '👥', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
              { label: 'Lô hàng',    value: overview?.batches.total ?? 0,  icon: '📦', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
              { label: 'Nông trại',  value: overview?.farms.total ?? 0,    icon: '🏡', color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Nông sản',   value: overview?.products.total ?? 0, icon: '🌿', color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className={`text-4xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Người dùng & Pipeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Người dùng theo vai trò</h2>
            {loading ? <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : (
              <div className="space-y-3">
                {Object.entries(overview?.users.byRole ?? {}).map(([role, count]) => {
                  const cfg = ROLE_CFG[role] ?? { label: role, icon: '👤', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
                  return (
                    <div key={role} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${cfg.bg}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cfg.icon}</span>
                        <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span className={`text-2xl font-black ${cfg.color}`}>{count}</span>
                    </div>
                  );
                })}
                {Object.keys(overview?.users.byRole ?? {}).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Chưa có người dùng</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Pipeline chuỗi cung ứng</h2>
            {loading ? <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : (
              <div className="space-y-2.5">
                {PIPELINE.map(status => {
                  const count = overview?.batches.byStatus[status] ?? 0;
                  const cfg   = STATUS_CFG[status];
                  const pct   = totalBatches > 0 ? Math.round((count / totalBatches) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-xs font-black ${cfg.color}`}>{count} lô</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {totalBatches === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có lô hàng nào</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Danh mục nông sản ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Danh mục nông sản</h2>
              <p className="text-xs text-slate-400 mt-0.5">{products.length} sản phẩm trong hệ thống</p>
            </div>
            <button onClick={() => { setEditProduct(null); setProductForm({ name: '', description: '', category: 'Thực vật' }); setShowProductModal(true); }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Thêm nông sản
            </button>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <span className="text-4xl mb-2">🌿</span>
              <p className="text-sm">Chưa có nông sản nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
              {products.map(p => {
                const cfg = CATEGORY_CFG[p.category] ?? CATEGORY_CFG['Thực vật'];
                return (
                  <div key={p.id} className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{cfg.icon}</span>
                      <button onClick={() => openEdit(p)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-all">
                        Sửa
                      </button>
                    </div>
                    <p className={`font-bold text-sm ${cfg.color}`}>{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.category}</p>
                    {p.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Nông trại & Lô hàng ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nông trại & Lô hàng</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nhấn vào nông trại để xem lô hàng</p>
          </div>

          <div className="divide-y divide-slate-50">
            {farms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                <span className="text-4xl mb-2">🏡</span>
                <p className="text-sm">Chưa có nông trại nào</p>
              </div>
            ) : farms.map(farm => {
              const isOpen = selectedFarm?.id === farm.id;
              return (
                <div key={farm.id}>
                  {/* Farm row */}
                  <button onClick={() => handleSelectFarm(farm)}
                    className={`w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all ${isOpen ? 'bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isOpen ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        🏡
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{farm.name}</p>
                        <p className="text-xs text-slate-400">📍 {farm.address} {farm.areaSize ? `· ${farm.areaSize} ha` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Farmer #{farm.farmerId}</span>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Batch list */}
                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                      {loadingBatches ? (
                        <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                      ) : farmBatches.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Nông trại này chưa có lô hàng nào</p>
                      ) : (
                        <div className="space-y-2">
                          {farmBatches.map(batch => {
                            const s   = STATUS_CFG[batch.currentStatus] ?? { label: batch.currentStatus, color: 'text-slate-600', dot: 'bg-slate-400' };
                            const cat = CATEGORY_CFG[batch.product?.category ?? ''];
                            return (
                              <div key={batch.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {cat && <span className="text-lg">{cat.icon}</span>}
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{batch.batchCode}</p>
                                    <p className="text-xs text-slate-400">{batch.product?.name ?? '—'} · {batch.quantity} {batch.unit}</p>
                                  </div>
                                </div>
                                <span className={`text-xs font-bold flex items-center gap-1.5 ${s.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                  {s.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hoạt động gần đây ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hoạt động gần đây</h2>
            <span className="text-xs text-slate-400">Toàn bộ chuỗi cung ứng</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (overview?.recentEvents ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <span className="text-4xl mb-2">📭</span>
              <p className="text-sm">Chưa có hoạt động nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {(overview?.recentEvents ?? []).map((ev, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-black text-indigo-700 flex-shrink-0">
                    {ev.batchCode.slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{ev.eventName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-semibold text-indigo-600">{ev.batchCode}</span>
                      {ev.location && <span className="text-xs text-slate-400">📍 {ev.location}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(ev.eventTime).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Truy cập nhanh ── */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Truy cập nhanh</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Nông trại',  icon: '🌾', desc: 'Quản lý lô hàng & nhật ký', href: '/portal/farmer',    color: 'hover:border-emerald-300 hover:bg-emerald-50' },
              { label: 'Chế biến',   icon: '🏭', desc: 'Kiểm định & đóng gói',      href: '/portal/processor', color: 'hover:border-orange-300 hover:bg-orange-50' },
              { label: 'Vận chuyển', icon: '🚛', desc: 'Theo dõi chuyến hàng',      href: '/portal/logistics', color: 'hover:border-blue-300 hover:bg-blue-50' },
              { label: 'Tra cứu',    icon: '🔍', desc: 'Truy xuất nguồn gốc',       href: '/traceability',     color: 'hover:border-teal-300 hover:bg-teal-50' },
            ].map(link => (
              <button key={link.label} onClick={() => router.push(link.href)}
                className={`bg-white border border-slate-200 rounded-2xl p-5 text-left transition-all shadow-sm ${link.color}`}>
                <div className="text-3xl mb-3">{link.icon}</div>
                <p className="font-black text-slate-900 text-sm tracking-tight">{link.label}</p>
                <p className="text-xs text-slate-500 mt-1">{link.desc}</p>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}