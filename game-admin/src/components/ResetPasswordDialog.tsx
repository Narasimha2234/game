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
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Share2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  User,
} from "lucide-react";

interface PlayerData {
  id: string;
  name: string;
  mobile: string | null;
  email?: string | null;
  walletBalance?: number;
  isActive?: boolean;
}

interface ResetPasswordDialogProps {
  player: PlayerData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({
  player,
  open,
  onOpenChange,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [savedPassword, setSavedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError(null);
      setSuccess(false);
      setSavedPassword("");
      setCopied(false);
    }
  }, [open, player]);

  if (!player) return null;

  const generateRandomPassword = (type: "pin" | "mixed") => {
    setError(null);
    let pwd = "";
    if (type === "pin") {
      // 6-digit numeric PIN
      pwd = Math.floor(100000 + Math.random() * 900000).toString();
    } else {
      // Strong mixed password with letters and numbers
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      let randomStr = "";
      for (let i = 0; i < 6; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      pwd = `Good#${randomStr}`;
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/api/users/${player.id}/password`, {
        password: trimmedPassword,
      });

      setSavedPassword(trimmedPassword);
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to reset password. Please check backend connection.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getShareText = () => {
    return (
      `🎮 *Goodgudi Account Login Credentials*\n\n` +
      `👤 *Player Name:* ${player.name || "Player"}\n` +
      `📱 *Login Mobile:* ${player.mobile || "Your registered mobile"}\n` +
      `🔑 *New Password:* ${savedPassword}\n\n` +
      `You can now open Goodgudi app, login with your credentials and enjoy playing!`
    );
  };

  const handleCopyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const cleanMobile = player.mobile ? player.mobile.replace(/\D/g, "") : "";
  const whatsappUrl = cleanMobile
    ? `https://wa.me/${cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile}?text=${encodeURIComponent(getShareText())}`
    : `https://wa.me/?text=${encodeURIComponent(getShareText())}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="gap-1.5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Reset Player Password</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a new login password for {player.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Player Info Summary Badge */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">{player.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span className="font-mono">{player.mobile || "No mobile registered"}</span>
              </div>
            </div>
          </div>
          {player.isActive !== false ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-normal">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px] font-normal text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS STATE WITH DIRECT SHARING OPTIONS */}
        {success ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-emerald-300">
                Password Changed Successfully!
              </h4>
              <p className="text-xs text-muted-foreground">
                The new password is now active. Share these credentials with the player so they can log in.
              </p>
            </div>

            {/* Credential summary box */}
            <div className="p-3.5 rounded-lg bg-background border border-border/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Login Mobile:</span>
                <span className="font-mono font-semibold text-foreground">
                  {player.mobile || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
                <span className="text-muted-foreground">New Password:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {savedPassword}
                </span>
              </div>
            </div>

            {/* Share / Copy Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                onClick={handleCopyCredentials}
                variant="outline"
                className={`gap-1.5 text-xs font-semibold h-10 border-border ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "hover:bg-muted"
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied Details!" : "Copy Details"}
              </Button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button
                  type="button"
                  className="w-full gap-1.5 text-xs font-semibold h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Share2 className="w-4 h-4" />
                  Share on WhatsApp
                </Button>
              </a>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full text-xs"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* FORM STATE: INPUT NEW PASSWORD */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Generator Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Quick Password Generators
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => generateRandomPassword("pin")}
                  className="text-xs h-7 gap-1 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  6-digit PIN
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => generateRandomPassword("mixed")}
                  className="text-xs h-7 gap-1 border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  Good# Password
                </Button>
              </div>
            </div>

            {/* New Password Input */}
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium">
                New Password <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 text-sm font-mono"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Set New Password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
