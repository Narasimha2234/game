import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import * as ExpoTHREE from 'expo-three';
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
  const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE, 2, 2, 2);

  // 1. Solid opaque pure white dice cube body
  const bodyMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 100,
    specular: new THREE.Color(0xffffff),
  });
  const cube = new THREE.Mesh(geo, bodyMat);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);

  // 2. Attach crisp PNG face decals onto the 6 solid white faces
  if (textures && textures.length === 6) {
    const decalGeo = new THREE.PlaneGeometry(SIZE * 0.82, SIZE * 0.82);
    const OFFSET = SIZE / 2 + 0.002;

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
  };

  const animStatesRef = useRef<Array<AnimState>>(
    Array.from({ length: 6 }, () => ({
      targetRot: [0, 0, 0],
      spinRot: [0, 0, 0],
      startTime: 0,
      duration: 1400,
      phase: 'idle',
      totalRollDuration: 8000,
      launchDuration: 800,
      rollDuration: 6400,
      settleDuration: 800,
    }))
  );

  const rafRef = useRef<number | null>(null);
  const landedCountRef = useRef(0);
  const prevServerPhaseRef = useRef(serverPhase);

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

    // Bright neutral white lights for crystal clear white dice
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(0, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.6);
    fillLight.position.set(-4, 2, 4);
    scene.add(fillLight);

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
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

      DICE_POSITIONS.forEach((pos, idx) => {
        const shadow = createShadowDisc();
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(pos[0], pos[1] - 0.35, pos[2] - 0.05);
        shadow.visible = false; // Initially hidden during betting open
        scene.add(shadow);
        shadowDiscsRef.current.push(shadow);

        const die = createDieMesh(textures);
        const HAND_POS = handPosRef.current;
        die.position.set(HAND_POS[0], HAND_POS[1], HAND_POS[2]);
        die.scale.setScalar(0.3);
        die.visible = false; // Hidden at dealer hand until rolling begins

        const initialVal = diceResultsRef.current[idx]?.value ?? (idx + 1);
        const [rx, ry, rz] = getTargetRotation(initialVal);
        die.rotation.set(rx, ry, rz);

        scene.add(die);
        diceGroupsRef.current.push(die);
      });

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
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);

            // Travel from dealer hand towards table
            const curX = HAND_POS[0] * (1 - eased) + basePos[0] * eased;
            const curY = HAND_POS[1] * (1 - eased) + (basePos[1] + 0.6) * eased;
            const curZ = HAND_POS[2] * (1 - eased) + basePos[2] * eased;
            die.position.set(curX, curY, curZ);

            const scale = 0.3 * (1 - eased) + 1.0 * eased;
            die.scale.setScalar(scale);

            die.rotation.x += 0.15;
            die.rotation.y += 0.18;

            if (shadow) {
              shadow.visible = true;
              shadow.scale.setScalar(eased * 0.7);
            }

            if (t >= 1) {
              a.phase = 'rolling';
              a.startTime = now;
              a.duration = a.rollDuration;
            }
          } else if (a.phase === 'rolling') {
            const elapsed = now - a.startTime;
            const t = Math.min(Math.max(elapsed / a.duration, 0), 1);
            const eased = easeInOut(t);

            const [tx, ty, tz] = a.targetRot;
            const [sx, sy, sz] = a.spinRot;

            die.rotation.x = sx * (1 - eased) + tx * eased;
            die.rotation.y = sy * (1 - eased) + ty * eased;
            die.rotation.z = sz * (1 - eased) + tz * eased;

            // Tumbling bounce height trajectory spanning the entire roll duration
            const bounceHumps = Math.max(3, Math.floor(a.duration / 1800));
            const bounceFactor = Math.abs(Math.sin(t * Math.PI * bounceHumps)) * (1 - t * 0.5);
            const arcY = bounceFactor * 0.65;
            die.position.set(basePos[0], basePos[1] + arcY, basePos[2]);

            if (shadow) {
              const shadowScale = 1.0 - bounceFactor * 0.35;
              shadow.scale.setScalar(shadowScale);
            }

            if (t >= 1) {
              a.phase = 'settling';
              a.startTime = now;
              a.duration = a.settleDuration;
            }
          } else if (a.phase === 'settling') {
            const elapsed = now - a.startTime;
            const t = Math.min(elapsed / a.duration, 1);
            const bounce = (1 - easeOutBounce(t)) * 0.14;

            die.position.set(basePos[0], basePos[1] + bounce, basePos[2]);
            const [tx, ty, tz] = a.targetRot;
            die.rotation.set(tx, ty, tz);

            if (t >= 1) {
              a.phase = 'done';
              die.position.set(basePos[0], basePos[1], basePos[2]);
              die.rotation.set(tx, ty, tz);
              if (shadow) {
                shadow.scale.setScalar(1.0);
                shadow.visible = true;
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
            const curY = basePos[1] * (1 - eased) + HAND_POS[1] * eased;
            const curZ = basePos[2] * (1 - eased) + HAND_POS[2] * eased;
            die.position.set(curX, curY, curZ);

            const scale = 1.0 * (1 - eased) + 0.3 * eased;
            die.scale.setScalar(scale);

            die.rotation.x += 0.1;
            die.rotation.y += 0.15;

            if (shadow) {
              shadow.scale.setScalar(1 - eased);
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
            if (shadow) shadow.visible = true;
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
  }, []);

  // Handle phase changes (Launch when ROLLING, Collect when BETTING_OPEN)
  useEffect(() => {
    const prevPhase = prevServerPhaseRef.current;
    prevServerPhaseRef.current = serverPhase;
    const HAND_POS = handPosRef.current;
    const now = performance.now();

    if (serverPhase === 'ROLLING' && prevPhase !== 'ROLLING') {
      // 1. Launch dice from dealer's hand onto table for the entire roll duration
      landedCountRef.current = 0;
      playRollRef.current();

      const totalRollMs = Math.max(3000, (rollTimeSecRef.current || 8) * 1000);
      const launchDuration = Math.min(1000, Math.floor(totalRollMs * 0.14));
      const settleDuration = Math.min(800, Math.floor(totalRollMs * 0.12));
      const rollDuration = totalRollMs - launchDuration - settleDuration;

      diceResults.forEach((d, idx) => {
        const delay = DELAYS[idx] ?? 0;
        const targetRot = getTargetRotation(d.value);
        const spinCount = Math.max(6, Math.floor(rollDuration / 450));

        const extraX = (spinCount + (idx % 3) + 2) * Math.PI * 2;
        const extraY = (spinCount + (idx % 2) + 2) * Math.PI * 2;
        const extraZ = (Math.floor(spinCount / 2) + 1) * Math.PI * 2;

        animStatesRef.current[idx] = {
          targetRot,
          spinRot: [targetRot[0] + extraX, targetRot[1] + extraY, targetRot[2] + extraZ],
          startTime: now + delay,
          duration: launchDuration,
          phase: 'launch',
          totalRollDuration: totalRollMs,
          launchDuration,
          rollDuration: rollDuration - delay,
          settleDuration,
        };

        const die = diceGroupsRef.current[idx];
        if (die) {
          die.visible = true;
          die.position.set(HAND_POS[0], HAND_POS[1], HAND_POS[2]);
          die.scale.setScalar(0.3);
        }
      });
    } else if (serverPhase === 'BETTING_OPEN' && (prevPhase === 'SETTLED' || prevPhase === 'ROLLING')) {
      // 2. Animate dice collecting back to dealer's hand and disappear
      diceGroupsRef.current.forEach((die, idx) => {
        if (die && die.visible) {
          animStatesRef.current[idx] = {
            ...animStatesRef.current[idx],
            startTime: now,
            duration: 400 + idx * 20,
            phase: 'collect',
          };
        } else {
          animStatesRef.current[idx].phase = 'idle';
        }
      });
    }
  }, [serverPhase, rollCount, diceResults]);

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
