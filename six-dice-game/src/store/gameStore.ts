import { create } from 'zustand';
import { rollDice } from '../game/diceEngine';
import { calculateScore, ScoreResult } from '../game/scoringSystem';

export type GamePhase = 'idle' | 'rolling' | 'landing' | 'landed' | 'done';

export interface DiceItem {
  id: number;
  value: number;
}

export interface GameState {
  phase: GamePhase;
  gameState: GamePhase;
  results: number[];
  diceResults: DiceItem[];
  score: ScoreResult | null;
  rollCount: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  selectedNumber: number;

  // Actions
  roll: () => void;
  onDiceLanded: (index: number) => void;
  setGameState: (state: GamePhase) => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  reset: () => void;
  setSelectedNumber: (n: number) => void;
}

let landedCount = 0;

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  gameState: 'idle',
  results: [1, 2, 3, 4, 5, 6],
  diceResults: [
    { id: 0, value: 1 },
    { id: 1, value: 2 },
    { id: 2, value: 3 },
    { id: 3, value: 4 },
    { id: 4, value: 5 },
    { id: 5, value: 6 },
  ],
  score: null,
  rollCount: 0,
  soundEnabled: true,
  hapticEnabled: true,
  selectedNumber: 1,

  roll: () => {
    landedCount = 0;
    const newResults = rollDice(6);
    const newDiceResults = newResults.map((val, idx) => ({ id: idx, value: val }));
    set({
      phase: 'rolling',
      gameState: 'rolling',
      results: newResults,
      diceResults: newDiceResults,
      score: null,
      rollCount: get().rollCount + 1,
    });
  },

  setGameState: (state: GamePhase) => {
    if (state === 'done' || state === 'landed') {
      const { results } = get();
      const score = calculateScore(results);
      set({ phase: 'landed', gameState: 'done', score });
    } else {
      set({ phase: state, gameState: state });
    }
  },

  onDiceLanded: (_index: number) => {
    landedCount++;
    if (landedCount >= 6) {
      const { results } = get();
      const score = calculateScore(results);
      set({ phase: 'landed', gameState: 'done', score });
      landedCount = 0;
    }
  },

  toggleSound: () => set(s => ({ soundEnabled: !s.soundEnabled })),
  toggleHaptic: () => set(s => ({ hapticEnabled: !s.hapticEnabled })),

  setSelectedNumber: (n: number) => set(() => ({ selectedNumber: n })),

  reset: () => {
    landedCount = 0;
    set({
      phase: 'idle',
      gameState: 'idle',
      results: [1, 2, 3, 4, 5, 6],
      diceResults: [
        { id: 0, value: 1 },
        { id: 1, value: 2 },
        { id: 2, value: 3 },
        { id: 3, value: 4 },
        { id: 4, value: 5 },
        { id: 5, value: 6 },
      ],
      score: null,
    });
  },
}));
