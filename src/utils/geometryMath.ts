export interface Point2D {
  x: number;
  y: number;
}

export interface CircleIntersectionResult {
  count: 0 | 1 | 2;
  points: Point2D[];
}

export interface TriangleAnalysis {
  sideA: number; // BC
  sideB: number; // AC
  sideC: number; // AB
  angleA: number;
  angleB: number;
  angleC: number;
  area: number;
  perimeter: number;
  centroid: Point2D; // همرسی میانه‌ها (G)
  circumcenter: Point2D | null; // همرسی عمودمنصف‌ها (O)
  incenter: Point2D; // همرسی نیمسازها (P)
  orthocenter: Point2D | null; // همرسی ارتفاع‌ها (H)
  circumradius: number | null;
  inradius: number;
}

export interface PicksTheoremResult {
  boundaryPoints: number; // b
  interiorPoints: number; // i
  area: number; // S = b/2 + i - 1
  formulaString: string;
}

export function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function angleDeg(a: Point2D, vertex: Point2D, b: Point2D): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 < 1e-9 || len2 < 1e-9) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export function footOfPerpendicular(p: Point2D, lineA: Point2D, lineB: Point2D): Point2D {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return { ...lineA };
  const t = ((p.x - lineA.x) * dx + (p.y - lineA.y) * dy) / lenSq;
  return {
    x: lineA.x + t * dx,
    y: lineA.y + t * dy,
  };
}

export function perpendicularBisector(
  p1: Point2D,
  p2: Point2D,
  span = 200
): { mid: Point2D; start: Point2D; end: Point2D } {
  const mid = midpoint(p1, p2);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { mid, start: { x: mid.x, y: mid.y - span }, end: { x: mid.x, y: mid.y + span } };
  }
  const nx = -dy / len;
  const ny = dx / len;
  return {
    mid,
    start: { x: mid.x - nx * span, y: mid.y - ny * span },
    end: { x: mid.x + nx * span, y: mid.y + ny * span },
  };
}

export function parallelLineThroughPoint(
  p: Point2D,
  lineA: Point2D,
  lineB: Point2D,
  span = 220
): { start: Point2D; end: Point2D } {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { start: { x: p.x - span, y: p.y }, end: { x: p.x + span, y: p.y } };
  }
  const ux = dx / len;
  const uy = dy / len;
  return {
    start: { x: p.x - ux * span, y: p.y - uy * span },
    end: { x: p.x + ux * span, y: p.y + uy * span },
  };
}

export function angleBisectorRay(
  a: Point2D,
  vertex: Point2D,
  b: Point2D,
  length = 200
): Point2D {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const l1 = Math.hypot(v1x, v1y) || 1;
  const l2 = Math.hypot(v2x, v2y) || 1;
  let bx = v1x / l1 + v2x / l2;
  let by = v1y / l1 + v2y / l2;
  const bl = Math.hypot(bx, by);
  if (bl < 1e-9) {
    bx = -v1y / l1;
    by = v1x / l1;
  } else {
    bx /= bl;
    by /= bl;
  }
  return {
    x: vertex.x + bx * length,
    y: vertex.y + by * length,
  };
}

export function lineLineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return null;
  const det1 = p1.x * p2.y - p1.y * p2.x;
  const det2 = p3.x * p4.y - p3.y * p4.x;
  const x = (det1 * (p3.x - p4.x) - (p1.x - p2.x) * det2) / denom;
  const y = (det1 * (p3.y - p4.y) - (p1.y - p2.y) * det2) / denom;
  return { x, y };
}

export function circleCircleIntersection(
  c1: Point2D,
  r1: number,
  c2: Point2D,
  r2: number
): CircleIntersectionResult {
  const d = distance(c1, c2);
  if (d > r1 + r2 + 1e-7 || d < Math.abs(r1 - r2) - 1e-7 || d < 1e-9) {
    return { count: 0, points: [] };
  }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = Math.max(0, r1 * r1 - a * a);
  const h = Math.sqrt(hSq);
  const x2 = c1.x + (a * (c2.x - c1.x)) / d;
  const y2 = c1.y + (a * (c2.y - c1.y)) / d;

  if (h < 1e-6) {
    return { count: 1, points: [{ x: x2, y: y2 }] };
  }

  const rx = -(c2.y - c1.y) * (h / d);
  const ry = (c2.x - c1.x) * (h / d);

  return {
    count: 2,
    points: [
      { x: x2 + rx, y: y2 + ry },
      { x: x2 - rx, y: y2 - ry },
    ],
  };
}

export function analyzeTriangle(a: Point2D, b: Point2D, c: Point2D): TriangleAnalysis {
  const sideA = distance(b, c);
  const sideB = distance(a, c);
  const sideC = distance(a, b);
  const perimeter = sideA + sideB + sideC;
  const area = Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);

  const angleA = angleDeg(b, a, c);
  const angleB = angleDeg(a, b, c);
  const angleC = angleDeg(a, c, b);

  const centroid: Point2D = {
    x: (a.x + b.x + c.x) / 3,
    y: (a.y + b.y + c.y) / 3,
  };

  const incenter: Point2D =
    perimeter > 1e-9
      ? {
          x: (sideA * a.x + sideB * b.x + sideC * c.x) / perimeter,
          y: (sideA * a.y + sideB * b.y + sideC * c.y) / perimeter,
        }
      : { ...centroid };

  const inradius = perimeter > 1e-9 ? (2 * area) / perimeter : 0;

  const pb1 = perpendicularBisector(a, b, 100);
  const pb2 = perpendicularBisector(b, c, 100);
  const circumcenter = lineLineIntersection(pb1.start, pb1.end, pb2.start, pb2.end);
  const circumradius = circumcenter ? distance(circumcenter, a) : null;

  const footA = footOfPerpendicular(a, b, c);
  const footB = footOfPerpendicular(b, a, c);
  const orthocenter = lineLineIntersection(a, footA, b, footB);

  return {
    sideA,
    sideB,
    sideC,
    angleA,
    angleB,
    angleC,
    area,
    perimeter,
    centroid,
    circumcenter,
    incenter,
    orthocenter,
    circumradius,
    inradius,
  };
}

export function polygonAreaShoelace(pts: Point2D[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) / 2;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function computePicksTheorem(latticeVertices: Point2D[]): PicksTheoremResult {
  if (latticeVertices.length < 3) {
    return {
      boundaryPoints: latticeVertices.length,
      interiorPoints: 0,
      area: 0,
      formulaString: 'S = b/2 + i - 1 = 0',
    };
  }
  let b = 0;
  for (let idx = 0; idx < latticeVertices.length; idx++) {
    const p1 = latticeVertices[idx];
    const p2 = latticeVertices[(idx + 1) % latticeVertices.length];
    const dx = Math.abs(Math.round(p2.x) - Math.round(p1.x));
    const dy = Math.abs(Math.round(p2.y) - Math.round(p1.y));
    b += gcd(dx, dy);
  }
  const roundedPts = latticeVertices.map((p) => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
  }));
  const area = polygonAreaShoelace(roundedPts);
  // Pick's formula: S = b/2 + i - 1 => i = S - b/2 + 1
  const i = Math.max(0, Math.round(area - b / 2 + 1));
  return {
    boundaryPoints: b,
    interiorPoints: i,
    area,
    formulaString: `S = (${b} / 2) + ${i} - 1 = ${area}`,
  };
}

export function computeThalesTheorem(
  ad: number,
  db: number,
  ae: number,
  bc: number
): {
  ec: number;
  ab: number;
  ac: number;
  de: number;
  ratioAdDb: number;
  ratioAdAb: number;
} {
  const safeAd = Math.max(0.1, ad);
  const ec = (db * ae) / safeAd;
  const ab = safeAd + db;
  const ac = ae + ec;
  const ratioAdAb = safeAd / ab;
  const de = ratioAdAb * bc;
  return {
    ec: Number(ec.toFixed(2)),
    ab: Number(ab.toFixed(2)),
    ac: Number(ac.toFixed(2)),
    de: Number(de.toFixed(2)),
    ratioAdDb: Number((safeAd / Math.max(0.1, db)).toFixed(3)),
    ratioAdAb: Number(ratioAdAb.toFixed(3)),
  };
}

export function computeRightTriangleMetrics(b: number, c: number): {
  a: number; // وتر BC
  ah: number; // ارتفاع وارد بر وتر AH
  bh: number; // تصویر AB روی وتر
  ch: number; // تصویر AC روی وتر
  area: number;
} {
  const a = Math.hypot(b, c);
  const ah = a > 0 ? (b * c) / a : 0;
  const bh = a > 0 ? (c * c) / a : 0;
  const ch = a > 0 ? (b * b) / a : 0;
  const area = (b * c) / 2;
  return {
    a: Number(a.toFixed(2)),
    ah: Number(ah.toFixed(2)),
    bh: Number(bh.toFixed(2)),
    ch: Number(ch.toFixed(2)),
    area: Number(area.toFixed(2)),
  };
}

export function classifyConicSection(
  planeTiltDeg: number,
  coneGeneratrixDeg = 60
): {
  typeFa: string;
  typeEn: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
  descriptionFa: string;
} {
  const absTilt = Math.abs(planeTiltDeg);
  if (absTilt < 2) {
    return {
      typeFa: 'دایره (Circle)',
      typeEn: 'circle',
      descriptionFa: 'صفحه افقی و موازی با قاعده مخروط است؛ سطح مقطع یک دایره کامل است (و بخش پایینی مخروط ناقص نام دارد).',
    };
  }
  if (Math.abs(absTilt - coneGeneratrixDeg) <= 3) {
    return {
      typeFa: 'سهمی (Parabola)',
      typeEn: 'parabola',
      descriptionFa: 'صفحه مایل دقیقاً موازی با یال مخروط است؛ سطح مقطع یک منحنی باز از نوع سهمی است.',
    };
  }
  if (absTilt < coneGeneratrixDeg) {
    return {
      typeFa: 'بیضی (Ellipse)',
      typeEn: 'ellipse',
      descriptionFa: 'صفحه مایل تمام یال‌های مخروط را قطع می‌کند و با قاعده متقاطع نیست؛ سطح مقطع یک بیضی بسته است.',
    };
  }
  return {
    typeFa: 'هذلولی / برش تند (Hyperbola)',
    typeEn: 'hyperbola',
    descriptionFa: 'زاویه صفحه از شیب یال مخروط بیشتر است (یا عمودی است) و قاعده را نیز قطع می‌کند.',
  };
}

export type RecognizedShapeResult =
  | {
      kind: 'segment';
      start: Point2D;
      end: Point2D;
      labelFa: string;
    }
  | {
      kind: 'circle';
      center: Point2D;
      radius: number;
      labelFa: string;
    }
  | {
      kind: 'triangle';
      vertices: [Point2D, Point2D, Point2D];
      labelFa: string;
    }
  | {
      kind: 'rectangle';
      vertices: [Point2D, Point2D, Point2D, Point2D];
      isSquare: boolean;
      labelFa: string;
    }
  | {
      kind: 'angle';
      vertices: [Point2D, Point2D, Point2D]; // ray BA and ray BC with vertex B
      deg: number;
      labelFa: string;
    }
  | {
      kind: 'freehand';
      labelFa: string;
    };

function perpendicularDistanceToSegment(pt: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return distance(pt, a);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (len * len)));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

export function rdpSimplify(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistanceToSegment(points[i], start, end);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, index + 1), epsilon);
    const right = rdpSimplify(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

export function snapSmartLineEndpoint(
  start: Point2D,
  end: Point2D,
  snapAngleThresholdDeg = 6
): { point: Point2D; snappedAngleDeg: number | null } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const r = Math.hypot(dx, dy);
  if (r < 10) return { point: end, snappedAngleDeg: null };

  const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const targets = [-180, -150, -135, -120, -90, -60, -45, -30, 0, 30, 45, 60, 90, 120, 135, 150, 180];

  for (const t of targets) {
    if (Math.abs(rawDeg - t) <= snapAngleThresholdDeg) {
      const rad = (t * Math.PI) / 180;
      return {
        point: {
          x: Math.round(start.x + r * Math.cos(rad)),
          y: Math.round(start.y + r * Math.sin(rad)),
        },
        snappedAngleDeg: (t + 360) % 360,
      };
    }
  }
  return { point: end, snappedAngleDeg: null };
}

export function snapSmartCircleRadius(
  rawRadiusPx: number,
  pxPerCm = 40
): { radiusPx: number; radiusCm: number; isSnapped: boolean } {
  const rawCm = rawRadiusPx / pxPerCm;
  // Snap to nearest 0.5 cm if within 0.14 cm
  const nearestHalfCm = Math.round(rawCm * 2) / 2;
  if (nearestHalfCm >= 0.5 && Math.abs(rawCm - nearestHalfCm) <= 0.14) {
    return {
      radiusPx: Math.round(nearestHalfCm * pxPerCm),
      radiusCm: nearestHalfCm,
      isSnapped: true,
    };
  }
  return {
    radiusPx: Math.round(rawRadiusPx),
    radiusCm: Number(rawCm.toFixed(2)),
    isSnapped: false,
  };
}

/**
 * Smart Pen Stroke Recognizer:
 * Analyzes a freehand stroke drawn by a teacher/student on a Touch TV or tablet
 * and classifies it into a clean geometric primitive (Segment, Circle, Triangle,
 * Rectangle/Square, or Angle) or leaves it as Freehand if it's handwriting.
 */
export function recognizeSmartStroke(points: Point2D[]): RecognizedShapeResult {
  if (points.length < 4) {
    return { kind: 'freehand', labelFa: 'دست‌خط آزاد' };
  }

  // Compute total path length and bounding box
  let pathLength = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      pathLength += distance(points[i - 1], p);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.hypot(width, height);
  if (pathLength < 28 || diag < 20) {
    return { kind: 'freehand', labelFa: 'دست‌خط آزاد' };
  }

  const start = points[0];
  const end = points[points.length - 1];
  const chordDist = distance(start, end);

  // 1. Check Straight Line Segment
  if (chordDist / pathLength > 0.89) {
    let maxDev = 0;
    for (const p of points) {
      const dev = perpendicularDistanceToSegment(p, start, end);
      if (dev > maxDev) maxDev = dev;
    }
    if (maxDev < Math.max(16, chordDist * 0.08)) {
      const snapped = snapSmartLineEndpoint(start, end, 6);
      return {
        kind: 'segment',
        start: { x: Math.round(start.x), y: Math.round(start.y) },
        end: snapped.point,
        labelFa: 'پاره‌خط صاف هوشمند',
      };
    }
  }

  const isClosed = chordDist < Math.max(48, pathLength * 0.28, diag * 0.42);

  // 2. If Closed Loop: Test Circle vs Triangle vs Rectangle/Square
  if (isClosed && width > 24 && height > 24) {
    // Simplify closed contour using RDP
    const closedPts = [...points, points[0]];
    const simplified = rdpSimplify(closedPts, diag * 0.085);
    // Remove closing duplicate vertex
    const corners = simplified.slice(0, -1);

    // Compute radial circularity metrics around bounding-box / mean center
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const center = { x: Math.round(cx), y: Math.round(cy) };
    const radii = points.map((p) => distance(p, center));
    const meanR = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance =
      radii.reduce((acc, r) => acc + (r - meanR) * (r - meanR), 0) / radii.length;
    const relStdDev = Math.sqrt(variance) / (meanR || 1);
    const aspect = Math.min(width, height) / Math.max(width, height);

    // Triangle check: 3 sharp corners
    if (corners.length === 3 && relStdDev > 0.11) {
      const v0 = { x: Math.round(corners[0].x), y: Math.round(corners[0].y) };
      const v1 = { x: Math.round(corners[1].x), y: Math.round(corners[1].y) };
      const v2 = { x: Math.round(corners[2].x), y: Math.round(corners[2].y) };
      return {
        kind: 'triangle',
        vertices: [v0, v1, v2],
        labelFa: 'مثلث هوشمند',
      };
    }

    // Circle check: low radial deviation and reasonable aspect ratio
    if (relStdDev < 0.19 && aspect > 0.68 && corners.length >= 4) {
      const snappedR = snapSmartCircleRadius(meanR);
      return {
        kind: 'circle',
        center,
        radius: snappedR.radiusPx,
        labelFa: `دایره هوشمند (r=${snappedR.radiusCm}cm)`,
      };
    }

    // Rectangle / Square check: 4 corners (or 4-5 corners with box-like bounds)
    if (corners.length === 4 || (corners.length === 5 && relStdDev >= 0.14)) {
      const isSquare = aspect > 0.85;
      const sideW = isSquare ? Math.round((width + height) / 2) : Math.round(width);
      const sideH = isSquare ? sideW : Math.round(height);
      const x1 = Math.round(cx - sideW / 2);
      const y1 = Math.round(cy - sideH / 2);
      const x2 = x1 + sideW;
      const y2 = y1 + sideH;
      return {
        kind: 'rectangle',
        vertices: [
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 },
        ],
        isSquare,
        labelFa: isSquare ? 'مربع هوشمند' : 'مستطیل هوشمند',
      };
    }

    // Secondary fallback for rougher hand-drawn circles on a big Touch TV
    if (relStdDev < 0.24 && aspect > 0.62) {
      const snappedR = snapSmartCircleRadius(meanR);
      return {
        kind: 'circle',
        center,
        radius: snappedR.radiusPx,
        labelFa: `دایره هوشمند (r=${snappedR.radiusCm}cm)`,
      };
    }
  }

  // 3. Open Stroke with 1 Sharp Corner -> Angle (two rays BA and BC)
  const openSimplified = rdpSimplify(points, diag * 0.09);
  if (!isClosed && openSimplified.length === 3) {
    const [pA, pB, pC] = openSimplified;
    const arm1 = distance(pA, pB);
    const arm2 = distance(pB, pC);
    const deg = angleDeg(pA, pB, pC);
    if (arm1 > 30 && arm2 > 30 && deg >= 15 && deg <= 165) {
      return {
        kind: 'angle',
        vertices: [
          { x: Math.round(pA.x), y: Math.round(pA.y) },
          { x: Math.round(pB.x), y: Math.round(pB.y) },
          { x: Math.round(pC.x), y: Math.round(pC.y) },
        ],
        deg: Math.round(deg),
        labelFa: `زاویه هوشمند (${Math.round(deg)}°)`,
      };
    }
  }

  return { kind: 'freehand', labelFa: 'دست‌خط آزاد' };
}

