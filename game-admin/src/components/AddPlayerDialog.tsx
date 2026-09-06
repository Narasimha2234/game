"use client";

import React, { useState } from "react";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, DollarSign, Phone, Mail, Lock, User } from "lucide-react";

interface AddPlayerDialogProps {
  onPlayerAdded?: () => void;
}

export function AddPlayerDialog({ onPlayerAdded }: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setName("");
    setMobile("");
    setEmail("");
    setPassword("");
    setWalletBalance("");
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter the player's name.");
      return;
    }
    if (!mobile.trim()) {
      setError("Please enter the player's mobile number.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    const parsedBalance = walletBalance.trim() !== "" ? Number(walletBalance) : 0;
    if (isNaN(parsedBalance) || parsedBalance < 0) {
      setError("Wallet balance must be a valid positive number.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/users", {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() ? email.trim() : undefined,
        password,
        walletBalance: parsedBalance,
        role: "user",
      });

      setSuccess(true);
      if (onPlayerAdded) {
        onPlayerAdded();
      }

      // Close modal after brief delay
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 700);
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create player.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium">
            <UserPlus className="w-4 h-4" />
            Add Player
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            Add New Player
          </DialogTitle>
          <DialogDescription>
            Create a new game player account. You can optionally assign an initial wallet balance.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            ✓ Player created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Player Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobile" className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              Mobile Number <span className="text-red-400">*</span>
            </Label>
            <Input
              id="mobile"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email Address <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. player@game.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              Password <span className="text-red-400">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walletBalance" className="text-sm font-medium flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Initial Wallet Balance <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                id="walletBalance"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                className="pl-7"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                disabled={loading || success}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank or set to 0 for zero initial balance.
            </p>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Player"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
