import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { PdfReaderWorkspace } from './components/PdfReaderWorkspace';
import { Geometry2DStudio } from './components/Geometry2DStudio';
import { Spatial3DLab, SpatialMode } from './components/Spatial3DLab';
import { ProofsAndAiDrawer } from './components/ProofsAndAiDrawer';
import { PWAInstallButton } from './components/PWAInstallButton';

type MainWorkspaceTab = 'pdf' | 'studio-2d' | 'spatial-3d' | 'proofs';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainWorkspaceTab>('studio-2d');
  const [targetBookPage, setTargetBookPage] = useState<number>(10);
  const [targetPresetId, setTargetPresetId] = useState<string>('preset-perp-bisector');
  const [targetSpatialMode, setTargetSpatialMode] = useState<SpatialMode>('cross-section');

  const handleJumpToPdfPage = (bookPage: number) => {
    setTargetBookPage(bookPage);
    setActiveTab('pdf');
  };

  const handleOpen2DStudio = (presetId: string) => {
    setTargetPresetId(presetId);
    setActiveTab('studio-2d');
  };

  const handleOpen3DLab = (mode: SpatialMode) => {
    setTargetSpatialMode(mode);
    setActiveTab('spatial-3d');
  };

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Top Bar Contract: 3 Distinct Zones (Brand Wordmark | 4 Single-Line Nav Links | 1 Primary CTA) */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20 overflow-x-auto">
        {/* Zone 1: Brand Wordmark */}
        <div
          onClick={() => setActiveTab('studio-2d')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
            <Compass className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight text-[#0F172A] block leading-none">
              هندسه‌نگار
            </span>
            <span className="text-[11px] text-[#64748B] font-medium block mt-1">
              تخته سفید، ترسیمات هندسی و کتابخوان آفلاین
            </span>
          </div>
        </div>

        {/* Zone 2: Primary Navigation (4 top-level single-line items, gap-6 sm:gap-8) */}
        <nav className="flex items-center gap-5 sm:gap-8 shrink-0">
          <button
            onClick={() => setActiveTab('studio-2d')}
            className={`whitespace-nowrap text-xs font-bold py-5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'studio-2d'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            تخته سفید و ترسیم ۲بعدی
          </button>

          <button
            onClick={() => setActiveTab('pdf')}
            className={`whitespace-nowrap text-xs font-bold py-5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            کتابخوان و میز ترسیم PDF
          </button>

          <button
            onClick={() => setActiveTab('spatial-3d')}
            className={`whitespace-nowrap text-xs font-bold py-5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'spatial-3d'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            آزمایشگاه فضایی ۳بعدی
          </button>

          <button
            onClick={() => setActiveTab('proofs')}
            className={`whitespace-nowrap text-xs font-bold py-5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'proofs'
                ? 'border-[#0284C7] text-[#0284C7]'
                : 'border-transparent text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            استدلال و قضایا
          </button>
        </nav>

        {/* Zone 3: Single Primary Action CTA */}
        <div className="flex items-center shrink-0">
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Active Workspace */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'studio-2d' && (
          <Geometry2DStudio
            key={targetPresetId}
            initialPresetId={targetPresetId}
            onJumpToTextbookPage={handleJumpToPdfPage}
          />
        )}

        {activeTab === 'pdf' && (
          <PdfReaderWorkspace
            initialBookPage={targetBookPage}
            onOpen2DStudio={handleOpen2DStudio}
            onOpen3DLab={handleOpen3DLab}
          />
        )}

        {activeTab === 'spatial-3d' && (
          <Spatial3DLab
            initialMode={targetSpatialMode}
            onJumpToPdfPage={handleJumpToPdfPage}
          />
        )}

        {activeTab === 'proofs' && (
          <ProofsAndAiDrawer
            onJumpToPdfPage={handleJumpToPdfPage}
            onOpen2DStudio={handleOpen2DStudio}
          />
        )}
      </main>
    </div>
  );
}
