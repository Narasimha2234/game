"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  ArrowDownRight,
  ArrowUpRight,
  EyeOff,
  RefreshCw,
  Receipt,
  Calendar,
} from "lucide-react";

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  note?: string;
  isHidden?: boolean;
  createdAt: string;
}

interface PlayerTransactionsDialogProps {
  player: { id: string; name: string; mobile?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerTransactionsDialog({
  player,
  open,
  onOpenChange,
}: PlayerTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && player) {
      fetchTransactions();
    }
  }, [open, player]);

  const fetchTransactions = async () => {
    if (!player) return;
    setLoading(true);
    try {
      // Include hidden transactions for admin view
      const res = await api.get(`/api/transactions/user/${player.id}?includeHidden=true`);
      setTransactions(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load player transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Transaction History
            </DialogTitle>
          </div>
          <DialogDescription>
            History for <span className="font-semibold text-foreground">{player.name}</span>
            {player.mobile ? ` (${player.mobile})` : ""}. (Admin View includes hidden updates)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <History className="w-8 h-8 stroke-1 opacity-40" />
              <p className="text-sm font-medium">No transactions found for this player.</p>
            </div>
          ) : (
            <div className="border border-border/40 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40 text-xs">
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Note / Reason</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isCredit =
                      tx.type === "deposit" || tx.type === "bonus" || tx.type === "bet_win";
                    const formattedDate = tx.createdAt
                      ? new Date(tx.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—";

                    return (
                      <TableRow key={tx.id} className="hover:bg-muted/30 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium">
                            {isCredit ? (
                              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span className="capitalize">{tx.type.replace("_", " ")}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`font-mono font-semibold ${
                              isCredit ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell>
                          {tx.isHidden ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 px-1.5 py-0"
                            >
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] text-muted-foreground px-1.5 py-0"
                            >
                              Public
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {tx.note || "—"}
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground font-mono">
                          <div className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
