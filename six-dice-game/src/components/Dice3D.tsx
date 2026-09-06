import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { getTargetRotation, PIP_PATTERNS } from '../game/diceOrientations';

interface Props {
  value: number;
  rolling: boolean;
  rollSeed: number;
  delay?: number;
  size?: number;
  onLanded?: () => void;
}

// Polyfill DOM document if needed for Three.js in React Native
if (typeof document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
  };
}

function createDieMesh(): THREE.Group {
  const group = new THREE.Group();

  // Rounded-corner dice body using BoxGeometry with bevel-like material
  const geo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xf5f0e8,
    shininess: 80,
    specular: new THREE.Color(0x888888),
  });
  const cube = new THREE.Mesh(geo, mat);
  group.add(cube);

  // Pip factory — tiny sphere per pip
  const pipGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const pipMat = new THREE.MeshPhongMaterial({ color: 0x1a1a2e });

  const HALF = 0.505;

  const faceConfigs: Array<{
    face: number;
    normal: THREE.Vector3;
    up: THREE.Vector3;
    right: THREE.Vector3;
  }> = [
    { face: 1, normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0) },
    { face: 2, normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), right: new THREE.Vector3(1, 0, 0) },
    { face: 3, normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(0, 0, -1) },
    { face: 4, normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(0, 0, 1) },
    { face: 5, normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(1, 0, 0) },
    { face: 6, normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0), right: new THREE.Vector3(-1, 0, 0) },
  ];

  for (const { face, normal, up, right } of faceConfigs) {
    const pips = PIP_PATTERNS[face] ?? [];
    for (const [u, v] of pips) {
      const pip = new THREE.Mesh(pipGeo, pipMat);
      const pos = normal.clone().multiplyScalar(HALF)
        .add(right.clone().multiplyScalar(u))
        .add(up.clone().multiplyScalar(v));
      pip.position.copy(pos);
      group.add(pip);
    }
  }

  return group;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const Dice3D: React.FC<Props> = ({ value, rolling, rollSeed, delay = 0, size = 80, onLanded }) => {
  const mountedRef = useRef(true);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dieGroupRef = useRef<THREE.Group | null>(null);
  const animRef = useRef<{
    startRot: [number, number, number];
    targetRot: [number, number, number];
    spinRot: [number, number, number];
    startTime: number;
    duration: number;
    phase: 'wait' | 'spin' | 'done';
  }>({
    startRot: [0, 0, 0],
    targetRot: [0, 0, 0],
    spinRot: [0, 0, 0],
    startTime: 0,
    duration: 1500,
    phase: 'done',
  });
  const rafRef = useRef<number | null>(null);
  const landedRef = useRef(false);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(0, 2.5, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 6, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x7c3aed, 0.3);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Shadow plane
    const planeGeo = new THREE.PlaneGeometry(6, 6);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.65;
    plane.receiveShadow = true;
    scene.add(plane);

    const die = createDieMesh();
    die.castShadow = true;
    die.traverse((child) => {
      if (child instanceof THREE.Mesh) child.castShadow = true;
    });
    scene.add(die);
    dieGroupRef.current = die;

    // Set initial rotation to match initial value
    const [rx, ry, rz] = getTargetRotation(value);
    die.rotation.set(rx, ry, rz);

    // Start render loop
    const render = () => {
      if (!mountedRef.current) return;
      rafRef.current = requestAnimationFrame(render);

      const anim = animRef.current;
      const now = performance.now();

      if (anim.phase === 'spin') {
        const elapsed = now - anim.startTime;
        const t = Math.min(elapsed / anim.duration, 1);
        const eased = easeInOut(t);

        const [tx, ty, tz] = anim.targetRot;
        const [sx, sy, sz] = anim.spinRot;

        if (dieGroupRef.current) {
          dieGroupRef.current.rotation.x = sx * (1 - eased) + tx * eased;
          dieGroupRef.current.rotation.y = sy * (1 - eased) + ty * eased;
          dieGroupRef.current.rotation.z = sz * (1 - eased) + tz * eased;

          // Bounce effect near end
          const bounceT = Math.max(0, (t - 0.85) / 0.15);
          const bounce = Math.sin(bounceT * Math.PI) * 0.08 * (1 - bounceT);
          dieGroupRef.current.position.y = bounce;
        }

        if (t >= 1) {
          anim.phase = 'done';
          if (dieGroupRef.current) {
            const [ftx, fty, ftz] = getTargetRotation(value);
            // Normalize to exact target
            dieGroupRef.current.rotation.set(ftx, fty, ftz);
            dieGroupRef.current.position.y = 0;
          }
          if (!landedRef.current) {
            landedRef.current = true;
            onLanded?.();
          }
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        gl.endFrameEXP();
      }
    };

    render();
  }, [value, onLanded]);

  // React to rolling prop changes
  useEffect(() => {
    if (!rolling) return;
    landedRef.current = false;

    const rng = rollSeed + delay;
    const targetRot = getTargetRotation(value);

    // Generate spin rotation: target + extra full rotations
    const extraX = (Math.floor(rng * 3.7) % 3 + 2) * Math.PI * 2;
    const extraY = (Math.floor(rng * 2.3) % 3 + 2) * Math.PI * 2;
    const extraZ = (Math.floor(rng * 1.9) % 2 + 1) * Math.PI * 2;

    const spinRot: [number, number, number] = [
      targetRot[0] + extraX,
      targetRot[1] + extraY,
      targetRot[2] + extraZ,
    ];

    const startRot: [number, number, number] = dieGroupRef.current
      ? [dieGroupRef.current.rotation.x, dieGroupRef.current.rotation.y, dieGroupRef.current.rotation.z]
      : [0, 0, 0];

    const duration = 1400 + (rng % 7) * 60;

    const start = () => {
      if (!mountedRef.current) return;
      animRef.current = {
        startRot,
        targetRot,
        spinRot,
        startTime: performance.now(),
        duration,
        phase: 'spin',
      };
    };

    if (delay > 0) {
      const t = setTimeout(start, delay);
      return () => clearTimeout(t);
    } else {
      start();
    }
  }, [rolling, rollSeed, value, delay]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
    };
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default Dice3D;
