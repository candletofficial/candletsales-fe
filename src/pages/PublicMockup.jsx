import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MockupViewport } from './LabelMockupStudio';
import { mockupService } from '../services/mockupService';

export default function PublicMockup() {
  const { token } = useParams();
  const rendererRef = useRef(null);
  const [mockup, setMockup] = useState(null);
  const [labelSource, setLabelSource] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    mockupService.getPublicShare(token)
      .then((response) => {
        if (cancelled) return;
        const data = response.data?.data;
        if (!data) throw new Error('Không tìm thấy mockup');
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => { if (!cancelled) { setMockup(data); setLabelSource(image); } };
        image.onerror = () => { if (!cancelled) setError('Không thể tải file tem của mockup này.'); };
        image.src = data.label_url;
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.message || requestError.message || 'Không thể mở mockup');
      });
    return () => { cancelled = true; };
  }, [token]);

  if (error) {
    return <main className="grid min-h-screen place-items-center bg-slate-100 p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><span className="material-symbols-outlined text-5xl text-slate-300">link_off</span><h1 className="mt-4 text-xl font-black text-slate-900">Không mở được mockup</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main>;
  }

  if (!mockup || !labelSource) {
    return <main className="grid min-h-screen place-items-center bg-[#91969a]"><div className="flex flex-col items-center gap-3 text-white"><span className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" /><p className="text-sm font-bold">Đang dựng mockup 3D…</p></div></main>;
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#91969a] text-slate-900">
      <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-white/20 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-7">
        <div className="min-w-0"><p className="text-base font-black tracking-tight">CANDLET</p><p className="truncate text-[11px] font-medium text-slate-500">Bản xem trước tem custom 3D</p></div>
        <div className="min-w-0 text-right"><p className="max-w-[190px] truncate text-xs font-bold text-slate-700 sm:max-w-sm">{mockup.label_file_name}</p><p className="mt-0.5 text-[10px] text-slate-400">Tem {mockup.label_width} × {mockup.label_height} mm</p></div>
      </header>
      <section className="fixed inset-x-0 bottom-0 top-16 overflow-hidden">
        <MockupViewport
          labelSource={labelSource}
          labelWidth={mockup.label_width}
          labelHeight={mockup.label_height}
          labelTop={mockup.label_top}
          labelRotation={mockup.label_rotation}
          finish={mockup.finish}
          lid={mockup.lid}
          rendererRef={rendererRef}
          compact
        />
      </section>
      <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-[10px] font-bold text-slate-600 shadow-lg backdrop-blur sm:px-4 sm:text-[11px]">KÉO ĐỂ XOAY · CUỘN ĐỂ PHÓNG TO</div>
    </main>
  );
}
