import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import * as ExpoTHREE from 'expo-three';
import { getTargetRotation, PIP_PATTERNS } from '../game/diceOrientations';
import { useGameStore } from '../store/gameStore';
import { useGameAudio } from '../hooks/useGameAudio';

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Staggered Casino Arc Layout — Expanded vertical clearance for 100% shadow separation
// ─────────────────────────────────────────────────────────────────────────────
// Place all dice in a single horizontal row, centered.
const DICE_POSITIONS: [number, number, number][] = [
  [-2.5, 0.0, 0],
  [-1.5, 0.0, 0],
  [-0.5, 0.0, 0],
  [0.5, 0.0, 0],
  [1.5, 0.0, 0],
  [2.5, 0.0, 0],
];

const DELAYS = [0, 90, 180, 55, 140, 220];

function createDieMesh(materials?: THREE.Material[]): THREE.Group {
  const group = new THREE.Group();

  const SIZE = 0.52;
  const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE, 2, 2, 2);
  // If image materials were provided, use them as the cube face materials.
  // Otherwise fall back to the original warm ivory single material.
  let cube: THREE.Mesh;
  if (materials && materials.length === 6) {
    cube = new THREE.Mesh(geo, materials);
  } else {
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xf0e8d8,
      shininess: 140,
      specular: new THREE.Color(0xb888ff),
      emissive: new THREE.Color(0x200850),
      emissiveIntensity: 0.25,
    });
    cube = new THREE.Mesh(geo, bodyMat);
    // Deep black pips (fallback when textures aren't provided)
    const pipGeo = new THREE.SphereGeometry(0.040, 12, 12);
    const pipMat = new THREE.MeshPhongMaterial({
      color: 0x0a0416,
      shininess: 60,
    });

    const HALF = 0.265;

    const faceConfigs: Array<{
      face: number;
      normal: THREE.Vector3;
      up: THREE.Vector3;
      right: THREE.Vector3;
    }> = [
      { face: 1, normal: new THREE.Vector3(0, 1, 0),  up: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0) },
      { face: 2, normal: new THREE.Vector3(0, 0, 1),  up: new THREE.Vector3(0, 1, 0),  right: new THREE.Vector3(1, 0, 0) },
      { face: 3, normal: new THREE.Vector3(1, 0, 0),  up: new THREE.Vector3(0, 1, 0),  right: new THREE.Vector3(0, 0, -1) },
      { face: 4, normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0),  right: new THREE.Vector3(0, 0, 1) },
      { face: 5, normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0),  right: new THREE.Vector3(-1, 0, 0) },
      { face: 6, normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1),  right: new THREE.Vector3(1, 0, 0) },
    ];

    for (const { face, normal, up, right } of faceConfigs) {
      const pips = PIP_PATTERNS[face] ?? [];
      for (const [u, v] of pips) {
        const pip = new THREE.Mesh(pipGeo, pipMat);
        const pos = normal.clone().multiplyScalar(HALF)
          .add(right.clone().multiplyScalar(u * 0.55))
          .add(up.clone().multiplyScalar(v * 0.55));
        pip.position.copy(pos);
        group.add(pip);
      }
    }
  }
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);
  // When using image faces we intentionally skip the pip geometry
  // (the image already contains the face artwork). Otherwise the
  // original pip rendering is left out in this branch.

  return group;
}

function createShadowDisc(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.22, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const DiceGrid: React.FC = () => {
  const { diceResults, gameState, phase, rollCount, setGameState } = useGameStore();
  const { playLand } = useGameAudio();

  const playLandRef = useRef(playLand);
  playLandRef.current = playLand;

  const mountedRef = useRef(true);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const faceMaterialsRef = useRef<THREE.Material[] | null>(null);
  const diceGroupsRef = useRef<THREE.Group[]>([]);
  const shadowDiscsRef = useRef<THREE.Mesh[]>([]);
  // kept for legacy collect-path compatibility; planes aren't used by default
  const settledPlaneRefs = useRef<Array<THREE.Mesh | null>>(Array.from({ length: 6 }, () => null));
  // no flat planes: keep dice as 3D cubes for realism
  const handPosRef = useRef<[number, number, number]>([-2.0, -0.9, 0.6]);

  const diceResultsRef = useRef(diceResults);
  diceResultsRef.current = diceResults;

  const animStatesRef = useRef<Array<{
    targetRot: [number, number, number];
    spinRot: [number, number, number];
    startTime: number;
    duration: number;
    phase: 'idle' | 'wait' | 'spin' | 'done';
  }>>(
    Array.from({ length: 6 }, () => ({
      targetRot: [0, 0, 0],
      spinRot: [0, 0, 0],
      startTime: 0,
      duration: 1500,
      phase: 'idle',
    }))
  );
  // We'll augment anim states to include launch positions and scales
  type AnimState = {
    targetRot: [number, number, number];
    spinRot: [number, number, number];
    startTime: number;
    duration: number;
    phase: 'idle' | 'launch' | 'wait' | 'spin' | 'settling' | 'collect' | 'done';
    startPos?: [number, number, number];
    targetPos?: [number, number, number];
    startScale?: number;
    targetScale?: number;
    // settling quaternion animation
    settleStart?: number;
    settleDuration?: number;
    settleFrom?: THREE.Quaternion;
    settleTo?: THREE.Quaternion;
  };
  const animStatesRef2 = useRef<Array<AnimState>>(
    Array.from({ length: 6 }, () => ({
      targetRot: [0, 0, 0],
      spinRot: [0, 0, 0],
      startTime: 0,
      duration: 1500,
      phase: 'idle',
      startPos: undefined,
      targetPos: undefined,
      startScale: 1,
      targetScale: 1,
    }))
  );

  const rafRef = useRef<number | null>(null);
  const landedCountRef = useRef(0);
  const collectTimeoutRef = useRef<number | null>(null);
  const isRolling = gameState === 'rolling' || phase === 'rolling';

  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    const canvasMock = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      clientHeight: gl.drawingBufferHeight,
      clientWidth: gl.drawingBufferWidth,
    } as unknown as HTMLCanvasElement;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasMock,
      context: gl as unknown as WebGLRenderingContext,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Ensure correct color encoding for textures
    try { (renderer as any).outputEncoding = (THREE as any).sRGBEncoding ?? (THREE as any).SRGBColorSpace; } catch {}
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const frustumSize = 2.4;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100,
    );
    camera.position.set(0, 3.2, 4.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Compute dealer hand spawn position in world space from normalized image UVs.
    // These UVs were estimated from the background image. Lower V moves the spawn higher.
    const HAND_U = 0.48; // 0..1 left->right
    const HAND_V = 0.00; // 0..1 top->bottom (reduced to move spawn point higher)
    const frustumWidth = frustumSize * aspect;
    const handX = (HAND_U - 0.5) * frustumWidth;
    const handY = (0.5 - HAND_V) * frustumSize;
    const handZ = 0.6;
    handPosRef.current = [handX, handY, handZ];

    const keyLight = new THREE.DirectionalLight(0xfff8e8, 3.0);
    keyLight.position.set(0, 8, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-4, 3, 3);
    scene.add(fillLight);

    const rimLeft = new THREE.PointLight(0x9333ea, 2.8, 8);
    rimLeft.position.set(-3.5, 1.5, 3);
    scene.add(rimLeft);

    const rimRight = new THREE.PointLight(0x7c3aed, 2.2, 8);
    rimRight.position.set(3.5, 1.5, 3);
    scene.add(rimRight);

    const ambient = new THREE.AmbientLight(0x3d1a7a, 0.8);
    scene.add(ambient);

    // Preload dice face images from the app assets and create
    // an array of materials for the six cube faces.
    diceGroupsRef.current = [];
    shadowDiscsRef.current = [];
    const FACE_MODULES = [
      require('../../assets/dice-faces/bat.jpeg'),
      require('../../assets/dice-faces/dimond.jpeg'),
      require('../../assets/dice-faces/heart.jpeg'),
      require('../../assets/dice-faces/leaf.jpeg'),
      require('../../assets/dice-faces/tree.jpeg'),
      require('../../assets/dice-faces/WhatsApp Image 2026-09-05 at 12.09.12.jpeg'),
    ];

    const loadTextures = async () => {
      try {
        const assets = await Promise.all(FACE_MODULES.map(m => Asset.fromModule(m).downloadAsync()));
        const uris = assets.map(a => (a.localUri ?? a.uri) as string);
        // Use expo-three's loader when available for better Expo compatibility.
        // rotation applied per BoxGeometry material index so images appear upright
        // Per-box-face texture rotation so each image appears upright.
        // Order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
        const rotationForIndex = [
          Math.PI,      // +X (right) — bat upright (180°)
          0,             // -X (left) — diamond upright
          Math.PI,      // +Y (top) — flip heart upright
          Math.PI,      // -Y (bottom)
          Math.PI,      // +Z (front) — flip tree upright
          Math.PI,      // -Z (back)
        ];

        try {
          const textures: THREE.Texture[] = [];
          for (const uri of uris) {
            try {
              // expo-three provides helpers that internally handle asset URIs on Expo runtimes
              const tex = await (ExpoTHREE as any).loadAsync(uri, undefined, { renderer: rendererRef.current });
              if (tex) textures.push(tex as THREE.Texture);
              else {
                // fallback to TextureLoader if loadAsync returned nothing
                const tex2 = await new Promise<THREE.Texture>((res) => new THREE.TextureLoader().load(uri, t => res(t), undefined, () => res(new THREE.Texture())));
                textures.push(tex2);
              }
            } catch (e) {
              // per-texture fallback
              const tex2 = await new Promise<THREE.Texture>((res) => new THREE.TextureLoader().load(uri, t => res(t), undefined, () => res(new THREE.Texture())));
              textures.push(tex2);
            }
          }
          const mats = textures.map((t, i) => {
            try { (t as any).encoding = (THREE as any).sRGBEncoding ?? (THREE as any).SRGBColorSpace; } catch {}
            // rotate texture so it appears upright on each cube face
            try {
              t.center.set(0.5, 0.5);
              t.rotation = rotationForIndex[i] ?? 0;
              t.flipY = false;
            } catch (e) {}
            t.needsUpdate = true;
            return new THREE.MeshPhongMaterial({ map: t, shininess: 40, side: THREE.FrontSide });
          });
          faceMaterialsRef.current = mats;
          return mats;
        } catch (e) {
          // final fallback to basic loader
          const loader = new THREE.TextureLoader();
          const promises = uris.map(uri => new Promise<THREE.Texture>((res) => loader.load(uri, tex => res(tex), undefined, () => res(new THREE.Texture()))));
          const textures = await Promise.all(promises);
          const mats = textures.map((t, i) => { try { (t as any).encoding = (THREE as any).sRGBEncoding ?? (THREE as any).SRGBColorSpace; } catch {} try { t.center.set(0.5, 0.5); t.rotation = rotationForIndex[i] ?? 0; t.flipY = false; } catch {} t.needsUpdate = true; return new THREE.MeshPhongMaterial({ map: t, shininess: 40, side: THREE.FrontSide }); });
          faceMaterialsRef.current = mats;
          return mats;
        }
      } catch (e) {
        // If any error occurs, fall back to undefined and use default body material.
        return undefined as unknown as THREE.Material[] | undefined;
      }
    };

    const initScene = (faceMaterials?: THREE.Material[]) => {
      DICE_POSITIONS.forEach((pos, idx) => {
        const shadow = createShadowDisc();
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(pos[0], pos[1] - 0.27, pos[2] - 0.05);
        scene.add(shadow);
        shadowDiscsRef.current.push(shadow);

        const die = createDieMesh(faceMaterials);
      // Initially hide dice at the computed hand spawn zone and small scale
      const INIT_HAND_POS = handPosRef.current;
      die.position.set(INIT_HAND_POS[0], INIT_HAND_POS[1], INIT_HAND_POS[2]);
        die.scale.setScalar(0.28);
        die.visible = false;
        const initialVal = diceResultsRef.current[idx]?.value ?? (idx + 1);
        const [rx, ry, rz] = getTargetRotation(initialVal);
        die.rotation.set(rx, ry, rz);
        scene.add(die);
        diceGroupsRef.current.push(die);
      });

      const render = () => {
        if (!mountedRef.current) return;
        rafRef.current = requestAnimationFrame(render);
        const now = performance.now();

        diceGroupsRef.current.forEach((die, idx) => {
          const a = animStatesRef2.current[idx];
          const basePos = DICE_POSITIONS[idx];
          const shadow = shadowDiscsRef.current[idx];

          if (a.phase === 'wait') {
            if (now >= a.startTime) a.phase = 'spin';
          } else if (a.phase === 'launch') {
            const elapsed = now - a.startTime;
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);
            if (a.startPos && a.targetPos) {
              const sx = a.startPos[0] * (1 - eased) + a.targetPos[0] * eased;
              const sy = a.startPos[1] * (1 - eased) + a.targetPos[1] * eased;
              const sz = a.startPos[2] * (1 - eased) + a.targetPos[2] * eased;
              die.position.set(sx, sy, sz);
            }
            const sc = (a.startScale ?? 0.3) * (1 - eased) + (a.targetScale ?? 1.0) * eased;
            die.scale.setScalar(sc);
            // small toss rotation while launching
            die.rotation.x += 0.08;
            die.rotation.y += 0.12;
            if (t >= 1) {
              // switch to spin phase
              a.phase = 'spin';
              // set new startTime for spin
              a.startTime = now;
              a.duration = 1400 + ((Math.floor((a.spinRot[0] + a.spinRot[1] + a.spinRot[2]) * 37) % 5) * 60);
            }
          } else if ((a.phase as any) === 'spin' || (a.phase as any) === 'settling') {
            const elapsed = now - a.startTime;
            const t = Math.min(elapsed / a.duration, 1);
            const eased = easeInOut(t);

            const [tx, ty, tz] = a.targetRot;
            const [sx, sy, sz] = a.spinRot;

            die.rotation.x = sx * (1 - eased) + tx * eased;
            die.rotation.y = sy * (1 - eased) + ty * eased;
            die.rotation.z = sz * (1 - eased) + tz * eased;

            const airFactor = Math.max(0, 1 - t * 1.6);
            const arcY = Math.sin(airFactor * Math.PI) * 0.55;
            die.position.set(basePos[0], basePos[1] + arcY, basePos[2]);

            if (shadow) {
              const sc = 0.4 + 0.6 * (1 - airFactor);
              shadow.scale.setScalar(sc);
            }

            if (t >= 1) {
              if (a.phase === 'spin') {
                // finished spinning, now smoothly orient the cube so the numeric face is readable
                a.phase = 'settling';
                a.settleStart = now;
                a.settleDuration = 400;
                a.settleFrom = die.quaternion.clone();
                const val = diceResultsRef.current[idx]?.value ?? (idx + 1);
                const faceEuler = new THREE.Euler(...getTargetRotation(val));
                const qFace = new THREE.Quaternion().setFromEuler(faceEuler);
                const camPos = cameraRef.current?.position ?? new THREE.Vector3(0, 0, 1);
                const dir = new THREE.Vector3().subVectors(camPos, die.position).normalize();
                const qZtoCam = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                const desiredQuat = qZtoCam.multiply(qFace);
                a.settleTo = desiredQuat;
              } else if (a.phase === 'settling') {
                // finish settling
                a.phase = 'done';
                die.quaternion.copy(a.settleTo as THREE.Quaternion);
                die.position.set(basePos[0], basePos[1], basePos[2]);
                die.scale.setScalar(1);
                if (shadow) shadow.scale.setScalar(1);

                // Replace visible cube with a camera-facing textured plane so only the top face is shown
                try {
                  const val = diceResultsRef.current[idx]?.value ?? (idx + 1);
                  // mapping of face number -> BoxGeometry material index (+X, -X, +Y, -Y, +Z, -Z)
                  const FACE_TO_MAT_INDEX: Record<number, number> = { 1: 4, 2: 2, 3: 0, 4: 1, 5: 3, 6: 5 };
                  const matIndex = FACE_TO_MAT_INDEX[val] ?? 4;
                  const faceMats = faceMaterialsRef.current;
                  let plane: THREE.Mesh | null = null;
                  if (faceMats && faceMats[matIndex]) {
                    const srcMat = faceMats[matIndex] as THREE.MeshPhongMaterial & { map?: THREE.Texture };
                    const map = srcMat.map ?? null;
                    const pMat = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide });
                    const planeGeo = new THREE.PlaneGeometry(0.52, 0.52);
                    plane = new THREE.Mesh(planeGeo, pMat);
                    // face plane to camera so it's perfectly readable
                    if (cameraRef.current) plane.quaternion.copy(cameraRef.current.quaternion);
                    plane.position.copy(die.position);
                    plane.scale.setScalar(1);
                    plane.renderOrder = 10;
                    sceneRef.current?.add(plane);
                    settledPlaneRefs.current[idx] = plane;
                    // hide the cube so only plane is visible
                    die.visible = false;
                  }
                } catch (e) {}

                landedCountRef.current += 1;
                if (landedCountRef.current >= 6) {
                  setGameState('done');
                  playLandRef.current();
                  if (collectTimeoutRef.current) clearTimeout(collectTimeoutRef.current as any);
                  collectTimeoutRef.current = setTimeout(() => {
                    const now2 = performance.now();
                    const HAND = handPosRef.current;
                    diceGroupsRef.current.forEach((d, i) => {
                      const base = DICE_POSITIONS[i];
                      // if we created a flat settled plane, remove it now and restore the 3D cube
                      const plane = settledPlaneRefs.current[i];
                      if (plane) {
                        try { sceneRef.current?.remove(plane); } catch {}
                        try { (plane.geometry as any).dispose(); } catch {}
                        try { (plane.material as any).dispose(); } catch {}
                        settledPlaneRefs.current[i] = null;
                        const dieMesh = diceGroupsRef.current[i];
                        if (dieMesh) {
                          dieMesh.visible = true;
                          dieMesh.position.set(base[0], base[1], base[2]);
                          dieMesh.scale.setScalar(1);
                        }
                      }

                      animStatesRef2.current[i] = {
                        targetRot: [0, 0, 0],
                        spinRot: [0, 0, 0],
                        startTime: now2 + i * 60,
                        duration: 600 + i * 60,
                        phase: 'collect',
                        startPos: [base[0], base[1], base[2]],
                        targetPos: HAND,
                        startScale: 1,
                        targetScale: 0.28,
                      };
                    });
                  }, 10000) as unknown as number;
                }
              }
            }
          }
          else if (a.phase === 'collect') {
            const elapsed = now - a.startTime;
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);
            const plane = settledPlaneRefs.current[idx];
            if (plane && a.startPos && a.targetPos) {
              const sx = a.startPos[0] * (1 - eased) + a.targetPos[0] * eased;
              const sy = a.startPos[1] * (1 - eased) + a.targetPos[1] * eased;
              const sz = a.startPos[2] * (1 - eased) + a.targetPos[2] * eased;
              plane.position.set(sx, sy, sz);
              const sc = (a.startScale ?? 1) * (1 - eased) + (a.targetScale ?? 0.28) * eased;
              plane.scale.setScalar(sc);
              plane.rotation.x += 0.06;
              plane.rotation.y += 0.08;
              if (t >= 1) {
                // remove plane
                try { sceneRef.current?.remove(plane); } catch {}
                try { (plane.geometry as any).dispose(); } catch {}
                try { (plane.material as any).dispose(); } catch {}
                settledPlaneRefs.current[idx] = null;
                a.phase = 'idle';
              }
            } else if (a.startPos && a.targetPos) {
              // fallback to animating the cube if no plane
              const sx = a.startPos[0] * (1 - eased) + a.targetPos[0] * eased;
              const sy = a.startPos[1] * (1 - eased) + a.targetPos[1] * eased;
              const sz = a.startPos[2] * (1 - eased) + a.targetPos[2] * eased;
              die.position.set(sx, sy, sz);
              const sc = (a.startScale ?? 1) * (1 - eased) + (a.targetScale ?? 0.28) * eased;
              die.scale.setScalar(sc);
              die.rotation.x += 0.06;
              die.rotation.y += 0.08;
              if (t >= 1) {
                die.visible = false;
                a.phase = 'idle';
              }
            }
          }
        });

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          gl.endFrameEXP();
        }
      };

      render();
    };

    loadTextures().then(initScene).catch(() => initScene(undefined));
  }, [setGameState]);

  useEffect(() => {
    if (!isRolling) return;
    landedCountRef.current = 0;
    const now = performance.now();

    // Hand/throw spawn position in world coordinates (computed from background UV)
    const HAND_POS = handPosRef.current;

    diceResults.forEach((d, idx) => {
      const delay = DELAYS[idx] ?? 0;
      const targetRot = getTargetRotation(d.value);
      const rng = rollCount * 17 + idx * 31;

      const extraX = (Math.floor(rng * 3.7) % 3 + 2) * Math.PI * 2;
      const extraY = (Math.floor(rng * 2.3) % 3 + 2) * Math.PI * 2;
      const extraZ = (Math.floor(rng * 1.9) % 2 + 1) * Math.PI * 2;

      const basePos = DICE_POSITIONS[idx];

      // launchDuration: how long it takes to travel from hand to mid-air
      const launchDuration = 500 + (idx * 40);

      animStatesRef2.current[idx] = {
        targetRot,
        spinRot: [
          targetRot[0] + extraX,
          targetRot[1] + extraY,
          targetRot[2] + extraZ,
        ],
        // first phase: launch (hand -> arc position)
        startTime: now + delay,
        duration: launchDuration,
        phase: 'launch',
        startPos: HAND_POS,
        // we land slightly above final base position while spinning, then settle
        targetPos: [basePos[0], basePos[1] + 0.6, basePos[2]],
        startScale: 0.28,
        targetScale: 1.0,
      };
      // make die visible and set initial hand position/scale immediately
      const die = diceGroupsRef.current[idx];
      if (die) {
        die.visible = true;
        die.position.set(HAND_POS[0], HAND_POS[1], HAND_POS[2]);
        die.scale.setScalar(0.28);
      }
    });
  }, [isRolling, rollCount, diceResults]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (collectTimeoutRef.current) clearTimeout(collectTimeoutRef.current as any);
      // dispose cached face materials and textures
      try {
        const mats = faceMaterialsRef.current;
        if (mats) {
          mats.forEach((m) => {
            const mat = m as THREE.Material & { map?: THREE.Texture };
            if (mat.map) {
              try { mat.map.dispose(); } catch {}
            }
            try { mat.dispose(); } catch {}
          });
        }
      } catch (e) {}
      rendererRef.current?.dispose();
    };
  }, []);

  return (
    <View style={styles.container}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default DiceGrid;
