"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  EyeOff,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PlayerData {
  id: string;
  name: string;
  mobile: string | null;
  walletBalance: number;
}

interface UpdateWalletDialogProps {
  player: PlayerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateWalletDialog({
  player,
  open,
  onOpenChange,
  onSuccess,
}: UpdateWalletDialogProps) {
  const [actionType, setActionType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isHidden, setIsHidden] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      setIsHidden(false);
      setError(null);
      setSuccess(false);
      setActionType("deposit");
    }
  }, [open, player]);

  if (!player) return null;

  const currentBalance = Number(player.walletBalance) || 0;
  const numAmount = parseFloat(amount) || 0;
  const calculatedNewBalance =
    actionType === "deposit"
      ? currentBalance + numAmount
      : Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    if (actionType === "withdraw" && numAmount > currentBalance) {
      setError(
        `Withdrawal amount (₹${numAmount}) exceeds current balance (₹${currentBalance}).`
      );
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        actionType === "deposit"
          ? "/api/transactions/deposit"
          : "/api/transactions/withdraw";

      await api.post(endpoint, {
        userId: player.id,
        amount: numAmount,
        note: note.trim() || undefined,
        isHidden: isHidden,
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onOpenChange(false);
      }, 700);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update wallet.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Update Wallet Balance
          </DialogTitle>
          <DialogDescription>
            Modify wallet balance for <span className="font-semibold text-foreground">{player.name}</span>{" "}
            {player.mobile ? `(${player.mobile})` : ""}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Wallet updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Action Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg">
            <button
              type="button"
              onClick={() => setActionType("deposit")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                actionType === "deposit"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Deposit (+)
            </button>
            <button
              type="button"
              onClick={() => setActionType("withdraw")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                actionType === "withdraw"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw (-)
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount (₹) <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                className="pl-8 text-base font-medium"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading || success}
                required
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/40 font-mono"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Balance Preview Card */}
          <div className="p-3 rounded-lg bg-card/60 border border-border/50 text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Current Balance:</span>
              <span className="font-mono">₹{currentBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Adjustment:</span>
              <span
                className={`font-mono font-semibold ${
                  actionType === "deposit" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {actionType === "deposit" ? "+" : "-"}₹{numAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border/40 pt-1 flex justify-between font-medium text-foreground">
              <span>Resulting Balance:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                ₹{calculatedNewBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Remarks / Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-sm font-medium">
              Reason / Note <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="note"
              placeholder="e.g. Tournament reward, manual fix..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Hide from User Toggle */}
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {isHidden ? (
                  <EyeOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
                <span>Hide from Player History</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If enabled, this transaction will not show up in the player's transaction list in their mobile app.
              </p>
            </div>
            <Switch
              checked={isHidden}
              onCheckedChange={setIsHidden}
              disabled={loading || success}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className={
                actionType === "deposit"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                  : "bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Processing...
                </>
              ) : actionType === "deposit" ? (
                "Confirm Deposit"
              ) : (
                "Confirm Withdrawal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
