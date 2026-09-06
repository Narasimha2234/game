import * as THREE from 'three';

/**
 * Euler rotations (x, y, z in radians) that rotate the die mesh
 * so that face N (1-6) points directly forward along the +Z axis (toward the camera).
 *
 * Face placement on unit cube:
 *   Face 1: +Z (Front)
 *   Face 2: +Y (Top)
 *   Face 3: +X (Right)
 *   Face 4: -X (Left)
 *   Face 5: -Y (Bottom)
 *   Face 6: -Z (Back)
 */
export const FACE_ROTATIONS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [Math.PI / 2, 0, 0],
  3: [0, -Math.PI / 2, 0],
  4: [0, Math.PI / 2, 0],
  5: [-Math.PI / 2, 0, 0],
  6: [0, Math.PI, 0],
};

export function getTargetRotation(face: number): [number, number, number] {
  return FACE_ROTATIONS[face] ?? [0, 0, 0];
}

const S = 0.28;
export const PIP_PATTERNS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-S, S], [S, -S]],
  3: [[-S, S], [0, 0], [S, -S]],
  4: [[-S, S], [S, S], [-S, -S], [S, -S]],
  5: [[-S, S], [S, S], [0, 0], [-S, -S], [S, -S]],
  6: [[-S, S], [S, S], [-S, 0], [S, 0], [-S, -S], [S, -S]],
};
