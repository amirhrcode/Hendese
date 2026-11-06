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
