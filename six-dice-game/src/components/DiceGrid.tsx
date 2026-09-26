import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import * as ExpoTHREE from 'expo-three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { getTargetRotation } from '../game/diceOrientations';
import { useGameStore } from '../store/gameStore';
import { useGameAudio } from '../hooks/useGameAudio';

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 Dice Table Layout: Centered horizontal layout
// ─────────────────────────────────────────────────────────────────────────────
const DICE_POSITIONS: [number, number, number][] = [
  [-2.25, 0.0, 0],
  [-1.35, 0.0, 0],
  [-0.45, 0.0, 0],
  [0.45, 0.0, 0],
  [1.35, 0.0, 0],
  [2.25, 0.0, 0],
];

const DELAYS = [0, 80, 160, 50, 130, 210];

function createDieMesh(textures?: THREE.Texture[]): THREE.Group {
  const group = new THREE.Group();
  const SIZE = 0.58;
  const CORNER_RADIUS = 0.075; // Modern rounded casino dice corner radius
  const SEGMENTS = 4; // Smooth rounded bevel curvature

  // 1. Sleek, high-gloss modern ivory-white dice body with smooth rounded corners
  const geo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, SEGMENTS, CORNER_RADIUS);
  geo.computeVertexNormals();

  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x0a0c1a, // Subtle depth tone so faces never look dull
    specular: new THREE.Color(0xffffff),
    shininess: 130, // Modern glossy acrylic finish on rounded edges
  });
  const cube = new THREE.Mesh(geo, bodyMat);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);

  // 2. High-contrast, crystal-clear face decals
  if (textures && textures.length === 6) {
    // Sized to fit prominent and flat within the rounded face boundary
    const DECAL_SIZE = SIZE * 0.78;
    const decalGeo = new THREE.PlaneGeometry(DECAL_SIZE, DECAL_SIZE);
    const OFFSET = SIZE / 2 + 0.003; // Just proud of surface to ensure zero z-fighting

    const faceConfigs = [
      // Face 1: +Z (Front) - Bat
      { pos: [0, 0, OFFSET], rot: [0, 0, 0], tex: textures[0] },
      // Face 2: +Y (Top) - Diamond
      { pos: [0, OFFSET, 0], rot: [-Math.PI / 2, 0, 0], tex: textures[1] },
      // Face 3: +X (Right) - Heart
      { pos: [OFFSET, 0, 0], rot: [0, Math.PI / 2, 0], tex: textures[2] },
      // Face 4: -X (Left) - Leaf
      { pos: [-OFFSET, 0, 0], rot: [0, -Math.PI / 2, 0], tex: textures[3] },
      // Face 5: -Y (Bottom) - Tree
      { pos: [0, -OFFSET, 0], rot: [Math.PI / 2, 0, 0], tex: textures[4] },
      // Face 6: -Z (Back) - Crown
      { pos: [0, 0, -OFFSET], rot: [0, Math.PI, 0], tex: textures[5] },
    ];

    faceConfigs.forEach((cfg) => {
      const decalMat = new THREE.MeshBasicMaterial({
        map: cfg.tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const decal = new THREE.Mesh(decalGeo, decalMat);
      decal.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      decal.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      group.add(decal);
    });
  }

  return group;
}

function createShadowDisc(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.32, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Quintic smootherstep for buttery smooth zero-jerk convergence
function smootherstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

const DiceGrid: React.FC = () => {
  const { diceResults, serverPhase, rollCount, rollTimeSeconds, onDiceLanded } = useGameStore();
  const { playLand, playRoll } = useGameAudio();

  const playLandRef = useRef(playLand);
  playLandRef.current = playLand;
  const playRollRef = useRef(playRoll);
  playRollRef.current = playRoll;
  const onDiceLandedRef = useRef(onDiceLanded);
  onDiceLandedRef.current = onDiceLanded;

  const mountedRef = useRef(true);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const faceTexturesRef = useRef<THREE.Texture[] | null>(null);
  const diceGroupsRef = useRef<THREE.Group[]>([]);
  const shadowDiscsRef = useRef<THREE.Mesh[]>([]);

  // Dealer Hand Spawn Position in world coordinates (top center)
  const handPosRef = useRef<[number, number, number]>([0.0, 1.3, 0.4]);

  const diceResultsRef = useRef(diceResults);
  diceResultsRef.current = diceResults;
  const rollTimeSecRef = useRef(rollTimeSeconds);
  rollTimeSecRef.current = rollTimeSeconds;
  const serverPhaseRef = useRef(serverPhase);
  serverPhaseRef.current = serverPhase;

  type AnimState = {
    targetRot: [number, number, number];
    spinRot: [number, number, number];
    startTime: number;
    duration: number;
    phase: 'idle' | 'launch' | 'rolling' | 'settling' | 'collect' | 'done';
    totalRollDuration: number;
    launchDuration: number;
    rollDuration: number;
    settleDuration: number;
    // Dynamic physics / wandering parameters:
    scatterTarget: [number, number, number];
    wanderFreqX: number;
    wanderFreqZ: number;
    wanderAmpX: number;
    wanderAmpZ: number;
    phaseX: number;
    phaseZ: number;
    bounceFreq: number;
    bounceAmp: number;
    bouncePhase: number;
  };

  const animStatesRef = useRef<Array<AnimState>>(
    Array.from({ length: 6 }, () => ({
      targetRot: [0, 0, 0],
      spinRot: [0, 0, 0],
      startTime: 0,
      duration: 1400,
      phase: 'idle',
      totalRollDuration: 8000,
      launchDuration: 850,
      rollDuration: 6400,
      settleDuration: 750,
      scatterTarget: [0, 0, 0],
      wanderFreqX: 1,
      wanderFreqZ: 1,
      wanderAmpX: 0.4,
      wanderAmpZ: 0.1,
      phaseX: 0,
      phaseZ: 0,
      bounceFreq: 5,
      bounceAmp: 0.55,
      bouncePhase: 0,
    }))
  );

  const rafRef = useRef<number | null>(null);
  const landedCountRef = useRef(0);
  const prevServerPhaseRef = useRef(serverPhase);
  const prevRollCountRef = useRef(rollCount);

  // Modular roll initiator with randomized scatter & trajectory generation
  const startRollAnimation = useCallback((results: typeof diceResults, totalDurationMs?: number) => {
    landedCountRef.current = 0;
    playRollRef.current();

    const HAND_POS = handPosRef.current;
    const now = performance.now();
    const totalRollMs = Math.max(3000, totalDurationMs || (rollTimeSecRef.current || 8) * 1000);
    const launchDuration = Math.min(850, Math.floor(totalRollMs * 0.12));
    const settleDuration = Math.min(750, Math.floor(totalRollMs * 0.10));
    const rollDuration = totalRollMs - launchDuration - settleDuration;

    results.forEach((d, idx) => {
      const delay = DELAYS[idx] ?? 0;
      const targetRot = getTargetRotation(d.value);
      const spinCount = Math.max(8, Math.floor(rollDuration / 380));

      const extraX = (spinCount + (idx % 3) + 3) * Math.PI * 2;
      const extraY = (spinCount + ((idx * 2) % 4) + 2) * Math.PI * 2;
      const extraZ = (Math.floor(spinCount / 2) + ((idx + 1) % 3) + 1) * Math.PI * 2;

      // Unique scatter target on the table felt when thrown
      const scatterSpreadX = (idx - 2.5) * 0.72 + (Math.random() - 0.5) * 0.45;
      const clampedScatterX = Math.max(-2.15, Math.min(2.15, scatterSpreadX));
      const scatterY = (Math.random() - 0.5) * 0.20;
      const scatterZ = (Math.random() - 0.5) * 0.18;
      const scatterTarget: [number, number, number] = [clampedScatterX, scatterY, scatterZ];

      animStatesRef.current[idx] = {
        targetRot,
        spinRot: [targetRot[0] + extraX, targetRot[1] + extraY, targetRot[2] + extraZ],
        startTime: now + delay,
        duration: launchDuration,
        phase: 'launch',
        totalRollDuration: totalRollMs,
        launchDuration,
        rollDuration: Math.max(1500, rollDuration - delay),
        settleDuration,
        scatterTarget,
        wanderFreqX: 1.1 + Math.random() * 0.8,
        wanderFreqZ: 0.9 + Math.random() * 0.8,
        wanderAmpX: 0.35 + Math.random() * 0.25,
        wanderAmpZ: 0.10 + Math.random() * 0.08,
        phaseX: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        bounceFreq: Math.max(4, Math.floor(rollDuration / 950)) + Math.random() * 0.5,
        bounceAmp: 0.50 + Math.random() * 0.20,
        bouncePhase: Math.random() * 0.6,
      };

      const die = diceGroupsRef.current[idx];
      if (die) {
        die.visible = delay === 0;
        die.position.set(HAND_POS[0], HAND_POS[1], HAND_POS[2]);
        die.scale.setScalar(0.3);
      }
      const shadow = shadowDiscsRef.current[idx];
      if (shadow) {
        shadow.visible = false;
      }
    });
  }, []);

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
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const frustumSize = 2.3;
    // Front-on camera alignment: user sees 100% only the result settled face directly
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Balanced studio lighting for modern glossy dice with crystal clear face visibility
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(2, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 1.4);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    // Modern rim light that glints across the rounded corner edges as dice roll
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(0, -4, 4);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    // Preload consistent PNG dice face textures
    const FACE_PNG_MODULES = [
      require('../../assets/dice-faces/png/bat.png'),
      require('../../assets/dice-faces/png/dimond.png'),
      require('../../assets/dice-faces/png/heart.png'),
      require('../../assets/dice-faces/png/leaf.png'),
      require('../../assets/dice-faces/png/tree.png'),
      require('../../assets/dice-faces/png/WhatsApp Image 2026-09-05 at 12.09.12.png'),
    ];

    const loadTextures = async () => {
      try {
        const assets = await Promise.all(FACE_PNG_MODULES.map((m) => Asset.fromModule(m).downloadAsync()));
        const uris = assets.map((a) => (a.localUri ?? a.uri) as string);
        const textures: THREE.Texture[] = [];

        for (const uri of uris) {
          try {
            const tex = await (ExpoTHREE as any).loadAsync(uri, undefined, { renderer: rendererRef.current });
            if (tex) {
              tex.generateMipmaps = true;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              if ((THREE as any).SRGBColorSpace) {
                tex.colorSpace = (THREE as any).SRGBColorSpace;
              }
              textures.push(tex as THREE.Texture);
            }
          } catch {
            const tex = new THREE.Texture();
            textures.push(tex);
          }
        }

        faceTexturesRef.current = textures;
        return textures;
      } catch (e) {
        return undefined;
      }
    };

    const initScene = (textures?: THREE.Texture[]) => {
      diceGroupsRef.current = [];
      shadowDiscsRef.current = [];
      const currentPhase = serverPhaseRef.current;

      DICE_POSITIONS.forEach((pos, idx) => {
        const shadow = createShadowDisc();
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(pos[0], pos[1] - 0.35, pos[2] - 0.05);
        shadow.visible = currentPhase === 'SETTLED';
        scene.add(shadow);
        shadowDiscsRef.current.push(shadow);

        const die = createDieMesh(textures);
        const HAND_POS = handPosRef.current;
        if (currentPhase === 'SETTLED') {
          die.position.set(pos[0], pos[1], pos[2]);
          die.scale.setScalar(1.0);
          die.visible = true;
          animStatesRef.current[idx].phase = 'done';
        } else {
          die.position.set(HAND_POS[0], HAND_POS[1], HAND_POS[2]);
          die.scale.setScalar(0.3);
          die.visible = false;
        }

        const initialVal = diceResultsRef.current[idx]?.value ?? (idx + 1);
        const [rx, ry, rz] = getTargetRotation(initialVal);
        die.rotation.set(rx, ry, rz);

        scene.add(die);
        diceGroupsRef.current.push(die);
      });

      if (currentPhase === 'ROLLING') {
        startRollAnimation(diceResultsRef.current);
      }

      // Continuous Render Loop
      const render = () => {
        if (!mountedRef.current) return;
        rafRef.current = requestAnimationFrame(render);
        const now = performance.now();
        const HAND_POS = handPosRef.current;

        diceGroupsRef.current.forEach((die, idx) => {
          const a = animStatesRef.current[idx];
          const basePos = DICE_POSITIONS[idx];
          const shadow = shadowDiscsRef.current[idx];

          if (a.phase === 'launch') {
            const elapsed = now - a.startTime;
            if (elapsed < 0) {
              // Wait for individual staggered toss delay
              die.visible = false;
              if (shadow) shadow.visible = false;
              return;
            }
            die.visible = true;

            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);

            // Parabolic toss arc from dealer's hand to randomized scatter destination
            const tossArc = Math.sin(t * Math.PI) * 0.65;
            const curX = HAND_POS[0] * (1 - eased) + a.scatterTarget[0] * eased;
            const curY = HAND_POS[1] * (1 - eased) + a.scatterTarget[1] * eased + tossArc;
            const curZ = HAND_POS[2] * (1 - eased) + a.scatterTarget[2] * eased;
            die.position.set(curX, curY, curZ);

            const scale = 0.3 * (1 - eased) + 1.0 * eased;
            die.scale.setScalar(scale);

            die.rotation.x += 0.20;
            die.rotation.y += 0.24;
            die.rotation.z += 0.10;

            if (shadow) {
              shadow.visible = true;
              shadow.position.set(curX, -0.35, curZ - 0.05);
              const shadowScale = eased * (1.0 - tossArc * 0.35);
              shadow.scale.setScalar(Math.max(0.2, shadowScale));
              (shadow.material as THREE.MeshBasicMaterial).opacity = 0.38 * eased;
            }

            if (t >= 1) {
              a.phase = 'rolling';
              a.startTime = now;
              a.duration = a.rollDuration;
            }
          } else if (a.phase === 'rolling') {
            const elapsed = now - a.startTime;
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);

            // 1. Organic rolling movement wandering across the table felt
            const wTime = elapsed * 0.003;
            const wanderX = Math.sin(wTime * a.wanderFreqX + a.phaseX) * a.wanderAmpX
                          + Math.cos(wTime * a.wanderFreqX * 0.55 + a.phaseX) * (a.wanderAmpX * 0.45);
            const wanderZ = Math.sin(wTime * a.wanderFreqZ + a.phaseZ) * a.wanderAmpZ;

            const freeX = Math.max(-2.3, Math.min(2.3, a.scatterTarget[0] + wanderX));
            const freeZ = Math.max(-0.25, Math.min(0.25, a.scatterTarget[2] + wanderZ));

            // 2. Realistic tumbling bouncing with progressive energy decay
            const energy = Math.max(0.08, (1 - t * 0.78));
            const bounceFactor = Math.abs(Math.sin(t * Math.PI * a.bounceFreq + a.bouncePhase)) * energy;
            const bounceY = bounceFactor * a.bounceAmp;

            // 3. Smooth Convergence to designated position as roll is about to complete:
            // At 62% of rolling time, the die begins smoothly steering into its final basePos slot!
            const convergenceStart = 0.62;
            let blend = 0;
            if (t > convergenceStart) {
              const u = (t - convergenceStart) / (1.0 - convergenceStart);
              // Quintic smootherstep produces seamless zero-jerk arrival at basePos
              blend = smootherstep(u);
            }

            const curX = freeX * (1 - blend) + basePos[0] * blend;
            const curZ = freeZ * (1 - blend) + basePos[2] * blend;
            const tableSurfaceY = a.scatterTarget[1] * (1 - blend) + basePos[1] * blend;
            // Micro-hops diminish as die settles into its position
            const curY = tableSurfaceY + bounceY * (1 - blend * 0.72);

            die.position.set(curX, curY, curZ);

            // 4. Real-time dynamic drop shadow tracking under the moving die
            if (shadow) {
              shadow.visible = true;
              shadow.position.set(curX, -0.35, curZ - 0.05);
              const heightAboveFloor = Math.max(0, curY);
              const shadowScale = Math.max(0.55, 1.0 - heightAboveFloor * 0.40);
              shadow.scale.setScalar(shadowScale);
              (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.16, 0.38 - heightAboveFloor * 0.18);
            }

            // 5. 3D Rotation tumbling and deceleration into target face
            const [tx, ty, tz] = a.targetRot;
            const [sx, sy, sz] = a.spinRot;

            let rotProgress: number;
            if (t <= convergenceStart) {
              rotProgress = (t / convergenceStart) * 0.68;
            } else {
              const u = (t - convergenceStart) / (1.0 - convergenceStart);
              // Cubic ease-out deceleration into target rotation
              const easeOutCubic = 1 - Math.pow(1 - u, 3);
              rotProgress = 0.68 + 0.32 * easeOutCubic;
            }

            die.rotation.x = sx * (1 - rotProgress) + tx * rotProgress;
            die.rotation.y = sy * (1 - rotProgress) + ty * rotProgress;
            die.rotation.z = sz * (1 - rotProgress) + tz * rotProgress;

            if (t >= 1) {
              a.phase = 'settling';
              a.startTime = now;
              a.duration = a.settleDuration;
            }
          } else if (a.phase === 'settling') {
            const elapsed = now - a.startTime;
            const t = Math.min(elapsed / a.duration, 1);
            const bounce = (1 - easeOutBounce(t)) * 0.10;

            die.position.set(basePos[0], basePos[1] + bounce, basePos[2]);
            const [tx, ty, tz] = a.targetRot;
            die.rotation.set(tx, ty, tz);

            if (shadow) {
              shadow.visible = true;
              shadow.position.set(basePos[0], -0.35, basePos[2] - 0.05);
              const shadowScale = 1.0 - bounce * 0.4;
              shadow.scale.setScalar(shadowScale);
              (shadow.material as THREE.MeshBasicMaterial).opacity = 0.38;
            }

            if (t >= 1) {
              a.phase = 'done';
              die.position.set(basePos[0], basePos[1], basePos[2]);
              die.rotation.set(tx, ty, tz);
              if (shadow) {
                shadow.scale.setScalar(1.0);
                shadow.visible = true;
                (shadow.material as THREE.MeshBasicMaterial).opacity = 0.38;
              }

              landedCountRef.current += 1;
              if (landedCountRef.current >= 6) {
                playLandRef.current();
                onDiceLandedRef.current(idx);
              }
            }
          } else if (a.phase === 'collect') {
            const elapsed = now - a.startTime;
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);

            // Fly back to dealer hand and scale down
            const curX = basePos[0] * (1 - eased) + HAND_POS[0] * eased;
            const curY = basePos[1] * (1 - eased) + HAND_POS[1] * eased + Math.sin(t * Math.PI) * 0.35;
            const curZ = basePos[2] * (1 - eased) + HAND_POS[2] * eased;
            die.position.set(curX, curY, curZ);

            const scale = 1.0 * (1 - eased) + 0.3 * eased;
            die.scale.setScalar(scale);

            die.rotation.x += 0.12;
            die.rotation.y += 0.16;

            if (shadow) {
              shadow.position.set(curX, -0.35, curZ - 0.05);
              shadow.scale.setScalar(Math.max(0.1, 1 - eased));
              (shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.35 * (1 - eased));
            }

            if (t >= 1) {
              die.visible = false;
              if (shadow) shadow.visible = false;
              a.phase = 'idle';
            }
          } else if (a.phase === 'done') {
            // Keep resting on table squarely showing the settled result face
            const curVal = diceResultsRef.current[idx]?.value ?? (idx + 1);
            const [tx, ty, tz] = getTargetRotation(curVal);
            die.rotation.set(tx, ty, tz);
            die.position.set(basePos[0], basePos[1], basePos[2]);
            die.visible = true;
            if (shadow) {
              shadow.visible = true;
              shadow.position.set(basePos[0], -0.35, basePos[2] - 0.05);
              shadow.scale.setScalar(1.0);
              (shadow.material as THREE.MeshBasicMaterial).opacity = 0.38;
            }
          } else if (a.phase === 'idle') {
            die.visible = false;
            if (shadow) shadow.visible = false;
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
  }, [startRollAnimation]);

  // Handle phase changes (Launch when ROLLING, Collect when BETTING_OPEN)
  useEffect(() => {
    const prevPhase = prevServerPhaseRef.current;
    prevServerPhaseRef.current = serverPhase;
    const prevRollCount = prevRollCountRef.current;
    prevRollCountRef.current = rollCount;
    const now = performance.now();

    const isNewRoll = (serverPhase === 'ROLLING' && prevPhase !== 'ROLLING') ||
                      (serverPhase === 'ROLLING' && rollCount !== prevRollCount);

    if (isNewRoll) {
      startRollAnimation(diceResults);
    } else if (serverPhase === 'BETTING_OPEN' && (prevPhase === 'SETTLED' || prevPhase === 'ROLLING')) {
      // 2. Animate dice collecting back to dealer's hand and disappear
      diceGroupsRef.current.forEach((die, idx) => {
        if (die && die.visible) {
          animStatesRef.current[idx] = {
            ...animStatesRef.current[idx],
            startTime: now,
            duration: 400 + idx * 25,
            phase: 'collect',
          };
        } else {
          animStatesRef.current[idx].phase = 'idle';
        }
      });
    }
  }, [serverPhase, rollCount, diceResults, startRollAnimation]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
