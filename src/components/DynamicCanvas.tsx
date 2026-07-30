'use client';

import dynamic from 'next/dynamic';

const DynamicCanvas = dynamic(() => import('./CanvasViewport'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center text-slate-400">Loading Canvas Preview...</div>,
});

export default DynamicCanvas;