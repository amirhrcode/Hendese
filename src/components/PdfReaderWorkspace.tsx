import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  BookOpen,
  Upload,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Compass,
  PenTool,
  Circle,
  Minus,
  Trash2,
  FolderOpen,
  Sparkles,
  Box,
  Eye,
  EyeOff,
  Check,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  RotateCw,
  Copy,
  Undo2,
  Eraser,
  Square,
  Highlighter,
  MousePointer,
  Wand2,
  Scissors,
  ImageDown,
  Bookmark,
  Grid,
} from 'lucide-react';
import {
  TEXTBOOK_LESSONS,
  TEXTBOOK_PDF_URL,
  ChapterLesson
} from '../data/textbookData';
import {
  saveLocalPdfToIndexedDB,
  listStoredPdfs,
  getStoredPdfById,
  deleteStoredPdfById,
  StoredPdfFile
} from '../utils/localStorageDB';
import {
  distance,
  midpoint,
  recognizeSmartStroke,
  snapSmartLineEndpoint
} from '../utils/geometryMath';

// Use self-hosted local pdf.worker.min.mjs from /public/pdfjs/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

type OverlayTool =
  | 'pan'
  | 'select'
  | 'smart-pen'
  | 'pen'
  | 'highlighter'
  | 'laser'
  | 'crop'
  | 'eraser'
  | 'segment'
  | 'line'
  | 'circle'
  | 'rect'
  | 'bisector';

interface OverlayStroke {
  id: string;
  type:
    | 'pen'
    | 'highlighter'
    | 'segment'
    | 'line'
    | 'circle'
    | 'rect'
    | 'polygon'
    | 'bisector'
    | 'crop';
  points: { x: number; y: number }[];
  color: string;
  width?: number;
}

interface PdfReaderWorkspaceProps {
  initialBookPage?: number;
  onOpen2DStudio: (presetId: string) => void;
  onOpen3DLab: (mode: 'cross-section' | 'revolution' | 'space-lines' | 'voxels') => void;
  onSendImageTo2DStudio?: (dataUrl: string, title: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Group lessons by chapter for the sidebar TOC
const GROUPED_CHAPTERS = [1, 2, 3, 4].map((chNum) => {
  const lessons = TEXTBOOK_LESSONS.filter((l) => l.chapterNumber === chNum);
  return {
    number: chNum,
    title: lessons[0]?.chapterTitle || `فصل ${chNum}`,
    startPage: lessons[0]?.bookPage || 1,
    lessons,
  };
});

// Helper to build local, offline-ready PDF.js document parameters
function createLocalPdfParams(arrayBuffer: ArrayBuffer) {
  const origin =
    typeof window !== 'undefined' &&
    window.location.origin &&
    window.location.origin !== 'null'
      ? window.location.origin
      : '';
  const basePath = origin ? `${origin}/pdfjs` : './pdfjs';

  return {
    data: new Uint8Array(arrayBuffer.slice(0)),
    wasmUrl: `${basePath}/wasm/`,
    cMapUrl: `${basePath}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${basePath}/standard_fonts/`,
    iccUrl: `${basePath}/iccs/`,
    isEvalSupported: false,
    useSystemFonts: true,
  };
}

export const PdfReaderWorkspace: React.FC<PdfReaderWorkspaceProps> = ({
  initialBookPage = 10,
  onOpen2DStudio,
  onOpen3DLab,
  onSendImageTo2DStudio,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(initialBookPage + 1);
  const [totalPages, setTotalPages] = useState<number>(97);
  const [scale, setScale] = useState<number>(1.35);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePdfTitle, setActivePdfTitle] = useState<string>('کتاب درسی هندسه ۱ (پایه دهم)');
  const [isDefaultTextbook, setIsDefaultTextbook] = useState<boolean>(true);

  // Sidebar collapse state & Page Grid Modal
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [showPageGridModal, setShowPageGridModal] = useState<boolean>(false);
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('hendese_pdf_bookmarks');
      return saved ? JSON.parse(saved) : [11, 20, 35, 43, 71];
    } catch {
      return [11, 20, 35, 43, 71];
    }
  });
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // Local PDF Library (IndexedDB)
  const [savedPdfs, setSavedPdfs] = useState<Omit<StoredPdfFile, 'data'>[]>([]);
  const [showLibraryPanel, setShowLibraryPanel] = useState<boolean>(false);

  // Interactive Geometry & Whiteboard Overlay over PDF
  const [overlayEnabled, setOverlayEnabled] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<OverlayTool>('smart-pen');
  const [strokeColor, setStrokeColor] = useState<string>('#0284C7');
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, OverlayStroke[]>>(() => {
    try {
      const saved = localStorage.getItem('hendese_pdf_annotations_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isPointerDown, setIsPointerDown] = useState<boolean>(false);
  const [draftStroke, setDraftStroke] = useState<OverlayStroke | null>(null);
  const [dragLastPt, setDragLastPt] = useState<{ x: number; y: number } | null>(null);
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number; t: number }[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportScrollRef = useRef<HTMLDivElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textbookBufferCacheRef = useRef<ArrayBuffer | null>(null);

  // Auto-fade laser trail
  useEffect(() => {
    if (laserTrail.length === 0) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setLaserTrail((prev) => prev.filter((pt) => now - pt.t < 750));
    }, 50);
    return () => window.clearInterval(timer);
  }, [laserTrail.length]);

  const showToastMsg = useCallback((msg: string) => {
    setPdfToast(msg);
    window.setTimeout(() => setPdfToast(null), 3200);
  }, []);

  const toggleBookmarkCurrentPage = () => {
    setBookmarkedPages((prev) => {
      const exists = prev.includes(currentPdfPage);
      const next = exists
        ? prev.filter((p) => p !== currentPdfPage)
        : [...prev, currentPdfPage].sort((a, b) => a - b);
      try {
        localStorage.setItem('hendese_pdf_bookmarks', JSON.stringify(next));
      } catch {
        // ignore
      }
      showToastMsg(
        exists ? 'نشانک این صفحه برداشته شد' : `★ صفحه ${isDefaultTextbook ? currentPdfPage - 1 : currentPdfPage} نشانک‌گذاری شد`
      );
      return next;
    });
  };

  // Sync external initialBookPage requests
  useEffect(() => {
    if (isDefaultTextbook && initialBookPage >= 1) {
      const targetPdfPage = Math.min(Math.max(initialBookPage + 1, 1), totalPages);
      setCurrentPdfPage(targetPdfPage);
    }
  }, [initialBookPage, isDefaultTextbook, totalPages]);

  // Save annotations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hendese_pdf_annotations_v2', JSON.stringify(pageAnnotations));
    } catch {
      // Ignore storage quota errors
    }
  }, [pageAnnotations]);

  // Load saved PDFs list from IndexedDB
  const refreshLibrary = useCallback(async () => {
    try {
      const list = await listStoredPdfs();
      setSavedPdfs(list);
    } catch {
      // Ignore IndexedDB errors
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // Toggle Fullscreen (delegates to App.tsx root Fullscreen so switching tabs never exits Fullscreen)
  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Load default textbook PDF using cached ArrayBuffer + local /pdfjs/ assets
  const loadDefaultTextbook = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let buffer = textbookBufferCacheRef.current;
      if (!buffer) {
        const response = await fetch(TEXTBOOK_PDF_URL);
        if (!response.ok) {
          throw new Error('خطا در دریافت فایل پی‌دی‌اف کتاب درسی');
        }
        buffer = await response.arrayBuffer();
        textbookBufferCacheRef.current = buffer;
      }

      const loadingTask = pdfjsLib.getDocument(createLocalPdfParams(buffer));
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setActivePdfTitle('کتاب درسی هندسه ۱ (پایه دهم)');
      setIsDefaultTextbook(true);
      setCurrentPdfPage((prev) => Math.min(Math.max(prev, 2), doc.numPages));
    } catch (err: any) {
      setLoadError(err?.message || 'خطا در بارگذاری فایل پی‌دی‌اف کتاب درسی');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultTextbook();
  }, [loadDefaultTextbook]);

  // Render active PDF page onto canvas cleanly (awaiting any cancelled render task)
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
            await renderTaskRef.current.promise.catch(() => {});
          } catch {
            // ignore cancellation error
          }
          renderTaskRef.current = null;
        }
        if (isCancelled) return;

        const safePageNum = Math.min(Math.max(1, currentPdfPage), pdfDoc.numPages);
        const page = await pdfDoc.getPage(safePageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.floor(viewport.width);
        const targetH = Math.floor(viewport.height);

        canvas.width = Math.floor(targetW * dpr);
        canvas.height = Math.floor(targetH * dpr);
        canvas.style.width = `${targetW}px`;
        canvas.style.height = `${targetH}px`;

        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = targetW;
          overlayCanvasRef.current.height = targetH;
          overlayCanvasRef.current.style.width = `${targetW}px`;
          overlayCanvasRef.current.style.height = `${targetH}px`;
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, targetW, targetH);

        const task = page.render({
          canvasContext: context,
          viewport,
          canvas,
        } as any);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page render note:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPdfPage, scale, rotation]);

  // Render interactive geometric overlay onto overlayCanvasRef
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!overlayEnabled) return;

    const strokes = pageAnnotations[currentPdfPage] || [];

    const renderStroke = (stroke: OverlayStroke, isSelected = false, isPreview = false) => {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.type === 'highlighter' ? 14 : stroke.width || 2.5;

      if (stroke.type === 'highlighter') {
        ctx.globalAlpha = 0.32;
      } else if (isPreview) {
        ctx.setLineDash([6, 4]);
      }

      if (isSelected) {
        ctx.shadowColor = '#0284C7';
        ctx.shadowBlur = 8;
      }

      const pts = stroke.points.map((p) => ({ x: p.x * scale, y: p.y * scale }));

      if ((stroke.type === 'pen' || stroke.type === 'highlighter') && pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      } else if ((stroke.type === 'segment' || stroke.type === 'line') && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        if (stroke.type === 'line') {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.hypot(dx, dy) || 1;
          ctx.moveTo(p1.x - (dx / len) * 1200, p1.y - (dy / len) * 1200);
          ctx.lineTo(p2.x + (dx / len) * 1200, p2.y + (dy / len) * 1200);
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();

        // Endpoints
        [p1, p2].forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Distance readout
        const distPx = distance(p1, p2) / scale;
        const mid = midpoint(p1, p2);
        ctx.setLineDash([]);
        ctx.font = '600 11px "JetBrains Mono", monospace';
        const label = `${(distPx / 35).toFixed(1)} cm`;
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(mid.x - w / 2, mid.y - 18, w, 16);
        ctx.fillStyle = stroke.color;
        ctx.textAlign = 'center';
        ctx.fillText(label, mid.x, mid.y - 6);
      } else if (stroke.type === 'circle' && pts.length >= 2) {
        const r = distance(pts[0], pts[1]);
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      } else if (stroke.type === 'rect' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (stroke.type === 'polygon' && pts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(2, 132, 199, 0.08)';
        ctx.fill();
      } else if (stroke.type === 'crop' && pts.length >= 2) {
        const [p1, p2] = pts;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.14)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);
      } else if (stroke.type === 'bisector' && pts.length >= 2) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        const mid = midpoint(pts[0], pts[1]);
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const span = Math.max(len * 0.9, 130);

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mid.x - nx * span, mid.y - ny * span);
        ctx.lineTo(mid.x + nx * span, mid.y + ny * span);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mid.x, mid.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    strokes.forEach((s) => renderStroke(s, s.id === selectedStrokeId, false));
    if (draftStroke) {
      renderStroke(draftStroke, false, true);
    }

    // Render glowing red laser pointer trail
    if (laserTrail.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(laserTrail[0].x * scale, laserTrail[0].y * scale);
      for (let i = 1; i < laserTrail.length; i++) {
        ctx.lineTo(laserTrail[i].x * scale, laserTrail[i].y * scale);
      }
      ctx.stroke();

      const last = laserTrail[laserTrail.length - 1];
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(last.x * scale, last.y * scale, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [pageAnnotations, currentPdfPage, scale, overlayEnabled, draftStroke, selectedStrokeId, laserTrail]);

  // Fit PDF page cleanly to current viewport width
  const fitToViewportWidth = useCallback(async () => {
    if (!pdfDoc || !viewportScrollRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPdfPage);
      const unscaled = page.getViewport({ scale: 1, rotation });
      const availW = Math.max(320, viewportScrollRef.current.clientWidth - 48);
      const nextScale = Math.min(2.4, Math.max(0.65, +(availW / unscaled.width).toFixed(2)));
      setScale(nextScale);
      showToastMsg(`تناسب خودکار با عرض صفحه (${Math.round(nextScale * 100)}%)`);
    } catch {
      // ignore
    }
  }, [pdfDoc, currentPdfPage, rotation, showToastMsg]);

  // Export current PDF page + geometric overlay annotations as a single high-res PNG
  const exportAnnotatedPdfPagePng = () => {
    const pdfCanvas = pdfCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!pdfCanvas) return;
    const out = document.createElement('canvas');
    out.width = pdfCanvas.width;
    out.height = pdfCanvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(pdfCanvas, 0, 0);
    if (overlayCanvas && overlayEnabled) {
      ctx.drawImage(overlayCanvas, 0, 0, out.width, out.height);
    }
    const a = document.createElement('a');
    a.download = `hendese-page-${isDefaultTextbook ? currentPdfPage - 1 : currentPdfPage}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
    showToastMsg('📸 تصویر صفحه به همراه ترسیمات ذخیره شد');
  };

  // Send the entire current PDF page to the 2D Whiteboard background
  const sendFullPageToWhiteboard = () => {
    const pdfCanvas = pdfCanvasRef.current;
    if (!pdfCanvas || !onSendImageTo2DStudio) return;
    const dataUrl = pdfCanvas.toDataURL('image/png');
    const pageTitle = `صفحه ${isDefaultTextbook ? currentPdfPage - 1 : currentPdfPage} (${activePdfTitle})`;
    onSendImageTo2DStudio(dataUrl, pageTitle);
  };

  // Handle local PDF upload from user device (Android / Desktop)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(createLocalPdfParams(buffer));
      const doc = await loadingTask.promise;

      await saveLocalPdfToIndexedDB(file);
      await refreshLibrary();

      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPdfPage(1);
      setActivePdfTitle(file.name.replace(/\.pdf$/i, ''));
      setIsDefaultTextbook(false);
    } catch (err: any) {
      setLoadError(err?.message || 'فایل انتخاب‌شده معتبر نیست یا امکان باز کردن آن وجود ندارد.');
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Load a saved PDF from IndexedDB using full local /pdfjs/ params
  const handleOpenSavedPdf = async (id: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const stored = await getStoredPdfById(id);
      if (!stored) throw new Error('فایل در حافظه یافت نشد');
      const loadingTask = pdfjsLib.getDocument(createLocalPdfParams(stored.data));
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPdfPage(1);
      setActivePdfTitle(stored.name.replace(/\.pdf$/i, ''));
      setIsDefaultTextbook(false);
      setShowLibraryPanel(false);
    } catch {
      setLoadError('خطا در بازخوانی فایل ذخیره‌شده.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pointer coordinates normalized to scale = 1 with exact CSS-to-Canvas ratio
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ratioX = (canvas.width || rect.width) / (rect.width || 1);
    const ratioY = (canvas.height || rect.height) / (rect.height || 1);
    return {
      x: ((e.clientX - rect.left) * ratioX) / scale,
      y: ((e.clientY - rect.top) * ratioY) / scale,
    };
  };

  const hitTestStroke = (pt: { x: number; y: number }, strokes: OverlayStroke[]): string | null => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.points.some((p) => distance(p, pt) < 22 / scale)) {
        return s.id;
      }
      if (s.points.length >= 2) {
        const mid = midpoint(s.points[0], s.points[1]);
        if (distance(mid, pt) < 24 / scale) return s.id;
      }
    }
    return null;
  };

  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!overlayEnabled || activeTool === 'pan') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormalizedCoords(e);
    setIsPointerDown(true);

    if (activeTool === 'laser') {
      setLaserTrail([{ x: pt.x, y: pt.y, t: Date.now() }]);
      return;
    }

    const currentStrokes = pageAnnotations[currentPdfPage] || [];

    if (activeTool === 'select') {
      const hitId = hitTestStroke(pt, currentStrokes);
      setSelectedStrokeId(hitId);
      setDragLastPt(hitId ? pt : null);
      return;
    }

    if (activeTool === 'eraser') {
      const hitId = hitTestStroke(pt, currentStrokes);
      if (hitId) {
        setPageAnnotations((prev) => ({
          ...prev,
          [currentPdfPage]: (prev[currentPdfPage] || []).filter((s) => s.id !== hitId),
        }));
      }
      return;
    }

    if (activeTool === 'crop') {
      setDraftStroke({
        id: `crop-${Date.now()}`,
        type: 'crop',
        points: [pt, pt],
        color: '#0284C7',
      });
      return;
    }

    if (activeTool === 'smart-pen' || activeTool === 'pen' || activeTool === 'highlighter') {
      setDraftStroke({
        id: `stroke-${Date.now()}`,
        type: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        points: [pt],
        color: strokeColor,
      });
      return;
    }

    // Drag-to-draw geometric shapes (segment, line, circle, rect, bisector)
    setDraftStroke({
      id: `geo-${Date.now()}`,
      type: activeTool,
      points: [pt, pt],
      color: strokeColor,
    });
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown || !overlayEnabled || activeTool === 'pan') return;
    const pt = getNormalizedCoords(e);

    if (activeTool === 'laser') {
      setLaserTrail((prev) => [...prev.slice(-28), { x: pt.x, y: pt.y, t: Date.now() }]);
      return;
    }

    if (activeTool === 'select' && selectedStrokeId && dragLastPt) {
      const dx = pt.x - dragLastPt.x;
      const dy = pt.y - dragLastPt.y;
      setPageAnnotations((prev) => ({
        ...prev,
        [currentPdfPage]: (prev[currentPdfPage] || []).map((s) =>
          s.id === selectedStrokeId
            ? { ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
            : s
        ),
      }));
      setDragLastPt(pt);
      return;
    }

    if (activeTool === 'eraser') {
      const currentStrokes = pageAnnotations[currentPdfPage] || [];
      const hitId = hitTestStroke(pt, currentStrokes);
      if (hitId) {
        setPageAnnotations((prev) => ({
          ...prev,
          [currentPdfPage]: (prev[currentPdfPage] || []).filter((s) => s.id !== hitId),
        }));
      }
      return;
    }

    if (!draftStroke) return;

    if (draftStroke.type === 'pen' || draftStroke.type === 'highlighter') {
      setDraftStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, pt] } : null
      );
    } else {
      setDraftStroke((prev) =>
        prev ? { ...prev, points: [prev.points[0], pt] } : null
      );
    }
  };

  const handleOverlayPointerUp = () => {
    setIsPointerDown(false);
    setDragLastPt(null);
    if (draftStroke) {
      // Handle Crop & Send Exercise to 2D Studio
      if (draftStroke.type === 'crop' && draftStroke.points.length >= 2) {
        const [p1, p2] = draftStroke.points;
        setDraftStroke(null);
        const pdfCanvas = pdfCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!pdfCanvas || !overlayCanvas || !onSendImageTo2DStudio) return;

        const dprRatioX = pdfCanvas.width / (overlayCanvas.width || 1);
        const dprRatioY = pdfCanvas.height / (overlayCanvas.height || 1);
        const sx = Math.min(p1.x, p2.x) * scale * dprRatioX;
        const sy = Math.min(p1.y, p2.y) * scale * dprRatioY;
        const sw = Math.abs(p2.x - p1.x) * scale * dprRatioX;
        const sh = Math.abs(p2.y - p1.y) * scale * dprRatioY;

        if (sw > 25 && sh > 25) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = Math.round(sw);
          cropCanvas.height = Math.round(sh);
          const cCtx = cropCanvas.getContext('2d');
          if (cCtx) {
            cCtx.fillStyle = '#FFFFFF';
            cCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
            cCtx.drawImage(
              pdfCanvas,
              sx,
              sy,
              sw,
              sh,
              0,
              0,
              cropCanvas.width,
              cropCanvas.height
            );
            const dataUrl = cropCanvas.toDataURL('image/png');
            const label = `تمرین برش‌خورده از ص ${isDefaultTextbook ? currentPdfPage - 1 : currentPdfPage}`;
            onSendImageTo2DStudio(dataUrl, label);
          }
        }
        return;
      }

      let finalStroke: OverlayStroke = draftStroke;

      // Smart Pen v2 recognition on PDF overlay
      if (activeTool === 'smart-pen' && draftStroke.points.length >= 6) {
        const recognized = recognizeSmartStroke(draftStroke.points);
        if (recognized.kind === 'erase-gesture') {
          const { minX, maxX, minY, maxY } = recognized.bounds;
          setPageAnnotations((prev) => ({
            ...prev,
            [currentPdfPage]: (prev[currentPdfPage] || []).filter(
              (s) =>
                !s.points.some(
                  (p) => p.x >= minX - 10 && p.x <= maxX + 10 && p.y >= minY - 10 && p.y <= maxY + 10
                )
            ),
          }));
          setDraftStroke(null);
          showToastMsg('🧹 ژست خط‌خطی هوشمند: ترسیمات زیر قلم پاک شدند');
          return;
        } else if (recognized.kind === 'circle') {
          finalStroke = {
            id: `smart-cir-${Date.now()}`,
            type: 'circle',
            points: [
              recognized.center,
              { x: recognized.center.x + recognized.radius, y: recognized.center.y },
            ],
            color: strokeColor,
          };
          showToastMsg('✨ تشخیص قلم هوشمند: دایره منظم');
        } else if (recognized.kind === 'segment') {
          const snappedEnd = snapSmartLineEndpoint(recognized.start, recognized.end, 4);
          finalStroke = {
            id: `smart-seg-${Date.now()}`,
            type: 'segment',
            points: [recognized.start, snappedEnd.point],
            color: strokeColor,
          };
          showToastMsg('✨ تشخیص قلم هوشمند: پاره‌خط صاف');
        } else if (recognized.kind === 'rectangle') {
          const xs = recognized.vertices.map((v) => v.x);
          const ys = recognized.vertices.map((v) => v.y);
          finalStroke = {
            id: `smart-rect-${Date.now()}`,
            type: 'rect',
            points: [
              { x: Math.min(...xs), y: Math.min(...ys) },
              { x: Math.max(...xs), y: Math.max(...ys) },
            ],
            color: strokeColor,
          };
          showToastMsg(recognized.isSquare ? '✨ تشخیص قلم هوشمند: مربع منتظم' : '✨ تشخیص قلم هوشمند: مستطیل');
        } else if (recognized.kind === 'triangle' || recognized.kind === 'polygon') {
          finalStroke = {
            id: `smart-poly-${Date.now()}`,
            type: 'polygon',
            points: recognized.vertices,
            color: strokeColor,
          };
          showToastMsg(
            recognized.kind === 'triangle'
              ? '✨ تشخیص قلم هوشمند: مثلث منظم'
              : `✨ تشخیص قلم هوشمند: ${recognized.sides}ضلعی منتظم`
          );
        }
      }

      const isMeaningful =
        finalStroke.type === 'pen' ||
        finalStroke.type === 'highlighter' ||
        finalStroke.type === 'polygon' ||
        (finalStroke.points.length >= 2 &&
          distance(finalStroke.points[0], finalStroke.points[1]) > 4 / scale);

      if (isMeaningful) {
        setPageAnnotations((prev) => ({
          ...prev,
          [currentPdfPage]: [...(prev[currentPdfPage] || []), finalStroke],
        }));
        setSelectedStrokeId(finalStroke.id);
      }
      setDraftStroke(null);
    }
  };

  const duplicateSelectedStroke = () => {
    if (!selectedStrokeId) return;
    const currentStrokes = pageAnnotations[currentPdfPage] || [];
    const target = currentStrokes.find((s) => s.id === selectedStrokeId);
    if (!target) return;
    const clone: OverlayStroke = {
      ...target,
      id: `copy-${Date.now()}`,
      points: target.points.map((p) => ({ x: p.x + 20 / scale, y: p.y + 20 / scale })),
    };
    setPageAnnotations((prev) => ({
      ...prev,
      [currentPdfPage]: [...(prev[currentPdfPage] || []), clone],
    }));
    setSelectedStrokeId(clone.id);
  };

  const undoLastStroke = () => {
    setPageAnnotations((prev) => {
      const list = prev[currentPdfPage] || [];
      if (list.length === 0) return prev;
      return {
        ...prev,
        [currentPdfPage]: list.slice(0, -1),
      };
    });
    setSelectedStrokeId(null);
  };

  const clearCurrentPageAnnotations = () => {
    setPageAnnotations((prev) => {
      const next = { ...prev };
      delete next[currentPdfPage];
      return next;
    });
    setSelectedStrokeId(null);
  };

  // Determine current textbook lesson based on page number
  const currentBookPage = Math.max(1, currentPdfPage - 1);
  let activeLesson: ChapterLesson | null = TEXTBOOK_LESSONS[0] || null;
  for (let i = 0; i < TEXTBOOK_LESSONS.length; i++) {
    const ls = TEXTBOOK_LESSONS[i];
    const nextLs = TEXTBOOK_LESSONS[i + 1];
    const endPage = nextLs ? nextLs.bookPage - 1 : 96;
    if (currentBookPage >= ls.bookPage && currentBookPage <= endPage) {
      activeLesson = ls;
      break;
    }
  }

  const isCurrentBookmarked = bookmarkedPages.includes(currentPdfPage);

  return (
    <div
      ref={containerRef}
      className="flex w-full bg-[#F8FAFC] overflow-hidden h-[calc(100vh-3.5rem)] relative"
    >
      {/* Collapsible Right Sidebar (RTL): Textbook Chapters, Bookmarks & Local PDF Library */}
      {sidebarOpen && (
        <aside className="w-72 shrink-0 bg-white border-l border-[#E2E8F0] flex flex-col h-full">
          {/* Document Switcher Header */}
          <div className="p-3.5 border-b border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#475569]">فایل فعال در کتابخوان</span>
              <button
                onClick={() => setShowLibraryPanel(!showLibraryPanel)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>کتابخانه من ({savedPdfs.length + 1})</span>
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-[#0284C7] shrink-0" />
                <p className="text-xs font-bold text-[#0F172A] truncate" title={activePdfTitle}>
                  {activePdfTitle}
                </p>
              </div>
              <span className="text-[11px] font-mono-num text-[#475569] shrink-0">
                {totalPages} ص
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>باز کردن هر فایل PDF</span>
              </button>
              {!isDefaultTextbook && (
                <button
                  onClick={loadDefaultTextbook}
                  className="py-2 px-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-medium text-[#0F172A] transition-colors cursor-pointer"
                  title="بازگشت به کتاب هندسه ۱"
                >
                  کتاب هندسه
                </button>
              )}
            </div>

            {/* Quick Bookmarked Pages Chips */}
            {bookmarkedPages.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  ★ صفحات نشانک‌گذاری‌شده:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {bookmarkedPages.map((p) => {
                    const disp = isDefaultTextbook ? Math.max(1, p - 1) : p;
                    const active = p === currentPdfPage;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPdfPage(p)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono-num font-bold cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ص {disp}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Saved Local PDFs Panel OR Textbook TOC */}
          {showLibraryPanel ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#0F172A]">فایل‌های ذخیره‌شده آفلاین</h3>
                <button
                  onClick={() => setShowLibraryPanel(false)}
                  className="text-xs text-[#0284C7] hover:underline cursor-pointer"
                >
                  فهرست کتاب
                </button>
              </div>

              <div
                onClick={() => {
                  loadDefaultTextbook();
                  setShowLibraryPanel(false);
                }}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  isDefaultTextbook
                    ? 'border-[#0284C7] bg-[#F0F9FF]'
                    : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A]">کتاب هندسه ۱ (پایه دهم)</span>
                  <span className="text-[11px] text-[#0284C7] font-medium">پیش‌فرض</span>
                </div>
                <p className="text-[11px] text-[#475569] mt-1">۹۶ صفحه • موتور محلی PDF.js</p>
              </div>

              {savedPdfs.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-white flex items-center justify-between gap-2"
                >
                  <div
                    onClick={() => handleOpenSavedPdf(item.id)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-[#0F172A] truncate">{item.name}</p>
                    <p className="text-[11px] text-[#475569] font-mono-num">
                      {(item.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await deleteStoredPdfById(item.id);
                      refreshLibrary();
                    }}
                    className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded cursor-pointer"
                    title="حذف از حافظه محلی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
              {GROUPED_CHAPTERS.map((chapter) => (
                <div key={chapter.number} className="space-y-1.5">
                  <button
                    onClick={() => {
                      if (!isDefaultTextbook) loadDefaultTextbook();
                      setCurrentPdfPage(chapter.startPage + 1);
                    }}
                    className="w-full text-right px-2.5 py-1.5 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#0F172A]">{chapter.title}</span>
                    <span className="text-[11px] font-mono-num text-[#475569]">
                      ص {chapter.startPage}
                    </span>
                  </button>

                  <div className="space-y-1 pr-2 border-r-2 border-[#E2E8F0]">
                    {chapter.lessons.map((lesson) => {
                      const isActive = isDefaultTextbook && activeLesson?.id === lesson.id;
                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-lg p-2 transition-colors ${
                            isActive
                              ? 'bg-[#F0F9FF] border border-[#BAE6FD]'
                              : 'hover:bg-[#F8FAFC] border border-transparent'
                          }`}
                        >
                          <div
                            onClick={() => {
                              if (!isDefaultTextbook) loadDefaultTextbook();
                              setCurrentPdfPage(lesson.pdfPage);
                            }}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span
                              className={`text-xs ${
                                isActive ? 'font-bold text-[#0284C7]' : 'font-medium text-[#334155]'
                              }`}
                            >
                              {lesson.lessonTitle}
                            </span>
                            <span className="text-[11px] font-mono-num text-[#64748B] shrink-0">
                              ص {lesson.bookPage}
                            </span>
                          </div>

                          {isActive && (
                            <div className="mt-2 pt-2 border-t border-[#E0F2FE] flex items-center gap-1.5 flex-wrap">
                              {lesson.linkedPresetId && (
                                <button
                                  onClick={() => onOpen2DStudio(lesson.linkedPresetId!)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  <Compass className="w-3 h-3" />
                                  <span>تخته سفید و ترسیم ۲بعدی</span>
                                </button>
                              )}
                              {lesson.linked3DMode && (
                                <button
                                  onClick={() =>
                                    onOpen3DLab(
                                      lesson.linked3DMode === 'orthographic'
                                        ? 'voxels'
                                        : lesson.linked3DMode!
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  <Box className="w-3 h-3" />
                                  <span>آزمایشگاه فضایی ۳بعدی</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* Main Center PDF + Transparent Geometry Canvas Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* SINGLE ULTRA-SLIM PDF NAVIGATION BAR (Zero Clutter) */}
        <div className="h-11 bg-white border-b border-[#E2E8F0] px-3 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
          {/* Sidebar Toggle + Page Navigation + Zoom */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="px-2 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title={sidebarOpen ? 'بستن نوار کناری' : 'باز کردن نوار کناری'}
            >
              {sidebarOpen ? (
                <PanelRightClose className="w-4 h-4 text-[#0284C7]" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-[#0284C7]" />
              )}
              <span className="hidden sm:inline">{sidebarOpen ? 'بستن فهرست' : 'فهرست کتاب'}</span>
            </button>

            <div className="h-4 w-px bg-[#E2E8F0] mx-0.5" />

            <button
              onClick={() => setCurrentPdfPage((p) => Math.max(1, p - 1))}
              disabled={currentPdfPage <= 1}
              className="p-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-40 cursor-pointer"
              title="صفحه قبل"
            >
              <ChevronRight className="w-4 h-4 text-[#0F172A]" />
            </button>

            <div className="flex items-center gap-1 text-xs">
              <input
                type="number"
                min={1}
                max={Math.max(1, totalPages - (isDefaultTextbook ? 1 : 0))}
                value={isDefaultTextbook ? currentBookPage : currentPdfPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const target = isDefaultTextbook ? val + 1 : val;
                    setCurrentPdfPage(Math.min(Math.max(1, target), totalPages));
                  }
                }}
                className="w-11 px-1 py-0.5 text-center font-mono-num font-bold text-[#0F172A] border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#0284C7]"
              />
              <span className="text-[#64748B] font-mono-num">
                / {isDefaultTextbook ? totalPages - 1 : totalPages}
              </span>
            </div>

            <button
              onClick={() => setCurrentPdfPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPdfPage >= totalPages}
              className="p-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-40 cursor-pointer"
              title="صفحه بعد"
            >
              <ChevronLeft className="w-4 h-4 text-[#0F172A]" />
            </button>

            <button
              onClick={toggleBookmarkCurrentPage}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                isCurrentBookmarked
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569]'
              }`}
              title="نشانک‌گذاری این صفحه"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowPageGridModal((v) => !v)}
              className="px-2 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="پرش سریع بین تمام صفحات کتاب"
            >
              <Grid className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="hidden md:inline">نمای صفحات</span>
            </button>

            <div className="h-4 w-px bg-[#E2E8F0] mx-0.5" />

            {/* Zoom, Fit-Width & Rotation Controls */}
            <button
              onClick={() => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)))}
              className="p-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-4 h-4 text-[#0F172A]" />
            </button>
            <span className="text-xs font-mono-num font-semibold text-[#334155] w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.6, +(s + 0.15).toFixed(2)))}
              className="p-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-4 h-4 text-[#0F172A]" />
            </button>
            <button
              onClick={fitToViewportWidth}
              className="px-2 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              title="تناسب خودکار اندازه PDF با عرض صفحه نمایش"
            >
              تناسب عرض
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer"
              title="چرخش ۹۰ درجه صفحه"
            >
              <RotateCw className="w-4 h-4 text-[#0F172A]" />
            </button>
          </div>

          {/* Right Action Group: Send Page to Whiteboard, Save PNG, Fullscreen */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onSendImageTo2DStudio && (
              <button
                onClick={sendFullPageToWhiteboard}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                title="ارسال کل این صفحه به پس‌زمینه تخته سفید ۲بعدی برای حل تمرین"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ارسال صفحه به تخته سفید</span>
              </button>
            )}

            <button
              onClick={exportAnnotatedPdfPagePng}
              className="px-2 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="دانلود تصویر این صفحه به همراه ترسیمات (PNG)"
            >
              <ImageDown className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="hidden lg:inline">ذخیره PNG</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="px-2 py-1 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title={isFullscreen ? 'خروج از حالت تمام‌صفحه' : 'نمایش تمام‌صفحه'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-[#0284C7]" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-[#0284C7]" />
              )}
              <span className="hidden md:inline">{isFullscreen ? 'خروج' : 'تمام‌صفحه'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast Banner when Smart Pen / Crop / Bookmark triggers */}
        {(pdfToast || activeTool === 'crop') && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-1 text-xs font-bold text-sky-900 flex items-center justify-between">
            <span>
              {pdfToast ||
                '✂️ حالت برش تمرین فعال است: دور هر شکل یا تمرین کتاب کادر بکشید تا مستقیماً به تخته سفید ۲بعدی منتقل شود!'}
            </span>
            {activeTool === 'crop' && (
              <button
                onClick={() => setActiveTool('smart-pen')}
                className="text-rose-600 hover:underline text-[11px] cursor-pointer"
              >
                لغو حالت برش
              </button>
            )}
          </div>
        )}

        {/* FLOATING RIGHT-SIDE VERTICAL OVERLAY TOOL DOCK ON PDF VIEWPORT */}
        <div
          className="absolute right-3 top-14 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg p-1.5 flex flex-col gap-1 w-[134px]"
          role="toolbar"
          aria-label="نوار ابزار ترسیم روی کتاب"
        >
          <button
            onClick={() => setOverlayEnabled(!overlayEnabled)}
            className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              overlayEnabled
                ? 'bg-[#0F172A] text-white'
                : 'bg-slate-100 text-[#475569] hover:bg-slate-200'
            }`}
            title="فعال/غیرفعال کردن طلق ترسیم روی کتاب"
          >
            {overlayEnabled ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{overlayEnabled ? 'طلق ترسیم فعال' : 'طلق خاموش'}</span>
          </button>

          {overlayEnabled && (
            <>
              <button
                onClick={() => setActiveTool('pan')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'pan'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Move className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">اسکرول صفحه</span>
              </button>

              <button
                onClick={() => setActiveTool('select')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">انتخاب شکل</span>
              </button>

              <button
                onClick={() => setActiveTool('smart-pen')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'smart-pen'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">قلم هوشمند ✨</span>
              </button>

              <button
                onClick={() => setActiveTool('pen')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'pen'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">قلم آزاد</span>
              </button>

              <button
                onClick={() => setActiveTool('highlighter')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'highlighter'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ماژیک</span>
              </button>

              <button
                onClick={() => setActiveTool('laser')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'laser'
                    ? 'bg-rose-600 text-white'
                    : 'text-[#475569] hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                <span>🔴</span>
                <span className="truncate">لیزر تدریس</span>
              </button>

              <button
                onClick={() => setActiveTool('segment')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'segment'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Minus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">پاره‌خط</span>
              </button>

              <button
                onClick={() => setActiveTool('circle')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'circle'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Circle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">دایره</span>
              </button>

              <button
                onClick={() => setActiveTool('rect')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'rect'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Square className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">مستطیل</span>
              </button>

              <button
                onClick={() => setActiveTool('bisector')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'bisector'
                    ? 'bg-sky-600 text-white'
                    : 'text-[#475569] hover:bg-slate-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">عمودمنصف</span>
              </button>

              <button
                onClick={() => setActiveTool('crop')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'crop'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Scissors className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">برش تمرین ✂️</span>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`w-full px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">پاک‌کن</span>
              </button>

              {/* Color Swatches */}
              <div className="flex items-center justify-center gap-1 py-1 border-t border-slate-100">
                {['#0284C7', '#D97706', '#059669', '#DC2626', '#0F172A'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setStrokeColor(c)}
                    className={`w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center ${
                      strokeColor === c ? 'border-[#0F172A] scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {strokeColor === c && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                ))}
              </div>

              {/* Quick Edit Row */}
              <div className="flex items-center justify-between pt-0.5 border-t border-slate-100">
                <button
                  onClick={undoLastStroke}
                  className="p-1.5 text-[#475569] hover:text-[#0F172A] rounded-md cursor-pointer"
                  title="بازگشت (Undo)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={duplicateSelectedStroke}
                  disabled={!selectedStrokeId}
                  className="p-1.5 text-[#475569] hover:text-[#0284C7] disabled:opacity-35 rounded-md cursor-pointer"
                  title="کپی شکل انتخاب‌شده"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={clearCurrentPageAnnotations}
                  className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-md cursor-pointer"
                  title="پاک کردن کل ترسیمات این صفحه"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scrollable PDF Viewport with Transparent Interactive Canvas Overlay */}
        <div
          ref={viewportScrollRef}
          className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start drafting-grid"
        >
          {isLoading ? (
            <div className="my-auto flex flex-col items-center gap-3 p-8 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
              <div className="w-8 h-8 border-2 border-[#0284C7] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-[#334155]">در حال رندر صفحه PDF از حافظه محلی...</p>
            </div>
          ) : loadError ? (
            <div className="my-auto p-6 bg-white rounded-xl border border-[#FECACA] text-center max-w-md space-y-3">
              <p className="text-sm font-bold text-[#DC2626]">{loadError}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={loadDefaultTextbook}
                  className="px-4 py-2 rounded-lg bg-[#0F172A] text-white text-xs font-medium cursor-pointer"
                >
                  بارگذاری مجدد کتاب هندسه ۱
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#0F172A] text-xs font-medium cursor-pointer"
                >
                  انتخاب PDF از دستگاه
                </button>
              </div>
            </div>
          ) : (
            <div className="relative bg-white shadow-md border border-[#CBD5E1] rounded-sm overflow-hidden">
              {/* Underlying PDF Canvas */}
              <canvas ref={pdfCanvasRef} className="block" />

              {/* Transparent Geometric Construction Layer directly on top of PDF */}
              <canvas
                ref={overlayCanvasRef}
                onPointerDown={handleOverlayPointerDown}
                onPointerMove={handleOverlayPointerMove}
                onPointerUp={handleOverlayPointerUp}
                onPointerCancel={handleOverlayPointerUp}
                style={{
                  touchAction: !overlayEnabled || activeTool === 'pan' ? 'auto' : 'none',
                }}
                className={`absolute inset-0 ${
                  !overlayEnabled || activeTool === 'pan'
                    ? 'pointer-events-none'
                    : activeTool === 'select'
                    ? 'cursor-move'
                    : 'cursor-crosshair'
                }`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Page Navigator Grid Modal */}
      {showPageGridModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  پرش سریع به صفحات ({activePdfTitle})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  صفحات دارای نشانک (★) یا ترسیم روی صفحه با رنگ متمایز مشخص شده‌اند
                </p>
              </div>
              <button
                onClick={() => setShowPageGridModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                بستن
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pdfP = idx + 1;
                if (isDefaultTextbook && pdfP === 1) return null;
                const displayNum = isDefaultTextbook ? pdfP - 1 : pdfP;
                const isCurr = pdfP === currentPdfPage;
                const isStar = bookmarkedPages.includes(pdfP);
                const hasNotes = (pageAnnotations[pdfP]?.length || 0) > 0;
                return (
                  <button
                    key={pdfP}
                    onClick={() => {
                      setCurrentPdfPage(pdfP);
                      setShowPageGridModal(false);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isCurr
                        ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                        : isStar
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : hasNotes
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-mono-num">{displayNum}</span>
                    <span className="text-[9px]">
                      {isStar ? '★ نشانک' : hasNotes ? '✎ ترسیم' : 'صفحه'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

