import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distance,
  midpoint,
  circleCircleIntersection,
  analyzeTriangle,
  computePicksTheorem,
  computeThalesTheorem,
  computeRightTriangleMetrics,
  classifyConicSection,
} from './geometryMath';

test('distance and midpoint calculations are accurate', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 6, y: 8 };
  assert.equal(distance(p1, p2), 10);
  assert.deepEqual(midpoint(p1, p2), { x: 3, y: 4 });
});

test('circleCircleIntersection finds two intersections for compass construction (textbook page 10)', () => {
  // Points A(0,0) and B(5,0) with radii 3 and 4 -> right triangle with hypotenuse 5
  const res = circleCircleIntersection({ x: 0, y: 0 }, 3, { x: 5, y: 0 }, 4);
  assert.equal(res.count, 2);
  const dA = distance(res.points[0], { x: 0, y: 0 });
  const dB = distance(res.points[0], { x: 5, y: 0 });
  assert.ok(Math.abs(dA - 3) < 1e-6);
  assert.ok(Math.abs(dB - 4) < 1e-6);
});

test('computePicksTheorem matches textbook page 69 example (b=4, i=3 => S=4)', () => {
  // Textbook page 69 polygon ABCD: 4 boundary points, 3 interior points => S = 4/2 + 3 - 1 = 4
  const square2x2 = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ];
  const res = computePicksTheorem(square2x2);
  assert.equal(res.boundaryPoints, 8);
  assert.equal(res.interiorPoints, 1);
  assert.equal(res.area, 4);
});

test('computeThalesTheorem calculates proportional segments and parallel base (textbook page 34)', () => {
  // Textbook page 34 Kar-dar-kelas 1: AD=1, DB=3, AE=0.8 -> EC=2.4, AC=3.2
  const res = computeThalesTheorem(1, 3, 0.8, 8);
  assert.equal(res.ec, 2.4);
  assert.equal(res.ac, 3.2);
  assert.equal(res.de, 2);
});

test('computeRightTriangleMetrics satisfies metric relations (textbook page 42-43)', () => {
  // AB=c=8, AC=b=6 -> BC=a=10, AH=4.8, BH=6.4, CH=3.6
  const res = computeRightTriangleMetrics(6, 8);
  assert.equal(res.a, 10);
  assert.equal(res.ah, 4.8);
  assert.equal(res.bh, 6.4);
  assert.equal(res.ch, 3.6);
});

test('analyzeTriangle computes concurrency points for a right triangle', () => {
  const tri = analyzeTriangle({ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 8 });
  assert.equal(tri.area, 24);
  assert.equal(tri.perimeter, 24);
  assert.ok(tri.orthocenter);
  // Orthocenter of right triangle at origin is (0,0)
  assert.ok(Math.abs(tri.orthocenter!.x) < 1e-6);
  assert.ok(Math.abs(tri.orthocenter!.y) < 1e-6);
});

test('classifyConicSection identifies circle, ellipse, parabola, hyperbola (textbook page 93)', () => {
  assert.equal(classifyConicSection(0, 60).typeEn, 'circle');
  assert.equal(classifyConicSection(30, 60).typeEn, 'ellipse');
  assert.equal(classifyConicSection(60, 60).typeEn, 'parabola');
  assert.equal(classifyConicSection(80, 60).typeEn, 'hyperbola');
});
