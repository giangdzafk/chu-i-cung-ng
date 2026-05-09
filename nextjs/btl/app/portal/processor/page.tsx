'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Batch {
  id: number; batchCode: string; quantity: number; unit: string;
  currentStatus: string; product?: { name: string; category: string };
}
interface QcRecord {
  id: number; status: 'PASSED' | 'FAILED'; criteria: string;
  note: string; inspectedAt: string;
}

type Step = 'HARVESTED' | 'QC' | 'PROCESSING' | 'PACKAGED';

const STEPS: { key: Step; icon: string; label: string; desc: string }[] = [
  { key: 'HARVESTED',   icon: '🌾', label: 'Tiếp nhận',      desc: 'Lô thu hoạch chờ kiểm định' },
  { key: 'QC',          icon: '🔬', label: 'Kiểm định',      desc: 'Đánh giá chất lượng' },
  { key: 'PROCESSING',  icon: '⚙️', label: 'Chế biến',       desc: 'Đang sơ chế & chế biến' },
  { key: 'PACKAGED',    icon: '📦', label: 'Đóng gói & QR',  desc: 'Dán tem, xuất xưởng' },
];

function getInspectorId(): number | null {
  try {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
    if (!cookie) return null;
    const payload = JSON.parse(atob(cookie.split('=')[1].split('.')[1]));
    return payload.sub ?? payload.id ?? null;
  } catch { return null; }
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2
      ${type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ProcessorDashboard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('HARVESTED');
  const [inspectorId, setInspectorId] = useState<number | null>(null);

  const [harvested,   setHarvested]   = useState<Batch[]>([]);
  const [processing,  setProcessing]  = useState<Batch[]>([]);
  const [packaged,    setPackaged]    = useState<Batch[]>([]);

  // QC state
  const [qcBatch,    setQcBatch]    = useState<Batch | null>(null);
  const [qcHistory,  setQcHistory]  = useState<QcRecord[]>([]);
  const [qcStatus,   setQcStatus]   = useState<'PASSED' | 'FAILED'>('PASSED');
  const [criteria,   setCriteria]   = useState('Độ ẩm < 12%, không nấm mốc, không dư lượng thuốc');
  const [note,       setNote]       = useState('');
  const [evidence,   setEvidence]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Packaging state
  const [pkgBatch,   setPkgBatch]   = useState<Batch | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [pkgNote,    setPkgNote]    = useState('');
  const [packaging,  setPackaging]  = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const id = getInspectorId();
    setInspectorId(id);
    fetchAll();
  }, []);

  const fetchAll = async () => {
  try {
    const [r1, r2] = await Promise.all([
      apiClient.get('/api/processing/pending'),   
      apiClient.get('/api/processing/passed'),    
    ]);
    setHarvested(r1.data);
    setProcessing(r2.data);
    setPackaged([]);  
  } catch (e: any) {
    console.error('Fetch error:', e?.response?.status);
  }
};

  const openQcForm = async (batch: Batch) => {
    setQcBatch(batch);
    setStep('QC');
    setQcStatus('PASSED');
    setNote('');
    setEvidence('');
    try {
      const res = await apiClient.get(`/api/processing/qc/${batch.id}`);
      setQcHistory(res.data);
    } catch { setQcHistory([]); }
  };

  const handleSubmitQc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcBatch || !inspectorId) return;
    setSubmitting(true);
    try {
      await apiClient.post('/api/processing/qc', {
        batchId: qcBatch.id, inspectorId, status: qcStatus,
        criteria, note, evidenceImageUrl: evidence || undefined,
      });
      showToast(qcStatus === 'PASSED' ? 'Đạt QC! Lô hàng chuyển sang chế biến.' : 'Lô hàng không đạt QC.', 'success');
      setQcBatch(null);
      setStep('HARVESTED');
      fetchAll();
    } catch { showToast('Lỗi lưu kết quả QC', 'error'); }
    finally { setSubmitting(false); }
  };

 const handlePackage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!pkgBatch || !inspectorId) return;
  setPackaging(true);
  try {
    await apiClient.put(`/api/processing/package/${pkgBatch.id}`, {
      actorId: inspectorId,  // ← đổi sang PUT /:batchId
    });
    showToast('Đóng gói thành công! QR Code đã sẵn sàng.', 'success');
    setPkgBatch(null);
    setExpiryDate('');
    setPkgNote('');
    fetchAll();
  } catch { showToast('Lỗi đóng gói', 'error'); }
  finally { setPackaging(false); }
};

  const handleLogout = () => {
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  const counts: Record<Step, number> = {
    HARVESTED: harvested.length, QC: harvested.length,
    PROCESSING: processing.length, PACKAGED: packaged.length,
  };

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast {...toast} />}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">🏭</div>
          <div>
            <p className="text-xs text-gray-400 leading-none">Hệ sinh thái nông sản</p>
            <h1 className="text-base font-bold text-gray-800">Phân hệ chế biến & đóng gói</h1>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Đăng xuất
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Workflow Steps ── */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { if (s.key !== 'QC') setStep(s.key); }}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all text-left
                  ${step === s.key || (step === 'QC' && s.key === 'QC')
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                <span className="text-xl">{s.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{s.label}</p>
                    {s.key !== 'QC' && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
                        ${counts[s.key] > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        {counts[s.key]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* ══ BƯỚC 1: TIẾP NHẬN ══ */}
        {step === 'HARVESTED' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">Lô hàng chờ kiểm định</h2>
                <p className="text-xs text-gray-400 mt-0.5">Chỉ hiển thị lô có trạng thái ĐÃ THU HOẠCH từ nông trại</p>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${harvested.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                {harvested.length} lô chờ
              </span>
            </div>

            {harvested.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <span className="text-5xl mb-3">🌾</span>
                <p className="text-sm font-medium">Chưa có lô hàng nào được thu hoạch</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {harvested.map(batch => (
                  <div key={batch.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">🌾</div>
                      <div>
                        <p className="font-bold text-gray-800">{batch.batchCode}</p>
                        <p className="text-sm text-emerald-600 font-medium">{batch.product?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{batch.quantity} {batch.unit}</p>
                      </div>
                    </div>
                    <button onClick={() => openQcForm(batch)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
                      🔬 Tiến hành kiểm định
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ BƯỚC 2: KIỂM ĐỊNH QC ══ */}
        {step === 'QC' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form QC */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="font-bold text-gray-800">Phiếu kiểm định chất lượng</h2>
                {qcBatch && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg">{qcBatch.batchCode}</span>
                    <span className="text-xs text-gray-400">{qcBatch.product?.name} · {qcBatch.quantity} {qcBatch.unit}</span>
                  </div>
                )}
              </div>

              {!qcBatch ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <span className="text-4xl mb-3">👈</span>
                  <p className="text-sm">Chọn lô hàng ở bước Tiếp nhận</p>
                  <button onClick={() => setStep('HARVESTED')}
                    className="mt-3 text-xs text-blue-600 font-semibold hover:underline">
                    ← Quay lại tiếp nhận
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQc} className="p-6 space-y-5">
                  {/* Kết quả */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kết quả kiểm định</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setQcStatus('PASSED')}
                        className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all
                          ${qcStatus === 'PASSED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        ✅ ĐẠT CHUẨN
                      </button>
                      <button type="button" onClick={() => setQcStatus('FAILED')}
                        className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all
                          ${qcStatus === 'FAILED' ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        ❌ KHÔNG ĐẠT
                      </button>
                    </div>
                  </div>

                  {/* Tiêu chí */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Tiêu chí đánh giá <span className="text-red-400">*</span>
                    </label>
                    <input required value={criteria} onChange={e => setCriteria(e.target.value)}
                      placeholder="VD: Độ ẩm < 12%, không nấm mốc..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Ghi chú {qcStatus === 'FAILED' && <span className="text-red-400">* (bắt buộc nếu không đạt)</span>}
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      rows={3} required={qcStatus === 'FAILED'}
                      placeholder="Mô tả chi tiết kết quả kiểm tra..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none" />
                  </div>

                  {/* Link ảnh bằng chứng */}
                  {qcStatus === 'FAILED' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Link ảnh bằng chứng (nếu có)
                      </label>
                      <input value={evidence} onChange={e => setEvidence(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setQcBatch(null); setStep('HARVESTED'); }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
                      Huỷ
                    </button>
                    <button type="submit" disabled={submitting}
                      className={`flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all
                        ${qcStatus === 'PASSED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                      {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {qcStatus === 'PASSED' ? '✅ Xác nhận ĐẠT' : '❌ Xác nhận KHÔNG ĐẠT'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Lịch sử QC */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="font-bold text-gray-800">Lịch sử kiểm định</h2>
                <p className="text-xs text-gray-400 mt-0.5">{qcBatch ? qcBatch.batchCode : 'Chọn lô hàng'}</p>
              </div>
              <div className="max-h-[460px] overflow-y-auto">
                {qcHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                    <span className="text-4xl mb-3">📋</span>
                    <p className="text-sm">Chưa có lịch sử kiểm định</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {qcHistory.map(qc => (
                      <div key={qc.id} className={`p-4 rounded-xl border ${qc.status === 'PASSED' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qc.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {qc.status === 'PASSED' ? '✅ ĐẠT' : '❌ KHÔNG ĐẠT'}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(qc.inspectedAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">{qc.criteria}</p>
                        {qc.note && <p className="text-xs text-gray-500 mt-1">{qc.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ BƯỚC 3: CHẾ BIẾN ══ */}
        {step === 'PROCESSING' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Danh sách */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="font-bold text-gray-800">Lô hàng đang chế biến</h2>
                <p className="text-xs text-gray-400 mt-0.5">Đã qua kiểm định QC PASSED</p>
              </div>
              {processing.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <span className="text-5xl mb-3">⚙️</span>
                  <p className="text-sm">Không có lô nào đang chế biến</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {processing.map(batch => (
                    <button key={batch.id} onClick={() => setPkgBatch(batch)}
                      className={`w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all group
                        ${pkgBatch?.id === batch.id ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-1 h-12 rounded-full transition-all ${pkgBatch?.id === batch.id ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-gray-300'}`} />
                        <div>
                          <p className="font-bold text-gray-800">{batch.batchCode}</p>
                          <p className="text-sm text-blue-600 font-medium">{batch.product?.name}</p>
                          <p className="text-xs text-gray-400">{batch.quantity} {batch.unit}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Đang chế biến
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Form đóng gói */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="font-bold text-gray-800">Đóng gói & Dán tem</h2>
                {pkgBatch
                  ? <p className="text-xs text-blue-600 font-semibold mt-0.5">{pkgBatch.batchCode}</p>
                  : <p className="text-xs text-gray-400 mt-0.5">Chọn lô hàng bên trái</p>}
              </div>

              {!pkgBatch ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-gray-300">
                  <span className="text-4xl mb-3">👈</span>
                  <p className="text-sm">Chọn lô để đóng gói</p>
                </div>
              ) : (
                <form onSubmit={handlePackage} className="p-6 flex flex-col gap-4 flex-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Hạn sử dụng
                    </label>
                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Ghi chú đóng gói
                    </label>
                    <textarea value={pkgNote} onChange={e => setPkgNote(e.target.value)}
                      rows={3} placeholder="VD: Đóng gói túi hút chân không 500g..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none" />
                  </div>
                  <button type="submit" disabled={packaging}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                    {packaging && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    📦 Hoàn tất đóng gói
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ══ BƯỚC 4: ĐÃ ĐÓNG GÓI & QR ══ */}
        {step === 'PACKAGED' && (
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-50">
                <h2 className="font-bold text-gray-800">Lô hàng đã đóng gói — Tem QR Code</h2>
                <p className="text-xs text-gray-400 mt-0.5">Quét QR để truy xuất toàn bộ hành trình lô hàng</p>
              </div>

              {packaged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <span className="text-5xl mb-3">📦</span>
                  <p className="text-sm">Chưa có lô hàng nào được đóng gói</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
                  {packaged.map(batch => (
                    <div key={batch.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                      <div className="bg-white p-3 rounded-xl shadow-sm mb-3 border border-slate-100">
                        <QRCodeSVG
                          value={`http://localhost:3000/traceability/${batch.batchCode}`}
                          size={110} bgColor="#ffffff" fgColor="#1e293b" level="M"
                        />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">{batch.batchCode}</p>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">{batch.product?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{batch.quantity} {batch.unit}</p>
                      <span className="mt-2 text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                        📦 Đã đóng gói
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}