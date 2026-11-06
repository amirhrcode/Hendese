import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  Layers,
  RotateCw,
  Compass,
  BookOpen,
  Eye,
  RotateCcw
} from 'lucide-react';
import { classifyConicSection } from '../utils/geometryMath';

export type SpatialMode = 'cross-section' | 'revolution' | 'space-lines' | 'voxels';
export type SolidShape = 'cone' | 'cylinder' | 'cube' | 'prism' | 'sphere';
export type RevolutionProfile = 'rectangle' | 'triangle' | 'trapezoid' | 'semicircle';

interface Spatial3DLabProps {
  initialMode?: SpatialMode;
  onJumpToPdfPage: (bookPage: number) => void;
}

// Create a crisp procedural drafting grid texture for the laboratory stage floor
function createStageGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, 512, 512);

  // Minor grid lines
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Major border lines
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// Create radial soft contact shadow texture
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.10)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export const Spatial3DLab: React.FC<Spatial3DLabProps> = ({
  initialMode = 'cross-section',
  onJumpToPdfPage,
}) => {
  const [mode, setMode] = useState<SpatialMode>(initialMode);
  const [dockOpen, setDockOpen] = useState<boolean>(true);

  // Mode 1: Cross-Section state
  const [solidShape, setSolidShape] = useState<SolidShape>('cone');
  const [planeAngleDeg, setPlaneAngleDeg] = useState<number>(28);
  const [planeHeight, setPlaneHeight] = useState<number>(0.1);
  const [coneHalfAngleDeg] = useState<number>(36);

  // Mode 2: Solid of Revolution state
  const [revProfile, setRevProfile] = useState<RevolutionProfile>('trapezoid');
  const [sweepDeg, setSweepDeg] = useState<number>(270);

  // Mode 3: 3D Lines, Planes & Hinged Doors state (Page 87 Exercise)
  const [door1Angle, setDoor1Angle] = useState<number>(30);
  const [door2Angle, setDoor2Angle] = useState<number>(90);
  const [showSkewLine, setShowSkewLine] = useState<boolean>(true);

  // Mode 4: Voxel Orthographic Views state (Page 92–96)
  // 3x3 grid of column heights (0 to 3 cubes high)
  const [voxelGrid, setVoxelGrid] = useState<number[][]>([
    [3, 2, 1],
    [2, 1, 0],
    [1, 1, 1],
  ]);
  const [activeCameraPreset, setActiveCameraPreset] = useState<'iso' | 'front' | 'top' | 'left'>('iso');

  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const setCameraPresetRef = useRef<((preset: 'iso' | 'front' | 'top' | 'left') => void) | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const isSoftwareGlRef = useRef<boolean>(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Initialize Three.js Scene, Renderer, Lighting, Environment, and OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const bgHex = 0xf1f5f9;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.032);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(5.2, 4.0, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);
    isSoftwareGlRef.current = isSoftwareGl;

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio IBL Environment via PMREMGenerator + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // 3-Point Studio Lighting: Warm Key + Cool Hemisphere Fill + Rim
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xfef3c7, 0.85);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.9);
    keyLight.position.set(6, 10, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 25;
      const d = 5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.75);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // Grounded Laboratory Drafting Stage Pedestal + Contact Shadow
    const stageGroup = new THREE.Group();
    const gridTex = createStageGridTexture();
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.55;
    floorMesh.receiveShadow = !isSoftwareGl;
    stageGroup.add(floorMesh);

    // Circular Brass-Rimmed Turntable Base under the 3D Apparatus
    const pedestalGeo = new THREE.CylinderGeometry(2.65, 2.8, 0.14, isSoftwareGl ? 32 : 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -1.48;
    pedestalMesh.receiveShadow = !isSoftwareGl;
    stageGroup.add(pedestalMesh);

    const brassRingGeo = new THREE.TorusGeometry(2.68, 0.03, 12, isSoftwareGl ? 32 : 64);
    const brassRingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.8,
    });
    const brassRing = new THREE.Mesh(brassRingGeo, brassRingMat);
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.y = -1.41;
    stageGroup.add(brassRing);

    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.405;
    stageGroup.add(shadowPlane);

    scene.add(stageGroup);

    // Dynamic Apparatus Group
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // OrbitControls with damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 2.8;
    controls.maxDistance = 16;
    controls.target.set(0, 0.1, 0);

    // On-demand render pacing (`requestRender` + `afterDraw`)
    let rafId = 0;
    let dirty = true;

    const afterDraw = () => {
      if (dirty) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      rafId = 0;
      const stillMoving = controls.update();
      renderer.render(scene, camera);
      dirty = stillMoving;
      afterDraw();
    };

    const requestRender = () => {
      dirty = true;
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    // Camera view preset switcher (Front, Top, Left, Isometric)
    setCameraPresetRef.current = (preset) => {
      controls.target.set(0, 0.1, 0);
      if (preset === 'front') {
        camera.position.set(0, 0.2, 7.5);
      } else if (preset === 'top') {
        camera.position.set(0, 8.2, 0.01);
      } else if (preset === 'left') {
        camera.position.set(-7.5, 0.2, 0);
      } else {
        camera.position.set(5.2, 4.0, 6.2);
      }
      controls.update();
      requestRender();
    };

    // ResizeObserver for crisp container responsiveness
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          requestRender();
        }
      }
    });
    ro.observe(container);

    requestRender();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  // Rebuild Composite 3D Apparatus whenever mode or parameters change
  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;

    // Dispose previous children cleanly
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const isSoft = isSoftwareGlRef.current;
    const segs = isSoft ? 28 : 56;

    // Shared materials
    const azureGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.05,
      transmission: isSoft ? 0 : 0.45,
      transparent: true,
      opacity: isSoft ? 0.72 : 0.88,
      side: THREE.DoubleSide,
    });

    const brassAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.75,
    });

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.5,
    });

    const emeraldCutMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
    });

    if (mode === 'cross-section') {
      // Composite Apparatus:
      // 1. Solid Geometry + Wireframe Edge Cage
      // 2. Central Vertical Axis Rod + Base Mount Collar
      // 3. Tilted Slicing Plane with Brass Frame + Intersection Contour Ring
      const apparatus = new THREE.Group();

      // Axis rod
      const axisRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 3.3, 16),
        darkFrameMat
      );
      axisRod.position.y = 0.2;
      apparatus.add(axisRod);

      // Base collar
      const baseCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 0.12, 24),
        brassAccentMat
      );
      baseCollar.position.y = -1.35;
      apparatus.add(baseCollar);

      // Main 3D Solid
      let solidGeo: THREE.BufferGeometry;
      const r = 1.35;
      const h = 2.6;
      if (solidShape === 'cone') {
        solidGeo = new THREE.ConeGeometry(r, h, segs, 1, false);
      } else if (solidShape === 'cylinder') {
        solidGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.82, h, segs);
      } else if (solidShape === 'cube') {
        solidGeo = new THREE.BoxGeometry(2.0, 2.0, 2.0);
      } else if (solidShape === 'prism') {
        solidGeo = new THREE.CylinderGeometry(r * 0.9, r * 0.9, h, 6);
      } else {
        solidGeo = new THREE.SphereGeometry(r * 0.95, segs, segs);
      }

      const solidMesh = new THREE.Mesh(solidGeo, azureGlassMat);
      solidMesh.position.y = 0.0;
      solidMesh.castShadow = !isSoft;
      apparatus.add(solidMesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(solidGeo, 25),
        new THREE.LineBasicMaterial({ color: 0x0369a1 })
      );
      edges.position.y = 0.0;
      apparatus.add(edges);

      // Slicing Plane Assembly (Plane + Brass Border + Protractor Arc)
      const planeGroup = new THREE.Group();
      planeGroup.position.y = planeHeight;
      const rad = THREE.MathUtils.degToRad(planeAngleDeg);
      planeGroup.rotation.z = rad;

      const slicePlaneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 3.4),
        emeraldCutMat
      );
      slicePlaneMesh.rotation.x = Math.PI / 2;
      planeGroup.add(slicePlaneMesh);

      // Brass border around cutting plane
      const borderEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4, 0.03, 3.4)),
        new THREE.LineBasicMaterial({ color: 0xd97706 })
      );
      planeGroup.add(borderEdge);

      // Highlighted Intersection Curve on the Cutting Plane
      const curveRingGeo = new THREE.RingGeometry(
        solidShape === 'cone'
          ? Math.max(0.18, (1.3 - planeHeight) * 0.52)
          : 0.92,
        solidShape === 'cone'
          ? Math.max(0.24, (1.3 - planeHeight) * 0.52 + 0.06)
          : 0.98,
        segs
      );
      const curveRingMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        side: THREE.DoubleSide,
      });
      const curveRing = new THREE.Mesh(curveRingGeo, curveRingMat);
      curveRing.rotation.x = Math.PI / 2;
      curveRing.scale.x = 1 / Math.max(0.38, Math.cos(rad * 0.85));
      planeGroup.add(curveRing);

      apparatus.add(planeGroup);
      group.add(apparatus);
    } else if (mode === 'revolution') {
      // Mode 2: Solid of Revolution (دوران شکل مسطح حول محور خط d — ص ۸۰ تا ۸۲)
      const revGroup = new THREE.Group();

      // Central Axis of Rotation d with top & bottom brass finials
      const axisRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3.5, 20),
        darkFrameMat
      );
      axisRod.position.y = 0.25;
      revGroup.add(axisRod);

      const topFinial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), brassAccentMat);
      topFinial.position.y = 2.0;
      revGroup.add(topFinial);

      // Build 2D Generator Profile Points
      const pts: THREE.Vector2[] = [];
      if (revProfile === 'rectangle') {
        pts.push(
          new THREE.Vector2(0.04, -1.1),
          new THREE.Vector2(1.25, -1.1),
          new THREE.Vector2(1.25, 1.1),
          new THREE.Vector2(0.04, 1.1)
        );
      } else if (revProfile === 'triangle') {
        pts.push(
          new THREE.Vector2(0.04, -1.1),
          new THREE.Vector2(1.4, -1.1),
          new THREE.Vector2(0.04, 1.25)
        );
      } else if (revProfile === 'trapezoid') {
        // Right trapezoid -> Frustum of a cone (مخروط ناقص — فعالیت ص ۸۰)
        pts.push(
          new THREE.Vector2(0.04, -1.1),
          new THREE.Vector2(1.45, -1.1),
          new THREE.Vector2(0.75, 1.1),
          new THREE.Vector2(0.04, 1.1)
        );
      } else {
        // Semicircle -> Sphere
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
          const a = -Math.PI / 2 + (Math.PI * i) / steps;
          pts.push(new THREE.Vector2(Math.max(0.04, Math.cos(a) * 1.25), Math.sin(a) * 1.25));
        }
      }

      const phiLength = THREE.MathUtils.degToRad(sweepDeg);
      const latheGeo = new THREE.LatheGeometry(
        pts,
        Math.max(12, Math.round((segs * sweepDeg) / 360)),
        0,
        phiLength
      );
      const latheMesh = new THREE.Mesh(latheGeo, azureGlassMat);
      latheMesh.castShadow = !isSoft;
      revGroup.add(latheMesh);

      const latheEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(latheGeo, 28),
        new THREE.LineBasicMaterial({ color: 0x0284c7 })
      );
      revGroup.add(latheEdges);

      // Highlight the 2D Generating Profile Slice in Brass
      const shapePts = pts.map((v) => new THREE.Vector3(v.x, v.y, 0));
      shapePts.push(shapePts[0].clone());
      const profileLineGeo = new THREE.BufferGeometry().setFromPoints(shapePts);
      const profileLine = new THREE.Line(
        profileLineGeo,
        new THREE.LineBasicMaterial({ color: 0xd97706 })
      );
      revGroup.add(profileLine);

      group.add(revGroup);
    } else if (mode === 'space-lines') {
      // Mode 3: Lines & Planes in 3D Space — Hinged Double Doors (مسئله دو در دولنگه ص ۸۷) + Skew Lines
      const spaceGroup = new THREE.Group();

      // Architectural Door Frame (چارچوب)
      const leftPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 2.7, 0.14),
        darkFrameMat
      );
      leftPost.position.set(-1.3, -0.05, 0);
      spaceGroup.add(leftPost);

      const rightPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 2.7, 0.14),
        darkFrameMat
      );
      rightPost.position.set(1.3, -0.05, 0);
      spaceGroup.add(rightPost);

      const topLintel = new THREE.Mesh(
        new THREE.BoxGeometry(2.74, 0.14, 0.16),
        darkFrameMat
      );
      topLintel.position.set(0, 1.3, 0);
      spaceGroup.add(topLintel);

      // Door 1 (Plane P1) hinged at leftPost
      const door1Pivot = new THREE.Group();
      door1Pivot.position.set(-1.23, -0.05, 0);
      door1Pivot.rotation.y = THREE.MathUtils.degToRad(door1Angle);

      const door1Panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 2.5, 0.06),
        azureGlassMat
      );
      door1Panel.position.set(0.61, 0, 0);
      door1Pivot.add(door1Panel);

      const door1Handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        brassAccentMat
      );
      door1Handle.position.set(1.08, 0, 0.06);
      door1Pivot.add(door1Handle);
      spaceGroup.add(door1Pivot);

      // Door 2 (Plane P2) hinged at rightPost
      const door2Pivot = new THREE.Group();
      door2Pivot.position.set(1.23, -0.05, 0);
      door2Pivot.rotation.y = -THREE.MathUtils.degToRad(door2Angle);

      const door2Panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 2.5, 0.06),
        emeraldCutMat
      );
      door2Panel.position.set(-0.61, 0, 0);
      door2Pivot.add(door2Panel);

      const door2Handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        brassAccentMat
      );
      door2Handle.position.set(-1.08, 0, 0.06);
      door2Pivot.add(door2Handle);
      spaceGroup.add(door2Pivot);

      // Skew line (خط متنافر با محور لولا)
      if (showSkewLine) {
        const skewCurve = new THREE.LineCurve3(
          new THREE.Vector3(-1.8, -0.9, 1.5),
          new THREE.Vector3(1.8, 1.1, 0.4)
        );
        const skewTube = new THREE.Mesh(
          new THREE.TubeGeometry(skewCurve, 20, 0.035, 12, false),
          brassAccentMat
        );
        spaceGroup.add(skewTube);
      }

      group.add(spaceGroup);
    } else if (mode === 'voxels') {
      // Mode 4: Visual Thinking & Triple Orthographic Projections (درس ۳ فصل ۴ — ص ۹۲ تا ۹۶)
      const voxelGroup = new THREE.Group();
      const cubeSize = 0.72;
      const boxGeo = new THREE.BoxGeometry(cubeSize * 0.96, cubeSize * 0.96, cubeSize * 0.96);
      const voxelMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.3,
        metalness: 0.1,
      });

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const count = voxelGrid[row][col];
          const x = (col - 1) * cubeSize;
          const z = (row - 1) * cubeSize;

          // Base tile marker on pedestal
          const tileMesh = new THREE.Mesh(
            new THREE.BoxGeometry(cubeSize * 0.92, 0.04, cubeSize * 0.92),
            new THREE.MeshStandardMaterial({ color: count > 0 ? 0xbae6fd : 0xe2e8f0 })
          );
          tileMesh.position.set(x, -1.38, z);
          voxelGroup.add(tileMesh);

          for (let hIdx = 0; hIdx < count; hIdx++) {
            const y = -1.0 + hIdx * cubeSize;
            const cube = new THREE.Mesh(boxGeo, voxelMat);
            cube.position.set(x, y, z);
            cube.castShadow = !isSoft;
            cube.receiveShadow = !isSoft;
            voxelGroup.add(cube);

            const edge = new THREE.LineSegments(
              new THREE.EdgesGeometry(boxGeo),
              new THREE.LineBasicMaterial({ color: 0x0f172a })
            );
            edge.position.set(x, y, z);
            voxelGroup.add(edge);
          }
        }
      }

      group.add(voxelGroup);
    }

    requestRenderRef.current?.();
  }, [
    mode,
    solidShape,
    planeAngleDeg,
    planeHeight,
    revProfile,
    sweepDeg,
    door1Angle,
    door2Angle,
    showSkewLine,
    voxelGrid,
  ]);

  const handleCameraPreset = useCallback((preset: 'iso' | 'front' | 'top' | 'left') => {
    setActiveCameraPreset(preset);
    setCameraPresetRef.current?.(preset);
  }, []);

  const cycleVoxelCell = (r: number, c: number) => {
    setVoxelGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = (next[r][c] + 1) % 4;
      return next;
    });
  };

  // Compute live conic section classification when Cone is active
  const conicResult = classifyConicSection(planeAngleDeg, 90 - coneHalfAngleDeg);
  const totalVoxels = voxelGrid.flat().reduce((acc, v) => acc + v, 0);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#F1F5F9] overflow-hidden select-none">
      {/* Full-Viewport 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top-Right Compact Mode Switcher & Textbook Page Reference (Opaque background, no backdrop-filter) */}
      <div className="absolute top-4 right-4 z-10 bg-white border border-[#CBD5E1] rounded-xl shadow-sm p-2 flex items-center gap-1.5 whitespace-nowrap">
        <button
          onClick={() => setMode('cross-section')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === 'cross-section'
              ? 'bg-[#0F172A] text-white'
              : 'text-[#334155] hover:bg-[#F1F5F9]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>مقاطع مخروطی و برش اجسام</span>
        </button>

        <button
          onClick={() => setMode('revolution')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === 'revolution'
              ? 'bg-[#0F172A] text-white'
              : 'text-[#334155] hover:bg-[#F1F5F9]'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>دوران حول محور (ص ۸۰)</span>
        </button>

        <button
          onClick={() => setMode('space-lines')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === 'space-lines'
              ? 'bg-[#0F172A] text-white'
              : 'text-[#334155] hover:bg-[#F1F5F9]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>صفحات و دو در دولنگه (ص ۸۷)</span>
        </button>

        <button
          onClick={() => setMode('voxels')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            mode === 'voxels'
              ? 'bg-[#0F172A] text-white'
              : 'text-[#334155] hover:bg-[#F1F5F9]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>نماهای سه‌گانه (ص ۹۲)</span>
        </button>
      </div>

      {/* Top-Left Live Geometric Telemetry Readout & PDF Link */}
      <div className="absolute top-4 left-4 z-10 bg-white border border-[#CBD5E1] rounded-xl shadow-sm p-3.5 w-72 space-y-2">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
          <span className="text-xs font-bold text-[#0F172A]">فصل ۴: تجسم فضایی</span>
          <button
            onClick={() =>
              onJumpToPdfPage(
                mode === 'cross-section'
                  ? 81
                  : mode === 'revolution'
                  ? 80
                  : mode === 'space-lines'
                  ? 87
                  : 92
              )
            }
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0284C7] hover:underline cursor-pointer"
          >
            <BookOpen className="w-3 h-3" />
            <span>مشاهده در کتاب PDF</span>
          </button>
        </div>

        {mode === 'cross-section' && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#475569]">مقطع حاصل از برش:</span>
              <span className="font-bold text-[#0284C7]">
                {solidShape === 'cone'
                  ? conicResult.typeFa
                  : solidShape === 'sphere'
                  ? 'دایره'
                  : solidShape === 'cylinder'
                  ? planeAngleDeg === 0
                    ? 'دایره'
                    : 'بیضی'
                  : 'چندضلعی مقطعی'}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              {solidShape === 'cone'
                ? conicResult.descriptionFa
                : 'با تغییر زاویه صفحه قاطع (سبز) یا ارتفاع آن، شکل سطح مقطع را در فضا بررسی کنید.'}
            </p>
          </div>
        )}

        {mode === 'revolution' && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#475569]">حجم حاصل از دوران:</span>
              <span className="font-bold text-[#0284C7]">
                {revProfile === 'rectangle'
                  ? 'استوانه'
                  : revProfile === 'triangle'
                  ? 'مخروط'
                  : revProfile === 'trapezoid'
                  ? 'مخروط ناقص'
                  : 'کره'}
              </span>
            </div>
            <div className="flex justify-between font-mono-num">
              <span className="text-[#475569]">زاویه دوران حول محور d:</span>
              <span className="font-bold text-[#D97706]">{sweepDeg}°</span>
            </div>
          </div>
        )}

        {mode === 'space-lines' && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-mono-num">
              <span className="text-[#475569]">زاویه بین دو لنگه در:</span>
              <span className="font-bold text-[#0284C7]">{180 - (door1Angle + door2Angle)}°</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              دو صفحه متقاطع در خط لولا و خط متنافر (طلایی) که در هیچ صفحه‌ای با لولا مشترک نیست.
            </p>
          </div>
        )}

        {mode === 'voxels' && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-mono-num">
              <span className="text-[#475569]">تعداد کل مکعب‌های واحد:</span>
              <span className="font-bold text-[#0284C7]">{totalVoxels} مکعب</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              روی خانه‌های جدول ۳×۳ در پنل پایین کلیک کنید و نماهای روبه‌رو، بالا و چپ را بسنجید.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Bottom Control Dock (Solid White Surface, No Backdrop Blur) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(95vw,56rem)]">
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => setDockOpen((v) => !v)}
            className="px-3.5 py-1 rounded-lg bg-[#0F172A] text-white text-xs font-semibold shadow-sm hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            {dockOpen ? '▾ بستن پنل کنترل' : '▴ نمایش پنل کنترل'}
          </button>
        </div>

        {dockOpen && (
          <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-md p-4">
            {mode === 'cross-section' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Solid Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#0F172A]">
                    انتخاب جسم فضایی:
                  </label>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {(
                      [
                        { id: 'cone', label: 'مخروط' },
                        { id: 'cylinder', label: 'استوانه' },
                        { id: 'cube', label: 'مکعب' },
                        { id: 'prism', label: 'منشور' },
                        { id: 'sphere', label: 'کره' },
                      ] as { id: SolidShape; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSolidShape(item.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          solidShape === item.id
                            ? 'bg-[#0284C7] text-white'
                            : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plane Tilt Angle */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">زاویه صفحه قاطع:</span>
                    <span className="font-mono-num font-bold text-[#0284C7]">{planeAngleDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    value={planeAngleDeg}
                    onChange={(e) => setPlaneAngleDeg(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B]">
                    <button
                      onClick={() => setPlaneAngleDeg(0)}
                      className="hover:text-[#0284C7] cursor-pointer"
                    >
                      افقی (دایره)
                    </button>
                    <button
                      onClick={() => setPlaneAngleDeg(28)}
                      className="hover:text-[#0284C7] cursor-pointer"
                    >
                      مایل (بیضی)
                    </button>
                    <button
                      onClick={() => setPlaneAngleDeg(54)}
                      className="hover:text-[#0284C7] cursor-pointer"
                    >
                      موازی مولد (سهمی)
                    </button>
                    <button
                      onClick={() => setPlaneAngleDeg(78)}
                      className="hover:text-[#0284C7] cursor-pointer"
                    >
                      تند (هذلولی)
                    </button>
                  </div>
                </div>

                {/* Plane Height */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">ارتفاع محل برش:</span>
                    <span className="font-mono-num font-bold text-[#D97706]">
                      {planeHeight.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.9}
                    max={0.9}
                    step={0.05}
                    value={planeHeight}
                    onChange={(e) => setPlaneHeight(Number(e.target.value))}
                    className="w-full accent-[#D97706] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {mode === 'revolution' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#0F172A]">
                    شکل مسطح اولیه (صفحه ۸۰ کتاب):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'trapezoid', label: 'ذوزنقه قائم‌الزاویه ← مخروط ناقص' },
                        { id: 'rectangle', label: 'مستطیل ← استوانه' },
                        { id: 'triangle', label: 'مثلث قائم‌الزاویه ← مخروط' },
                        { id: 'semicircle', label: 'نیم‌دایره ← کره' },
                      ] as { id: RevolutionProfile; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setRevProfile(item.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          revProfile === item.id
                            ? 'bg-[#0284C7] text-white'
                            : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">میزان دوران حول خط d:</span>
                    <span className="font-mono-num font-bold text-[#D97706]">{sweepDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={360}
                    step={5}
                    value={sweepDeg}
                    onChange={(e) => setSweepDeg(Number(e.target.value))}
                    className="w-full accent-[#D97706] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#64748B]">
                    <button onClick={() => setSweepDeg(90)} className="cursor-pointer">
                      ۹۰° (ربع دوران)
                    </button>
                    <button onClick={() => setSweepDeg(180)} className="cursor-pointer">
                      ۱۸۰° (نیم‌دوران)
                    </button>
                    <button onClick={() => setSweepDeg(360)} className="cursor-pointer">
                      ۳۶۰° (دوران کامل)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'space-lines' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">زاویه باز شدن لنگه اول:</span>
                    <span className="font-mono-num font-bold text-[#0284C7]">{door1Angle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={door1Angle}
                    onChange={(e) => setDoor1Angle(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">زاویه باز شدن لنگه دوم:</span>
                    <span className="font-mono-num font-bold text-[#10B981]">{door2Angle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={door2Angle}
                    onChange={(e) => setDoor2Angle(Number(e.target.value))}
                    className="w-full accent-[#10B981] cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setDoor1Angle(30);
                      setDoor2Angle(90);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#0F172A] cursor-pointer"
                  >
                    تنظیم روی حالت ۳۰° و ۹۰° (ص ۸۷)
                  </button>
                  <button
                    onClick={() => setShowSkewLine((s) => !s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      showSkewLine
                        ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {showSkewLine ? 'پنهان کردن خط متنافر طلایی' : 'نمایش خط متنافر در فضا'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'voxels' && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Camera Projection Presets */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-[#0F172A]">
                    مشاهده از زاویه نماهای سه‌گانه (درس ۳):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'iso', label: 'نمای سه‌بعدی آزاد' },
                        { id: 'front', label: 'نمای روبه‌رو' },
                        { id: 'top', label: 'نمای بالا' },
                        { id: 'left', label: 'نمای چپ' },
                      ] as const
                    ).map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => handleCameraPreset(cam.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          activeCameraPreset === cam.id
                            ? 'bg-[#0284C7] text-white'
                            : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{cam.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive 3x3 Voxel Height Matrix */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#475569]">
                    تغییر تعداد طبقات هر ستون:
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-[#F8FAFC] p-1.5 rounded-lg border border-[#E2E8F0]">
                    {voxelGrid.map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => cycleVoxelCell(rIdx, cIdx)}
                          className="w-8 h-8 rounded bg-white border border-[#CBD5E1] hover:border-[#0284C7] font-mono-num text-xs font-bold text-[#0F172A] flex items-center justify-center cursor-pointer"
                          title="کلیک برای تغییر ارتفاع ستون"
                        >
                          {val}
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setVoxelGrid([
                        [3, 2, 1],
                        [2, 1, 0],
                        [1, 1, 1],
                      ])
                    }
                    className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#475569] cursor-pointer"
                    title="بازنشانی چیدمان مکعب‌ها"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
