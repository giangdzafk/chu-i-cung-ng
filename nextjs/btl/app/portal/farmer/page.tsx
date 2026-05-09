'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Farm    { id: number; name: string; address: string; areaSize: number; }
interface Product { id: number; name: string; category: string; description?: string; }
interface Batch   {
  id: number; batchCode: string; quantity: number; unit: string;
  currentStatus: string; expectedHarvestDate: string | null;
  product?: Product;
}
interface FarmingLog { id: number; actionType: string; description: string; actionDate: string; }

// ─── Nhóm nông sản ────────────────────────────────────────────────────────
const CATEGORY_CFG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  'Thực vật': { icon: '🌿', label: 'Thực vật',  color: 'text-emerald-800', bg: 'bg-emerald-50',  border: 'border-emerald-300' },
  'Động vật': { icon: '🐄', label: 'Động vật',  color: 'text-amber-800',   bg: 'bg-amber-50',    border: 'border-amber-300' },
  'Thủy sản': { icon: '🐟', label: 'Thủy sản',  color: 'text-blue-800',    bg: 'bg-blue-50',     border: 'border-blue-300' },
};

// ─── Nhật ký theo loại ─────────────────────────────────────────────────────
const ACTION_BY_CATEGORY: Record<string, { value: string; label: string; icon: string }[]> = {
  'Thực vật': [
    { value: 'SEEDING',     label: 'Gieo hạt / Trồng cây', icon: '🌱' },
    { value: 'WATERING',    label: 'Tưới nước',             icon: '💧' },
    { value: 'FERTILIZING', label: 'Bón phân',              icon: '🌿' },
    { value: 'PESTICIDE',   label: 'Phun thuốc bảo vệ',    icon: '🛡️' },
    { value: 'HARVESTING',  label: 'Thu hoạch',             icon: '🌾' },
  ],
  'Động vật': [
    { value: 'FEEDING',      label: 'Cho ăn',              icon: '🍖' },
    { value: 'VACCINATION',  label: 'Tiêm phòng',          icon: '💉' },
    { value: 'HEALTH_CHECK', label: 'Kiểm tra sức khoẻ',  icon: '🩺' },
    { value: 'BREEDING',     label: 'Nhân giống',          icon: '🐣' },
    { value: 'SLAUGHTER',    label: 'Xuất chuồng / Giết mổ', icon: '📦' },
  ],
  'Thủy sản': [
    { value: 'STOCKING',            label: 'Thả giống',          icon: '🐠' },
    { value: 'FEEDING',             label: 'Cho ăn',             icon: '🍚' },
    { value: 'WATER_QUALITY_CHECK', label: 'Kiểm tra nước',      icon: '🔬' },
    { value: 'WATER_CHANGE',        label: 'Thay / xử lý nước',  icon: '💦' },
    { value: 'DISEASE_TREATMENT',   label: 'Phòng trị bệnh',     icon: '💊' },
    { value: 'FISHING',             label: 'Thu hoạch',          icon: '🎣' },
  ],
};

const DEFAULT_ACTIONS = ACTION_BY_CATEGORY['Thực vật'];

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  PLANTED:       { label: 'Đang trồng',      color: 'bg-blue-50 text-blue-800 border-blue-200',       dot: 'bg-blue-500' },
  HARVESTED:     { label: 'Đã thu hoạch',    color: 'bg-amber-50 text-amber-800 border-amber-200',    dot: 'bg-amber-500' },
  IN_PROCESSING: { label: 'Đang chế biến',   color: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  QC_FAILED:     { label: 'Không đạt QC',    color: 'bg-red-50 text-red-800 border-red-200',          dot: 'bg-red-500' },
  PACKAGED:      { label: 'Đã đóng gói',     color: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  IN_TRANSIT:    { label: 'Đang vận chuyển', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
  DELIVERED:     { label: 'Đã giao',         color: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getFarmerIdFromToken(): number | null {
  try {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
    if (!cookie) return null;
    const p = JSON.parse(atob(cookie.split('=')[1].split('.')[1]));
    return p.sub ?? p.id ?? p.userId ?? null;
  } catch { return null; }
}

function getCategoryFromProduct(product?: Product): string {
  return product?.category ?? 'Thực vật';
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold
      ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FarmerDashboard() {
  const router = useRouter();

  const [farmerId,       setFarmerId]       = useState<number | null>(null);
  const [farms,          setFarms]          = useState<Farm[]>([]);
  const [selectedFarm,   setSelectedFarm]   = useState<Farm | null>(null);
  const [products,       setProducts]       = useState<Product[]>([]);
  const [batches,        setBatches]        = useState<Batch[]>([]);
  const [selectedBatch,  setSelectedBatch]  = useState<Batch | null>(null);
  const [logs,           setLogs]           = useState<FarmingLog[]>([]);
  const [rightTab,       setRightTab]       = useState<'logs' | 'addLog'>('logs');
  const [toast,          setToast]          = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal tạo lô hàng
  const [showModal,   setShowModal]   = useState(false);
  const [batchForm,   setBatchForm]   = useState({ productId: '', quantity: '', unit: 'kg', expectedHarvestDate: '' });
  const [isCreating,  setIsCreating]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<string>('Thực vật'); // tab nhóm trong modal

  // Form nhật ký
  const [actionType,   setActionType]   = useState('WATERING');
  const [description,  setDescription]  = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const labelCls = 'block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5';
  const inputCls = 'w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white';

  useEffect(() => {
    const id = getFarmerIdFromToken();
    if (!id) { router.push('/login'); return; }
    setFarmerId(id);
    fetchFarms(id);
    fetchProducts();
  }, []);

  // Reset actionType khi đổi lô hàng
  useEffect(() => {
    if (selectedBatch) {
      const cat = getCategoryFromProduct(selectedBatch.product);
      const actions = ACTION_BY_CATEGORY[cat] ?? DEFAULT_ACTIONS;
      setActionType(actions[0].value);
    }
  }, [selectedBatch]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchFarms    = async (id: number) => {
    try {
      const res = await apiClient.get(`/api/farm/farms/${id}`);
      setFarms(res.data);
      if (res.data.length > 0) { setSelectedFarm(res.data[0]); fetchBatches(res.data[0].id); }
    } catch (e: any) { console.error('Fetch farms:', e?.response?.status); }
  };

  const fetchProducts = async () => {
    try { const res = await apiClient.get('/api/farm/products'); setProducts(res.data); } catch {}
  };

  const fetchBatches  = async (farmId: number) => {
    try { const res = await apiClient.get(`/api/farm/batches/${farmId}`); setBatches(res.data); }
    catch (e: any) { console.error('Fetch batches:', e?.response?.status); }
  };

  const fetchLogs     = async (batchId: number) => {
    try { const res = await apiClient.get(`/api/farm/logs/${batchId}`); setLogs(res.data); }
    catch { setLogs([]); }
  };

  const handleSelectFarm  = (farm: Farm) => {
    setSelectedFarm(farm); setSelectedBatch(null); setLogs([]); fetchBatches(farm.id);
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch); setRightTab('logs'); fetchLogs(batch.id);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setIsCreating(true);
    try {
      await apiClient.post('/api/farm/batches', {
        productId: Number(batchForm.productId), farmId: selectedFarm.id,
        quantity: Number(batchForm.quantity), unit: batchForm.unit,
        expectedHarvestDate: batchForm.expectedHarvestDate || null,
      });
      showToast('Tạo lô hàng thành công!', 'success');
      setShowModal(false);
      setBatchForm({ productId: '', quantity: '', unit: 'kg', expectedHarvestDate: '' });
      fetchBatches(selectedFarm.id);
    } catch { showToast('Lỗi khi tạo lô hàng', 'error'); }
    finally { setIsCreating(false); }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !farmerId) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/farm/logs', {
        batchId: selectedBatch.id, farmerId, actionType, description,
      });
      showToast('Ghi nhật ký thành công!', 'success');
      setDescription('');
      fetchLogs(selectedBatch.id);
      if (selectedFarm) fetchBatches(selectedFarm.id);
      setRightTab('logs');
    } catch { showToast('Lỗi khi ghi nhật ký', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleLogout = () => { document.cookie = 'token=; path=/; max-age=0'; router.push('/login'); };

  // Nhóm sản phẩm theo category
  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category || 'Thực vật';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const selectedProduct  = products.find(p => p.id === Number(batchForm.productId));
  const currentCategory  = getCategoryFromProduct(selectedBatch?.product);
  const currentActions   = ACTION_BY_CATEGORY[currentCategory] ?? DEFAULT_ACTIONS;
  const catCfg           = CATEGORY_CFG[currentCategory] ?? CATEGORY_CFG['Thực vật'];

  const stats = [
    { label: 'Tổng lô hàng',  value: batches.length,                                                icon: '📦', color: 'text-slate-900' },
    { label: 'Thực vật',      value: batches.filter(b => b.product?.category === 'Thực vật').length, icon: '🌿', color: 'text-emerald-800' },
    { label: 'Động vật',      value: batches.filter(b => b.product?.category === 'Động vật').length, icon: '🐄', color: 'text-amber-800' },
    { label: 'Thủy sản',      value: batches.filter(b => b.product?.category === 'Thủy sản').length, icon: '🐟', color: 'text-blue-800' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {toast && <Toast {...toast} />}

      {/* ══ Modal tạo lô hàng ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Tạo lô hàng mới</h2>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">📍 {selectedFarm?.name}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-5">
              {/* Chọn nhóm nông sản */}
              <div>
                <label className={labelCls}>Nhóm nông sản <span className="text-red-500 normal-case tracking-normal">*</span></label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {Object.entries(CATEGORY_CFG).map(([cat, cfg]) => (
                    <button key={cat} type="button"
                      onClick={() => { setActiveTab(cat); setBatchForm(f => ({ ...f, productId: '' })); }}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all
                        ${activeTab === cat ? `${cfg.border} ${cfg.bg}` : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <span className="text-2xl">{cfg.icon}</span>
                      <span className={`text-xs font-bold ${activeTab === cat ? cfg.color : 'text-slate-600'}`}>{cfg.label}</span>
                    </button>
                  ))}
                </div>

                {/* Danh sách sản phẩm theo nhóm */}
                <label className={labelCls}>Loại nông sản <span className="text-red-500 normal-case tracking-normal">*</span></label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {(productsByCategory[activeTab] ?? []).map(p => {
                    const cfg = CATEGORY_CFG[activeTab];
                    const isSelected = batchForm.productId === String(p.id);
                    return (
                      <button key={p.id} type="button"
                        onClick={() => setBatchForm(f => ({ ...f, productId: String(p.id) }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left
                          ${isSelected ? `${cfg.border} ${cfg.bg}` : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                        <span className="text-lg">{cfg.icon}</span>
                        <span className={`text-sm font-bold truncate ${isSelected ? cfg.color : 'text-slate-700'}`}>{p.name}</span>
                      </button>
                    );
                  })}
                  {(productsByCategory[activeTab] ?? []).length === 0 && (
                    <p className="col-span-2 text-xs text-slate-400 text-center py-4">Chưa có sản phẩm trong nhóm này</p>
                  )}
                </div>

                {/* Sản phẩm đã chọn */}
                {selectedProduct && (
                  <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border ${CATEGORY_CFG[activeTab]?.border ?? 'border-emerald-300'} ${CATEGORY_CFG[activeTab]?.bg ?? 'bg-emerald-50'}`}>
                    <span className="text-lg">{CATEGORY_CFG[selectedProduct.category]?.icon ?? '🌿'}</span>
                    <span className={`text-sm font-bold ${CATEGORY_CFG[selectedProduct.category]?.color ?? 'text-emerald-800'}`}>
                      Đã chọn: {selectedProduct.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Sản lượng + đơn vị */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sản lượng <span className="text-red-500 normal-case tracking-normal">*</span></label>
                  <input type="number" min="0.1" step="0.1" required
                    value={batchForm.quantity}
                    onChange={e => setBatchForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="VD: 500" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Đơn vị</label>
                  <select value={batchForm.unit}
                    onChange={e => setBatchForm(f => ({ ...f, unit: e.target.value }))}
                    className={inputCls}>
                    {['kg','tấn','con','con/ao','hộp','bao','thùng'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ngày thu hoạch */}
              <div>
                <label className={labelCls}>
                  {activeTab === 'Thủy sản' ? 'Ngày thu hoạch dự kiến' :
                   activeTab === 'Động vật' ? 'Ngày xuất chuồng dự kiến' :
                   'Ngày thu hoạch dự kiến'}
                </label>
                <input type="date" value={batchForm.expectedHarvestDate}
                  onChange={e => setBatchForm(f => ({ ...f, expectedHarvestDate: e.target.value }))}
                  className={inputCls} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Huỷ
                </button>
                <button type="submit" disabled={isCreating || !batchForm.productId}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                  {isCreating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Tạo lô hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-sm">🌾</div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-none">Hệ sinh thái nông sản</p>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Quản lý nông trại</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {farms.length > 1 && (
            <select value={selectedFarm?.id ?? ''}
              onChange={e => { const f = farms.find(x => x.id === Number(e.target.value)); if (f) handleSelectFarm(f); }}
              className="text-sm font-semibold text-slate-800 border border-slate-300 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-emerald-500">
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          {farms.length === 1 && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold">
              🏡 {selectedFarm?.name}
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Không có farm */}
      {farms.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <span className="text-6xl mb-4">🏡</span>
          <p className="text-lg font-black text-slate-700">Bạn chưa có nông trại nào</p>
          <p className="text-sm text-slate-500 mt-1">Liên hệ Admin để được tạo nông trại</p>
        </div>
      )}

      {farms.length > 0 && (
        <main className="max-w-6xl mx-auto px-6 py-8">

          {/* Stats — 4 cột */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className={`text-4xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Danh sách lô hàng ── */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-black text-slate-900 tracking-tight">Danh sách lô hàng</h2>
                  {selectedFarm && <p className="text-xs text-slate-500 mt-0.5">📍 {selectedFarm.address}</p>}
                </div>
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo lô mới
                </button>
              </div>

              <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {batches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <span className="text-5xl mb-3">🌿</span>
                    <p className="text-sm font-bold text-slate-400">Chưa có lô hàng nào</p>
                  </div>
                ) : batches.map(batch => {
                  const s    = STATUS_CFG[batch.currentStatus] ?? { label: batch.currentStatus, color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
                  const cat  = batch.product?.category ?? '';
                  const catC = CATEGORY_CFG[cat];
                  const isSelected = selectedBatch?.id === batch.id;
                  return (
                    <button key={batch.id} onClick={() => handleSelectBatch(batch)}
                      className={`w-full text-left px-6 py-4 transition-all flex items-center justify-between group ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-12 rounded-full transition-all ${isSelected ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-slate-300'}`} />
                        <div>
                          <p className="font-black text-slate-900 text-sm tracking-tight">{batch.batchCode}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {catC && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md border ${catC.bg} ${catC.border} ${catC.color}`}>
                                {catC.icon} {catC.label}
                              </span>
                            )}
                            <span className="text-xs font-bold text-emerald-700">{batch.product?.name ?? '—'}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {batch.quantity} {batch.unit}
                            {batch.expectedHarvestDate && ` · ${new Date(batch.expectedHarvestDate).toLocaleDateString('vi-VN')}`}
                          </p>
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
                {selectedBatch ? (
                  <>
                    <div className="flex items-center gap-2 mb-0.5">
                      {catCfg && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${catCfg.bg} ${catCfg.border} ${catCfg.color}`}>
                          {catCfg.icon} {catCfg.label}
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-700">{selectedBatch.product?.name}</span>
                    </div>
                    <h2 className="font-black text-slate-900 tracking-tight">{selectedBatch.batchCode}</h2>
                  </>
                ) : (
                  <h2 className="font-bold text-slate-400">Chọn lô hàng để xem nhật ký</h2>
                )}

                {selectedBatch && (
                  <div className="flex gap-1 mt-3 bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setRightTab('logs')}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${rightTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                      📋 Nhật ký
                    </button>
                    {selectedBatch.currentStatus === 'PLANTED' && (
                      <button onClick={() => setRightTab('addLog')}
                        className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${rightTab === 'addLog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                        ✏️ Ghi thêm
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab: Nhật ký */}
              {(!selectedBatch || rightTab === 'logs') && (
                <div className="flex-1 overflow-y-auto max-h-[480px]">
                  {!selectedBatch ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300">
                      <span className="text-4xl mb-3">👈</span>
                      <p className="text-sm font-bold text-slate-400">Chọn lô hàng để xem nhật ký</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16">
                      <span className="text-4xl mb-3">📭</span>
                      <p className="text-sm font-bold text-slate-400">Chưa có nhật ký nào</p>
                      <button onClick={() => setRightTab('addLog')}
                        className="mt-3 text-xs font-bold text-emerald-700 hover:underline">
                        Ghi nhật ký đầu tiên →
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {logs.map((log, i) => {
                        const allActions = Object.values(ACTION_BY_CATEGORY).flat();
                        const action = allActions.find(a => a.value === log.actionType);
                        return (
                          <div key={log.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black flex-shrink-0">
                                {i + 1}
                              </div>
                              {i < logs.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                            </div>
                            <div className="pb-3 flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                  {action ? `${action.icon} ${action.label}` : log.actionType}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(log.actionDate).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-700 leading-relaxed">{log.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Ghi nhật ký */}
              {selectedBatch && rightTab === 'addLog' && (
                <>
                  {selectedBatch.currentStatus !== 'PLANTED' ? (
                    /* Khoá ghi nhật ký khi lô đã thu hoạch */
                    <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
                      <span className="text-4xl mb-3">🔒</span>
                      <p className="text-sm font-black text-slate-700">Không thể ghi nhật ký</p>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Lô hàng đang ở trạng thái{' '}
                        <span className={`font-bold ${STATUS_CFG[selectedBatch.currentStatus]?.color.split(' ')[1] ?? 'text-slate-600'}`}>
                          "{STATUS_CFG[selectedBatch.currentStatus]?.label ?? selectedBatch.currentStatus}"
                        </span>
                        {' '}— nhật ký canh tác đã được khoá.
                      </p>
                      <button onClick={() => setRightTab('logs')}
                        className="mt-4 text-xs font-bold text-emerald-700 hover:underline">
                        ← Xem nhật ký đã ghi
                      </button>
                    </div>
                  ) : (
                    /* Form ghi nhật ký — chỉ khi PLANTED */
                    <form onSubmit={handleAddLog} className="flex flex-col flex-1 p-5 gap-4 overflow-y-auto">
                      {/* Header nhóm */}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${catCfg.bg} ${catCfg.border}`}>
                        <span className="text-xl">{catCfg.icon}</span>
                        <span className={`text-sm font-black ${catCfg.color}`}>
                          Nhật ký {catCfg.label}: {selectedBatch.product?.name}
                        </span>
                      </div>

                      {/* Chọn hoạt động */}
                      <div>
                        <label className={labelCls}>Hoạt động</label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {currentActions.map(opt => (
                            <button key={opt.value} type="button" onClick={() => setActionType(opt.value)}
                              className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all font-bold flex items-center gap-2
                                ${actionType === opt.value
                                  ? `${catCfg.bg} ${catCfg.border} ${catCfg.color}`
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                              <span>{opt.icon}</span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ghi chú */}
                      <div className="flex-1">
                        <label className={labelCls}>Ghi chú chi tiết</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                          rows={3} required
                          placeholder={
                            currentCategory === 'Động vật' ? 'VD: Cho ăn 2kg/con, thức ăn hỗn hợp...' :
                            currentCategory === 'Thủy sản' ? 'VD: pH nước 7.5, nhiệt độ 28°C...' :
                            'VD: Bón phân hữu cơ 2kg/m², thời tiết nắng...'
                          }
                          className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none" />
                      </div>

                      <button type="submit" disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
                        {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        ✓ Lưu nhật ký
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}