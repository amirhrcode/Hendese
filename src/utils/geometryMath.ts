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
      subType: 'equilateral' | 'right' | 'isosceles' | 'scalene';
      labelFa: string;
    }
  | {
      kind: 'rectangle';
      vertices: [Point2D, Point2D, Point2D, Point2D];
      isSquare: boolean;
      labelFa: string;
    }
  | {
      kind: 'polygon';
      vertices: Point2D[];
      sides: number;
      labelFa: string;
    }
  | {
      kind: 'angle';
      vertices: [Point2D, Point2D, Point2D]; // ray BA and ray BC with vertex B
      deg: number;
      isRightAngle: boolean;
      labelFa: string;
    }
  | {
      kind: 'erase-gesture';
      bounds: { minX: number; maxX: number; minY: number; maxY: number };
      labelFa: string;
    }
  | {
      kind: 'freehand';
      labelFa: string;
    };

export type SmartRecognizedShape = RecognizedShapeResult;

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
  snapAngleThresholdDeg = 4
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
  return { point: { x: Math.round(end.x), y: Math.round(end.y) }, snappedAngleDeg: null };
}

export function snapSmartCircleRadius(
  rawRadiusPx: number,
  pxPerCm = 40
): { radiusPx: number; radiusCm: number; isSnapped: boolean } {
  const rawCm = rawRadiusPx / pxPerCm;
  // Snap to nearest 0.5 cm if within 0.12 cm
  const nearestHalfCm = Math.round(rawCm * 2) / 2;
  if (nearestHalfCm >= 0.5 && Math.abs(rawCm - nearestHalfCm) <= 0.12) {
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
 * Algebraic Circle Fit (Kåsa method) for hand-drawn circles and arcs.
 * Returns fitted center, radius, normalized radial RMSE, and angular sweep in degrees.
 */
function fitCircleAlgebraic(points: Point2D[]): {
  center: Point2D;
  radius: number;
  relStdDev: number;
  sweepDeg: number;
} {
  const n = points.length;
  let meanX = 0;
  let meanY = 0;
  for (const p of points) {
    meanX += p.x;
    meanY += p.y;
  }
  meanX /= n;
  meanY /= n;

  let suu = 0;
  let suv = 0;
  let svv = 0;
  let suuu = 0;
  let svvv = 0;
  let suvv = 0;
  let svuu = 0;

  for (const p of points) {
    const u = p.x - meanX;
    const v = p.y - meanY;
    suu += u * u;
    suv += u * v;
    svv += v * v;
    suuu += u * u * u;
    svvv += v * v * v;
    suvv += u * v * v;
    svuu += v * u * u;
  }

  const det = suu * svv - suv * suv;
  let cx = meanX;
  let cy = meanY;

  if (Math.abs(det) > 1e-5) {
    const rhsU = 0.5 * (suuu + suvv);
    const rhsV = 0.5 * (svvv + svuu);
    const uc = ( rhsU * svv - rhsV * suv) / det;
    const vc = (-rhsU * suv + rhsV * suu) / det;
    cx = meanX + uc;
    cy = meanY + vc;
  }

  const center = { x: cx, y: cy };
  const radii = points.map((p) => distance(p, center));
  const meanR = radii.reduce((a, b) => a + b, 0) / n;
  const variance = radii.reduce((acc, r) => acc + (r - meanR) * (r - meanR), 0) / n;
  const relStdDev = Math.sqrt(variance) / (meanR || 1);

  // Compute total angular sweep around fitted center
  let totalAngleRad = 0;
  for (let i = 1; i < n; i++) {
    const a1 = Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx);
    const a2 = Math.atan2(points[i].y - cy, points[i].x - cx);
    let diff = a2 - a1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    totalAngleRad += diff;
  }
  const sweepDeg = (Math.abs(totalAngleRad) * 180) / Math.PI;

  return {
    center: { x: Math.round(cx), y: Math.round(cy) },
    radius: meanR,
    relStdDev,
    sweepDeg,
  };
}

/**
 * Regularizes a 3-vertex triangle if it is close to Equilateral, Right, or Isosceles.
 */
function regularizeSmartTriangle(
  v0: Point2D,
  v1: Point2D,
  v2: Point2D
): {
  vertices: [Point2D, Point2D, Point2D];
  subType: 'equilateral' | 'right' | 'isosceles' | 'scalene';
  labelFa: string;
} {
  const d01 = distance(v0, v1);
  const d12 = distance(v1, v2);
  const d20 = distance(v2, v0);
  const maxS = Math.max(d01, d12, d20);
  const minS = Math.min(d01, d12, d20);

  // 1. Equilateral Triangle if all 3 sides are within 14% of each other
  if ((maxS - minS) / (maxS || 1) < 0.14) {
    // Keep base as the most horizontal pair or v1-v2, and place third vertex at exact 60 deg
    const pairs: [Point2D, Point2D, Point2D][] = [
      [v1, v2, v0],
      [v0, v2, v1],
      [v0, v1, v2],
    ];
    pairs.sort(
      (a, b) =>
        Math.abs(a[0].y - a[1].y) - Math.abs(b[0].y - b[1].y)
    );
    const [b1, b2, top] = pairs[0];
    const side = distance(b1, b2);
    const mid = midpoint(b1, b2);
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;
    // Point normal toward original top vertex
    if ((top.x - mid.x) * nx + (top.y - mid.y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const h = (Math.sqrt(3) / 2) * side;
    const regTop: Point2D = {
      x: Math.round(mid.x + nx * h),
      y: Math.round(mid.y + ny * h),
    };
    return {
      vertices: [
        regTop,
        { x: Math.round(b1.x), y: Math.round(b1.y) },
        { x: Math.round(b2.x), y: Math.round(b2.y) },
      ],
      subType: 'equilateral',
      labelFa: 'مثلث متساوی‌الاضلاع هوشمند (۶۰°)',
    };
  }

  // 2. Right Triangle if any vertex angle is within 80..100 deg
  const ang0 = angleDeg(v1, v0, v2);
  const ang1 = angleDeg(v0, v1, v2);
  const ang2 = angleDeg(v0, v2, v1);

  const checkRight = (
    rightV: Point2D,
    armA: Point2D,
    armB: Point2D,
    ang: number
  ): [Point2D, Point2D, Point2D] | null => {
    if (ang >= 80 && ang <= 100) {
      const snappedA = snapSmartLineEndpoint(rightV, armA, 8).point;
      const dx = snappedA.x - rightV.x;
      const dy = snappedA.y - rightV.y;
      const lenA = Math.hypot(dx, dy) || 1;
      const lenB = distance(rightV, armB);
      let nx = -dy / lenA;
      let ny = dx / lenA;
      if ((armB.x - rightV.x) * nx + (armB.y - rightV.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const snappedB: Point2D = {
        x: Math.round(rightV.x + nx * lenB),
        y: Math.round(rightV.y + ny * lenB),
      };
      return [
        { x: Math.round(rightV.x), y: Math.round(rightV.y) },
        snappedA,
        snappedB,
      ];
    }
    return null;
  };

  const rightAt0 = checkRight(v0, v1, v2, ang0);
  if (rightAt0) {
    return {
      vertices: rightAt0,
      subType: 'right',
      labelFa: 'مثلث قائم‌الزاویه هوشمند (۹۰°)',
    };
  }
  const rightAt1 = checkRight(v1, v0, v2, ang1);
  if (rightAt1) {
    return {
      vertices: rightAt1,
      subType: 'right',
      labelFa: 'مثلث قائم‌الزاویه هوشمند (۹۰°)',
    };
  }
  const rightAt2 = checkRight(v2, v0, v1, ang2);
  if (rightAt2) {
    return {
      vertices: rightAt2,
      subType: 'right',
      labelFa: 'مثلث قائم‌الزاویه هوشمند (۹۰°)',
    };
  }

  // 3. Isosceles Triangle if two sides are within 12% of each other
  const isIso0 = Math.abs(d01 - d20) / Math.max(d01, d20) < 0.12;
  if (isIso0) {
    return {
      vertices: [
        { x: Math.round(v0.x), y: Math.round(v0.y) },
        { x: Math.round(v1.x), y: Math.round(v1.y) },
        { x: Math.round(v2.x), y: Math.round(v2.y) },
      ],
      subType: 'isosceles',
      labelFa: 'مثلث متساوی‌الساقین هوشمند',
    };
  }

  return {
    vertices: [
      { x: Math.round(v0.x), y: Math.round(v0.y) },
      { x: Math.round(v1.x), y: Math.round(v1.y) },
      { x: Math.round(v2.x), y: Math.round(v2.y) },
    ],
    subType: 'scalene',
    labelFa: 'مثلث هوشمند',
  };
}

/**
 * Smart Pen Stroke Recognizer v2:
 * Analyzes a freehand stroke drawn by a teacher/student on an Android Touch TV or desktop
 * and classifies it into a clean geometric primitive:
 * - Scratch-out Erase Gesture
 * - Straight Line Segment (with smart angle snap)
 * - Circle or Large Arc (via Kåsa algebraic least-squares circle fit)
 * - Triangle (Equilateral, Right 90°, Isosceles, or General)
 * - Square or Axis-Aligned Rectangle
 * - Regular Pentagon / Hexagon
 * - Angle (with automatic 90° Right-Angle snap or Angle Bisector)
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
  if (pathLength < 24 || diag < 18) {
    return { kind: 'freehand', labelFa: 'دست‌خط آزاد' };
  }

  const start = points[0];
  const end = points[points.length - 1];
  const chordDist = distance(start, end);

  // 0. Check Scratch-Out Erase Gesture (rapid back-and-forth zigzag)
  const fineSimp = rdpSimplify(points, Math.max(8, diag * 0.06));
  if (fineSimp.length >= 6 && pathLength > diag * 2.35 && chordDist > diag * 0.35) {
    let sharpReversals = 0;
    for (let i = 1; i < fineSimp.length - 1; i++) {
      const ang = angleDeg(fineSimp[i - 1], fineSimp[i], fineSimp[i + 1]);
      if (ang < 52) {
        sharpReversals++;
      }
    }
    if (sharpReversals >= 4) {
      return {
        kind: 'erase-gesture',
        bounds: { minX, maxX, minY, maxY },
        labelFa: 'پاک‌کن هوشمند (خط‌خطی)',
      };
    }
  }

  // 1. Check Straight Line Segment
  if (chordDist / pathLength > 0.895) {
    let maxDev = 0;
    for (const p of points) {
      const dev = perpendicularDistanceToSegment(p, start, end);
      if (dev > maxDev) maxDev = dev;
    }
    if (maxDev < Math.max(15, chordDist * 0.075)) {
      const snapped = snapSmartLineEndpoint(start, end, 4);
      return {
        kind: 'segment',
        start: { x: Math.round(start.x), y: Math.round(start.y) },
        end: snapped.point,
        labelFa:
          snapped.snappedAngleDeg !== null
            ? `پاره‌خط صاف هوشمند (${snapped.snappedAngleDeg}°)`
            : 'پاره‌خط صاف هوشمند',
      };
    }
  }

  // Fit algebraic circle (works for both closed circles and 240°+ open circular strokes)
  const circleFit = fitCircleAlgebraic(points);
  const aspect = Math.min(width, height) / (Math.max(width, height) || 1);
  const isClosed = chordDist < Math.max(54, pathLength * 0.30, diag * 0.45);

  // 2. If Closed Loop (or near-closed): Test Triangle vs Circle vs Square/Rectangle vs Pentagon/Hexagon
  if ((isClosed || circleFit.sweepDeg >= 265) && width > 22 && height > 22) {
    const closedPts = [...points, points[0]];
    const simplified = rdpSimplify(closedPts, diag * 0.082);
    const corners = simplified.slice(0, -1);

    // Filter corners that are actual sharp turns (< 145 deg)
    const sharpCorners: Point2D[] = [];
    for (let i = 0; i < corners.length; i++) {
      const prev = corners[(i - 1 + corners.length) % corners.length];
      const curr = corners[i];
      const next = corners[(i + 1) % corners.length];
      if (angleDeg(prev, curr, next) < 146) {
        sharpCorners.push(curr);
      }
    }

    // Triangle check: 3 sharp corners
    if (
      (sharpCorners.length === 3 || corners.length === 3) &&
      circleFit.relStdDev > 0.105
    ) {
      const triPts = sharpCorners.length === 3 ? sharpCorners : corners;
      const reg = regularizeSmartTriangle(triPts[0], triPts[1], triPts[2]);
      return {
        kind: 'triangle',
        vertices: reg.vertices,
        subType: reg.subType,
        labelFa: reg.labelFa,
      };
    }

    // High-confidence Circle check via Kåsa algebraic fit
    if (
      circleFit.relStdDev < 0.185 &&
      aspect > 0.68 &&
      circleFit.sweepDeg >= 245 &&
      sharpCorners.length !== 3 &&
      sharpCorners.length !== 4
    ) {
      const snappedR = snapSmartCircleRadius(circleFit.radius);
      return {
        kind: 'circle',
        center: circleFit.center,
        radius: snappedR.radiusPx,
        labelFa: `دایره هوشمند (r=${snappedR.radiusCm}cm)`,
      };
    }

    // Rectangle / Square check: 4 corners
    if (
      (sharpCorners.length === 4 || corners.length === 4) &&
      circleFit.relStdDev >= 0.115
    ) {
      const isSquare = aspect > 0.84;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
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
        labelFa: isSquare ? 'مربع منظم هوشمند' : 'مستطیل منظم هوشمند',
      };
    }

    // Regular Pentagon / Hexagon check: 5 or 6 corners
    if (
      (sharpCorners.length === 5 || sharpCorners.length === 6) &&
      circleFit.relStdDev >= 0.08 &&
      circleFit.relStdDev <= 0.22 &&
      aspect > 0.72
    ) {
      const nSides = sharpCorners.length;
      const r = Math.round(circleFit.radius);
      const cx = circleFit.center.x;
      const cy = circleFit.center.y;
      const regVerts: Point2D[] = [];
      for (let i = 0; i < nSides; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / nSides;
        regVerts.push({
          x: Math.round(cx + r * Math.cos(ang)),
          y: Math.round(cy + r * Math.sin(ang)),
        });
      }
      return {
        kind: 'polygon',
        vertices: regVerts,
        sides: nSides,
        labelFa: nSides === 5 ? 'پنج‌ضلعی منتظم هوشمند' : 'شش‌ضلعی منتظم هوشمند',
      };
    }

    // Fallback Circle check for slightly rougher hand-drawn circles on Touch TVs
    if (circleFit.relStdDev < 0.235 && aspect > 0.62 && circleFit.sweepDeg >= 230) {
      const snappedR = snapSmartCircleRadius(circleFit.radius);
      return {
        kind: 'circle',
        center: circleFit.center,
        radius: snappedR.radiusPx,
        labelFa: `دایره هوشمند (r=${snappedR.radiusCm}cm)`,
      };
    }
  }

  // 3. Open Stroke with 1 Sharp Corner -> Angle (two rays BA and BC, with 90° Right-Angle snap)
  const openSimplified = rdpSimplify(points, diag * 0.09);
  if (!isClosed && openSimplified.length === 3) {
    const [pA, pB, pC] = openSimplified;
    const arm1 = distance(pA, pB);
    const arm2 = distance(pB, pC);
    const rawDeg = angleDeg(pA, pB, pC);
    if (arm1 > 28 && arm2 > 28 && rawDeg >= 15 && rawDeg <= 165) {
      const isRightAngle = rawDeg >= 80 && rawDeg <= 100;
      let finalA = { x: Math.round(pA.x), y: Math.round(pA.y) };
      const finalB = { x: Math.round(pB.x), y: Math.round(pB.y) };
      let finalC = { x: Math.round(pC.x), y: Math.round(pC.y) };

      if (isRightAngle) {
        finalA = snapSmartLineEndpoint(finalB, finalA, 8).point;
        const dx = finalA.x - finalB.x;
        const dy = finalA.y - finalB.y;
        const lenA = Math.hypot(dx, dy) || 1;
        let nx = -dy / lenA;
        let ny = dx / lenA;
        if ((finalC.x - finalB.x) * nx + (finalC.y - finalB.y) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        finalC = {
          x: Math.round(finalB.x + nx * arm2),
          y: Math.round(finalB.y + ny * arm2),
        };
      }

      const finalDeg = isRightAngle ? 90 : Math.round(rawDeg);
      return {
        kind: 'angle',
        vertices: [finalA, finalB, finalC],
        deg: finalDeg,
        isRightAngle,
        labelFa: isRightAngle
          ? 'زاویه قائمه هوشمند (۹۰°)'
          : `زاویه هوشمند (${finalDeg}°)`,
      };
    }
  }

  return { kind: 'freehand', labelFa: 'دست‌خط آزاد' };
}

/**
 * Super Geometry v2.0: Reflects point P across the line passing through lineA and lineB.
 */
export function reflectPointAcrossLine(
  pt: Point2D,
  lineA: Point2D,
  lineB: Point2D
): Point2D {
  const foot = footOfPerpendicular(pt, lineA, lineB);
  return {
    x: Number((2 * foot.x - pt.x).toFixed(2)),
    y: Number((2 * foot.y - pt.y).toFixed(2)),
  };
}

/**
 * Super Geometry v2.0: Rotates point P around `center` by `angleDegVal` degrees.
 */
export function rotatePointAroundCenter(
  pt: Point2D,
  center: Point2D,
  angleDegVal: number
): Point2D {
  const rad = (angleDegVal * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pt.x - center.x;
  const dy = pt.y - center.y;
  return {
    x: Number((center.x + dx * cos - dy * sin).toFixed(2)),
    y: Number((center.y + dx * sin + dy * cos).toFixed(2)),
  };
}

/**
 * Super Geometry v2.0: Computes exact tangent touch points T1, T2 on circle (center, radius)
 * from an external point P.
 */
export function circleTangentsFromPoint(
  externalPt: Point2D,
  center: Point2D,
  radius: number
): Point2D[] {
  const d = distance(externalPt, center);
  if (d < radius - 1e-6 || radius <= 0) return [];
  if (Math.abs(d - radius) <= 1e-6) {
    return [{ x: externalPt.x, y: externalPt.y }];
  }
  const baseAngle = Math.atan2(externalPt.y - center.y, externalPt.x - center.x);
  const alpha = Math.acos(Math.max(-1, Math.min(1, radius / d)));
  return [
    {
      x: Number((center.x + radius * Math.cos(baseAngle + alpha)).toFixed(2)),
      y: Number((center.y + radius * Math.sin(baseAngle + alpha)).toFixed(2)),
    },
    {
      x: Number((center.x + radius * Math.cos(baseAngle - alpha)).toFixed(2)),
      y: Number((center.y + radius * Math.sin(baseAngle - alpha)).toFixed(2)),
    },
  ];
}

/**
 * Ray-casting algorithm to determine whether `pt` lies inside `polygon`.
 */
export function pointInPolygon(pt: Point2D, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes SVG arc sector path and label position for displaying interior vertex angles.
 */
export function computeVertexAngleArc(
  prev: Point2D,
  vertex: Point2D,
  next: Point2D,
  arcRadius = 22
): {
  deg: number;
  pathD: string;
  labelPos: Point2D;
} | null {
  const l1 = distance(vertex, prev);
  const l2 = distance(vertex, next);
  if (l1 < 28 || l2 < 28) return null;

  const deg = angleDeg(prev, vertex, next);
  if (deg < 3 || deg > 177) return null;

  const r = Math.min(arcRadius, l1 * 0.35, l2 * 0.35);
  const u1x = (prev.x - vertex.x) / l1;
  const u1y = (prev.y - vertex.y) / l1;
  const u2x = (next.x - vertex.x) / l2;
  const u2y = (next.y - vertex.y) / l2;

  const startX = vertex.x + u1x * r;
  const startY = vertex.y + u1y * r;
  const endX = vertex.x + u2x * r;
  const endY = vertex.y + u2y * r;

  // Sweep flag using cross product so the smaller interior angle is swept
  const cross = u1x * u2y - u1y * u2x;
  const sweepFlag = cross >= 0 ? 1 : 0;

  let bx = u1x + u2x;
  let by = u1y + u2y;
  const bLen = Math.hypot(bx, by) || 1;
  bx /= bLen;
  by /= bLen;

  const pathD = `M ${vertex.x} ${vertex.y} L ${startX.toFixed(1)} ${startY.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweepFlag} ${endX.toFixed(1)} ${endY.toFixed(1)} Z`;

  return {
    deg: Math.round(deg * 10) / 10,
    pathD,
    labelPos: {
      x: vertex.x + bx * (r + 12),
      y: vertex.y + by * (r + 12),
    },
  };
}

/**
 * Super Geometry v3.0: Computes the exact circumcircle passing through three non-collinear points A, B, C.
 */
export function circumcircleThroughThreePoints(
  a: Point2D,
  b: Point2D,
  c: Point2D
): { center: Point2D; radius: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) return null;
  const aSq = a.x * a.x + a.y * a.y;
  const bSq = b.x * b.x + b.y * b.y;
  const cSq = c.x * c.x + c.y * c.y;
  const ux = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d;
  const uy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d;
  const center = { x: Number(ux.toFixed(2)), y: Number(uy.toFixed(2)) };
  const radius = Number(distance(center, a).toFixed(2));
  return { center, radius };
}

/**
 * Super Geometry v3.0: Computes exact polygon area (cm²), perimeter (cm), and centroid.
 */
export function computePolygonMetrics(
  vertices: Point2D[],
  pxPerCm = 40
): { areaCm2: number; perimeterCm: number; centroid: Point2D } {
  if (vertices.length < 3) {
    return {
      areaCm2: 0,
      perimeterCm: 0,
      centroid: vertices[0] || { x: 0, y: 0 },
    };
  }
  const areaPx2 = polygonAreaShoelace(vertices);
  let perimPx = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length];
    perimPx += distance(vertices[i], next);
    cx += vertices[i].x;
    cy += vertices[i].y;
  }
  return {
    areaCm2: Number((areaPx2 / (pxPerCm * pxPerCm)).toFixed(2)),
    perimeterCm: Number((perimPx / pxPerCm).toFixed(2)),
    centroid: {
      x: Number((cx / vertices.length).toFixed(1)),
      y: Number((cy / vertices.length).toFixed(1)),
    },
  };
}
