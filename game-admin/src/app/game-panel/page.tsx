"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StopGameDialog } from "@/components/StopGameDialog";
import {
  Gamepad2,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle,
  Sliders,
  Trophy,
  Zap,
  Pause,
  RefreshCw,
  Eye,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Flame,
  Star,
  ShieldCheck,
} from "lucide-react";

// Dice Face Definitions corresponding to Goodgudi mobile game
export const DICE_FACES = [
  {
    id: 1,
    name: "Bat",
    symbol: "🦇",
    image: "/dice-faces/bat.png",
    border: "border-purple-300 hover:border-purple-500",
    activeBorder: "border-purple-600 ring-2 ring-purple-200",
    text: "text-purple-700",
    bg: "bg-purple-50",
    badge: "bg-purple-100 text-purple-800",
  },
  {
    id: 2,
    name: "Diamond",
    symbol: "💎",
    image: "/dice-faces/diamond.png",
    border: "border-cyan-300 hover:border-cyan-500",
    activeBorder: "border-cyan-600 ring-2 ring-cyan-200",
    text: "text-cyan-700",
    bg: "bg-cyan-50",
    badge: "bg-cyan-100 text-cyan-800",
  },
  {
    id: 3,
    name: "Heart",
    symbol: "❤️",
    image: "/dice-faces/heart.png",
    border: "border-rose-300 hover:border-rose-500",
    activeBorder: "border-rose-600 ring-2 ring-rose-200",
    text: "text-rose-700",
    bg: "bg-rose-50",
    badge: "bg-rose-100 text-rose-800",
  },
  {
    id: 4,
    name: "Leaf",
    symbol: "🍀",
    image: "/dice-faces/leaf.png",
    border: "border-emerald-300 hover:border-emerald-500",
    activeBorder: "border-emerald-600 ring-2 ring-emerald-200",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    id: 5,
    name: "Tree",
    symbol: "🌲",
    image: "/dice-faces/tree.png",
    border: "border-amber-300 hover:border-amber-500",
    activeBorder: "border-amber-600 ring-2 ring-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    id: 6,
    name: "Crown",
    symbol: "👑",
    image: "/dice-faces/crown.png",
    border: "border-yellow-300 hover:border-yellow-500",
    activeBorder: "border-yellow-600 ring-2 ring-yellow-200",
    text: "text-yellow-700",
    bg: "bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-800",
  },
];

interface RoundHistory {
  roundNumber: number;
  diceResults: number[];
  phase: string;
  totalBetsAmount: number;
  totalPayoutAmount: number;
  createdAt: string;
}

export default function GamePanelPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Live Game state from backend
  const [roundNumber, setRoundNumber] = useState(1001);
  const [gamePhase, setGamePhase] = useState<"BETTING_OPEN" | "ROLLING" | "SETTLED">("BETTING_OPEN");
  const [gameMode, setGameMode] = useState<"AUTOMATIC" | "MANUAL" | "STOPPED">("AUTOMATIC");
  const [timeLeft, setTimeLeft] = useState(30);
  const [betTimeSeconds, setBetTimeSeconds] = useState(30);
  const [rollTimeSeconds, setRollTimeSeconds] = useState(8);
  const [intervalTimeSeconds, setIntervalTimeSeconds] = useState(10);
  const [minProfitPercentage, setMinProfitPercentage] = useState<number | null>(null);
  const [customProfitInput, setCustomProfitInput] = useState<string>("");
  const [profitSaving, setProfitSaving] = useState(false);
  const [stopMessage, setStopMessage] = useState<string | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  // Staged Manual Dice (1 to 6)
  const [dice, setDice] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [activeSlot, setActiveSlot] = useState<number>(0); // 0 to 5
  const [serverPresetDice, setServerPresetDice] = useState<number[] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Real Bet Pools from backend
  const [betPools, setBetPools] = useState<{ [faceId: number]: { totalAmount: number; bettorsCount: number } }>({
    1: { totalAmount: 0, bettorsCount: 0 },
    2: { totalAmount: 0, bettorsCount: 0 },
    3: { totalAmount: 0, bettorsCount: 0 },
    4: { totalAmount: 0, bettorsCount: 0 },
    5: { totalAmount: 0, bettorsCount: 0 },
    6: { totalAmount: 0, bettorsCount: 0 },
  });

  // History of rounds from backend
  const [history, setHistory] = useState<RoundHistory[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Sync with live server state every 1 second
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await api.get("/api/game/state");
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setRoundNumber(d.roundNumber);
          setGamePhase(d.phase);
          setGameMode(d.mode);
          setTimeLeft(d.timeLeft);
          setBetTimeSeconds(d.betTimeSeconds || 30);
          setRollTimeSeconds(d.rollTimeSeconds || 8);
          setIntervalTimeSeconds(d.intervalTimeSeconds || 10);
          setServerPresetDice(d.presetDice || null);
          if (d.minProfitPercentage !== undefined) {
            setMinProfitPercentage(d.minProfitPercentage);
          }
          if (d.stopMessage !== undefined) {
            setStopMessage(d.stopMessage || null);
          }

          // If round is currently rolling or settled, show the live outcome dice
          if (d.phase === "ROLLING" || d.phase === "SETTLED") {
            if (Array.isArray(d.diceResults)) {
              setDice(d.diceResults.map((v: any) => Number(v)));
            }
          } else if (d.presetDice && Array.isArray(d.presetDice) && d.presetDice.length === 6) {
            setDice(d.presetDice.map((v: any) => Number(v)));
          }

          if (d.betPools) {
            setBetPools(d.betPools);
          }
          if (Array.isArray(d.recentHistory)) {
            setHistory(d.recentHistory);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live game state:", err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Admin Control Handlers
  const handleSetMode = async (mode: "AUTOMATIC" | "MANUAL" | "STOPPED") => {
    if (mode === "STOPPED") {
      setIsStopModalOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      await api.post("/api/game/control", {
        mode,
        action: "start",
      });
      setGameMode(mode);
      setStopMessage(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update game mode");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmStopGame = async (message: string) => {
    setActionLoading(true);
    try {
      await api.post("/api/game/control", {
        mode: "STOPPED",
        action: "stop",
        stopMessage: message,
      });
      setGameMode("STOPPED");
      setStopMessage(message);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to stop game");
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTimers = async (betTime: number, rollTime: number, intervalTime: number) => {
    setActionLoading(true);
    try {
      await api.post("/api/game/control", {
        betTimeSeconds: betTime,
        rollTimeSeconds: rollTime,
        intervalTimeSeconds: intervalTime,
      });
      setBetTimeSeconds(betTime);
      setRollTimeSeconds(rollTime);
      setIntervalTimeSeconds(intervalTime);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update timers");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetMinProfit = async (pct: number | null) => {
    setProfitSaving(true);
    try {
      await api.post("/api/game/control", {
        minProfitPercentage: pct,
      });
      setMinProfitPercentage(pct);
      if (pct !== null) {
        setCustomProfitInput(String(pct));
      } else {
        setCustomProfitInput("");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update minimum profit target");
    } finally {
      setProfitSaving(false);
    }
  };

  const handleApplyCustomProfit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(customProfitInput);
    if (isNaN(val) || val <= 0) {
      handleSetMinProfit(null);
    } else {
      const clamped = Math.min(95, Math.max(1, Math.round(val)));
      handleSetMinProfit(clamped);
    }
  };

  const handleTriggerAction = async (action: "roll_now" | "next_round" | "start" | "stop") => {
    setActionLoading(true);
    try {
      await api.post("/api/game/control", { action });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to execute action");
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Assign face to active slot and auto-advance to next slot
  const handlePickFaceForActiveSlot = async (faceId: number) => {
    const updated = [...dice];
    updated[activeSlot] = faceId;
    setDice(updated);

    // Auto-advance to next slot for rapid sequential entry (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0)
    setActiveSlot((prev) => (prev + 1) % 6);

    try {
      await api.post("/api/game/control", { manualDice: updated });
      setServerPresetDice(updated);
    } catch (err: any) {
      console.error("Failed to set manual dice:", err);
    }
  };

  // 2. Set single die directly
  const handleSetDirectSlot = async (slotIdx: number, faceId: number) => {
    const updated = [...dice];
    updated[slotIdx] = faceId;
    setDice(updated);
    setActiveSlot(slotIdx);

    try {
      await api.post("/api/game/control", { manualDice: updated });
      setServerPresetDice(updated);
    } catch (err: any) {
      console.error("Failed to set manual dice:", err);
    }
  };

  // 3. Set All 6 Dice to one face
  const handleSetAllToFace = async (faceId: number) => {
    const outcome = [faceId, faceId, faceId, faceId, faceId, faceId];
    setDice(outcome);
    try {
      await api.post("/api/game/control", { manualDice: outcome });
      setServerPresetDice(outcome);
    } catch (err: any) {
      console.error("Failed to set dice to face:", err);
    }
  };

  // 4. Comprehensive Smart Presets
  const applyPreset = async (
    presetType:
      | "all_bats"
      | "all_diamonds"
      | "all_hearts"
      | "all_leaves"
      | "all_trees"
      | "all_crowns"
      | "straight"
      | "five_kind"
      | "four_kind"
      | "full_house"
      | "lowest_pool"
      | "lowest_split"
      | "highest_pool"
      | "random"
  ) => {
    let outcome = [1, 2, 3, 4, 5, 6];

    // Face sorting by pool amount
    const sortedPools = DICE_FACES.map((f) => ({
      id: f.id,
      amount: betPools[f.id]?.totalAmount || 0,
    })).sort((a, b) => a.amount - b.amount);

    const lowestFace = sortedPools[0]?.id || 1;
    const secondLowestFace = sortedPools[1]?.id || 2;
    const highestFace = sortedPools[sortedPools.length - 1]?.id || 6;

    switch (presetType) {
      case "all_bats":
        outcome = [1, 1, 1, 1, 1, 1];
        break;
      case "all_diamonds":
        outcome = [2, 2, 2, 2, 2, 2];
        break;
      case "all_hearts":
        outcome = [3, 3, 3, 3, 3, 3];
        break;
      case "all_leaves":
        outcome = [4, 4, 4, 4, 4, 4];
        break;
      case "all_trees":
        outcome = [5, 5, 5, 5, 5, 5];
        break;
      case "all_crowns":
        outcome = [6, 6, 6, 6, 6, 6];
        break;
      case "lowest_pool":
        outcome = [lowestFace, lowestFace, lowestFace, lowestFace, lowestFace, lowestFace];
        break;
      case "lowest_split":
        outcome = [lowestFace, lowestFace, lowestFace, secondLowestFace, secondLowestFace, secondLowestFace];
        break;
      case "highest_pool":
        outcome = [highestFace, highestFace, highestFace, highestFace, highestFace, highestFace];
        break;
      case "straight":
        outcome = [1, 2, 3, 4, 5, 6];
        break;
      case "five_kind":
        outcome = [6, 6, 6, 6, 6, 1];
        break;
      case "four_kind":
        outcome = [3, 3, 3, 3, 2, 2];
        break;
      case "full_house":
        outcome = [4, 4, 4, 5, 5, 5];
        break;
      case "random":
        outcome = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
        break;
    }

    setDice(outcome);
    try {
      await api.post("/api/game/control", { manualDice: outcome });
      setServerPresetDice(outcome);
    } catch (err: any) {
      console.error("Failed to send preset:", err);
    }
  };

  // Pattern recognition helper
  const getPatternName = (diceValues: number[]) => {
    if (!diceValues || diceValues.length === 0) return "Awaiting Roll";
    const freq: Record<number, number> = {};
    diceValues.forEach((d) => (freq[d] = (freq[d] || 0) + 1));
    const maxFreq = Math.max(...Object.values(freq));
    const sorted = [...diceValues].sort((a, b) => a - b);
    const isStraight = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1);

    if (maxFreq === 6) return "🎰 Hextuples (6 of a kind)";
    if (maxFreq === 5) return "⭐ Five of a Kind (5x)";
    if (maxFreq === 4) return "🔥 Four of a Kind (4x)";
    if (isStraight) return "⚡ Straight (1-6)";
    if (maxFreq === 3) return "✨ Three of a Kind (3x)";
    if (Object.values(freq).filter((f) => f === 2).length === 2) return "Two Pairs";
    if (maxFreq === 2) return "One Pair";
    return "Mixed Roll";
  };

  // Metrics
  const totalBetPool = Object.values(betPools).reduce((sum, b) => sum + (b?.totalAmount || 0), 0);
  const totalBettors = Object.values(betPools).reduce((sum, b) => sum + (b?.bettorsCount || 0), 0);
  const isRolling = gamePhase === "ROLLING";

  // Min and Max pools calculation for visual badges
  const poolAmounts = Object.values(betPools).map((b) => b.totalAmount || 0);
  const maxPoolAmount = Math.max(...poolAmounts, 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Clean Navigation Bar (Fully Responsive) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 shadow-xs">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Left Block: Back Button, Brand Icon & Title with Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
            {/* Top Navigation Row on Mobile (Back button + Mobile Status Chip) */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors gap-1.5 border-slate-300 font-medium text-xs h-8 sm:h-9 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Button>

              {/* Mobile-only compact Round & Phase Chip */}
              <div className="flex md:hidden items-center gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-2xs">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">ROUND</span>
                  <span className="text-xs font-extrabold text-indigo-700 font-mono">#{roundNumber}</span>
                  <div className="h-3 w-[1px] bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-800 uppercase">{gamePhase.replace("_", " ")}</span>
                </div>
              </div>
            </div>

            {/* Desktop Divider */}
            <div className="hidden sm:block h-6 w-[1px] bg-slate-200 shrink-0" />

            {/* Brand Title and Mode Indicators */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Goodgudi Control Room
                  </h1>
                  <Badge className={`border text-[10px] sm:text-xs px-2 py-0.5 font-bold ${
                    gameMode === "AUTOMATIC"
                      ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                      : gameMode === "MANUAL"
                      ? "bg-amber-100 border-amber-300 text-amber-800"
                      : "bg-rose-100 border-rose-300 text-rose-800"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current" />
                    {gameMode} MODE
                  </Badge>
                  {gameMode === "AUTOMATIC" && minProfitPercentage && minProfitPercentage > 0 && (
                    <Badge className="bg-emerald-600 text-white border-0 text-[10px] sm:text-xs px-2 py-0.5 font-bold shadow-2xs">
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                      ≥{minProfitPercentage}% Min Profit
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {gameMode === "MANUAL"
                    ? "Manual Mode Active: Admin controls dice outcomes or falls back to automatic"
                    : gameMode === "STOPPED"
                    ? `Game Paused: "${stopMessage || "Game temporarily paused by admin"}"`
                    : minProfitPercentage && minProfitPercentage > 0
                    ? `Automatic Mode Active: Profit Engine guaranteeing ≥ ${minProfitPercentage}% house margin with winner payouts`
                    : "Automatic Mode Active: Continuous randomized rounds with auto-settlement"}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Right Live Status Indicators */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xs">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">ACTIVE ROUND</div>
                <div className="text-sm font-extrabold text-indigo-700 font-mono">#{roundNumber}</div>
              </div>
              <div className="h-6 w-[1px] bg-slate-300" />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">PHASE</div>
                <div className="text-xs font-bold text-slate-800 uppercase">{gamePhase.replace("_", " ")}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace (Responsive 2-Column Layout) */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 Cols): Mode Controls, Betting Pools & Fast Dice Builder */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          {/* Active Stop Notice Banner when game is STOPPED */}
          {gameMode === "STOPPED" && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs shrink-0 mt-0.5 sm:mt-0">
                  <Pause className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-rose-950 uppercase tracking-wider">
                      Game Is Currently Stopped
                    </span>
                    <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                      Broadcasting to Mobile App
                    </Badge>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 font-medium">
                    Player Screen Message:{" "}
                    <span className="font-bold text-slate-900 bg-white/90 px-2 py-0.5 rounded border border-rose-200 italic">
                      "{stopMessage || "Game is temporarily paused by admin. Please check back shortly."}"
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsStopModalOpen(true)}
                  className="text-xs font-bold border-rose-300 text-rose-800 bg-white hover:bg-rose-100 h-9"
                >
                  Edit Notice
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSetMode("AUTOMATIC")}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  Resume (Auto)
                </Button>
              </div>
            </div>
          )}

          {/* 1. Mode Selector & Timer Configuration Card */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Game Mode & Round Timing Controls
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50 font-medium">
                Authoritative Server
              </Badge>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Mode Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Engine Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => handleSetMode("AUTOMATIC")}
                    className={`text-xs font-bold transition-all h-9 ${
                      gameMode === "AUTOMATIC"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    Auto
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSetMode("MANUAL")}
                    className={`text-xs font-bold transition-all h-9 ${
                      gameMode === "MANUAL"
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1" />
                    Manual
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsStopModalOpen(true);
                    }}
                    className={`text-xs font-bold transition-all h-9 ${
                      gameMode === "STOPPED"
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5 mr-1" />
                    {gameMode === "STOPPED" ? "Notice" : "Stop"}
                  </Button>
                </div>
              </div>

              {/* Bet Timer Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">1. Betting Time</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 45, 60].map((sec) => (
                    <Button
                      key={sec}
                      size="sm"
                      onClick={() => handleUpdateTimers(sec, rollTimeSeconds, intervalTimeSeconds)}
                      className={`text-xs h-9 font-bold transition-all ${
                        betTimeSeconds === sec
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sec}s
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rolling / Settlement Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">2. Rolling Time</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[5, 8, 12].map((sec) => (
                    <Button
                      key={sec}
                      size="sm"
                      onClick={() => handleUpdateTimers(betTimeSeconds, sec, intervalTimeSeconds)}
                      className={`text-xs h-9 font-bold transition-all ${
                        rollTimeSeconds === sec
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sec}s
                    </Button>
                  ))}
                </div>
              </div>

              {/* Next Round Interval / Result Display Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">3. Result Wait Time</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[5, 10, 15].map((sec) => (
                    <Button
                      key={sec}
                      size="sm"
                      onClick={() => handleUpdateTimers(betTimeSeconds, rollTimeSeconds, sec)}
                      className={`text-xs h-9 font-bold transition-all ${
                        intervalTimeSeconds === sec
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sec}s
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>

            {/* Auto Mode Minimum Profit Target Engine (Displayed ONLY when in AUTOMATIC mode) */}
            {gameMode === "AUTOMATIC" && (
              <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Auto-Mode Minimum Profit Target
                        </span>
                        {minProfitPercentage && minProfitPercentage > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px] px-2 py-0.5">
                            <Check className="w-3 h-3 mr-1 inline" />
                            {minProfitPercentage}% Guaranteed Margin Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-300 bg-white font-medium text-[11px]">
                            Off (100% Pure Random)
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Optional: In Auto Mode, the engine calculates results so the game guarantees at least this profit % from the round's total bets, while rewarding winning players whenever possible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">Presets:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={profitSaving}
                      onClick={() => handleSetMinProfit(null)}
                      className={`text-xs h-9 px-3 font-bold transition-all ${
                        minProfitPercentage === null || minProfitPercentage <= 0
                          ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      Off (Random)
                    </Button>
                    {[10, 20, 30, 40, 50].map((pct) => (
                      <Button
                        key={pct}
                        size="sm"
                        variant="outline"
                        disabled={profitSaving}
                        onClick={() => handleSetMinProfit(pct)}
                        className={`text-xs h-9 px-3 font-bold transition-all ${
                          minProfitPercentage === pct
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>

                  {/* Custom Percentage Input Form */}
                  <form onSubmit={handleApplyCustomProfit} className="flex items-center gap-2">
                    <div className="relative w-36">
                      <Input
                        type="number"
                        min={1}
                        max={95}
                        step={1}
                        placeholder="Custom %"
                        value={customProfitInput}
                        onChange={(e) => setCustomProfitInput(e.target.value)}
                        className="h-9 pr-7 text-xs font-bold text-slate-800 bg-white"
                        disabled={profitSaving}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={profitSaving || !customProfitInput}
                      className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-3"
                    >
                      {profitSaving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Set Target"
                      )}
                    </Button>
                    {minProfitPercentage !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetMinProfit(null)}
                        className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                        title="Disable Profit Constraint"
                      >
                        Reset
                      </Button>
                    )}
                  </form>
                </div>

                {/* Dynamic Live Calculation Card */}
                <div className="mt-3.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${minProfitPercentage ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      {minProfitPercentage && minProfitPercentage > 0 ? (
                        <div>
                          <span className="font-bold text-slate-800">
                            Active Protection: Round #{roundNumber}
                          </span>
                          <div className="text-slate-600 mt-0.5">
                            Round Pool: <strong className="font-mono text-slate-900">₹{totalBetPool.toLocaleString()}</strong>
                            <span className="mx-1.5 text-slate-300">|</span>
                            Target House Profit: <strong className="font-mono text-emerald-700">≥ ₹{Math.round(totalBetPool * (minProfitPercentage / 100)).toLocaleString()} ({minProfitPercentage}%)</strong>
                            <span className="mx-1.5 text-slate-300">|</span>
                            Allowed Winner Payouts: <strong className="font-mono text-indigo-700">≤ ₹{Math.round(totalBetPool * (1 - minProfitPercentage / 100)).toLocaleString()}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          <span className="font-bold text-slate-700">Status: Pure Random Mode.</span> All dice faces have an unbiased 1-in-6 probability with standard payout returns.
                        </div>
                      )}
                    </div>
                  </div>

                  {minProfitPercentage && minProfitPercentage > 0 && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold self-start sm:self-auto shrink-0 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Pays winners while protecting ≥{minProfitPercentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* 2. LIVE PLAYER BETTING POOLS */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Live Player Betting Pools (Round #{roundNumber})
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-normal">
                    Real-time player distribution across all 6 faces — analyze live bets to stage manual dice
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Pool Placed</span>
                <strong className="text-emerald-700 font-mono text-base font-black">₹{totalBetPool.toLocaleString()}</strong>
                <span className="text-[11px] text-slate-500 ml-1 font-medium">({totalBettors} active bets)</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {DICE_FACES.map((face) => {
                const pool = betPools[face.id] || { totalAmount: 0, bettorsCount: 0 };
                const percentage = totalBetPool > 0 ? Math.round((pool.totalAmount / totalBetPool) * 100) : 0;
                const isZeroRisk = pool.totalAmount === 0 && totalBetPool > 0;
                const isHighestPool = pool.totalAmount > 0 && pool.totalAmount === maxPoolAmount;

                return (
                  <div
                    key={face.id}
                    className={`rounded-2xl border-2 p-3.5 flex flex-col items-center justify-between text-center transition-all bg-white hover:shadow-md relative ${
                      isHighestPool
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : isZeroRisk
                        ? "border-emerald-300 ring-2 ring-emerald-100"
                        : face.border
                    }`}
                  >
                    {/* Visual Risk Tag */}
                    {isZeroRisk ? (
                      <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-xs">
                        💎 0 Bets (Max Profit)
                      </span>
                    ) : isHighestPool ? (
                      <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs">
                        🔥 Heaviest Pool
                      </span>
                    ) : null}

                    <div className="p-2 rounded-xl bg-slate-50 mt-1 mb-1">
                      <img src={face.image} alt={face.name} className="w-10 h-10 object-contain drop-shadow-sm" />
                    </div>

                    <div className={`text-xs font-black uppercase tracking-wider ${face.text}`}>{face.name}</div>

                    <div className="mt-2 text-lg font-black text-slate-900 font-mono">
                      ₹{pool.totalAmount.toLocaleString()}
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {pool.bettorsCount} bets ({percentage}%)
                    </div>

                    {/* Share Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighestPool ? "bg-rose-500" : isZeroRisk ? "bg-emerald-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Quick 1-Click Action for Manual Mode */}
                    {gameMode === "MANUAL" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetAllToFace(face.id)}
                        className="w-full mt-2.5 text-[10px] h-7 font-bold border-slate-300 hover:bg-indigo-50 hover:border-indigo-400 text-slate-700"
                      >
                        Set All 6x {face.name}
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 3. ULTRA-CLEAR INTERACTIVE 6-DICE STAGE & LARGE VISUAL SELECTOR */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Interactive 6-Dice Stage & Manual Face Builder
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-normal">
                    Select any of the 6 slots, then tap any face button below for rapid 1-click configuration
                  </p>
                </div>
              </div>

              {/* Big Visual Countdown Pill */}
              <div className={`px-4 py-1.5 rounded-2xl border flex items-center gap-3 shadow-xs ${
                gamePhase === "BETTING_OPEN"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : isRolling
                  ? "bg-amber-50 border-amber-300 text-amber-800 animate-pulse"
                  : "bg-indigo-50 border-indigo-300 text-indigo-800"
              }`}>
                <Clock className="w-4 h-4" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase opacity-90">
                    {gamePhase === "BETTING_OPEN" ? "BETTING:" : isRolling ? "ROLLING:" : "NEXT ROUND:"}
                  </span>
                  <span className="text-xl font-black font-mono leading-none">
                    {timeLeft}s
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex flex-col gap-6">
              {/* Status Banner */}
              {gameMode === "MANUAL" && (
                <div className={`w-full px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                  serverPresetDice
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                }`}>
                  <div className="flex items-center gap-2">
                    {serverPresetDice ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <strong>
                        {serverPresetDice
                          ? `Configured Outcome for Round #${roundNumber}:`
                          : "Manual Mode Ready:"}
                      </strong>{" "}
                      {serverPresetDice ? (
                        <span className="font-mono font-bold text-emerald-700">
                          [{serverPresetDice.map((d) => DICE_FACES.find((f) => f.id === d)?.name || d).join(", ")}] — Active!
                        </span>
                      ) : (
                        <span>
                          Pick 6 faces below before countdown ends (fallback: auto random if not set).
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-slate-600">
                    Pattern: <strong className="text-indigo-700">{getPatternName(dice)}</strong>
                  </div>
                </div>
              )}

              {/* 6 LARGE DICE SLOTS RACK */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    6 Dice Slots (Active: Slot #{activeSlot + 1})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveSlot((prev) => (prev === 0 ? 5 : prev - 1))}
                      className="h-7 text-xs text-slate-600 hover:text-indigo-600 px-2"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Prev Slot
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveSlot((prev) => (prev + 1) % 6)}
                      className="h-7 text-xs text-slate-600 hover:text-indigo-600 px-2"
                    >
                      Next Slot
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full">
                  {dice.map((faceVal, idx) => {
                    const faceMeta = DICE_FACES.find((f) => f.id === faceVal) || DICE_FACES[0];
                    const isActive = activeSlot === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveSlot(idx)}
                        className={`rounded-2xl border-2 p-3.5 flex flex-col items-center justify-between text-center transition-all bg-white cursor-pointer relative ${
                          isActive
                            ? "border-indigo-600 ring-4 ring-indigo-100 shadow-md scale-[1.02]"
                            : "border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Slot Tag */}
                        <div className="w-full flex items-center justify-between">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                          }`}>
                            Die #{idx + 1}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        {/* Large Clear PNG Image */}
                        <div className="my-3 p-1">
                          <img
                            src={faceMeta.image}
                            alt={faceMeta.name}
                            className={`w-14 h-14 object-contain drop-shadow-sm transition-transform ${
                              isRolling ? "animate-bounce" : ""
                            }`}
                          />
                        </div>

                        {/* Face Name Badge */}
                        <div className={`w-full py-1 rounded-lg text-xs font-black uppercase tracking-wider ${faceMeta.bg} ${faceMeta.text}`}>
                          {faceMeta.symbol} {faceMeta.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DEDICATED LARGE 6-FACE PALETTE SELECTOR (Direct, Big, High-Contrast Buttons) */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Tap Face to Assign &rarr; <span className="text-indigo-600 font-black">Die #{activeSlot + 1}</span>:
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (Auto-advances to next slot on tap)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {DICE_FACES.map((face) => (
                    <button
                      key={face.id}
                      onClick={() => handlePickFaceForActiveSlot(face.id)}
                      className={`p-3 rounded-xl border-2 bg-white flex flex-col items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all hover:scale-105 active:scale-95 group ${face.border}`}
                    >
                      <img src={face.image} alt={face.name} className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                      <span className={`text-xs font-black uppercase tracking-wider ${face.text}`}>
                        {face.symbol} {face.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* COMPREHENSIVE SMART PRESETS MATRIX */}
              <div className="w-full flex flex-col gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Complete Smart Presets Matrix
                  </span>
                  <span className="text-xs text-slate-500 font-medium">1-Click instant configuration</span>
                </div>

                {/* Category 1: Single Face Multipliers */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 min-w-[100px]">All 6x Multipliers:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_bats")}
                    className="text-xs h-8 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/bat.png" alt="Bat" className="w-3.5 h-3.5 object-contain" />
                    All Bats
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_diamonds")}
                    className="text-xs h-8 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/diamond.png" alt="Diamond" className="w-3.5 h-3.5 object-contain" />
                    All Diamonds
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_hearts")}
                    className="text-xs h-8 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/heart.png" alt="Heart" className="w-3.5 h-3.5 object-contain" />
                    All Hearts
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_leaves")}
                    className="text-xs h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/leaf.png" alt="Leaf" className="w-3.5 h-3.5 object-contain" />
                    All Leaves
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_trees")}
                    className="text-xs h-8 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/tree.png" alt="Tree" className="w-3.5 h-3.5 object-contain" />
                    All Trees
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset("all_crowns")}
                    className="text-xs h-8 border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 gap-1 font-semibold"
                  >
                    <img src="/dice-faces/crown.png" alt="Crown" className="w-3.5 h-3.5 object-contain" />
                    All Crowns
                  </Button>
                </div>

                {/* Category 3: Combos & Action Triggers */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 min-w-[100px]">Casino Combos:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset("straight")}
                      className="text-xs h-8 border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 gap-1 font-semibold"
                    >
                      ⚡ Straight (1-6)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset("five_kind")}
                      className="text-xs h-8 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1 font-semibold"
                    >
                      ⭐ Five of Kind (5x+1)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset("four_kind")}
                      className="text-xs h-8 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 gap-1 font-semibold"
                    >
                      🔥 Four of Kind (4x+2x)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset("full_house")}
                      className="text-xs h-8 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 gap-1 font-semibold"
                    >
                      ✨ Full House (3x+3x)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyPreset("random")}
                      className="text-xs h-8 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 gap-1 font-semibold"
                    >
                      🎲 Randomize
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTriggerAction("roll_now")}
                      disabled={actionLoading || isRolling}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs gap-1.5 text-xs h-9"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Force Roll Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTriggerAction("next_round")}
                      disabled={actionLoading}
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold gap-1.5 text-xs h-9"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Advance Round
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (4 Cols): STICKY, SELF-CONTAINED RESPONSIVE ROUND HISTORY */}
        <div className="lg:col-span-4 w-full sticky top-20">
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col max-h-[calc(100vh-6.5rem)] overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Recent Rounds History
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600 bg-white font-medium">
                Live Audit
              </Badge>
            </CardHeader>
            <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-2.5">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No settled rounds yet. Game loop will record outcomes automatically.
                </div>
              ) : (
                history.map((rh, idx) => {
                  const diceArr = Array.isArray(rh.diceResults) ? rh.diceResults.map((v: any) => Number(v)) : [];
                  const pattern = getPatternName(diceArr);
                  const profit = (rh.totalBetsAmount || 0) - (rh.totalPayoutAmount || 0);

                  return (
                    <div
                      key={idx}
                      className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col gap-2 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700 font-mono">
                            Round #{rh.roundNumber}
                          </span>
                          <Badge className="text-[9px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0 font-semibold">
                            {rh.phase}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rh.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      {/* 6 Dice Icons */}
                      <div className="flex items-center gap-1.5 py-1">
                        {diceArr.map((d, dIdx) => {
                          const face = DICE_FACES.find((f) => f.id === d);
                          return (
                            <div
                              key={dIdx}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shadow-2xs"
                            >
                              {face?.image ? (
                                <img src={face.image} alt={face.name} className="w-5 h-5 object-contain" />
                              ) : (
                                "🎲"
                              )}
                            </div>
                          );
                        })}
                        <span className="text-[11px] font-bold text-amber-700 ml-1 truncate">
                          {pattern}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/80">
                        <span className="text-slate-600">
                          Total Bets: <strong className="text-slate-900 font-mono font-bold">₹{(rh.totalBetsAmount || 0).toLocaleString()}</strong>
                        </span>
                        <span className={`font-mono font-bold ${profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          House: {profit >= 0 ? `+₹${profit.toLocaleString()}` : `-₹${Math.abs(profit).toLocaleString()}`}
                          {rh.totalBetsAmount > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({Math.round((profit / rh.totalBetsAmount) * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      {/* Stop Game Reason Dialog */}
      <StopGameDialog
        open={isStopModalOpen}
        onOpenChange={setIsStopModalOpen}
        currentMessage={stopMessage}
        isAlreadyStopped={gameMode === "STOPPED"}
        onConfirm={handleConfirmStopGame}
      />
    </div>
  );
}
