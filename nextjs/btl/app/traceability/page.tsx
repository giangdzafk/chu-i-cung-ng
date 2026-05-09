'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

export default function TraceabilityHome() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) router.push(`/traceability/${code.trim()}`);
  };

  const startScan = async () => {
    setScanning(true);
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => { stopScan(); router.push(`/traceability/${decoded}`); },
        () => {}
      );
    } catch {
      alert('Không thể mở camera. Kiểm tra quyền truy cập!');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    setScanning(false);
  };

  useEffect(() => { return () => { stopScan(); }; }, []);

  const features = [
    { icon: '🌱', title: 'Nguồn gốc minh bạch', desc: 'Biết rõ nông trại, ngày trồng, loại giống, phân bón đã dùng' },
    { icon: '🔬', title: 'Kiểm định chất lượng', desc: 'Mỗi lô hàng đều qua kiểm định tiêu chuẩn trước khi xuất xưởng' },
    { icon: '🚚', title: 'Hành trình vận chuyển', desc: 'Theo dõi lộ trình từ nông trại đến tay người tiêu dùng' },
    { icon: '📱', title: 'Quét QR tức thì', desc: 'Chỉ cần quét mã trên bao bì để xem toàn bộ hành trình' },
  ];

  const steps = [
    { icon: '👨‍🌾', label: 'Nông dân', desc: 'Gieo trồng & ghi nhật ký canh tác' },
    { icon: '🏭', label: 'Chế biến', desc: 'Kiểm định, sơ chế & đóng gói' },
    { icon: '🚛', label: 'Vận chuyển', desc: 'Giao hàng đến điểm bán lẻ' },
    { icon: '🛒', label: 'Người tiêu dùng', desc: 'Nhận hàng & truy xuất nguồn gốc' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm">🌾</div>
            <span className={`font-black text-lg ${scrolled ? 'text-gray-800' : 'text-white'}`}>AgriTrace</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/login')}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all
                ${scrolled ? 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
              Đăng nhập
            </button>
            <button onClick={() => router.push('/login')}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm">
              Đăng ký
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-6 pt-20">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-teal-400 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-300 blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 text-emerald-200 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Hệ sinh thái nông sản minh bạch Việt Nam
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Biết rõ nguồn gốc<br />
            <span className="text-emerald-300">từng hạt gạo</span>
          </h1>
          <p className="text-emerald-100 text-lg mb-10 leading-relaxed">
            Nhập mã lô hàng hoặc quét QR trên bao bì để xem toàn bộ<br className="hidden md:block" />
            hành trình từ nông trại đến bàn ăn của bạn
          </p>

          {/* Search box */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6">
            <input
              type="text" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Nhập mã lô hàng (VD: BATCH-1234...)"
              className="flex-1 px-5 py-4 rounded-2xl bg-white/95 text-gray-800 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-lg" />
            <button type="submit"
              className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl transition-all shadow-lg whitespace-nowrap">
              🔍 Tra cứu
            </button>
          </form>

          {/* QR scan */}
          <div className="max-w-lg mx-auto">
            {scanning && (
              <div className="mb-4 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xl">
                <div id="qr-reader" style={{ width: '100%' }} />
              </div>
            )}
            <button onClick={scanning ? stopScan : startScan}
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all
                ${scanning ? 'border-red-400 text-red-300 hover:bg-red-400/10' : 'border-white/30 text-white hover:bg-white/10'}`}>
              {scanning ? '⏹ Dừng quét' : '📸 Quét mã QR trên bao bì'}
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 animate-bounce text-xs flex flex-col items-center gap-1">
          <span>Cuộn xuống</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-800 mb-4">Tại sao chọn AgriTrace?</h2>
            <p className="text-gray-500">Hệ thống truy xuất nguồn gốc đầy đủ nhất cho nông sản Việt Nam</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-emerald-700 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey Steps ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-800 mb-4">Hành trình minh bạch</h2>
            <p className="text-gray-500">Mỗi bước trong chuỗi cung ứng đều được ghi lại và xác thực</p>
          </div>
          <div className="relative">
            {/* Line */}
            <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 mx-16" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {steps.map((s, i) => (
                <div key={s.label} className="flex flex-col items-center text-center relative">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm border-2 z-10 bg-white
                    ${i === 0 ? 'border-emerald-300' : i === 1 ? 'border-blue-300' : i === 2 ? 'border-orange-300' : 'border-purple-300'}`}>
                    {s.icon}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1">{s.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-gradient-to-br from-emerald-800 to-teal-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Bạn là nhà sản xuất?</h2>
          <p className="text-emerald-200 mb-8">Tham gia hệ thống AgriTrace để xây dựng niềm tin với người tiêu dùng và tăng giá trị nông sản của bạn.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white text-emerald-800 font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-lg">
              Đăng ký tham gia
            </button>
            <button onClick={() => router.push('/login')}
              className="px-8 py-4 border-2 border-white/40 text-white font-bold rounded-2xl hover:bg-white/10 transition-all">
              Đăng nhập hệ thống
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white text-xs">🌾</div>
          <span className="font-bold text-white">AgriTrace</span>
        </div>
        <p>© 2026 AgriTrace — Hệ thống truy xuất nguồn gốc nông sản minh bạch</p>
      </footer>

    </div>
  );
}