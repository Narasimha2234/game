import { FACE_ROTATIONS } from './diceOrientations';

export interface DiceAnimationParams {
  diceIndex: number;
  targetFace: number;
  targetRotation: [number, number, number];
  /** Full rotations to add before final face (wraps cleanly) */
  extraRotations: [number, number, number];
  /** ms before this die starts rolling */
  startDelay: number;
  /** total animation duration in ms */
  duration: number;
}

/**
 * Generates a cryptographically-seeded random integer from 1 to 6.
 */
function randomFace(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Rolls `count` dice and returns their face values.
 */
export function rollDice(count: number = 6): number[] {
  return Array.from({ length: count }, randomFace);
}

/**
 * Builds per-dice animation parameters so each die has a unique
 * roll trajectory before landing on the correct face.
 */
export function getAnimationParams(
  results: number[],
): DiceAnimationParams[] {
  return results.map((face, index) => {
    const [tx, ty, tz] = FACE_ROTATIONS[face];

    // Each die gets 2–4 full extra rotations on each axis (2π multiples)
    const extraX = (Math.floor(Math.random() * 3) + 2) * Math.PI * 2;
    const extraY = (Math.floor(Math.random() * 3) + 2) * Math.PI * 2;
    const extraZ = (Math.floor(Math.random() * 2)) * Math.PI * 2;

    // Stagger: 0–150ms between dice (earlier dice take longer)
    const startDelay = index * (50 + Math.floor(Math.random() * 50));

    // Duration: 900–1400ms, earlier dice take a tiny bit longer
    const duration = 1000 + Math.random() * 400 + index * 30;

    return {
      diceIndex: index,
      targetFace: face,
      targetRotation: [tx, ty, tz],
      extraRotations: [extraX, extraY, extraZ],
      startDelay,
      duration,
    };
  });
}
