import { create } from 'zustand';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';
import { calculateScore, ScoreResult } from '../game/scoringSystem';

export type ServerGamePhase = 'BETTING_OPEN' | 'ROLLING' | 'SETTLED';
export type ServerGameMode = 'AUTOMATIC' | 'MANUAL' | 'STOPPED';

export interface DiceItem {
  id: number;
  value: number;
}

export interface MyBet {
  id: string;
  selectedNumber: number;
  amount: number;
  status: string;
  matchingCount?: number;
  payout?: number;
}

export interface LastRoundUserResult {
  roundNumber: number;
  diceResults: number[];
  totalBet: number;
  totalWon: number;
  hasWon: boolean;
  bets: {
    selectedNumber: number;
    amount: number;
    payout: number;
    matchingCount: number;
    status: string;
  }[];
}

export interface GameState {
  // Server Sync state
  roundId: string | null;
  roundNumber: number;
  serverPhase: ServerGamePhase;
  mode: ServerGameMode;
  timeLeft: number;
  betTimeSeconds: number;
  rollTimeSeconds: number;
  intervalTimeSeconds: number;
  betPools: Record<number, { totalAmount: number; bettorsCount: number }>;
  myBets: MyBet[];
  lastRoundUserResult: LastRoundUserResult | null;
  stopMessage: string | null;
  
  // Local Game & Animation State
  phase: 'idle' | 'rolling' | 'landing' | 'landed' | 'done';
  gameState: 'idle' | 'rolling' | 'landing' | 'landed' | 'done';
  results: number[];
  diceResults: DiceItem[];
  score: ScoreResult | null;
  rollCount: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  selectedNumber: number;
  betAmount: number;
  isPlacingBet: boolean;

  // Win Feedback Modal State
  winModalVisible: boolean;
  lastCelebratedRound: number | null;

  // Actions
  syncServerState: (userId?: string) => Promise<void>;
  placeBet: () => Promise<boolean>;
  rollWithResults: (serverDice: number[]) => void;
  onDiceLanded: (index: number) => void;
  setGameState: (state: 'idle' | 'rolling' | 'landing' | 'landed' | 'done') => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  setSelectedNumber: (n: number) => void;
  setBetAmount: (amt: number | ((prev: number) => number)) => void;
  closeWinModal: () => void;
}

let landedCount = 0;

export const useGameStore = create<GameState>((set, get) => ({
  roundId: null,
  roundNumber: 1001,
  serverPhase: 'BETTING_OPEN',
  mode: 'AUTOMATIC',
  timeLeft: 30,
  betTimeSeconds: 30,
  rollTimeSeconds: 8,
  intervalTimeSeconds: 10,
  betPools: {},
  myBets: [],
  lastRoundUserResult: null,
  stopMessage: null,

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
  betAmount: 100,
  isPlacingBet: false,
  winModalVisible: false,
  lastCelebratedRound: null,

  syncServerState: async (userId?: string) => {
    try {
      const auth = useAuthStore.getState();
      const effectiveUserId = userId || auth.user?.id;
      const sessionId = auth.sessionId;

      const url = effectiveUserId
        ? `/api/game/state?userId=${effectiveUserId}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`
        : `/api/game/state`;
      const res = await apiClient.get(url);

      // Check session validity (single active device check)
      if (res.data?.sessionValid === false) {
        await auth.logout();
        useAuthStore.setState({
          error: 'Your session has been terminated or logged into another device.',
        });
        return;
      }

      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        const prevServerPhase = get().serverPhase;
        const incomingPhase = d.phase as ServerGamePhase;
        const incomingDice = Array.isArray(d.diceResults) ? d.diceResults.map(Number) : [1, 2, 3, 4, 5, 6];

        // 1. If server moved to ROLLING from BETTING_OPEN, trigger 3D roll with server's dice outcome!
        if (incomingPhase === 'ROLLING' && prevServerPhase !== 'ROLLING') {
          get().rollWithResults(incomingDice);
        }

        // 2. If server moved back to BETTING_OPEN (new round), reset local rolling state to idle & auto-close modal
        if (incomingPhase === 'BETTING_OPEN') {
          if (prevServerPhase !== 'BETTING_OPEN') {
            set({
              phase: 'idle',
              gameState: 'idle',
            });
          }
          // Auto-close modal when betting opens
          if (get().winModalVisible) {
            set({ winModalVisible: false });
          }
        }

        // Auto-close modal right before next round starts (when settled timeLeft <= 1)
        if (incomingPhase === 'SETTLED' && d.timeLeft <= 1 && get().winModalVisible) {
          set({ winModalVisible: false });
        }

        // 3. If server settled round and user has a result to celebrate
        if (d.lastRoundUserResult && d.lastRoundUserResult.roundNumber !== get().lastCelebratedRound) {
          set({
            winModalVisible: true,
            lastCelebratedRound: d.lastRoundUserResult.roundNumber,
          });
          // Refresh user's wallet
          useAuthStore.getState().refreshWallet();
        }

        set({
          roundId: d.roundId,
          roundNumber: d.roundNumber,
          serverPhase: incomingPhase,
          mode: d.mode,
          timeLeft: d.timeLeft,
          betTimeSeconds: d.betTimeSeconds || 30,
          rollTimeSeconds: d.rollTimeSeconds || 8,
          intervalTimeSeconds: d.intervalTimeSeconds || 10,
          betPools: d.betPools || {},
          myBets: d.myBets || [],
          lastRoundUserResult: d.lastRoundUserResult,
          stopMessage: d.stopMessage ?? null,
        });
      }
    } catch (err) {
      // Network silence
    }
  },

  placeBet: async () => {
    const { selectedNumber, betAmount, isPlacingBet, serverPhase } = get();
    const user = useAuthStore.getState().user;

    if (!user?.id) return false;
    if (isPlacingBet) return false;
    if (serverPhase !== 'BETTING_OPEN') return false;

    set({ isPlacingBet: true });

    try {
      const res = await apiClient.post('/api/game/bets', {
        userId: user.id,
        selectedNumber,
        amount: betAmount,
      });

      if (res.data?.success) {
        // Update wallet in authStore
        if (typeof res.data.data?.walletBalance === 'number') {
          useAuthStore.getState().setWalletBalance(res.data.data.walletBalance);
        }

        // Update myBets locally
        set((state) => ({
          myBets: [
            ...state.myBets,
            {
              id: res.data.data.id,
              selectedNumber: res.data.data.selectedNumber,
              amount: res.data.data.amount,
              status: res.data.data.status,
            },
          ],
          isPlacingBet: false,
        }));

        return true;
      }
      set({ isPlacingBet: false });
      return false;
    } catch (err: any) {
      set({ isPlacingBet: false });
      throw err;
    }
  },

  rollWithResults: (serverDice: number[]) => {
    landedCount = 0;
    const newDiceResults = serverDice.map((val, idx) => ({ id: idx, value: val }));
    set({
      phase: 'rolling',
      gameState: 'rolling',
      results: serverDice,
      diceResults: newDiceResults,
      score: null,
      rollCount: get().rollCount + 1,
    });
  },

  setGameState: (state: 'idle' | 'rolling' | 'landing' | 'landed' | 'done') => {
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

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
  setSelectedNumber: (n: number) => set(() => ({ selectedNumber: n })),
  setBetAmount: (amt: number | ((prev: number) => number)) =>
    set((state) => ({
      betAmount: typeof amt === 'function' ? amt(state.betAmount) : amt,
    })),
  closeWinModal: () => set({ winModalVisible: false }),
}));
