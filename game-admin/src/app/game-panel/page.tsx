"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Gamepad2,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Users,
  TrendingUp,
  AlertTriangle,
  Flame,
  Clock,
  ArrowLeft,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  CheckCircle,
  Eye,
  Sliders,
  Trophy,
} from "lucide-react";

// Dice Face Definitions corresponding to six-dice-game
export const DICE_FACES = [
  { id: 1, name: "Bat", symbol: "🦇", color: "from-purple-600 to-indigo-700", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-500/10" },
  { id: 2, name: "Diamond", symbol: "💎", color: "from-cyan-500 to-blue-600", border: "border-cyan-500", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: 3, name: "Heart", symbol: "❤️", color: "from-rose-500 to-red-600", border: "border-rose-500", text: "text-rose-400", bg: "bg-rose-500/10" },
  { id: 4, name: "Leaf", symbol: "🍀", color: "from-emerald-500 to-green-600", border: "border-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  { id: 5, name: "Tree", symbol: "🌲", color: "from-amber-500 to-yellow-600", border: "border-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  { id: 6, name: "Crown", symbol: "👑", color: "from-yellow-400 to-orange-500", border: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500/10" },
];

interface BetPoolItem {
  faceId: number;
  totalAmount: number;
  bettorsCount: number;
}

interface SimulatedBet {
  id: string;
  playerName: string;
  faceId: number;
  amount: number;
  time: string;
}

interface RoundHistory {
  roundNumber: number;
  dice: number[];
  pattern: string;
  totalBets: number;
  houseProfit: number;
  timestamp: string;
}

export default function GamePanelPage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Game state
  const [roundNumber, setRoundNumber] = useState(1048);
  const [gamePhase, setGamePhase] = useState<"BETTING_OPEN" | "BETS_LOCKED" | "ROLLING" | "ROUND_RESOLVED">("BETTING_OPEN");
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 6 Current Dice Values (1 to 6)
  const [dice, setDice] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [isRolling, setIsRolling] = useState(false);
  const [activeDieIndexToEdit, setActiveDieIndexToEdit] = useState<number | null>(null);

  // Mode: Manual or Auto-Dealer
  const [autoRollEnabled, setAutoRollEnabled] = useState(false);

  // Simulated Pool Bets across 6 faces
  const [betPools, setBetPools] = useState<BetPoolItem[]>([
    { faceId: 1, totalAmount: 4500, bettorsCount: 6 },
    { faceId: 2, totalAmount: 8200, bettorsCount: 11 },
    { faceId: 3, totalAmount: 14500, bettorsCount: 19 },
    { faceId: 4, totalAmount: 3200, bettorsCount: 4 },
    { faceId: 5, totalAmount: 6100, bettorsCount: 8 },
    { faceId: 6, totalAmount: 11800, bettorsCount: 15 },
  ]);

  // Live Simulated Player Bets Feed
  const [liveBetsFeed, setLiveBetsFeed] = useState<SimulatedBet[]>([
    { id: "1", playerName: "Alex Kumar", faceId: 3, amount: 1000, time: "Just now" },
    { id: "2", playerName: "Rohan V.", faceId: 6, amount: 2500, time: "10s ago" },
    { id: "3", playerName: "Suresh P.", faceId: 2, amount: 500, time: "18s ago" },
    { id: "4", playerName: "Vikram S.", faceId: 3, amount: 2000, time: "25s ago" },
  ]);

  // History of rounds
  const [history, setHistory] = useState<RoundHistory[]>([
    { roundNumber: 1047, dice: [3, 3, 3, 1, 6, 2], pattern: "Three of a Kind", totalBets: 42000, houseProfit: 8400, timestamp: "2m ago" },
    { roundNumber: 1046, dice: [2, 2, 5, 5, 1, 4], pattern: "Two Pairs", totalBets: 38500, houseProfit: 12100, timestamp: "4m ago" },
    { roundNumber: 1045, dice: [6, 6, 6, 6, 2, 3], pattern: "Four of a Kind!", totalBets: 51200, houseProfit: -6400, timestamp: "6m ago" },
  ]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Timer Countdown Effect
  useEffect(() => {
    if (isTimerPaused || gamePhase !== "BETTING_OPEN") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          // Lock bets and roll automatically if auto mode is active
          setGamePhase("BETS_LOCKED");
          if (autoRollEnabled) {
            setTimeout(() => triggerRollDice(), 800);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerPaused, gamePhase, autoRollEnabled]);

  // Pattern recognition helper
  const getPatternName = (diceValues: number[]) => {
    const freq: Record<number, number> = {};
    diceValues.forEach((d) => (freq[d] = (freq[d] || 0) + 1));
    const maxFreq = Math.max(...Object.values(freq));
    const sorted = [...diceValues].sort((a, b) => a - b);
    const isStraight = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1);

    if (maxFreq === 6) return "🎰 HEXTUPLES! (6x)";
    if (maxFreq === 5) return "⭐ Five of a Kind! (5x)";
    if (maxFreq === 4) return "🔥 Four of a Kind! (4x)";
    if (isStraight) return "⚡ Straight (1-6)!";
    if (maxFreq === 3) return "✨ Three of a Kind (3x)";
    if (Object.values(freq).filter((f) => f === 2).length === 2) return "Two Pairs";
    if (maxFreq === 2) return "One Pair";
    return "High Roll";
  };

  // Roll Dice Trigger with Animated Physics Shuffle
  const triggerRollDice = (customOutcome?: number[]) => {
    if (isRolling) return;
    setIsRolling(true);
    setGamePhase("ROLLING");

    let rollsCount = 0;
    const interval = setInterval(() => {
      setDice(Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1));
      rollsCount++;

      if (rollsCount > 12) {
        clearInterval(interval);
        // Final outcome
        const finalDice = customOutcome || Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
        setDice(finalDice);
        setIsRolling(false);
        setGamePhase("ROUND_RESOLVED");

        // Calculate Round Metrics
        const pattern = getPatternName(finalDice);
        const totalPool = betPools.reduce((sum, b) => sum + b.totalAmount, 0);

        // Calculate Payouts
        const freqMap: Record<number, number> = {};
        finalDice.forEach((d) => (freqMap[d] = (freqMap[d] || 0) + 1));

        let totalPayout = 0;
        betPools.forEach((pool) => {
          const matchCount = freqMap[pool.faceId] || 0;
          if (matchCount > 0) {
            // Payout = bet * (matchCount + 1)
            totalPayout += pool.totalAmount * (matchCount + 1);
          }
        });

        const houseProfit = totalPool - totalPayout;

        // Record history
        setHistory((prev) => [
          {
            roundNumber,
            dice: finalDice,
            pattern,
            totalBets: totalPool,
            houseProfit,
            timestamp: "Just now",
          },
          ...prev.slice(0, 9),
        ]);
      }
    }, 90);
  };

  // Manual Dice Manipulation (Set specific die value)
  const handleSetDieValue = (dieIndex: number, faceId: number) => {
    const updated = [...dice];
    updated[dieIndex] = faceId;
    setDice(updated);
    setActiveDieIndexToEdit(null);
  };

  // Quick Preset Outcomes
  const applyPreset = (presetType: "all_hearts" | "all_bats" | "all_crowns" | "straight" | "random") => {
    let outcome = [1, 2, 3, 4, 5, 6];
    if (presetType === "all_hearts") outcome = [3, 3, 3, 3, 3, 3];
    if (presetType === "all_bats") outcome = [1, 1, 1, 1, 1, 1];
    if (presetType === "all_crowns") outcome = [6, 6, 6, 6, 6, 6];
    if (presetType === "straight") outcome = [1, 2, 3, 4, 5, 6];
    if (presetType === "random") outcome = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);

    setDice(outcome);
  };

  // Reset to New Round
  const startNewRound = () => {
    setRoundNumber((r) => r + 1);
    setGamePhase("BETTING_OPEN");
    setTimerSeconds(15);
    setIsTimerPaused(false);
    // Generate new simulated pool
    setBetPools(
      DICE_FACES.map((f) => ({
        faceId: f.id,
        totalAmount: Math.floor(Math.random() * 80 + 20) * 100,
        bettorsCount: Math.floor(Math.random() * 15 + 3),
      }))
    );
  };

  // Metrics
  const totalBetPool = betPools.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalBettors = betPools.reduce((sum, b) => sum + b.bettorsCount, 0);

  // Calculate face frequency on current dice
  const faceCounts: Record<number, number> = {};
  dice.forEach((d) => (faceCounts[d] = (faceCounts[d] || 0) + 1));

  const currentPattern = getPatternName(dice);

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Players Dashboard
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/30">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  Six Dice Game Control Room
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                    LIVE
                  </Badge>
                </h1>
                <p className="text-[11px] text-slate-400 font-mono">Round #{roundNumber}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-white p-1.5 h-8 w-8"
              title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Dealer / Admin:</span>
              <span className="font-semibold text-white">{user?.name || "Admin"}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 text-xs h-8"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Control Room Viewport */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* Live Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Round & Phase Card */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-slate-400 text-xs flex items-center justify-between">
                <span>ROUND STATUS</span>
                <span className="font-mono text-emerald-400">#{roundNumber}</span>
              </CardDescription>
              <CardTitle className="text-lg font-bold">
                {gamePhase === "BETTING_OPEN" && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    OPEN FOR BETS
                  </span>
                )}
                {gamePhase === "BETS_LOCKED" && (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    BETS LOCKED
                  </span>
                )}
                {gamePhase === "ROLLING" && (
                  <span className="text-sky-400 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    DICE ROLLING...
                  </span>
                )}
                {gamePhase === "ROUND_RESOLVED" && (
                  <span className="text-indigo-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    RESOLVED
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Phase:</span>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {gamePhase}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Countdown Timer Card */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-slate-400 text-xs flex items-center justify-between">
                <span>COUNTDOWN TIMER</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-mono font-extrabold flex items-baseline gap-1">
                <span className={timerSeconds <= 5 && gamePhase === "BETTING_OPEN" ? "text-red-400 animate-pulse" : "text-amber-400"}>
                  {timerSeconds}s
                </span>
                <span className="text-xs font-normal text-slate-400">
                  {gamePhase === "BETTING_OPEN" ? "remaining" : "phase locked"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTimerPaused(!isTimerPaused)}
                  className="h-7 text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200"
                >
                  {isTimerPaused ? "Resume Timer" : "Pause Timer"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTimerSeconds(15)}
                  className="h-7 text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200"
                >
                  Reset 15s
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Total Stakes Pool */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-slate-400 text-xs flex items-center justify-between">
                <span>TOTAL ROUND POOL</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-400">
                ₹{totalBetPool.toLocaleString("en-IN")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Bettors:</span>
                <span className="font-semibold text-white">{totalBettors} players</span>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Recognition Card */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription className="text-slate-400 text-xs flex items-center justify-between">
                <span>CURRENT OUTCOME</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </CardDescription>
              <CardTitle className="text-base font-bold text-amber-400 truncate">
                {currentPattern}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Dice Sum:</span>
                <span className="font-mono font-bold text-white">
                  {dice.reduce((a, b) => a + b, 0)} pts
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Central Casino Table: 6 Dice Tray & Dealer Controller */}
        <Card className="bg-gradient-to-b from-[#141b33] via-[#0f152b] to-[#0a0f20] border-slate-700/80 shadow-2xl relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-rose-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-20 bg-amber-500/10 blur-3xl pointer-events-none" />

          <CardHeader className="pb-2 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <Flame className="w-5 h-5 text-rose-500" />
                Live 6-Dice Tray (Dealer Master Control)
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Click any die to override its face value, or trigger a full physics roll.
              </CardDescription>
            </div>

            {/* Quick Outcome Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Presets:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("all_hearts")}
                className="h-7 text-[11px] bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60"
              >
                ❤️ All Hearts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("all_bats")}
                className="h-7 text-[11px] bg-purple-950/40 border-purple-800/60 text-purple-300 hover:bg-purple-900/60"
              >
                🦇 All Bats
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("all_crowns")}
                className="h-7 text-[11px] bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/60"
              >
                👑 All Crowns
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("straight")}
                className="h-7 text-[11px] bg-sky-950/40 border-sky-800/60 text-sky-300 hover:bg-sky-900/60"
              >
                ⚡ Straight (1-6)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset("random")}
                className="h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                🎲 Randomize
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* 6 Dice Visual Container */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {dice.map((val, idx) => {
                const face = DICE_FACES.find((f) => f.id === val) || DICE_FACES[0];
                const isSelectedForEdit = activeDieIndexToEdit === idx;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDieIndexToEdit(isSelectedForEdit ? null : idx)
                      }
                      className={`relative w-full aspect-square max-w-[120px] rounded-2xl p-3 flex flex-col items-center justify-between border-2 transition-all transform duration-200 select-none ${
                        isRolling
                          ? "animate-bounce scale-95 border-amber-400/80 shadow-lg shadow-amber-500/20 bg-gradient-to-br from-amber-600/30 to-purple-600/30"
                          : isSelectedForEdit
                          ? "ring-4 ring-primary border-white scale-105 shadow-xl bg-slate-800"
                          : `${face.border} bg-[#16203c] hover:scale-105 hover:shadow-lg shadow-md`
                      }`}
                    >
                      {/* Die Index Badge */}
                      <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>

                      {/* Face Emoji & Glow */}
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-4xl sm:text-5xl filter drop-shadow-md transition-transform">
                          {face.symbol}
                        </span>
                      </div>

                      {/* Face Name & Value */}
                      <div className="w-full flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px] font-medium">
                        <span className={face.text}>{face.name}</span>
                        <span className="font-mono text-slate-400">[{val}]</span>
                      </div>
                    </button>

                    {/* Quick Face Selector Popover for this Die */}
                    {isSelectedForEdit && (
                      <div className="w-full p-2 rounded-xl bg-slate-900 border border-primary shadow-2xl flex flex-col gap-1.5 z-20 animate-in fade-in zoom-in-95">
                        <div className="text-[10px] font-semibold text-center text-slate-400">
                          Set Die #{idx + 1}:
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {DICE_FACES.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleSetDieValue(idx, f.id)}
                              className={`p-1.5 rounded text-xs flex flex-col items-center justify-center border ${
                                f.id === val
                                  ? "bg-primary text-white border-primary"
                                  : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                              }`}
                            >
                              <span>{f.symbol}</span>
                              <span className="text-[9px] font-mono">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
              <Button
                size="lg"
                disabled={isRolling}
                onClick={() => triggerRollDice()}
                className="w-full sm:w-auto min-w-[220px] h-12 text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/40 gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                {isRolling ? "Rolling 6 Dice..." : "ROLL 6 DICE"}
              </Button>

              <Button
                size="lg"
                variant="outline"
                disabled={isRolling}
                onClick={() => {
                  setGamePhase("BETS_LOCKED");
                  triggerRollDice();
                }}
                className="w-full sm:w-auto h-12 text-sm font-semibold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-2"
              >
                <Lock className="w-4 h-4" />
                Lock Bets & Roll
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={startNewRound}
                className="w-full sm:w-auto h-12 text-sm font-semibold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Next Round (#{roundNumber + 1})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Stake Distribution across 6 Faces */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Live Betting Board (Symbol Pool Breakdown)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total Stakes: ₹{totalBetPool.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {DICE_FACES.map((face) => {
              const pool = betPools.find((p) => p.faceId === face.id) || {
                faceId: face.id,
                totalAmount: 0,
                bettorsCount: 0,
              };
              const sharePct = totalBetPool > 0 ? Math.round((pool.totalAmount / totalBetPool) * 100) : 0;
              const matchesOnTray = faceCounts[face.id] || 0;

              return (
                <Card
                  key={face.id}
                  className={`bg-[#11182c] border-slate-800 text-slate-100 transition-all ${
                    matchesOnTray > 0 ? `ring-2 ring-emerald-500/50 ${face.border}` : ""
                  }`}
                >
                  <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{face.symbol}</span>
                      <div>
                        <div className={`font-bold text-xs ${face.text}`}>{face.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Face #{face.id}</div>
                      </div>
                    </div>

                    {matchesOnTray > 0 && (
                      <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0">
                        {matchesOnTray}x Hit
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="p-3 pt-0 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-400">Total Stake:</span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        ₹{pool.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Bettors: {pool.bettorsCount}</span>
                      <span>{sharePct}% pool</span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${face.color}`}
                        style={{ width: `${sharePct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bottom Split Section: Live Player Bets Feed + Recent Rounds History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Player Activity Feed */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="p-4 pb-2 border-b border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-sky-400" />
                Live Player Bets Stream
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Real-time incoming bets from connected mobile app players.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                {liveBetsFeed.map((bet) => {
                  const face = DICE_FACES.find((f) => f.id === bet.faceId) || DICE_FACES[0];
                  return (
                    <div key={bet.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-800/30">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-primary text-[10px]">
                          {bet.playerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{bet.playerName}</div>
                          <div className="text-[10px] text-slate-400">{bet.time}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${face.border} ${face.bg} ${face.text} text-[11px] gap-1 px-2 py-0.5`}
                        >
                          <span>{face.symbol}</span>
                          <span>{face.name}</span>
                        </Badge>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          ₹{bet.amount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Rounds History Log */}
          <Card className="bg-[#11182c] border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="p-4 pb-2 border-b border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                <Trophy className="w-4 h-4 text-amber-400" />
                Recent Rounds History
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Previous 6-dice roll outcomes and house margins.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
                {history.map((h) => {
                  const isHouseProfit = h.houseProfit >= 0;
                  return (
                    <div key={h.roundNumber} className="p-3 flex items-center justify-between text-xs hover:bg-slate-800/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-300">#{h.roundNumber}</span>
                          <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0">
                            {h.pattern}
                          </Badge>
                        </div>
                        {/* 6 Dice Emojis */}
                        <div className="flex items-center gap-1 text-sm">
                          {h.dice.map((d, i) => (
                            <span key={i}>{DICE_FACES.find((f) => f.id === d)?.symbol || "🎲"}</span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-[11px] text-slate-400 font-mono">
                          Pool: ₹{h.totalBets.toLocaleString("en-IN")}
                        </div>
                        <div
                          className={`font-mono font-semibold text-xs ${
                            isHouseProfit ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isHouseProfit ? "+" : ""}₹{h.houseProfit.toLocaleString("en-IN")} Margin
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
