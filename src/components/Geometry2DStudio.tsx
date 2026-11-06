import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  CircleDot,
  Minus,
  Compass,
  Scissors,
  GitBranch,
  CornerRightDown,
  Equal,
  Pentagon,
  Ruler,
  Grid,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
  Eye,
  PenTool,
  Highlighter,
  Eraser,
  Square,
  Triangle,
  MoveUpRight,
  MoveHorizontal,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  FilePlus2,
  Type,
  Check,
  ImageDown,
  Wand2
} from 'lucide-react';
import {
  Point2D,
  distance,
  midpoint,
  perpendicularBisector,
  angleBisectorRay,
  footOfPerpendicular,
  parallelLineThroughPoint,
  circleCircleIntersection,
  analyzeTriangle,
  computePicksTheorem,
  computeThalesTheorem,
  computeRightTriangleMetrics,
  recognizeSmartStroke,
  snapSmartLineEndpoint,
  snapSmartCircleRadius,
  SmartRecognizedShape,
} from '../utils/geometryMath';
import { GEOMETRY_PRESETS, GeometryPreset } from '../data/textbookData';

export type Tool2D =
  | 'select'
  | 'smart-pen'
  | 'pen'
  | 'highlighter'
  | 'laser'
  | 'eraser'
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'compass'
  | 'rect'
  | 'triangle'
  | 'regular-poly'
  | 'perp-bisector'
  | 'angle-bisector'
  | 'perp-line'
  | 'parallel-line'
  | 'polygon'
  | 'text';

export type BoardBackground = 'white' | 'grid' | 'dots' | 'axes';

export interface CanvasPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface CanvasSegment {
  id: string;
  p1: string;
  p2: string;
  kind?: 'segment' | 'line' | 'ray';
  style?: 'solid' | 'dashed' | 'accent';
  color?: string;
  label?: string;
}

export interface CanvasCircle {
  id: string;
  center: string;
  radiusPoint?: string;
  fixedRadius?: number;
  style?: 'compass' | 'solid';
  color?: string;
}

export interface CanvasPolygon {
  id: string;
  vertices: string[];
  fill?: string;
  color?: string;
}

export interface FreehandStroke {
  id: string;
  type: 'pen' | 'highlighter';
  points: Point2D[];
  color: string;
  width: number;
}

export interface CanvasTextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface BoardSnapshot {
  points: CanvasPoint[];
  segments: CanvasSegment[];
  circles: CanvasCircle[];
  polygons: CanvasPolygon[];
  strokes: FreehandStroke[];
  notes: CanvasTextNote[];
}

interface Geometry2DStudioProps {
  initialPresetId?: string;
  onJumpToTextbookPage?: (bookPage: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  backgroundImage?: { dataUrl: string; title: string } | null;
  onClearBackgroundImage?: () => void;
}

const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const Geometry2DStudio: React.FC<Geometry2DStudioProps> = ({
  initialPresetId = 'preset-perp-bisector',
  onJumpToTextbookPage,
  isFullscreen = false,
  onToggleFullscreen,
  backgroundImage = null,
  onClearBackgroundImage,
}) => {
  const initialPreset =
    GEOMETRY_PRESETS.find((p) => p.id === initialPresetId) || GEOMETRY_PRESETS[0];

  const [activePreset, setActivePreset] = useState<GeometryPreset | null>(initialPreset);
  const [activeTool, setActiveTool] = useState<Tool2D>('smart-pen');
  const [activeColor, setActiveColor] = useState<string>('#0284C7');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [polySides, setPolySides] = useState<number>(5);
  const [boardBg, setBoardBg] = useState<BoardBackground>('grid');
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [smartRecognitionToast, setSmartRecognitionToast] = useState<string | null>(null);

  // Collapsible Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Core Canvas State
  const [points, setPoints] = useState<CanvasPoint[]>(initialPreset.points);
  const [segments, setSegments] = useState<CanvasSegment[]>(initialPreset.segments);
  const [circles, setCircles] = useState<CanvasCircle[]>(initialPreset.circles);
  const [polygons, setPolygons] = useState<CanvasPolygon[]>(initialPreset.polygons || []);
  const [strokes, setStrokes] = useState<FreehandStroke[]>([]);
  const [notes, setNotes] = useState<CanvasTextNote[]>([]);

  // Undo / Redo History
  const [history, setHistory] = useState<BoardSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BoardSnapshot[]>([]);

  // Selection & Dragging State
  const [selectedItem, setSelectedItem] = useState<{
    kind: 'point' | 'segment' | 'circle' | 'polygon' | 'stroke' | 'note';
    id: string;
  } | null>(null);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [draggingWholeItem, setDraggingWholeItem] = useState<{
    lastPt: Point2D;
  } | null>(null);

  // Fast Drag-to-Draw State (for Segment, Line, Ray, Circle, Rect, Triangle, Regular Polygon, Perp-Bisector, Pen)
  const [dragDrawStart, setDragDrawStart] = useState<{
    startPt: Point2D;
    currentPt: Point2D;
    startPointId?: string;
    snappedAngle?: number | null;
    snappedRadiusCm?: number | null;
  } | null>(null);
  const [activeFreehand, setActiveFreehand] = useState<FreehandStroke | null>(null);
  const [liveSmartPreview, setLiveSmartPreview] = useState<SmartRecognizedShape | null>(null);
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number; t: number }[]>([]);

  // Inline Text Note Input Modal
  const [pendingNotePos, setPendingNotePos] = useState<Point2D | null>(null);
  const [pendingNoteText, setPendingNoteText] = useState<string>('');

  // Physical instruments & lattice mode
  const [showRuler, setShowRuler] = useState<boolean>(false);
  const [rulerPos, setRulerPos] = useState<{ x: number; y: number; angle: number }>({
    x: 190,
    y: 420,
    angle: 0,
  });
  const [showProtractor, setShowProtractor] = useState<boolean>(false);
  const [protractorPos, setProtractorPos] = useState<{ x: number; y: number }>({
    x: 380,
    y: 260,
  });
  const [draggingInstrument, setDraggingInstrument] = useState<'ruler' | 'protractor' | null>(null);

  // Triangle Concurrency toggles
  const [showCircumcenter, setShowCircumcenter] = useState<boolean>(false);
  const [showIncenter, setShowIncenter] = useState<boolean>(false);
  const [showCentroid, setShowCentroid] = useState<boolean>(false);
  const [showOrthocenter, setShowOrthocenter] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(initialPreset.steps.length - 1);

  // Thales & Right Triangle Interactive Calculators
  const [thalesAd, setThalesAd] = useState<number>(2);
  const [thalesDb, setThalesDb] = useState<number>(3);
  const [thalesAe] = useState<number>(2.4);
  const [thalesBc] = useState<number>(7.5);
  const [rtSideB, setRtSideB] = useState<number>(6);
  const [rtSideC, setRtSideC] = useState<number>(8);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const holdSnapTimerRef = useRef<number | null>(null);
  const activeFreehandRef = useRef<FreehandStroke | null>(null);
  activeFreehandRef.current = activeFreehand;

  // Auto-fade laser pointer trail
  useEffect(() => {
    if (laserTrail.length === 0) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setLaserTrail((prev) => prev.filter((pt) => now - pt.t < 750));
    }, 50);
    return () => window.clearInterval(timer);
  }, [laserTrail.length]);

  const showSmartToast = useCallback((msg: string) => {
    setSmartRecognitionToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setSmartRecognitionToast(null);
    }, 3400);
  }, []);

  // Save snapshot for Undo before modifying board
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-35),
      {
        points: points.map((p) => ({ ...p })),
        segments: segments.map((s) => ({ ...s })),
        circles: circles.map((c) => ({ ...c })),
        polygons: polygons.map((p) => ({ ...p, vertices: [...p.vertices] })),
        strokes: strokes.map((s) => ({ ...s, points: [...s.points] })),
        notes: notes.map((n) => ({ ...n })),
      },
    ]);
    setRedoStack([]);
  }, [points, segments, circles, polygons, strokes, notes]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack((prev) => [
      ...prev,
      { points, segments, circles, polygons, strokes, notes },
    ]);
    setPoints(last.points);
    setSegments(last.segments);
    setCircles(last.circles);
    setPolygons(last.polygons);
    setStrokes(last.strokes);
    setNotes(last.notes);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedItem(null);
  }, [history, points, segments, circles, polygons, strokes, notes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [
      ...prev,
      { points, segments, circles, polygons, strokes, notes },
    ]);
    setPoints(next.points);
    setSegments(next.segments);
    setCircles(next.circles);
    setPolygons(next.polygons);
    setStrokes(next.strokes);
    setNotes(next.notes);
    setRedoStack((prev) => prev.slice(0, -1));
  }, [redoStack, points, segments, circles, polygons, strokes, notes]);

  const getNextLabel = (currentPts: CanvasPoint[]) => {
    const used = new Set(currentPts.map((p) => p.label));
    for (const ch of LETTERS) {
      if (!used.has(ch)) return ch;
    }
    return `P${currentPts.length + 1}`;
  };

  const getPointById = (id: string) => points.find((p) => p.id === id);

  // Switch to a completely blank whiteboard ready for writing & smart drawing
  const openBlankWhiteboard = () => {
    pushHistory();
    setActivePreset(null);
    setPoints([]);
    setSegments([]);
    setCircles([]);
    setPolygons([]);
    setStrokes([]);
    setNotes([]);
    setSelectedItem(null);
    setSelectedPointIds([]);
    setBoardBg('white');
    setActiveTool('smart-pen');
    showSmartToast('✨ تخته سفید خالی آماده است — با قلم هوشمند هر شکلی بکشید تا خودکار منظم شود');
  };

  const loadPreset = (preset: GeometryPreset) => {
    pushHistory();
    setActivePreset(preset);
    setPoints(preset.points.map((p) => ({ ...p })));
    setSegments(preset.segments.map((s) => ({ ...s })));
    setCircles(preset.circles.map((c) => ({ ...c })));
    setPolygons((preset.polygons || []).map((poly) => ({ ...poly })));
    setStrokes([]);
    setNotes([]);
    setSelectedPointIds([]);
    setSelectedItem(null);
    setActiveStepIndex(preset.steps.length - 1);
    setBoardBg(preset.id === 'preset-picks-theorem' ? 'dots' : 'grid');
    setActiveTool('select');
  };

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

  // Copy / Duplicate Selected Shape or Construction
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedItem) return;
    pushHistory();
    const offset = 32;

    if (selectedItem.kind === 'point') {
      const pt = points.find((p) => p.id === selectedItem.id);
      if (!pt) return;
      const newLabel = getNextLabel(points);
      const newPt: CanvasPoint = {
        ...pt,
        id: newLabel,
        label: newLabel,
        x: pt.x + offset,
        y: pt.y + offset,
      };
      setPoints((prev) => [...prev, newPt]);
      setSelectedItem({ kind: 'point', id: newPt.id });
    } else if (selectedItem.kind === 'segment') {
      const seg = segments.find((s) => s.id === selectedItem.id);
      if (!seg) return;
      const p1 = getPointById(seg.p1);
      const p2 = getPointById(seg.p2);
      if (!p1 || !p2) return;
      const lbl1 = getNextLabel(points);
      const pt1: CanvasPoint = { id: lbl1, label: lbl1, x: p1.x + offset, y: p1.y + offset };
      const lbl2 = getNextLabel([...points, pt1]);
      const pt2: CanvasPoint = { id: lbl2, label: lbl2, x: p2.x + offset, y: p2.y + offset };
      const newSeg: CanvasSegment = {
        ...seg,
        id: `seg-${Date.now()}`,
        p1: pt1.id,
        p2: pt2.id,
      };
      setPoints((prev) => [...prev, pt1, pt2]);
      setSegments((prev) => [...prev, newSeg]);
      setSelectedItem({ kind: 'segment', id: newSeg.id });
    } else if (selectedItem.kind === 'circle') {
      const cir = circles.find((c) => c.id === selectedItem.id);
      if (!cir) return;
      const cPt = getPointById(cir.center);
      if (!cPt) return;
      const lblC = getNextLabel(points);
      const newCenter: CanvasPoint = {
        id: lblC,
        label: lblC,
        x: cPt.x + offset,
        y: cPt.y + offset,
      };
      let newRadiusPtId = cir.radiusPoint;
      const addedPts: CanvasPoint[] = [newCenter];
      if (cir.radiusPoint) {
        const rPt = getPointById(cir.radiusPoint);
        if (rPt) {
          const lblR = getNextLabel([...points, newCenter]);
          const newRPt: CanvasPoint = {
            id: lblR,
            label: lblR,
            x: rPt.x + offset,
            y: rPt.y + offset,
          };
          addedPts.push(newRPt);
          newRadiusPtId = newRPt.id;
        }
      }
      const newCir: CanvasCircle = {
        ...cir,
        id: `cir-${Date.now()}`,
        center: newCenter.id,
        radiusPoint: newRadiusPtId,
      };
      setPoints((prev) => [...prev, ...addedPts]);
      setCircles((prev) => [...prev, newCir]);
      setSelectedItem({ kind: 'circle', id: newCir.id });
    } else if (selectedItem.kind === 'polygon') {
      const poly = polygons.find((p) => p.id === selectedItem.id);
      if (!poly) return;
      const newPts: CanvasPoint[] = [];
      const oldToNew: Record<string, string> = {};
      let tempPts = [...points];
      for (const vid of poly.vertices) {
        const orig = getPointById(vid);
        if (orig) {
          const lbl = getNextLabel(tempPts);
          const np: CanvasPoint = { id: lbl, label: lbl, x: orig.x + offset, y: orig.y + offset };
          newPts.push(np);
          tempPts.push(np);
          oldToNew[vid] = lbl;
        }
      }
      const newVerts = poly.vertices.map((v) => oldToNew[v]).filter(Boolean);
      const newSegs: CanvasSegment[] = newVerts.map((v, i) => ({
        id: `seg-${Date.now()}-${i}`,
        p1: v,
        p2: newVerts[(i + 1) % newVerts.length],
        style: 'solid',
        color: poly.color || activeColor,
      }));
      const newPoly: CanvasPolygon = {
        ...poly,
        id: `poly-${Date.now()}`,
        vertices: newVerts,
      };
      setPoints((prev) => [...prev, ...newPts]);
      setSegments((prev) => [...prev, ...newSegs]);
      setPolygons((prev) => [...prev, newPoly]);
      setSelectedItem({ kind: 'polygon', id: newPoly.id });
    } else if (selectedItem.kind === 'stroke') {
      const st = strokes.find((s) => s.id === selectedItem.id);
      if (!st) return;
      const newSt: FreehandStroke = {
        ...st,
        id: `st-${Date.now()}`,
        points: st.points.map((p) => ({ x: p.x + offset, y: p.y + offset })),
      };
      setStrokes((prev) => [...prev, newSt]);
      setSelectedItem({ kind: 'stroke', id: newSt.id });
    } else if (selectedItem.kind === 'note') {
      const nt = notes.find((n) => n.id === selectedItem.id);
      if (!nt) return;
      const newNt: CanvasTextNote = {
        ...nt,
        id: `note-${Date.now()}`,
        x: nt.x + offset,
        y: nt.y + offset,
      };
      setNotes((prev) => [...prev, newNt]);
      setSelectedItem({ kind: 'note', id: newNt.id });
    }
  }, [selectedItem, points, segments, circles, polygons, strokes, notes, activeColor, pushHistory]);

  // Delete Selected Item
  const handleDeleteSelected = useCallback(() => {
    if (!selectedItem) return;
    pushHistory();
    if (selectedItem.kind === 'point') {
      const pid = selectedItem.id;
      setPoints((prev) => prev.filter((p) => p.id !== pid));
      setSegments((prev) => prev.filter((s) => s.p1 !== pid && s.p2 !== pid));
      setCircles((prev) => prev.filter((c) => c.center !== pid && c.radiusPoint !== pid));
      setPolygons((prev) => prev.filter((p) => !p.vertices.includes(pid)));
    } else if (selectedItem.kind === 'segment') {
      setSegments((prev) => prev.filter((s) => s.id !== selectedItem.id));
    } else if (selectedItem.kind === 'circle') {
      setCircles((prev) => prev.filter((c) => c.id !== selectedItem.id));
    } else if (selectedItem.kind === 'polygon') {
      setPolygons((prev) => prev.filter((p) => p.id !== selectedItem.id));
    } else if (selectedItem.kind === 'stroke') {
      setStrokes((prev) => prev.filter((s) => s.id !== selectedItem.id));
    } else if (selectedItem.kind === 'note') {
      setNotes((prev) => prev.filter((n) => n.id !== selectedItem.id));
    }
    setSelectedItem(null);
  }, [selectedItem, pushHistory]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C/D, Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'c')) {
        if (selectedItem) {
          e.preventDefault();
          handleDuplicateSelected();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedPointIds([]);
        setDragDrawStart(null);
        setPendingNotePos(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, handleDuplicateSelected, handleDeleteSelected, selectedItem]);

  // Convert PointerEvent to exact SVG viewBox coordinates using SVG CTM inverse
  // (Eliminates any aspect-ratio or letterboxing offset on widescreen / Fullscreen / Touch TVs)
  const getSvgCoords = (e: React.PointerEvent<SVGSVGElement>): Point2D => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    let rawX = 0;
    let rawY = 0;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      rawX = transformed.x;
      rawY = transformed.y;
    } else {
      const rect = svg.getBoundingClientRect();
      rawX = (e.clientX - rect.left) * (760 / (rect.width || 760));
      rawY = (e.clientY - rect.top) * (500 / (rect.height || 500));
    }

    if (snapToGrid || boardBg === 'dots') {
      rawX = Math.round(rawX / 20) * 20;
      rawY = Math.round(rawY / 20) * 20;
    }
    return {
      x: Math.round(rawX * 10) / 10,
      y: Math.round(rawY * 10) / 10,
    };
  };

  // Find existing point within snap radius
  const findNearestPoint = (coords: Point2D, radius = 16): CanvasPoint | undefined => {
    return points.find((p) => distance(p, coords) <= radius);
  };

  // Erase any item near pointer
  const eraseNearPoint = (coords: Point2D) => {
    const nearPt = findNearestPoint(coords, 18);
    if (nearPt) {
      pushHistory();
      const pid = nearPt.id;
      setPoints((prev) => prev.filter((p) => p.id !== pid));
      setSegments((prev) => prev.filter((s) => s.p1 !== pid && s.p2 !== pid));
      setCircles((prev) => prev.filter((c) => c.center !== pid && c.radiusPoint !== pid));
      setPolygons((prev) => prev.filter((p) => !p.vertices.includes(pid)));
      return;
    }

    const hitStroke = strokes.find((s) => s.points.some((p) => distance(p, coords) < 18));
    if (hitStroke) {
      pushHistory();
      setStrokes((prev) => prev.filter((s) => s.id !== hitStroke.id));
      return;
    }

    const hitSeg = segments.find((s) => {
      const p1 = getPointById(s.p1);
      const p2 = getPointById(s.p2);
      if (!p1 || !p2) return false;
      const foot = footOfPerpendicular(coords, p1, p2);
      const segLen = distance(p1, p2);
      const within =
        distance(p1, foot) <= segLen + 8 && distance(p2, foot) <= segLen + 8;
      return within && distance(coords, foot) < 16;
    });
    if (hitSeg) {
      pushHistory();
      setSegments((prev) => prev.filter((s) => s.id !== hitSeg.id));
      return;
    }

    const hitCir = circles.find((c) => {
      const cPt = getPointById(c.center);
      const rPt = c.radiusPoint ? getPointById(c.radiusPoint) : null;
      if (!cPt) return false;
      const r = c.fixedRadius ?? (rPt ? distance(cPt, rPt) : 60);
      return Math.abs(distance(cPt, coords) - r) < 16;
    });
    if (hitCir) {
      pushHistory();
      setCircles((prev) => prev.filter((c) => c.id !== hitCir.id));
    }
  };

  // Convert a recognized smart stroke into crisp geometric entities on the board
  const applyRecognizedSmartShape = useCallback(
    (recognized: SmartRecognizedShape, isHoldSnap = false): boolean => {
      let updatedPts = [...points];
      const ensurePt = (pt: Point2D): CanvasPoint => {
        const near = updatedPts.find((p) => distance(p, pt) <= 15);
        if (near) return near;
        const lbl = getNextLabel(updatedPts);
        const created: CanvasPoint = {
          id: lbl,
          label: lbl,
          x: Math.round(pt.x),
          y: Math.round(pt.y),
          color: activeColor,
        };
        updatedPts.push(created);
        return created;
      };

      const prefix = isHoldSnap ? '⏱️ تبدیل خودکار با مکث قلم:' : '✨ تشخیص قلم هوشمند:';

      if (recognized.kind === 'erase-gesture') {
        const { minX, maxX, minY, maxY } = recognized.bounds;
        const pad = 16;
        const inBox = (pt: Point2D) =>
          pt.x >= minX - pad &&
          pt.x <= maxX + pad &&
          pt.y >= minY - pad &&
          pt.y <= maxY + pad;

        const removedPtIds = new Set(points.filter(inBox).map((p) => p.id));
        setPoints((prev) => prev.filter((p) => !removedPtIds.has(p.id)));
        setSegments((prev) =>
          prev.filter((s) => {
            if (removedPtIds.has(s.p1) || removedPtIds.has(s.p2)) return false;
            const p1 = getPointById(s.p1);
            const p2 = getPointById(s.p2);
            if (!p1 || !p2) return true;
            return !inBox(midpoint(p1, p2));
          })
        );
        setCircles((prev) =>
          prev.filter((c) => {
            if (removedPtIds.has(c.center)) return false;
            const cPt = getPointById(c.center);
            return cPt ? !inBox(cPt) : true;
          })
        );
        setPolygons((prev) =>
          prev.filter((poly) => !poly.vertices.some((v) => removedPtIds.has(v)))
        );
        setStrokes((prev) => prev.filter((st) => !st.points.some(inBox)));
        showSmartToast('🧹 ژست خط‌خطی هوشمند: اشکال زیر قلم پاک شدند');
        return true;
      }

      if (recognized.kind === 'circle') {
        const snapR = snapSmartCircleRadius(recognized.radius, 40);
        const finalR = snapR.radiusPx;
        const centerPt = ensurePt(recognized.center);
        const radiusPt = ensurePt({
          x: recognized.center.x + finalR,
          y: recognized.center.y,
        });
        const newCir: CanvasCircle = {
          id: `smart-cir-${Date.now()}`,
          center: centerPt.id,
          radiusPoint: radiusPt.id,
          style: 'solid',
          color: activeColor,
        };
        setPoints(updatedPts);
        setCircles((prev) => [...prev, newCir]);
        setSelectedItem({ kind: 'circle', id: newCir.id });
        showSmartToast(
          `${prefix} دایره دقیق به مرکز ${centerPt.label} و شعاع ${(finalR / 40).toFixed(1)} cm`
        );
        return true;
      }

      if (recognized.kind === 'segment') {
        const snappedEnd = snapSmartLineEndpoint(recognized.start, recognized.end, 4);
        const p1 = ensurePt(recognized.start);
        const p2 = ensurePt(snappedEnd.point);
        const newSeg: CanvasSegment = {
          id: `smart-seg-${Date.now()}`,
          p1: p1.id,
          p2: p2.id,
          kind: 'segment',
          style: 'solid',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, newSeg]);
        setSelectedItem({ kind: 'segment', id: newSeg.id });
        showSmartToast(
          `${prefix} پاره‌خط صاف ${p1.label}${p2.label} (${(
            distance(p1, p2) / 40
          ).toFixed(1)} cm)`
        );
        return true;
      }

      if (recognized.kind === 'triangle') {
        const [v1, v2, v3] = recognized.vertices;
        const pA = ensurePt(v1);
        const pB = ensurePt(v2);
        const pC = ensurePt(v3);
        const verts = [pA.id, pB.id, pC.id];
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `smart-tri-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 3],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `smart-tri-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.09)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
        const subTitle =
          recognized.subType === 'equilateral'
            ? 'مثلث متساوی‌الاضلاع (۶۰°)'
            : recognized.subType === 'right'
            ? 'مثلث قائم‌الزاویه (۹۰° ∟)'
            : recognized.subType === 'isosceles'
            ? 'مثلث متساوی‌الساقین'
            : 'مثلث';
        showSmartToast(`${prefix} ${subTitle} ${pA.label}${pB.label}${pC.label}`);
        return true;
      }

      if (recognized.kind === 'rectangle') {
        const [v1, v2, v3, v4] = recognized.vertices;
        const pA = ensurePt(v1);
        const pB = ensurePt(v2);
        const pC = ensurePt(v3);
        const pD = ensurePt(v4);
        const verts = [pA.id, pB.id, pC.id, pD.id];
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `smart-rect-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 4],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `smart-rect-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.09)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
        showSmartToast(
          `${prefix} ${recognized.isSquare ? 'مربع منتظم' : 'مستطیل'} ${pA.label}${pB.label}${pC.label}${pD.label}`
        );
        return true;
      }

      if (recognized.kind === 'polygon') {
        const polyPts = recognized.vertices.map((v) => ensurePt(v));
        const verts = polyPts.map((p) => p.id);
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `smart-poly-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % verts.length],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `smart-poly-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.09)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
        showSmartToast(`${prefix} ${recognized.sides}ضلعی منتظم`);
        return true;
      }

      if (recognized.kind === 'angle') {
        const [ptStart, ptVertex, ptEnd] = recognized.vertices;
        const p1 = ensurePt(ptStart);
        const p2 = ensurePt(ptVertex);
        const p3 = ensurePt(ptEnd);
        if (recognized.isRightAngle) {
          setPoints(updatedPts);
          setSegments((prev) => [
            ...prev,
            { id: `smart-ang1-${Date.now()}`, p1: p2.id, p2: p1.id, style: 'solid', color: activeColor },
            { id: `smart-ang2-${Date.now()}`, p1: p2.id, p2: p3.id, style: 'solid', color: activeColor },
          ]);
          showSmartToast(`${prefix} زاویه قائمه ۹۰° (∟) در رأس ${p2.label}`);
          return true;
        }
        const rayEnd = angleBisectorRay(p1, p2, p3, 180);
        const kPt = ensurePt(rayEnd);
        setPoints(updatedPts);
        setSegments((prev) => [
          ...prev,
          { id: `smart-ang1-${Date.now()}`, p1: p2.id, p2: p1.id, style: 'solid', color: activeColor },
          { id: `smart-ang2-${Date.now()}`, p1: p2.id, p2: p3.id, style: 'solid', color: activeColor },
          {
            id: `smart-bis-${Date.now()}`,
            p1: p2.id,
            p2: kPt.id,
            kind: 'ray',
            style: 'accent',
            label: 'نیمساز',
          },
        ]);
        showSmartToast(`${prefix} زاویه ${p1.label}${p2.label}${p3.label} و نیمساز آن`);
        return true;
      }

      return false;
    },
    [points, activeColor, showSmartToast]
  );

  // One-Tap Quick Geometric Shape Templates for instant classroom use
  const insertQuickTemplate = (
    template:
      | 'equilateral'
      | 'right-triangle'
      | 'square'
      | 'hexagon'
      | 'circle-chord'
      | 'parallel-transversal'
  ) => {
    pushHistory();
    let updatedPts = [...points];
    const addPt = (x: number, y: number): CanvasPoint => {
      const lbl = getNextLabel(updatedPts);
      const pt: CanvasPoint = {
        id: lbl,
        label: lbl,
        x: Math.round(x),
        y: Math.round(y),
        color: activeColor,
      };
      updatedPts.push(pt);
      return pt;
    };

    // Slight offset if shapes already exist near center
    const jitter = (polygons.length + circles.length) % 3 === 0 ? 0 : ((polygons.length % 3) - 1) * 30;
    const cx = 380 + jitter;
    const cy = 250 + jitter;

    if (template === 'equilateral') {
      const side = 160;
      const h = (side * Math.sqrt(3)) / 2;
      const pA = addPt(cx, cy - (2 * h) / 3);
      const pB = addPt(cx - side / 2, cy + h / 3);
      const pC = addPt(cx + side / 2, cy + h / 3);
      const verts = [pA.id, pB.id, pC.id];
      setPoints(updatedPts);
      setSegments((prev) => [
        ...prev,
        ...verts.map((v, i) => ({
          id: `tpl-eq-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 3],
          style: 'solid' as const,
          color: activeColor,
        })),
      ]);
      setPolygons((prev) => [
        ...prev,
        { id: `tpl-poly-${Date.now()}`, vertices: verts, fill: 'rgba(2, 132, 199, 0.09)', color: activeColor },
      ]);
      showSmartToast('⚡ مثلث متساوی‌الاضلاع استاندارد درج شد');
    } else if (template === 'right-triangle') {
      // 3-4-5 right triangle (120px, 160px, 200px)
      const pA = addPt(cx - 70, cy - 60);
      const pB = addPt(cx - 70, cy + 60); // 90 deg vertex
      const pC = addPt(cx + 90, cy + 60);
      const verts = [pA.id, pB.id, pC.id];
      setPoints(updatedPts);
      setSegments((prev) => [
        ...prev,
        ...verts.map((v, i) => ({
          id: `tpl-rt-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 3],
          style: 'solid' as const,
          color: activeColor,
        })),
      ]);
      setPolygons((prev) => [
        ...prev,
        { id: `tpl-poly-${Date.now()}`, vertices: verts, fill: 'rgba(2, 132, 199, 0.09)', color: activeColor },
      ]);
      showSmartToast('⚡ مثلث قائم‌الزاویه استاندارد (۳-۴-۵) با علامت زاویه قائمه ∟ درج شد');
    } else if (template === 'square') {
      const half = 70;
      const pA = addPt(cx - half, cy - half);
      const pB = addPt(cx + half, cy - half);
      const pC = addPt(cx + half, cy + half);
      const pD = addPt(cx - half, cy + half);
      const verts = [pA.id, pB.id, pC.id, pD.id];
      setPoints(updatedPts);
      setSegments((prev) => [
        ...prev,
        ...verts.map((v, i) => ({
          id: `tpl-sq-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 4],
          style: 'solid' as const,
          color: activeColor,
        })),
      ]);
      setPolygons((prev) => [
        ...prev,
        { id: `tpl-poly-${Date.now()}`, vertices: verts, fill: 'rgba(2, 132, 199, 0.09)', color: activeColor },
      ]);
      showSmartToast('⚡ مربع منتظم استاندارد درج شد');
    } else if (template === 'hexagon') {
      const r = 90;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const vp = addPt(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
        verts.push(vp.id);
      }
      setPoints(updatedPts);
      setSegments((prev) => [
        ...prev,
        ...verts.map((v, i) => ({
          id: `tpl-hex-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 6],
          style: 'solid' as const,
          color: activeColor,
        })),
      ]);
      setPolygons((prev) => [
        ...prev,
        { id: `tpl-poly-${Date.now()}`, vertices: verts, fill: 'rgba(2, 132, 199, 0.09)', color: activeColor },
      ]);
      showSmartToast('⚡ شش‌ضلعی منتظم استاندارد درج شد');
    } else if (template === 'circle-chord') {
      const r = 100;
      const pO = addPt(cx, cy);
      const pR = addPt(cx + r, cy);
      const pA = addPt(cx - 80, cy + 60);
      const pB = addPt(cx + 80, cy + 60);
      const pM = addPt(cx, cy + 60);
      setPoints(updatedPts);
      setCircles((prev) => [
        ...prev,
        { id: `tpl-cir-${Date.now()}`, center: pO.id, radiusPoint: pR.id, style: 'solid', color: activeColor },
      ]);
      setSegments((prev) => [
        ...prev,
        { id: `tpl-ch1-${Date.now()}`, p1: pA.id, p2: pB.id, style: 'solid', color: activeColor, label: 'وتر' },
        { id: `tpl-ch2-${Date.now()}`, p1: pO.id, p2: pM.id, style: 'accent', label: 'عمود بر وتر' },
      ]);
      showSmartToast('⚡ دایره، وتر و شعاع عمود بر وتر درج شد');
    } else if (template === 'parallel-transversal') {
      const p1 = addPt(cx - 140, cy - 55);
      const p2 = addPt(cx + 140, cy - 55);
      const p3 = addPt(cx - 140, cy + 55);
      const p4 = addPt(cx + 140, cy + 55);
      const p5 = addPt(cx - 75, cy - 110);
      const p6 = addPt(cx + 75, cy + 110);
      setPoints(updatedPts);
      setSegments((prev) => [
        ...prev,
        { id: `tpl-pl1-${Date.now()}`, p1: p1.id, p2: p2.id, kind: 'line', style: 'solid', color: activeColor, label: 'd₁' },
        { id: `tpl-pl2-${Date.now()}`, p1: p3.id, p2: p4.id, kind: 'line', style: 'solid', color: activeColor, label: 'd₂ || d₁' },
        { id: `tpl-tr-${Date.now()}`, p1: p5.id, p2: p6.id, kind: 'line', style: 'accent', label: 'خط مورب' },
      ]);
      showSmartToast('⚡ دو خط موازی و خط مورب درج شد');
    }
  };

  // Pointer Down on SVG Canvas (Unified Mouse & Android Touch)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingInstrument) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getSvgCoords(e);
    const nearPt = findNearestPoint(coords, 16);

    // 0. LASER POINTER TOOL (Temporary glowing classroom pointer)
    if (activeTool === 'laser') {
      setLaserTrail([{ x: coords.x, y: coords.y, t: Date.now() }]);
      return;
    }

    // 1. SELECT & MOVE TOOL
    if (activeTool === 'select') {
      if (nearPt) {
        pushHistory();
        setSelectedItem({ kind: 'point', id: nearPt.id });
        setDraggingPointId(nearPt.id);
        return;
      }
      // Check freehand strokes
      const hitSt = strokes.find((s) => s.points.some((p) => distance(p, coords) < 18));
      if (hitSt) {
        pushHistory();
        setSelectedItem({ kind: 'stroke', id: hitSt.id });
        setDraggingWholeItem({ lastPt: coords });
        return;
      }
      // Check notes
      const hitNote = notes.find((n) => Math.hypot(n.x - coords.x, n.y - coords.y) < 35);
      if (hitNote) {
        pushHistory();
        setSelectedItem({ kind: 'note', id: hitNote.id });
        setDraggingWholeItem({ lastPt: coords });
        return;
      }
      // Check segments (by distance to segment line)
      const hitSeg = segments.find((s) => {
        const p1 = getPointById(s.p1);
        const p2 = getPointById(s.p2);
        if (!p1 || !p2) return false;
        const foot = footOfPerpendicular(coords, p1, p2);
        const segLen = distance(p1, p2);
        const within =
          distance(p1, foot) <= segLen + 6 && distance(p2, foot) <= segLen + 6;
        return within && distance(coords, foot) < 14;
      });
      if (hitSeg) {
        pushHistory();
        setSelectedItem({ kind: 'segment', id: hitSeg.id });
        setDraggingWholeItem({ lastPt: coords });
        return;
      }
      // Check circles (by rim or center)
      const hitCir = circles.find((c) => {
        const cPt = getPointById(c.center);
        const rPt = c.radiusPoint ? getPointById(c.radiusPoint) : null;
        if (!cPt) return false;
        const r = c.fixedRadius ?? (rPt ? distance(cPt, rPt) : 60);
        return Math.abs(distance(cPt, coords) - r) < 14;
      });
      if (hitCir) {
        pushHistory();
        setSelectedItem({ kind: 'circle', id: hitCir.id });
        setDraggingWholeItem({ lastPt: coords });
        return;
      }

      setSelectedItem(null);
      return;
    }

    // 2. SMART PEN, PEN & HIGHLIGHTER (Blank Whiteboard Freehand + Smart Shape Recognition)
    if (activeTool === 'smart-pen' || activeTool === 'pen' || activeTool === 'highlighter') {
      pushHistory();
      setLiveSmartPreview(null);
      setActiveFreehand({
        id: `stroke-${Date.now()}`,
        type: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        points: [coords],
        color: activeColor,
        width: activeTool === 'highlighter' ? 16 : strokeWidth,
      });
      return;
    }

    // 3. ERASER
    if (activeTool === 'eraser') {
      eraseNearPoint(coords);
      return;
    }

    // 4. TEXT NOTE TOOL
    if (activeTool === 'text') {
      setPendingNotePos(coords);
      setPendingNoteText('');
      return;
    }

    // 5. POINT TOOL
    if (activeTool === 'point') {
      pushHistory();
      const label = getNextLabel(points);
      const newPt: CanvasPoint = {
        id: label,
        label,
        x: Math.round(coords.x),
        y: Math.round(coords.y),
        color: activeColor,
      };
      setPoints((prev) => [...prev, newPt]);
      setSelectedItem({ kind: 'point', id: newPt.id });
      return;
    }

    // 6. FAST DRAG-TO-DRAW TOOLS: segment, line, ray, compass, rect, triangle, regular-poly, perp-bisector
    if (
      activeTool === 'segment' ||
      activeTool === 'line' ||
      activeTool === 'ray' ||
      activeTool === 'compass' ||
      activeTool === 'rect' ||
      activeTool === 'triangle' ||
      activeTool === 'regular-poly' ||
      activeTool === 'perp-bisector'
    ) {
      const startPt = nearPt ? { x: nearPt.x, y: nearPt.y } : coords;
      setDragDrawStart({
        startPt,
        currentPt: coords,
        startPointId: nearPt?.id,
        snappedAngle: null,
        snappedRadiusCm: null,
      });
      return;
    }

    // 7. MULTI-POINT CONSTRUCTION TOOLS (angle-bisector, perp-line, parallel-line, polygon)
    let targetPoint = nearPt;
    let currentPts = points;
    if (!targetPoint) {
      pushHistory();
      const label = getNextLabel(points);
      targetPoint = {
        id: label,
        label,
        x: Math.round(coords.x),
        y: Math.round(coords.y),
        color: activeColor,
      };
      currentPts = [...points, targetPoint];
      setPoints(currentPts);
    }

    const nextSel = [...selectedPointIds, targetPoint.id];

    if (
      (activeTool === 'angle-bisector' ||
        activeTool === 'perp-line' ||
        activeTool === 'parallel-line') &&
      nextSel.length === 3
    ) {
      pushHistory();
      const p1 = currentPts.find((p) => p.id === nextSel[0])!;
      const p2 = currentPts.find((p) => p.id === nextSel[1])!;
      const p3 = currentPts.find((p) => p.id === nextSel[2])!;

      if (activeTool === 'angle-bisector') {
        const rayEnd = angleBisectorRay(p1, p2, p3, 210);
        const kLabel = getNextLabel(currentPts);
        const kPt: CanvasPoint = {
          id: kLabel,
          label: kLabel,
          x: Math.round(rayEnd.x),
          y: Math.round(rayEnd.y),
        };
        setPoints([...currentPts, kPt]);
        setSegments((prev) => [
          ...prev,
          { id: `seg-ba-${Date.now()}`, p1: p2.id, p2: p1.id, style: 'solid', color: activeColor },
          { id: `seg-bc-${Date.now()}`, p1: p2.id, p2: p3.id, style: 'solid', color: activeColor },
          {
            id: `bis-ray-${Date.now()}`,
            p1: p2.id,
            p2: kPt.id,
            kind: 'ray',
            style: 'accent',
            label: 'نیمساز',
          },
        ]);
      } else if (activeTool === 'perp-line') {
        const foot = footOfPerpendicular(p3, p1, p2);
        const hLabel = getNextLabel(currentPts);
        const hPt: CanvasPoint = {
          id: hLabel,
          label: hLabel,
          x: Math.round(foot.x),
          y: Math.round(foot.y),
        };
        setPoints([...currentPts, hPt]);
        setSegments((prev) => [
          ...prev,
          {
            id: `perp-${Date.now()}`,
            p1: p3.id,
            p2: hPt.id,
            style: 'accent',
            label: 'عمود',
          },
        ]);
      } else if (activeTool === 'parallel-line') {
        const { start: q1, end: q2 } = parallelLineThroughPoint(p3, p1, p2, 160);
        const l1 = getNextLabel(currentPts);
        const pt1: CanvasPoint = { id: l1, label: l1, x: Math.round(q1.x), y: Math.round(q1.y) };
        const l2 = getNextLabel([...currentPts, pt1]);
        const pt2: CanvasPoint = { id: l2, label: l2, x: Math.round(q2.x), y: Math.round(q2.y) };
        setPoints([...currentPts, pt1, pt2]);
        setSegments((prev) => [
          ...prev,
          {
            id: `par-${Date.now()}`,
            p1: pt1.id,
            p2: pt2.id,
            kind: 'line',
            style: 'accent',
            label: 'موازی',
          },
        ]);
      }
      setSelectedPointIds([]);
      return;
    }

    if (activeTool === 'polygon') {
      if (nextSel.length >= 4 && nextSel[0] === targetPoint.id) {
        pushHistory();
        const verts = nextSel.slice(0, -1);
        const newSegs: CanvasSegment[] = verts.map((v, idx) => ({
          id: `pseg-${Date.now()}-${idx}`,
          p1: v,
          p2: verts[(idx + 1) % verts.length],
          style: 'solid',
          color: activeColor,
        }));
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [
          ...prev,
          {
            id: `poly-${Date.now()}`,
            vertices: verts,
            fill: 'rgba(2, 132, 199, 0.10)',
            color: activeColor,
          },
        ]);
        setSelectedPointIds([]);
        return;
      }
    }

    setSelectedPointIds(nextSel);
  };

  // Pointer Move on SVG Canvas
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);

    if (activeTool === 'laser' && e.buttons > 0) {
      setLaserTrail((prev) => [...prev.slice(-28), { x: coords.x, y: coords.y, t: Date.now() }]);
      return;
    }

    if (draggingInstrument === 'ruler') {
      setRulerPos((prev) => ({ ...prev, x: coords.x - 140, y: coords.y - 22 }));
      return;
    }
    if (draggingInstrument === 'protractor') {
      setProtractorPos({ x: coords.x, y: coords.y });
      return;
    }

    if (draggingPointId) {
      setPoints((prev) =>
        prev.map((p) => (p.id === draggingPointId ? { ...p, x: coords.x, y: coords.y } : p))
      );
      return;
    }

    if (draggingWholeItem && selectedItem) {
      const dx = coords.x - draggingWholeItem.lastPt.x;
      const dy = coords.y - draggingWholeItem.lastPt.y;
      if (dx === 0 && dy === 0) return;

      if (selectedItem.kind === 'stroke') {
        setStrokes((prev) =>
          prev.map((s) =>
            s.id === selectedItem.id
              ? { ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
              : s
          )
        );
      } else if (selectedItem.kind === 'note') {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedItem.id ? { ...n, x: n.x + dx, y: n.y + dy } : n
          )
        );
      } else if (selectedItem.kind === 'segment') {
        const seg = segments.find((s) => s.id === selectedItem.id);
        if (seg) {
          setPoints((prev) =>
            prev.map((p) =>
              p.id === seg.p1 || p.id === seg.p2
                ? { ...p, x: p.x + dx, y: p.y + dy }
                : p
            )
          );
        }
      } else if (selectedItem.kind === 'circle') {
        const cir = circles.find((c) => c.id === selectedItem.id);
        if (cir) {
          setPoints((prev) =>
            prev.map((p) =>
              p.id === cir.center || p.id === cir.radiusPoint
                ? { ...p, x: p.x + dx, y: p.y + dy }
                : p
            )
          );
        }
      }
      setDraggingWholeItem({ lastPt: coords });
      return;
    }

    if (activeFreehand) {
      const nextPts = [...activeFreehand.points, coords];
      setActiveFreehand((prev) => (prev ? { ...prev, points: nextPts } : null));

      // Live Smart Recognition Preview while drawing with Smart Pen
      if (activeTool === 'smart-pen' && nextPts.length >= 8) {
        const candidate = recognizeSmartStroke(nextPts);
        setLiveSmartPreview(candidate.kind !== 'freehand' ? candidate : null);
      }

      // Hold-to-Snap (430ms pause at end of stroke converts freehand in-place)
      if (holdSnapTimerRef.current) {
        window.clearTimeout(holdSnapTimerRef.current);
      }
      if ((activeTool === 'smart-pen' || activeTool === 'pen') && nextPts.length >= 8) {
        holdSnapTimerRef.current = window.setTimeout(() => {
          const current = activeFreehandRef.current;
          if (!current || current.points.length < 8) return;
          const candidate = recognizeSmartStroke(current.points);
          if (candidate.kind !== 'freehand') {
            setActiveFreehand(null);
            setLiveSmartPreview(null);
            applyRecognizedSmartShape(candidate, true);
          }
        }, 430);
      }
      return;
    }

    if (activeTool === 'eraser' && e.buttons > 0) {
      eraseNearPoint(coords);
      return;
    }

    if (dragDrawStart) {
      const nearPt = findNearestPoint(coords, 14);
      if (nearPt) {
        setDragDrawStart((prev) =>
          prev
            ? {
                ...prev,
                currentPt: { x: nearPt.x, y: nearPt.y },
                snappedAngle: null,
                snappedRadiusCm: null,
              }
            : null
        );
        return;
      }

      if (activeTool === 'compass') {
        const rawR = distance(dragDrawStart.startPt, coords);
        const snapR = snapSmartCircleRadius(rawR, 40);
        const ang = Math.atan2(
          coords.y - dragDrawStart.startPt.y,
          coords.x - dragDrawStart.startPt.x
        );
        const nextPt = {
          x: Math.round(dragDrawStart.startPt.x + snapR.radiusPx * Math.cos(ang)),
          y: Math.round(dragDrawStart.startPt.y + snapR.radiusPx * Math.sin(ang)),
        };
        setDragDrawStart((prev) =>
          prev
            ? {
                ...prev,
                currentPt: nextPt,
                snappedRadiusCm: snapR.isSnapped ? snapR.radiusCm : null,
              }
            : null
        );
      } else if (
        activeTool === 'segment' ||
        activeTool === 'line' ||
        activeTool === 'ray'
      ) {
        // Subtle 1.5° angle snap so the endpoint stays glued directly under the cursor tip
        const snapLine = snapSmartLineEndpoint(dragDrawStart.startPt, coords, 1.5);
        setDragDrawStart((prev) =>
          prev
            ? {
                ...prev,
                currentPt: snapLine.point,
                snappedAngle: snapLine.snappedAngleDeg,
              }
            : null
        );
      } else {
        setDragDrawStart((prev) =>
          prev
            ? {
                ...prev,
                currentPt: coords,
              }
            : null
        );
      }
    }
  };

  // Pointer Up: Finalize Fast Drag-to-Draw Shapes & Smart Pen Recognition
  const handlePointerUp = () => {
    setDraggingPointId(null);
    setDraggingInstrument(null);
    setDraggingWholeItem(null);
    if (holdSnapTimerRef.current) {
      window.clearTimeout(holdSnapTimerRef.current);
      holdSnapTimerRef.current = null;
    }
    setLiveSmartPreview(null);

    if (activeFreehand) {
      const drawnPts = activeFreehand.points;
      const strokeToFinish = activeFreehand;
      setActiveFreehand(null);

      if (activeTool === 'smart-pen' && drawnPts.length >= 6) {
        const recognized = recognizeSmartStroke(drawnPts);
        if (recognized.kind !== 'freehand') {
          if (applyRecognizedSmartShape(recognized, false)) {
            return;
          }
        }
      }

      if (drawnPts.length > 1) {
        setStrokes((prev) => [...prev, strokeToFinish]);
        setSelectedItem({ kind: 'stroke', id: strokeToFinish.id });
      }
      return;
    }

    if (dragDrawStart) {
      const { startPt, currentPt, startPointId } = dragDrawStart;
      const dragDist = distance(startPt, currentPt);
      setDragDrawStart(null);

      // Ignore accidental tiny taps (< 10px) unless snapping to a second point
      if (dragDist < 10) return;

      pushHistory();
      let updatedPts = [...points];

      // Ensure start point exists when needed
      const ensurePoint = (pt: Point2D, existingId?: string): CanvasPoint => {
        if (existingId) {
          const found = updatedPts.find((p) => p.id === existingId);
          if (found) return found;
        }
        const near = updatedPts.find((p) => distance(p, pt) <= 16);
        if (near) return near;
        const lbl = getNextLabel(updatedPts);
        const created: CanvasPoint = {
          id: lbl,
          label: lbl,
          x: Math.round(pt.x),
          y: Math.round(pt.y),
          color: activeColor,
        };
        updatedPts.push(created);
        return created;
      };

      if (activeTool === 'segment' || activeTool === 'line' || activeTool === 'ray') {
        const p1 = ensurePoint(startPt, startPointId);
        const p2 = ensurePoint(currentPt);
        const newSeg: CanvasSegment = {
          id: `seg-${Date.now()}`,
          p1: p1.id,
          p2: p2.id,
          kind: activeTool,
          style: 'solid',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, newSeg]);
        setSelectedItem({ kind: 'segment', id: newSeg.id });
      } else if (activeTool === 'compass') {
        const centerPt = ensurePoint(startPt, startPointId);
        const radiusPt = ensurePoint(currentPt);
        const newCir: CanvasCircle = {
          id: `cir-${Date.now()}`,
          center: centerPt.id,
          radiusPoint: radiusPt.id,
          style: 'compass',
          color: activeColor,
        };
        setPoints(updatedPts);
        setCircles((prev) => [...prev, newCir]);
        setSelectedItem({ kind: 'circle', id: newCir.id });
      } else if (activeTool === 'rect') {
        const x1 = Math.min(startPt.x, currentPt.x);
        const y1 = Math.min(startPt.y, currentPt.y);
        const x2 = Math.max(startPt.x, currentPt.x);
        const y2 = Math.max(startPt.y, currentPt.y);
        const pA = ensurePoint({ x: x1, y: y1 });
        const pB = ensurePoint({ x: x2, y: y1 });
        const pC = ensurePoint({ x: x2, y: y2 });
        const pD = ensurePoint({ x: x1, y: y2 });
        const verts = [pA.id, pB.id, pC.id, pD.id];
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `rect-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 4],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `rect-poly-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.08)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
      } else if (activeTool === 'triangle') {
        const topPt = ensurePoint({ x: (startPt.x + currentPt.x) / 2, y: Math.min(startPt.y, currentPt.y) });
        const leftPt = ensurePoint({ x: Math.min(startPt.x, currentPt.x), y: Math.max(startPt.y, currentPt.y) });
        const rightPt = ensurePoint({ x: Math.max(startPt.x, currentPt.x), y: Math.max(startPt.y, currentPt.y) });
        const verts = [topPt.id, leftPt.id, rightPt.id];
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `tri-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % 3],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `tri-poly-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.08)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
      } else if (activeTool === 'regular-poly') {
        const r = Math.max(25, distance(startPt, currentPt));
        const baseAngle = Math.atan2(currentPt.y - startPt.y, currentPt.x - startPt.x);
        const verts: string[] = [];
        for (let i = 0; i < polySides; i++) {
          const ang = baseAngle + (i * 2 * Math.PI) / polySides;
          const vx = startPt.x + r * Math.cos(ang);
          const vy = startPt.y + r * Math.sin(ang);
          const vp = ensurePoint({ x: vx, y: vy });
          verts.push(vp.id);
        }
        const newSegs: CanvasSegment[] = verts.map((v, i) => ({
          id: `rpoly-seg-${Date.now()}-${i}`,
          p1: v,
          p2: verts[(i + 1) % polySides],
          style: 'solid',
          color: activeColor,
        }));
        const newPoly: CanvasPolygon = {
          id: `rpoly-${Date.now()}`,
          vertices: verts,
          fill: 'rgba(2, 132, 199, 0.08)',
          color: activeColor,
        };
        setPoints(updatedPts);
        setSegments((prev) => [...prev, ...newSegs]);
        setPolygons((prev) => [...prev, newPoly]);
        setSelectedItem({ kind: 'polygon', id: newPoly.id });
      } else if (activeTool === 'perp-bisector') {
        const p1 = ensurePoint(startPt, startPointId);
        const p2 = ensurePoint(currentPt);
        const r = distance(p1, p2) * 0.68;
        const intersections = circleCircleIntersection(p1, r, p2, r);
        const fallbackBis = perpendicularBisector(p1, p2, 120);
        const b1 = intersections.points[0] || fallbackBis.start;
        const b2 = intersections.points[1] || fallbackBis.end;
        const uPt = ensurePoint(b1);
        const vPt = ensurePoint(b2);
        const mPt = ensurePoint(midpoint(p1, p2));
        setPoints(updatedPts);
        setCircles((prev) => [
          ...prev,
          { id: `cir-a-${Date.now()}`, center: p1.id, fixedRadius: r, style: 'compass' },
          { id: `cir-b-${Date.now()}`, center: p2.id, fixedRadius: r, style: 'compass' },
        ]);
        setSegments((prev) => [
          ...prev,
          { id: `base-${Date.now()}`, p1: p1.id, p2: p2.id, style: 'solid' },
          {
            id: `bis-${Date.now()}`,
            p1: uPt.id,
            p2: vPt.id,
            style: 'accent',
            label: `عمودمنصف (${mPt.label})`,
          },
        ]);
      }
    }
  };

  // Export Canvas as PNG Image
  const exportBoardPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1520;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `hendese-whiteboard-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const exportConstructionJson = () => {
    const payload = {
      title: activePreset?.title || 'تخته سفید هندسه‌نگار',
      exportedAt: new Date().toISOString(),
      points,
      segments,
      circles,
      polygons,
      strokes,
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hendese-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConstructionJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.points)) {
          pushHistory();
          setPoints(data.points);
          setSegments(data.segments || []);
          setCircles(data.circles || []);
          setPolygons(data.polygons || []);
          setStrokes(data.strokes || []);
          setNotes(data.notes || []);
        }
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file);
  };

  // Compute live triangle analytics when >= 3 points exist
  const triangleStats = points.length >= 3 ? analyzeTriangle(points[0], points[1], points[2]) : null;

  // Compute Pick's Theorem metrics when polygon exists
  const activePolyVertices =
    polygons.length > 0
      ? (polygons[0].vertices
          .map((id) => getPointById(id))
          .filter(Boolean) as CanvasPoint[]).map((p) => ({
          x: Math.round(p.x / 40),
          y: Math.round(p.y / 40),
        }))
      : [];
  const picksResult =
    activePolyVertices.length >= 3 ? computePicksTheorem(activePolyVertices) : null;

  const thalesStats = computeThalesTheorem(thalesAd, thalesDb, thalesAe, thalesBc);
  const rtStats = computeRightTriangleMetrics(rtSideB, rtSideC);

  const toolHelperText: Record<Tool2D, string> = {
    select: 'روی هر نقطه، خط، دایره یا دست‌خط کلیک کنید تا انتخاب، جابه‌جا یا کپی شود.',
    'smart-pen':
      'قلم هوشمند پیشرفته ✨ — دایره، خط، مثلث (متساوی‌الاضلاع/قائم‌الزاویه)، مربع، چندضلعی یا زاویه ۹۰° بکشید یا در انتهای رسم مکث کنید؛ خط‌خطی کردن روی شکل آن را پاک می‌کند!',
    pen: 'قلم آزاد تخته سفید (با مکث کوتاه در انتهای خط، شکل خودکار منظم می‌شود).',
    highlighter: 'ماژیک هایلایت فعال است — روی زوایا یا فرمول‌ها بکشید.',
    laser: 'لیزر تدریس فعال است 🔴 — برای اشاره موقت و توضیح قضیه روی تخته بکشید.',
    eraser: 'پاک‌کن فعال است — روی هر خط، شکل یا نقطه بکشید تا پاک شود.',
    point: 'روی هر جای تخته کلیک کنید تا یک نقطه نام‌گذاری‌شده ایجاد شود.',
    segment: 'روی تخته بکشید (Drag) تا پاره‌خط دقیقاً در محل نوک قلم رسم شود.',
    line: 'روی تخته بکشید تا خط راست دوطرفه بی‌نهایت رسم شود.',
    ray: 'از نقطه مبدأ بکشید تا نیم‌خط رسم شود.',
    compass: 'از مرکز دایره به بیرون بکشید — پرگار هوشمند شعاع، قطر، محیط و مساحت زنده را نمایش می‌دهد.',
    rect: 'روی تخته بکشید تا مستطیل یا مربع چهارضلعی رسم شود.',
    triangle: 'روی تخته بکشید تا مثلث سه رأسی قابل تغییر شکل رسم شود.',
    'regular-poly': `از مرکز به بیرون بکشید تا ${polySides}ضلعی منتظم رسم شود.`,
    'perp-bisector': 'روی تخته بکشید تا پاره‌خط و عمودمنصف آن با کمان‌های پرگار رسم شوند.',
    'angle-bisector': 'سه نقطه (ضلع اول، رأس زاویه، ضلع دوم) را کلیک کنید تا نیمساز رسم شود.',
    'perp-line': 'ابتدا دو نقطه از خط پایه و سپس نقطه سوم را کلیک کنید تا خط عمود رسم شود.',
    'parallel-line': 'ابتدا دو نقطه از خط پایه و سپس نقطه سوم را کلیک کنید تا خط موازی رسم شود.',
    polygon: 'نقاط رئوس را متوالی کلیک کنید و در پایان روی نقطه اول کلیک کنید تا بسته شود.',
    text: 'روی هر نقطه از تخته کلیک کنید تا متن یا فرمول هندسی درج شود.',
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col lg:flex-row gap-3 p-2.5 max-w-[1680px] mx-auto overflow-y-auto h-[calc(100vh-3.5rem)]"
    >
      {/* Main Interactive Whiteboard & Drafting Canvas Column */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs min-w-0">
        {/* Top Row 1: Fast Drawing & Geometric Construction Tools (Flex-Wrap, Zero Horizontal Scrollbar) */}
        <div className="p-2 bg-slate-50 border-b border-slate-200">
          <div
            className="flex items-center gap-1 flex-wrap"
            role="toolbar"
            aria-label="ابزارهای تخته سفید و ترسیم هندسی"
          >
            {/* Blank Whiteboard Quick Reset Button */}
            <button
              onClick={openBlankWhiteboard}
              className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap shadow-2xs shrink-0"
              title="باز کردن یک تخته سفید کاملاً خالی برای نوشتن و ترسیم آزاد"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>تخته سفید خالی</span>
            </button>

            <div className="h-5 w-px bg-slate-300 mx-0.5 shrink-0" />

            {(
              [
                { id: 'select', label: 'انتخاب و حرکت', icon: MousePointer },
                { id: 'smart-pen', label: 'قلم هوشمند ✨', icon: Wand2 },
                { id: 'pen', label: 'قلم آزاد', icon: PenTool },
                { id: 'highlighter', label: 'ماژیک', icon: Highlighter },
                { id: 'laser', label: 'لیزر تدریس 🔴', icon: Sparkles },
                { id: 'eraser', label: 'پاک‌کن', icon: Eraser },
                { id: 'compass', label: 'دایره هوشمند', icon: Compass },
                { id: 'segment', label: 'پاره‌خط', icon: Minus },
                { id: 'line', label: 'خط دوطرفه', icon: MoveHorizontal },
                { id: 'ray', label: 'نیم‌خط', icon: MoveUpRight },
                { id: 'rect', label: 'مستطیل', icon: Square },
                { id: 'triangle', label: 'مثلث', icon: Triangle },
                { id: 'regular-poly', label: 'چندضلعی منتظم', icon: Pentagon },
                { id: 'point', label: 'نقطه', icon: CircleDot },
                { id: 'perp-bisector', label: 'عمودمنصف', icon: Scissors },
                { id: 'angle-bisector', label: 'نیمساز', icon: GitBranch },
                { id: 'perp-line', label: 'خط عمود', icon: CornerRightDown },
                { id: 'parallel-line', label: 'خط موازی', icon: Equal },
                { id: 'text', label: 'متن/فرمول', icon: Type },
              ] as const
            ).map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              const isSmartPen = tool.id === 'smart-pen';
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setSelectedPointIds([]);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : isSmartPen
                      ? 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Row 2: Edit Actions (Copy, Delete, Undo/Redo), Colors, Background Mode, Fullscreen & Sidebar Toggle */}
        <div className="px-3 py-1.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Edit & Copy Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-35 text-slate-700 flex items-center gap-1 cursor-pointer"
              title="بازگشت (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>بازگشت</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-35 text-slate-700 flex items-center gap-1 cursor-pointer"
              title="انجام مجدد (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDuplicateSelected}
              disabled={!selectedItem}
              className="px-2.5 py-1 rounded-md border border-sky-200 bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="کپی و تکثیر شکل انتخاب‌شده (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>کپی شکل</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={!selectedItem}
              className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
              title="حذف شکل انتخاب‌شده (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Color Palette */}
            <div className="flex items-center gap-1">
              {['#0284C7', '#0F172A', '#D97706', '#059669', '#DC2626', '#7C3AED'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setActiveColor(c);
                    if (selectedItem) {
                      if (selectedItem.kind === 'segment') {
                        setSegments((prev) =>
                          prev.map((s) => (s.id === selectedItem.id ? { ...s, color: c } : s))
                        );
                      } else if (selectedItem.kind === 'circle') {
                        setCircles((prev) =>
                          prev.map((cir) => (cir.id === selectedItem.id ? { ...cir, color: c } : cir))
                        );
                      } else if (selectedItem.kind === 'stroke') {
                        setStrokes((prev) =>
                          prev.map((st) => (st.id === selectedItem.id ? { ...st, color: c } : st))
                        );
                      }
                    }
                  }}
                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center cursor-pointer ${
                    activeColor === c ? 'border-slate-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {activeColor === c && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
              ))}
            </div>

            {activeTool === 'regular-poly' && (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                <span>تعداد اضلاع:</span>
                {[3, 4, 5, 6, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPolySides(n)}
                    className={`px-1.5 py-0.5 rounded font-mono-num font-bold cursor-pointer ${
                      polySides === n ? 'bg-sky-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Background Switcher, Physical Instruments, Fullscreen & Sidebar Toggle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Board Background Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(
                [
                  { id: 'white', label: 'تخته سفید' },
                  { id: 'grid', label: 'شطرنجی' },
                  { id: 'dots', label: 'شبکه پیک' },
                  { id: 'axes', label: 'مختصات' },
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBoardBg(bg.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                    boardBg === bg.id
                      ? 'bg-white text-sky-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSnapToGrid((s) => !s)}
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer ${
                snapToGrid
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
              title="چسبیدن خودکار نقاط به شبکه (Snap to Grid)"
            >
              <Grid className="w-3.5 h-3.5 inline ml-1" />
              <span>جذب به شبکه</span>
            </button>

            <button
              onClick={() => setShowRuler((v) => !v)}
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer ${
                showRuler
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 inline ml-1" />
              <span>خط‌کش</span>
            </button>

            <button
              onClick={() => setShowProtractor((v) => !v)}
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer ${
                showProtractor
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <span>نقاله</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="حالت تمام‌صفحه پایدار در کل برنامه"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-sky-600" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              )}
              <span>{isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}</span>
            </button>

            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 cursor-pointer"
              title={sidebarOpen ? 'بستن نوار کناری برای بزرگ شدن تخته' : 'باز کردن نوار کناری'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              )}
              <span>{sidebarOpen ? 'بستن پنل کناری' : 'پنل ابزار و کتاب'}</span>
            </button>
          </div>
        </div>

        {/* One-Click Smart Shape Templates Strip (Instant 1-Tap Classroom Shapes) */}
        <div className="px-3 py-1 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-slate-600 ml-1">⚡ درج سریع شکل استاندارد:</span>
            <button
              onClick={() => insertQuickTemplate('equilateral')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              △ متساوی‌الاضلاع (۶۰°)
            </button>
            <button
              onClick={() => insertQuickTemplate('right-triangle')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              ∟ مثلث قائم‌الزاویه (۳-۴-۵)
            </button>
            <button
              onClick={() => insertQuickTemplate('square')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              □ مربع منتظم
            </button>
            <button
              onClick={() => insertQuickTemplate('hexagon')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              ⬡ شش‌ضلعی منتظم
            </button>
            <button
              onClick={() => insertQuickTemplate('circle-chord')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              ⊙ دایره و عمود بر وتر
            </button>
            <button
              onClick={() => insertQuickTemplate('parallel-transversal')}
              className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 font-medium cursor-pointer"
            >
              ∥ خطوط موازی و مورب
            </button>
          </div>

          {backgroundImage && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-900">
              <span className="font-semibold truncate max-w-[180px]">
                📄 پس‌زمینه: {backgroundImage.title}
              </span>
              {onClearBackgroundImage && (
                <button
                  onClick={onClearBackgroundImage}
                  className="text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  حذف پس‌زمینه
                </button>
              )}
            </div>
          )}
        </div>

        {/* Instruction Strip + Smart Pen Recognition Badge */}
        <div className="px-4 py-1.5 bg-sky-50/70 border-b border-slate-200 flex items-center justify-between gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-2 truncate">
            {smartRecognitionToast ? (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-xs animate-pulse">
                {smartRecognitionToast}
              </span>
            ) : (
              <>
                <span className="font-semibold text-sky-800 shrink-0">راهنمای سریع:</span>
                <span className="truncate">{toolHelperText[activeTool]}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowMeasurements((m) => !m)}
              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] cursor-pointer"
            >
              {showMeasurements ? 'پنهان کردن اندازه‌ها' : 'نمایش اندازه‌ها'}
            </button>
            {activePreset && (
              <button
                onClick={() => loadPreset(activePreset)}
                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>بازنشانی شکل</span>
              </button>
            )}
            <button
              onClick={openBlankWhiteboard}
              className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer whitespace-nowrap"
            >
              پاک کردن کل تخته
            </button>
          </div>
        </div>

        {/* Interactive SVG Whiteboard & Drafting Canvas (Touch & Stylus Ready) */}
        <div
          className={`relative flex-1 w-full min-h-[460px] select-none overflow-hidden ${
            boardBg === 'grid' || boardBg === 'axes' ? 'drafting-grid' : 'bg-white'
          }`}
        >
          <svg
            ref={svgRef}
            data-testid="geometry-2d-canvas"
            viewBox="0 0 760 500"
            style={{ touchAction: 'none' }}
            className={`w-full h-full ${
              activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Optional Cropped PDF Exercise Background Layer */}
            {backgroundImage && (
              <image
                href={backgroundImage.dataUrl}
                x="40"
                y="15"
                width="680"
                height="470"
                preserveAspectRatio="xMidYMid contain"
                opacity="0.92"
              />
            )}

            {/* Coordinate Axes when 'axes' background is selected (extended across widescreen viewBox) */}
            {boardBg === 'axes' && (
              <g opacity="0.65">
                <line x1="-400" y1="250" x2="1160" y2="250" stroke="#475569" strokeWidth="1.5" />
                <line x1="380" y1="-300" x2="380" y2="800" stroke="#475569" strokeWidth="1.5" />
                <text x="742" y="244" fontSize="11" fontWeight="bold" fill="#334155">
                  x
                </text>
                <text x="386" y="16" fontSize="11" fontWeight="bold" fill="#334155">
                  y
                </text>
                <text x="384" y="264" fontSize="10" fill="#475569">
                  O
                </text>
              </g>
            )}

            {/* Lattice Dots when Pick's Theorem / Dots Mode is active */}
            {boardBg === 'dots' &&
              Array.from({ length: 24 }).map((_, gx) =>
                Array.from({ length: 14 }).map((__, gy) => {
                  const lx = (gx - 2) * 40;
                  const ly = (gy - 1) * 40;
                  return (
                    <circle
                      key={`lat-${gx}-${gy}`}
                      cx={lx}
                      cy={ly}
                      r={2.3}
                      fill="#94A3B8"
                    />
                  );
                })
              )}

            {/* Polygons */}
            {polygons.map((poly) => {
              const pts = poly.vertices
                .map(getPointById)
                .filter(Boolean) as CanvasPoint[];
              if (pts.length < 3) return null;
              const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(' ');
              const isSel = selectedItem?.kind === 'polygon' && selectedItem.id === poly.id;
              return (
                <polygon
                  key={poly.id}
                  points={pointsAttr}
                  fill={poly.fill || 'rgba(2, 132, 199, 0.08)'}
                  stroke={isSel ? '#0284C7' : 'none'}
                  strokeWidth={isSel ? 2 : 0}
                />
              );
            })}

            {/* Freehand Whiteboard Strokes (Pen & Highlighter) */}
            {strokes.map((st) => {
              if (st.points.length < 2) return null;
              const d = st.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ');
              const isSel = selectedItem?.kind === 'stroke' && selectedItem.id === st.id;
              return (
                <path
                  key={st.id}
                  d={d}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={isSel ? st.width + 2 : st.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={st.type === 'highlighter' ? 0.34 : 0.95}
                />
              );
            })}

            {/* Active Freehand Preview */}
            {activeFreehand && activeFreehand.points.length > 1 && (
              <path
                d={activeFreehand.points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ')}
                fill="none"
                stroke={activeFreehand.color}
                strokeWidth={activeFreehand.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={activeTool === 'smart-pen' ? '5 3' : undefined}
                opacity={activeFreehand.type === 'highlighter' ? 0.34 : 0.95}
              />
            )}

            {/* Live Smart Pen Ghost Recognition Preview while drawing */}
            {liveSmartPreview && liveSmartPreview.kind !== 'freehand' && (
              <g opacity="0.88" className="pointer-events-none">
                {liveSmartPreview.kind === 'circle' && (
                  <circle
                    cx={liveSmartPreview.center.x}
                    cy={liveSmartPreview.center.y}
                    r={liveSmartPreview.radius}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                )}
                {liveSmartPreview.kind === 'segment' && (
                  <line
                    x1={liveSmartPreview.start.x}
                    y1={liveSmartPreview.start.y}
                    x2={liveSmartPreview.end.x}
                    y2={liveSmartPreview.end.y}
                    stroke="#059669"
                    strokeWidth="2.8"
                    strokeDasharray="6 4"
                  />
                )}
                {(liveSmartPreview.kind === 'triangle' ||
                  liveSmartPreview.kind === 'rectangle' ||
                  liveSmartPreview.kind === 'polygon') && (
                  <polygon
                    points={liveSmartPreview.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                )}
                {liveSmartPreview.kind === 'angle' && (
                  <polyline
                    points={liveSmartPreview.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                )}
                {liveSmartPreview.kind === 'erase-gesture' && (
                  <rect
                    x={liveSmartPreview.bounds.minX - 8}
                    y={liveSmartPreview.bounds.minY - 8}
                    width={liveSmartPreview.bounds.maxX - liveSmartPreview.bounds.minX + 16}
                    height={liveSmartPreview.bounds.maxY - liveSmartPreview.bounds.minY + 16}
                    rx="6"
                    fill="rgba(220, 38, 38, 0.12)"
                    stroke="#DC2626"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            )}

            {/* Automatic Right-Angle Square Markers (∟) on 90° vertices */}
            {points.map((vertex) => {
              const connected = segments.filter(
                (s) => s.p1 === vertex.id || s.p2 === vertex.id
              );
              if (connected.length < 2) return null;
              const markers: React.ReactNode[] = [];
              for (let i = 0; i < connected.length; i++) {
                for (let j = i + 1; j < connected.length; j++) {
                  const s1 = connected[i];
                  const s2 = connected[j];
                  const other1 = getPointById(s1.p1 === vertex.id ? s1.p2 : s1.p1);
                  const other2 = getPointById(s2.p1 === vertex.id ? s2.p2 : s2.p1);
                  if (!other1 || !other2) continue;
                  const v1x = other1.x - vertex.x;
                  const v1y = other1.y - vertex.y;
                  const v2x = other2.x - vertex.x;
                  const v2y = other2.y - vertex.y;
                  const len1 = Math.hypot(v1x, v1y);
                  const len2 = Math.hypot(v2x, v2y);
                  if (len1 < 22 || len2 < 22) continue;
                  const cosTheta = (v1x * v2x + v1y * v2y) / (len1 * len2);
                  const deg = (Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180) / Math.PI;
                  if (Math.abs(deg - 90) <= 2.2) {
                    const size = 13;
                    const u1x = (v1x / len1) * size;
                    const u1y = (v1y / len1) * size;
                    const u2x = (v2x / len2) * size;
                    const u2y = (v2y / len2) * size;
                    const p1x = vertex.x + u1x;
                    const p1y = vertex.y + u1y;
                    const p2x = vertex.x + u1x + u2x;
                    const p2y = vertex.y + u1y + u2y;
                    const p3x = vertex.x + u2x;
                    const p3y = vertex.y + u2y;
                    markers.push(
                      <g key={`ra-${vertex.id}-${s1.id}-${s2.id}`}>
                        <path
                          d={`M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}`}
                          fill="rgba(5, 150, 105, 0.14)"
                          stroke="#059669"
                          strokeWidth="1.6"
                        />
                        <circle
                          cx={vertex.x + (u1x + u2x) * 0.45}
                          cy={vertex.y + (u1y + u2y) * 0.45}
                          r={1.6}
                          fill="#059669"
                        />
                      </g>
                    );
                  }
                }
              }
              return markers;
            })}

            {/* Laser Pointer Auto-Fading Trail */}
            {laserTrail.length > 1 && (
              <g className="pointer-events-none">
                <polyline
                  points={laserTrail.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.35"
                />
                <polyline
                  points={laserTrail.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={laserTrail[laserTrail.length - 1].x}
                  cy={laserTrail[laserTrail.length - 1].y}
                  r={6}
                  fill="#EF4444"
                />
              </g>
            )}

            {/* Compass Circles & Construction Arcs */}
            {circles.map((cir) => {
              const cPt = getPointById(cir.center);
              const rPt = cir.radiusPoint ? getPointById(cir.radiusPoint) : null;
              if (!cPt) return null;
              const r = cir.fixedRadius ?? (rPt ? distance(cPt, rPt) : 60);
              const isCompass = cir.style === 'compass';
              const isSel = selectedItem?.kind === 'circle' && selectedItem.id === cir.id;
              const labelX = cPt.x;
              const labelY = Math.max(18, cPt.y - r - 8);
              return (
                <g key={cir.id}>
                  <circle
                    cx={cPt.x}
                    cy={cPt.y}
                    r={r}
                    fill="none"
                    stroke={cir.color || (isCompass ? '#0284C7' : '#0F172A')}
                    strokeWidth={isSel ? 3.2 : isCompass ? 1.6 : 2.2}
                    strokeDasharray={isCompass ? '6 4' : undefined}
                    opacity={isCompass ? 0.8 : 0.95}
                  />
                  {rPt && (
                    <line
                      x1={cPt.x}
                      y1={cPt.y}
                      x2={rPt.x}
                      y2={rPt.y}
                      stroke={cir.color || '#0284C7'}
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                      opacity="0.7"
                    />
                  )}
                  {showMeasurements && (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x="-28"
                        y="-11"
                        width="56"
                        height="15"
                        rx="3"
                        fill="rgba(255,255,255,0.9)"
                      />
                      <text
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="600"
                        fill="#0369A1"
                        className="font-mono-num"
                      >
                        r={(r / 40).toFixed(2)}cm
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Segments, Infinite Lines & Rays */}
            {segments.map((seg) => {
              const p1 = getPointById(seg.p1);
              const p2 = getPointById(seg.p2);
              if (!p1 || !p2) return null;
              const mid = midpoint(p1, p2);
              const lenCm = (distance(p1, p2) / 40).toFixed(2);
              const isAccent = seg.style === 'accent';
              const isDashed = seg.style === 'dashed';
              const isSel = selectedItem?.kind === 'segment' && selectedItem.id === seg.id;
              const isVertical = Math.abs(p2.y - p1.y) > Math.abs(p2.x - p1.x) * 1.4;
              const labelPos = isVertical
                ? { x: p2.x, y: Math.max(p1.y, p2.y) + 22 }
                : { x: mid.x - 32, y: mid.y + 18 };
              const boxWidth = seg.label ? 92 : 52;

              // Compute endpoints for infinite line or ray
              let drawX1 = p1.x;
              let drawY1 = p1.y;
              let drawX2 = p2.x;
              let drawY2 = p2.y;
              if (seg.kind === 'line' || seg.kind === 'ray') {
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy) || 1;
                if (seg.kind === 'line') {
                  drawX1 = p1.x - (dx / len) * 1000;
                  drawY1 = p1.y - (dy / len) * 1000;
                }
                drawX2 = p1.x + (dx / len) * 1000;
                drawY2 = p1.y + (dy / len) * 1000;
              }

              return (
                <g key={seg.id}>
                  <line
                    x1={drawX1}
                    y1={drawY1}
                    x2={drawX2}
                    y2={drawY2}
                    stroke={
                      seg.color ||
                      (isAccent ? '#D97706' : isDashed ? '#64748B' : '#0F172A')
                    }
                    strokeWidth={isSel ? 3.6 : isAccent ? 2.6 : isDashed ? 1.5 : 2.2}
                    strokeDasharray={isDashed ? '5 5' : undefined}
                    strokeLinecap="round"
                  />
                  {showMeasurements && (
                    <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                      <rect
                        x={-boxWidth / 2}
                        y="-10"
                        width={boxWidth}
                        height="15"
                        rx="3"
                        fill="rgba(255,255,255,0.9)"
                      />
                      <text
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="600"
                        fill={isAccent ? '#B45309' : '#334155'}
                        className="font-mono-num"
                      >
                        {seg.label ? `${seg.label} (${lenCm})` : `${lenCm}cm`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Live Drag-to-Draw Preview Overlay (with Smart Circle & Smart Line HUD) */}
            {dragDrawStart && (
              <g opacity="0.92">
                {(activeTool === 'segment' ||
                  activeTool === 'line' ||
                  activeTool === 'ray' ||
                  activeTool === 'perp-bisector') && (
                  <>
                    <line
                      x1={dragDrawStart.startPt.x}
                      y1={dragDrawStart.startPt.y}
                      x2={dragDrawStart.currentPt.x}
                      y2={dragDrawStart.currentPt.y}
                      stroke={activeColor}
                      strokeWidth="2.4"
                      strokeDasharray="5 4"
                    />
                    <g
                      transform={`translate(${
                        (dragDrawStart.startPt.x + dragDrawStart.currentPt.x) / 2
                      }, ${(dragDrawStart.startPt.y + dragDrawStart.currentPt.y) / 2 - 14})`}
                    >
                      <rect
                        x="-62"
                        y="-13"
                        width="124"
                        height="18"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.88)"
                      />
                      <text
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="bold"
                        fill="#FFFFFF"
                        className="font-mono-num"
                      >
                        {(distance(dragDrawStart.startPt, dragDrawStart.currentPt) / 40).toFixed(2)} cm
                        {dragDrawStart.snappedAngle !== null &&
                        dragDrawStart.snappedAngle !== undefined
                          ? ` • ${Math.abs(dragDrawStart.snappedAngle)}°`
                          : ''}
                      </text>
                    </g>
                  </>
                )}
                {activeTool === 'compass' && (() => {
                  const rPx = distance(dragDrawStart.startPt, dragDrawStart.currentPt);
                  const rCm = rPx / 40;
                  const dCm = rCm * 2;
                  const perimCm = 2 * Math.PI * rCm;
                  const areaCm2 = Math.PI * rCm * rCm;
                  return (
                    <>
                      <circle
                        cx={dragDrawStart.startPt.x}
                        cy={dragDrawStart.startPt.y}
                        r={rPx}
                        fill="rgba(2, 132, 199, 0.06)"
                        stroke={activeColor}
                        strokeWidth="2.4"
                        strokeDasharray="6 4"
                      />
                      {/* Crosshair at center */}
                      <line
                        x1={dragDrawStart.startPt.x - 8}
                        y1={dragDrawStart.startPt.y}
                        x2={dragDrawStart.startPt.x + 8}
                        y2={dragDrawStart.startPt.y}
                        stroke={activeColor}
                        strokeWidth="1.5"
                      />
                      <line
                        x1={dragDrawStart.startPt.x}
                        y1={dragDrawStart.startPt.y - 8}
                        x2={dragDrawStart.startPt.x}
                        y2={dragDrawStart.startPt.y + 8}
                        stroke={activeColor}
                        strokeWidth="1.5"
                      />
                      <line
                        x1={dragDrawStart.startPt.x}
                        y1={dragDrawStart.startPt.y}
                        x2={dragDrawStart.currentPt.x}
                        y2={dragDrawStart.currentPt.y}
                        stroke={activeColor}
                        strokeWidth="1.8"
                        strokeDasharray="4 4"
                      />
                      {/* Smart Circle Live HUD */}
                      <g
                        transform={`translate(${dragDrawStart.startPt.x}, ${Math.max(
                          28,
                          dragDrawStart.startPt.y - rPx - 14
                        )})`}
                      >
                        <rect
                          x="-135"
                          y="-16"
                          width="270"
                          height="22"
                          rx="6"
                          fill="rgba(15, 23, 42, 0.9)"
                        />
                        <text
                          textAnchor="middle"
                          fontSize="10.5"
                          fontWeight="700"
                          fill="#38BDF8"
                          className="font-mono-num"
                        >
                          {`r=${rCm.toFixed(1)}cm | 2r=${dCm.toFixed(1)} | P=${perimCm.toFixed(1)} | S=${areaCm2.toFixed(1)}cm²`}
                        </text>
                      </g>
                    </>
                  );
                })()}
                {activeTool === 'rect' && (
                  <rect
                    x={Math.min(dragDrawStart.startPt.x, dragDrawStart.currentPt.x)}
                    y={Math.min(dragDrawStart.startPt.y, dragDrawStart.currentPt.y)}
                    width={Math.abs(dragDrawStart.currentPt.x - dragDrawStart.startPt.x)}
                    height={Math.abs(dragDrawStart.currentPt.y - dragDrawStart.startPt.y)}
                    fill="rgba(2, 132, 199, 0.08)"
                    stroke={activeColor}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}
                {activeTool === 'triangle' && (
                  <polygon
                    points={`${(dragDrawStart.startPt.x + dragDrawStart.currentPt.x) / 2},${Math.min(
                      dragDrawStart.startPt.y,
                      dragDrawStart.currentPt.y
                    )} ${Math.min(dragDrawStart.startPt.x, dragDrawStart.currentPt.x)},${Math.max(
                      dragDrawStart.startPt.y,
                      dragDrawStart.currentPt.y
                    )} ${Math.max(dragDrawStart.startPt.x, dragDrawStart.currentPt.x)},${Math.max(
                      dragDrawStart.startPt.y,
                      dragDrawStart.currentPt.y
                    )}`}
                    fill="rgba(2, 132, 199, 0.08)"
                    stroke={activeColor}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                )}
                {activeTool === 'regular-poly' && (
                  <circle
                    cx={dragDrawStart.startPt.x}
                    cy={dragDrawStart.startPt.y}
                    r={distance(dragDrawStart.startPt, dragDrawStart.currentPt)}
                    fill="rgba(2, 132, 199, 0.06)"
                    stroke={activeColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            )}

            {/* Triangle Concurrency Overlays */}
            {triangleStats && (
              <g>
                {showCircumcenter && triangleStats.circumcenter && triangleStats.circumradius && (
                  <g>
                    <circle
                      cx={triangleStats.circumcenter.x}
                      cy={triangleStats.circumcenter.y}
                      r={triangleStats.circumradius}
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="1.6"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={triangleStats.circumcenter.x}
                      cy={triangleStats.circumcenter.y}
                      r={5}
                      fill="#0284C7"
                    />
                    <text
                      x={triangleStats.circumcenter.x + 8}
                      y={triangleStats.circumcenter.y - 6}
                      fontSize="12"
                      fontWeight="700"
                      fill="#0284C7"
                    >
                      O (مرکز دایره محیطی)
                    </text>
                  </g>
                )}

                {showIncenter && (
                  <g>
                    <circle
                      cx={triangleStats.incenter.x}
                      cy={triangleStats.incenter.y}
                      r={triangleStats.inradius}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="1.6"
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={triangleStats.incenter.x}
                      cy={triangleStats.incenter.y}
                      r={5}
                      fill="#059669"
                    />
                    <text
                      x={triangleStats.incenter.x + 8}
                      y={triangleStats.incenter.y - 6}
                      fontSize="12"
                      fontWeight="700"
                      fill="#059669"
                    >
                      P (همرسی نیمسازها)
                    </text>
                  </g>
                )}

                {showCentroid && (
                  <g>
                    <circle
                      cx={triangleStats.centroid.x}
                      cy={triangleStats.centroid.y}
                      r={5}
                      fill="#D97706"
                    />
                    <text
                      x={triangleStats.centroid.x + 8}
                      y={triangleStats.centroid.y + 14}
                      fontSize="12"
                      fontWeight="700"
                      fill="#D97706"
                    >
                      G (مرکز ثقل / همرسی میانه‌ها)
                    </text>
                  </g>
                )}

                {showOrthocenter && triangleStats.orthocenter && (
                  <g>
                    <circle
                      cx={triangleStats.orthocenter.x}
                      cy={triangleStats.orthocenter.y}
                      r={5}
                      fill="#DC2626"
                    />
                    <text
                      x={triangleStats.orthocenter.x + 8}
                      y={triangleStats.orthocenter.y - 8}
                      fontSize="12"
                      fontWeight="700"
                      fill="#DC2626"
                    >
                      H (مرکز ارتفاعی)
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* Text Notes on Whiteboard */}
            {notes.map((nt) => {
              const isSel = selectedItem?.kind === 'note' && selectedItem.id === nt.id;
              return (
                <g key={nt.id} transform={`translate(${nt.x}, ${nt.y})`}>
                  <rect
                    x="-6"
                    y="-16"
                    width={Math.max(60, nt.text.length * 8 + 16)}
                    height="24"
                    rx="5"
                    fill="rgba(255,255,255,0.92)"
                    stroke={isSel ? '#0284C7' : '#CBD5E1'}
                    strokeWidth={isSel ? 2 : 1}
                  />
                  <text fontSize="12" fontWeight="700" fill={nt.color}>
                    {nt.text}
                  </text>
                </g>
              );
            })}

            {/* Interactive Draggable Points */}
            {points.map((pt) => {
              const isSelected =
                selectedPointIds.includes(pt.id) ||
                (selectedItem?.kind === 'point' && selectedItem.id === pt.id);
              return (
                <g
                  key={pt.id}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle
                      r={12}
                      fill="rgba(2, 132, 199, 0.18)"
                      stroke="#0284C7"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    r={6}
                    fill={isSelected ? '#0284C7' : '#FFFFFF'}
                    stroke={pt.color || '#0F172A'}
                    strokeWidth="2.4"
                  />
                  <text
                    x={9}
                    y={-8}
                    fontSize="12.5"
                    fontWeight="700"
                    fill="#0F172A"
                    className="font-mono-num select-none"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}

            {/* Physical Draggable Ruler Overlay */}
            {showRuler && (
              <g
                transform={`translate(${rulerPos.x}, ${rulerPos.y}) rotate(${rulerPos.angle})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingInstrument('ruler');
                }}
                className="cursor-move"
              >
                <rect
                  x="0"
                  y="0"
                  width="360"
                  height="42"
                  rx="5"
                  fill="rgba(254, 243, 199, 0.9)"
                  stroke="#D97706"
                  strokeWidth="1.6"
                />
                {Array.from({ length: 10 }).map((_, cm) => (
                  <g key={cm} transform={`translate(${cm * 40}, 0)`}>
                    <line x1="0" y1="0" x2="0" y2="14" stroke="#92400E" strokeWidth="1.5" />
                    <text
                      x="3"
                      y="27"
                      fontSize="10"
                      fill="#78350F"
                      className="font-mono-num"
                    >
                      {cm}cm
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Physical Draggable Protractor Overlay */}
            {showProtractor && (
              <g
                transform={`translate(${protractorPos.x}, ${protractorPos.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingInstrument('protractor');
                }}
                className="cursor-move"
              >
                <path
                  d="M -120 0 A 120 120 0 0 1 120 0 Z"
                  fill="rgba(224, 242, 254, 0.78)"
                  stroke="#0284C7"
                  strokeWidth="1.6"
                />
                <circle cx="0" cy="0" r="4" fill="#0284C7" />
                {[0, 30, 45, 60, 90, 120, 135, 150, 180].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = Math.cos(rad) * 102;
                  const y1 = -Math.sin(rad) * 102;
                  const x2 = Math.cos(rad) * 120;
                  const y2 = -Math.sin(rad) * 120;
                  return (
                    <g key={deg}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0369A1" strokeWidth="1.4" />
                      <text
                        x={Math.cos(rad) * 86}
                        y={-Math.sin(rad) * 86 + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill="#0C4A6E"
                        className="font-mono-num"
                      >
                        {deg}°
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {/* Inline Text Note Input Popover */}
          {pendingNotePos && (
            <div
              className="absolute z-20 bg-white border border-sky-300 rounded-xl shadow-lg p-3 flex items-center gap-2"
              style={{ left: '50%', top: '20%', transform: 'translateX(-50%)' }}
            >
              <input
                type="text"
                autoFocus
                value={pendingNoteText}
                onChange={(e) => setPendingNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pendingNoteText.trim()) {
                    pushHistory();
                    setNotes((prev) => [
                      ...prev,
                      {
                        id: `note-${Date.now()}`,
                        x: pendingNotePos.x,
                        y: pendingNotePos.y,
                        text: pendingNoteText.trim(),
                        color: activeColor,
                      },
                    ]);
                    setPendingNotePos(null);
                  }
                }}
                placeholder="متن، زاویه یا فرمول را بنویسید..."
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-sky-600"
              />
              <button
                onClick={() => {
                  if (pendingNoteText.trim()) {
                    pushHistory();
                    setNotes((prev) => [
                      ...prev,
                      {
                        id: `note-${Date.now()}`,
                        x: pendingNotePos.x,
                        y: pendingNotePos.y,
                        text: pendingNoteText.trim(),
                        color: activeColor,
                      },
                    ]);
                  }
                  setPendingNotePos(null);
                }}
                className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                ثبت روی تخته
              </button>
              <button
                onClick={() => setPendingNotePos(null)}
                className="px-2 py-1.5 text-slate-500 text-xs cursor-pointer"
              >
                لغو
              </button>
            </div>
          )}
        </div>

        {/* Bottom Bar: Export PNG/JSON & Textbook Step-by-Step Construction Guide */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            {activePreset ? (
              <>
                <span className="text-[11px] font-semibold text-slate-500">
                  {activePreset.chapterRef} · صفحه {activePreset.bookPage} کتاب
                </span>
                <h3 className="text-xs font-bold text-slate-900">{activePreset.title}</h3>
              </>
            ) : (
              <div>
                <span className="text-[11px] font-semibold text-emerald-700">حالت تخته سفید آزاد</span>
                <h3 className="text-xs font-bold text-slate-900">
                  تخته سفید ترسیمات هندسی و دست‌نویس آزاد
                </h3>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activePreset && onJumpToTextbookPage && (
              <button
                onClick={() => onJumpToTextbookPage(activePreset.bookPage)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>مشاهده صفحه {activePreset.bookPage} در PDF</span>
              </button>
            )}
            <button
              onClick={exportBoardPng}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ImageDown className="w-3.5 h-3.5" />
              <span>خروجی تصویر PNG</span>
            </button>
            <button
              onClick={exportConstructionJson}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ذخیره JSON</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>بارگذاری JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importConstructionJson}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Collapsible Side Inspector Column: Presets, Live Telemetry, Pick's Theorem & Thales */}
      {sidebarOpen && (
        <div className="w-full lg:w-[370px] shrink-0 flex flex-col gap-3">
          {/* Textbook Interactive Presets Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  ترسیم‌های آماده کتاب هندسه ۱
                </h3>
              </div>
              <button
                onClick={openBlankWhiteboard}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                + صفحه سفید خالی
              </button>
            </div>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pl-1">
              {GEOMETRY_PRESETS.map((preset) => {
                const isSelected = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => loadPreset(preset)}
                    className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                    }`}
                  >
                    <span className="truncate">{preset.title}</span>
                    <span
                      className={`text-[10px] font-mono-num shrink-0 ${
                        isSelected ? 'text-sky-300' : 'text-slate-400'
                      }`}
                    >
                      ص {preset.bookPage}
                    </span>
                  </button>
                );
              })}
            </div>

            {activePreset && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-1 gap-1">
                {activePreset.steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`text-right px-2.5 py-1.5 rounded text-[11px] border transition-colors cursor-pointer ${
                      idx <= activeStepIndex
                        ? 'bg-sky-50/70 border-sky-200 text-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Triangle Telemetry & Concurrency Inspector */}
          {triangleStats && (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900">
                  تحلیل زنده مثلث ({points[0]?.label}
                  {points[1]?.label}
                  {points[2]?.label})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono-num">مقیاس: 1cm = 40px</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500">زاویه {points[0]?.label}</div>
                  <div className="text-xs font-bold text-slate-900 font-mono-num">
                    {triangleStats.angleA.toFixed(1)}°
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">زاویه {points[1]?.label}</div>
                  <div className="text-xs font-bold text-slate-900 font-mono-num">
                    {triangleStats.angleB.toFixed(1)}°
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">زاویه {points[2]?.label}</div>
                  <div className="text-xs font-bold text-slate-900 font-mono-num">
                    {triangleStats.angleC.toFixed(1)}°
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-xs">
                <div className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex justify-between">
                  <span className="text-slate-600">محیط (P):</span>
                  <span className="font-bold font-mono-num">
                    {(triangleStats.perimeter / 40).toFixed(2)} cm
                  </span>
                </div>
                <div className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 flex justify-between">
                  <span className="text-slate-600">مساحت (S):</span>
                  <span className="font-bold font-mono-num">
                    {(triangleStats.area / 1600).toFixed(2)} cm²
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                نمایش نقاط همرسی مثلث روی بوم (ص ۱۹ و ۶۷):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setShowCircumcenter((v) => !v)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-right cursor-pointer ${
                    showCircumcenter
                      ? 'bg-sky-50 border-sky-400 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ● عمودمنصف‌ها (O)
                </button>
                <button
                  onClick={() => setShowIncenter((v) => !v)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-right cursor-pointer ${
                    showIncenter
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ● نیمسازها (P)
                </button>
                <button
                  onClick={() => setShowCentroid((v) => !v)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-right cursor-pointer ${
                    showCentroid
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ● میانه‌ها (G)
                </button>
                <button
                  onClick={() => setShowOrthocenter((v) => !v)}
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border text-right cursor-pointer ${
                    showOrthocenter
                      ? 'bg-rose-50 border-rose-400 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ● ارتفاع‌ها (H)
                </button>
              </div>
            </div>
          )}

          {/* Pick's Theorem Calculator */}
          {picksResult && (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-slate-900">
                  فرمول پیک در چندضلعی شبکه‌ای (ص ۷۰)
                </h3>
                <span className="text-xs font-mono-num font-bold text-emerald-700">
                  S = b/2 + i - 1
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500">نقاط مرزی (b)</div>
                  <div className="text-sm font-bold text-sky-700 font-mono-num">
                    {picksResult.boundaryPoints}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">نقاط درونی (i)</div>
                  <div className="text-sm font-bold text-amber-700 font-mono-num">
                    {picksResult.interiorPoints}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">مساحت (S)</div>
                  <div className="text-sm font-bold text-emerald-700 font-mono-num">
                    {picksResult.area.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thales & Right Triangle Interactive Simulators */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 mb-1.5">
                شبیه‌ساز قضیه تالس (ص ۳۴: DE || BC)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">
                    طول AD: <strong className="font-mono-num">{thalesAd}</strong>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={thalesAd}
                    onChange={(e) => setThalesAd(parseFloat(e.target.value))}
                    className="accent-sky-600"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">
                    طول DB: <strong className="font-mono-num">{thalesDb}</strong>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={thalesDb}
                    onChange={(e) => setThalesDb(parseFloat(e.target.value))}
                    className="accent-sky-600"
                  />
                </label>
              </div>
              <div className="mt-1.5 bg-slate-50 p-2 rounded border border-slate-200 text-[11px] font-mono-num flex flex-wrap justify-between gap-1">
                <span>EC = {thalesStats.ec}</span>
                <span>·</span>
                <span>DE = {thalesStats.de}</span>
                <span>·</span>
                <span className="text-sky-700 font-semibold">
                  AD/AB = {thalesStats.ratioAdAb}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 mb-1.5">
                روابط طولی مثلث قائم‌الزاویه (ص ۴۲)
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs mb-1.5">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">ضلع قائمه AC (b): {rtSideB}</span>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="1"
                    value={rtSideB}
                    onChange={(e) => setRtSideB(parseFloat(e.target.value))}
                    className="accent-amber-600"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-600">ضلع قائمه AB (c): {rtSideC}</span>
                  <input
                    type="range"
                    min="4"
                    max="16"
                    step="1"
                    value={rtSideC}
                    onChange={(e) => setRtSideC(parseFloat(e.target.value))}
                    className="accent-amber-600"
                  />
                </label>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] font-mono-num grid grid-cols-2 gap-y-1">
                <span>وتر BC = {rtStats.a}</span>
                <span>ارتفاع AH = {rtStats.ah}</span>
                <span>تصویر BH = {rtStats.bh}</span>
                <span>تصویر CH = {rtStats.ch}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
