'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

interface TraceData {
  batchInfo: {
    batchCode: string; quantity: number; unit: string;
    currentStatus: string; createdAt: string;
    product?: { name: string; category: string; description: string };
    farm?: { name: string; address: string };
  };
  qualityControl?: {
    status: string; criteria: string; note: string; inspectedAt: string;
  };
  farmingLogs?: {
    actionType: string; description: string; actionDate: string;
  }[];
  timeline: {
    eventName: string; eventDescription: string;
    location: string; eventTime: string;
  }[];
}

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  SEEDING:     { label: 'Gieo hạt',    icon: '🌱' },
  WATERING:    { label: 'Tưới nước',   icon: '💧' },
  FERTILIZING: { label: 'Bón phân',   icon: '🌿' },
  PESTICIDE:   { label: 'Phun thuốc', icon: '🛡️' },
  HARVESTING:  { label: 'Thu hoạch',  icon: '🌾' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PLANTED:       { label: 'Đang trồng',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  HARVESTED:     { label: 'Đã thu hoạch',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  IN_PROCESSING: { label: 'Đang chế biến',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  QC_FAILED:     { label: 'Không đạt QC',    color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  PACKAGED:      { label: 'Đã đóng gói',     color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  IN_TRANSIT:    { label: 'Đang vận chuyển', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  DELIVERED:     { label: 'Đã giao',         color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
};

export default function TraceabilityResult() {
  const { batchCode } = useParams();
  const router = useRouter();
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'logs'>('timeline');

  useEffect(() => {
    apiClient.get(`/api/tracking/${batchCode}`)
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [batchCode]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-teal-900 flex flex-col items-center justify-center text-white gap-4">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-emerald-200 font-medium">Đang tải dữ liệu minh bạch...</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <span className="text-6xl mb-4">❌</span>
      <h2 className="text-xl font-black text-gray-800 mb-2">Không tìm thấy lô hàng</h2>
      <p className="text-gray-500 mb-6">Mã <span className="font-bold text-gray-700">"{batchCode}"</span> không tồn tại trong hệ thống</p>
      <button onClick={() => router.push('/traceability')}
        className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all">
        ← Tra cứu lại
      </button>
    </div>
  );

  const { batchInfo, qualityControl, farmingLogs, timeline } = data;
  const status = STATUS_CFG[batchInfo.currentStatus] ?? { label: batchInfo.currentStatus, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 px-6 pt-12 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-300 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-teal-300 blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          <button onClick={() => router.push('/traceability')}
            className="flex items-center gap-1 text-emerald-300 hover:text-white text-sm font-medium mb-6 transition-colors">
            ← Tra cứu lại
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-emerald-300 text-xs font-semibold uppercase tracking-widest mb-1">Nông sản</p>
              <h1 className="text-3xl font-black text-white">{batchInfo.product?.name ?? 'Nông sản'}</h1>
              <p className="text-emerald-200 text-sm mt-1 font-mono">{batchInfo.batchCode}</p>
            </div>
            <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {batchInfo.farm && (
              <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full border border-white/20">
                🏡 {batchInfo.farm.name}
              </span>
            )}
            {batchInfo.farm?.address && (
              <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full border border-white/20">
                📍 {batchInfo.farm.address}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs bg-white/10 text-white px-3 py-1.5 rounded-full border border-white/20">
              📦 {batchInfo.quantity} {batchInfo.unit}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-12">

        {/* ── QC Badge ── */}
        {qualityControl && (
          <div className={`rounded-2xl border-2 p-5 mb-6 flex items-start gap-4 shadow-sm
            ${qualityControl.status === 'PASSED' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-3xl flex-shrink-0">{qualityControl.status === 'PASSED' ? '✅' : '⚠️'}</span>
            <div>
              <h3 className={`font-bold text-base ${qualityControl.status === 'PASSED' ? 'text-emerald-800' : 'text-red-700'}`}>
                {qualityControl.status === 'PASSED' ? 'Đạt tiêu chuẩn kiểm định chất lượng' : 'Không đạt kiểm định chất lượng'}
              </h3>
              <p className={`text-sm mt-1 ${qualityControl.status === 'PASSED' ? 'text-emerald-600' : 'text-red-600'}`}>
                {qualityControl.criteria}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Kiểm định lúc {new Date(qualityControl.inspectedAt).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
        )}

        {/* ── Product info ── */}
        {batchInfo.product?.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">🌿 Về sản phẩm</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{batchInfo.product.description}</p>
            {batchInfo.product.category && (
              <span className="inline-block mt-2 text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                {batchInfo.product.category}
              </span>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
          <button onClick={() => setActiveTab('timeline')}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5
              ${activeTab === 'timeline' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            🗓️ Hành trình ({timeline?.length ?? 0})
          </button>
          <button onClick={() => setActiveTab('logs')}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5
              ${activeTab === 'logs' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            📋 Nhật ký canh tác ({farmingLogs?.length ?? 0})
          </button>
        </div>

        {/* ── Tab: Timeline ── */}
        {activeTab === 'timeline' && (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 to-gray-200" />
            <div className="space-y-4">
              {(timeline ?? []).length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <span className="text-4xl block mb-2">📭</span>
                  <p className="text-sm">Chưa có sự kiện nào</p>
                </div>
              ) : (timeline ?? []).map((event, i) => (
                <div key={i} className="relative pl-14">
                  <div className="absolute left-2.5 top-4 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex items-center justify-center z-10" />
                  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-emerald-200 transition-all">
                    <p className="text-xs text-emerald-600 font-semibold mb-1">
                      {new Date(event.eventTime).toLocaleString('vi-VN')}
                    </p>
                    <h4 className="font-bold text-gray-800 text-base">{event.eventName}</h4>
                    {event.eventDescription && (
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{event.eventDescription}</p>
                    )}
                    {event.location && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Farming Logs ── */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            {(farmingLogs ?? []).length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <span className="text-4xl block mb-2">📭</span>
                <p className="text-sm">Chưa có nhật ký canh tác</p>
              </div>
            ) : (farmingLogs ?? []).map((log, i) => {
              const a = ACTION_LABELS[log.actionType] ?? { label: log.actionType, icon: '📝' };
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-emerald-700">{a.label}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.actionDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{log.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer note ── */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-400 bg-gray-100 px-4 py-2 rounded-full">
            🔒 Dữ liệu được xác thực bởi hệ thống AgriTrace
          </div>
        </div>
      </div>
    </div>
  );
}