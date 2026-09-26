"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Pause,
  AlertTriangle,
  Radio,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

interface StopGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMessage?: string | null;
  isAlreadyStopped?: boolean;
  onConfirm: (message: string) => Promise<void>;
}

const PRESET_MESSAGES = [
  "🛠️ Server Maintenance. We will be back shortly!",
  "⏸️ Game is temporarily paused by admin.",
  "⏳ Short Intermission. Next round starting soon!",
  "⚖️ Routine system balancing and updates in progress.",
];

export function StopGameDialog({
  open,
  onOpenChange,
  currentMessage,
  isAlreadyStopped = false,
  onConfirm,
}: StopGameDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMessage(
        currentMessage || "🛠️ Server Maintenance. We will be back shortly!"
      );
      setError(null);
    }
  }, [open, currentMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please enter a notice message for the players.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update stop message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                {isAlreadyStopped ? "Update Game Pause Notice" : "Pause & Stop Goodgudi Game"}
                <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                  Live Broadcast
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                This notice will be immediately broadcast to all players in the mobile app.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Notice Presets
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_MESSAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(preset)}
                  className={`text-left text-[11px] p-2 rounded-xl border transition-all ${
                    message === preset
                      ? "border-rose-500 bg-rose-50 text-rose-900 font-semibold ring-1 ring-rose-300"
                      : "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stop-message" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Custom Notice to Players <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {message.length}/200
              </span>
            </div>
            <textarea
              id="stop-message"
              rows={3}
              maxLength={200}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Server maintenance in progress. We will be back at 8:00 PM!"
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none resize-none bg-slate-50/40 text-slate-900"
            />
          </div>

          {/* Live Mobile Screen Preview */}
          <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              <Radio className="w-3 h-3 animate-pulse text-rose-400" />
              Player Mobile Screen Live Preview
            </div>
            <p className="text-xs text-slate-200 italic font-medium pl-1">
              "{message || "Game is temporarily paused by admin. Please check back shortly."}"
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !message.trim()}
              className="text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isAlreadyStopped ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              {isAlreadyStopped ? "Update Notice Message" : "Confirm & Pause Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
