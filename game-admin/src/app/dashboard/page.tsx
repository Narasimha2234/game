"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { UpdateWalletDialog } from "@/components/UpdateWalletDialog";
import { PlayerTransactionsDialog } from "@/components/PlayerTransactionsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Wallet,
  ShieldCheck,
  Search,
  RefreshCw,
  LogOut,
  Gamepad2,
  Phone,
  Mail,
  Calendar,
  Receipt,
  UserCheck,
  UserX,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  role: string;
  walletBalance: number;
  isActive: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [walletTargetPlayer, setWalletTargetPlayer] = useState<UserItem | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const [historyTargetPlayer, setHistoryTargetPlayer] = useState<UserItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    try {
      const res = await api.get("/api/users");
      const list = res.data?.data || [];
      setUsers(list);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    } else if (isAuthenticated) {
      fetchUsers();
    }
  }, [loading, isAuthenticated, router, fetchUsers]);

  const handleToggleStatus = async (player: UserItem) => {
    setStatusUpdatingId(player.id);
    const newStatus = !player.isActive;
    try {
      await api.patch(`/api/users/${player.id}/status`, { isActive: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === player.id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openWalletModal = (player: UserItem) => {
    setWalletTargetPlayer(player);
    setWalletDialogOpen(true);
  };

  const openHistoryModal = (player: UserItem) => {
    setHistoryTargetPlayer(player);
    setHistoryDialogOpen(true);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="text-base font-medium">Checking authentication…</span>
        </div>
      </div>
    );
  }

  // Filter players (excluding admin if desired, or showing all players)
  const players = users.filter((u) => u.role === "user" || !u.role);
  const filteredPlayers = players.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const mobileMatch = p.mobile?.toLowerCase().includes(q);
    const emailMatch = p.email?.toLowerCase().includes(q);
    return nameMatch || mobileMatch || emailMatch;
  });

  const totalWalletSum = players.reduce((sum, p) => sum + (Number(p.walletBalance) || 0), 0);
  const activePlayersCount = players.filter((p) => p.isActive !== false).length;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Six Dice Game</h1>
              <p className="text-xs text-muted-foreground">Admin Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="sm"
              onClick={() => router.push("/game-panel")}
              className="bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-semibold text-xs gap-1.5 shadow-md shadow-rose-900/20"
            >
              <Gamepad2 className="w-4 h-4" />
              Live Game Panel
            </Button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Logged in as:</span>
              <span className="font-semibold text-foreground">{user?.name || "Admin"}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 gap-1.5 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Page Header with Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Players & Wallet Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Control player statuses, adjust wallet balances (deposit/withdraw), and view transactions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/game-panel")}
              className="gap-2 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Open Game Room
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={fetching}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <AddPlayerDialog onPlayerAdded={fetchUsers} />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Players
              </CardTitle>
              <Users className="w-4 h-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{players.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activePlayersCount} active accounts / {players.length - activePlayersCount} inactive
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallet Balance
              </CardTitle>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{totalWalletSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total funds across all registered players
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Player Ratio
              </CardTitle>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {players.length > 0
                  ? `${Math.round((activePlayersCount / players.length) * 100)}%`
                  : "100%"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activePlayersCount} active accounts eligible to play
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Players Table Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-semibold">Registered Players</CardTitle>
                <CardDescription>
                  Manage balances, active/inactive states, and transaction visibility.
                </CardDescription>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {fetching && players.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm">Loading players...</span>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Users className="w-10 h-10 stroke-1 opacity-40" />
                <p className="text-sm font-medium">
                  {searchQuery ? "No players match your search filter." : "No players found."}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground">
                    Click the "Add Player" button above to register your first player.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[220px]">Player</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Wallet Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((p) => {
                      const isUpdatingThis = statusUpdatingId === p.id;
                      const isActive = p.isActive !== false;

                      return (
                        <TableRow key={p.id} className="hover:bg-muted/40">
                          {/* Player Identity */}
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {p.name || "Unnamed"}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ID: {p.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Contact */}
                          <TableCell>
                            <div className="space-y-0.5">
                              {p.mobile && (
                                <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  {p.mobile}
                                </div>
                              )}
                              {p.email && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {p.email}
                                </div>
                              )}
                              {!p.mobile && !p.email && (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Balance */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-emerald-400 text-sm">
                                ₹{(Number(p.walletBalance) || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </TableCell>

                          {/* Active / Inactive Status Toggle */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isActive}
                                onCheckedChange={() => handleToggleStatus(p)}
                                disabled={isUpdatingThis}
                                size="sm"
                              />
                              {isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] font-normal gap-1 py-0.5">
                                  <UserCheck className="w-3 h-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[11px] font-normal text-muted-foreground gap-1 py-0.5"
                                >
                                  <UserX className="w-3 h-3" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWalletModal(p)}
                                className="h-8 gap-1.5 text-xs font-medium border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                              >
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                Update Wallet
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openHistoryModal(p)}
                                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                title="View transaction history"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                History
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Wallet Modal */}
      <UpdateWalletDialog
        player={walletTargetPlayer}
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        onSuccess={fetchUsers}
      />

      {/* Player Transactions Modal */}
      <PlayerTransactionsDialog
        player={historyTargetPlayer}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </main>
  );
}
