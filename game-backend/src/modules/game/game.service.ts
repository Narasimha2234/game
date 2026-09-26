import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserService } from "../user/user.service.js";
import { Transaction, WalletTransactionType } from "../transaction/entity/transaction.entity.js";
import { GameBet, GameBetStatus } from "./entity/game-bet.entity.js";
import { GameMode, GameRound, GameRoundPhase } from "./entity/game-round.entity.js";
import { GameControlDto } from "./dto/game-control.dto.js";

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameService.name);
  private tickerInterval: NodeJS.Timeout | null = null;
  private isProcessingTick = false;

  // Active in-memory round cache
  private activeRound: GameRound | null = null;
  // Next preset dice rolls if set by admin manually
  private presetDice: number[] | null = null;

  constructor(
    @InjectRepository(GameRound)
    private readonly gameRoundRepository: Repository<GameRound>,
    @InjectRepository(GameBet)
    private readonly gameBetRepository: Repository<GameBet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    try {
      await this.initActiveRound();
      this.startEngineTicker();
      this.logger.log("Dice Game Engine initialized successfully.");
    } catch (err) {
      this.logger.error("Failed to initialize Game Engine on boot", err);
    }
  }

  onModuleDestroy() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  private async initActiveRound() {
    const latestRound = await this.gameRoundRepository.findOne({
      where: {},
      order: { roundNumber: "DESC" },
    });

    if (latestRound) {
      this.activeRound = latestRound;
      const now = new Date();
      if (this.activeRound.phaseEndsAt < now) {
        if (this.activeRound.phase === GameRoundPhase.SETTLED) {
          // If previous round was settled while offline, spawn next round
          await this.spawnNextRound();
        } else {
          const duration =
            this.activeRound.phase === GameRoundPhase.BETTING_OPEN
              ? this.activeRound.betTimeSeconds || 30
              : this.activeRound.rollTimeSeconds || 8;
          this.activeRound.phaseEndsAt = new Date(Date.now() + duration * 1000);
          await this.gameRoundRepository.save(this.activeRound);
        }
      }
    } else {
      const newRound = this.gameRoundRepository.create({
        roundNumber: 1001,
        phase: GameRoundPhase.BETTING_OPEN,
        mode: GameMode.AUTOMATIC,
        diceResults: [1, 2, 3, 4, 5, 6],
        betTimeSeconds: 30,
        rollTimeSeconds: 8,
        intervalTimeSeconds: 10,
        phaseEndsAt: new Date(Date.now() + 30 * 1000),
        totalBetsAmount: 0,
        totalPayoutAmount: 0,
      });
      this.activeRound = await this.gameRoundRepository.save(newRound);
    }

    this.logger.log(
      `Active round initialized: #${this.activeRound!.roundNumber} (Phase: ${this.activeRound!.phase}, Mode: ${this.activeRound!.mode})`,
    );
  }

  private startEngineTicker() {
    if (this.tickerInterval) clearInterval(this.tickerInterval);
    this.tickerInterval = setInterval(() => this.processTick(), 1000);
  }

  private async processTick() {
    if (this.isProcessingTick || !this.activeRound) return;
    this.isProcessingTick = true;

    try {
      if (this.activeRound.mode === GameMode.STOPPED) {
        return;
      }

      const now = Date.now();
      const phaseEndsMs = new Date(this.activeRound.phaseEndsAt).getTime();
      const timeLeft = Math.max(0, Math.ceil((phaseEndsMs - now) / 1000));

      if (timeLeft <= 0) {
        if (this.activeRound.phase === GameRoundPhase.BETTING_OPEN) {
          // Transition: BETTING_OPEN -> ROLLING
          await this.transitionToRolling();
        } else if (this.activeRound.phase === GameRoundPhase.ROLLING) {
          // Transition: ROLLING -> SETTLED (Result display duration begins)
          await this.settleRound();
        } else if (this.activeRound.phase === GameRoundPhase.SETTLED) {
          // Transition: SETTLED -> New Round BETTING_OPEN (Interval ended)
          await this.spawnNextRound();
        }
      }
    } catch (error) {
      this.logger.error("Error in game loop tick:", error);
    } finally {
      this.isProcessingTick = false;
    }
  }

  private async transitionToRolling() {
    if (!this.activeRound) return;

    // Generate random 6 dice results (or use admin manual preset, or auto minimum profit calculator)
    let finalDice: number[];
    if (this.presetDice && Array.isArray(this.presetDice) && this.presetDice.length === 6) {
      finalDice = [...this.presetDice];
      this.logger.log(
        `[MANUAL MODE] Using admin configured dice for Round #${this.activeRound.roundNumber}: [${finalDice.join(", ")}]`,
      );
      this.presetDice = null; // Clear after applying to this round
    } else if (
      this.activeRound.mode === GameMode.AUTOMATIC &&
      typeof this.activeRound.minProfitPercentage === "number" &&
      this.activeRound.minProfitPercentage > 0
    ) {
      const currentBets = await this.gameBetRepository.find({
        where: [
          { round: { id: this.activeRound.id } },
          { roundNumber: this.activeRound.roundNumber },
        ],
      });
      finalDice = this.calculateProfitConstrainedDice(
        currentBets,
        this.activeRound.minProfitPercentage,
      );
    } else {
      finalDice = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
      this.logger.log(
        `[AUTO PURE RANDOM] Random dice generated for Round #${this.activeRound.roundNumber}: [${finalDice.join(", ")}]`,
      );
    }

    this.activeRound.diceResults = finalDice;
    this.activeRound.phase = GameRoundPhase.ROLLING;
    const rollDuration = this.activeRound.rollTimeSeconds || 8;
    this.activeRound.phaseEndsAt = new Date(Date.now() + rollDuration * 1000);

    this.activeRound = await this.gameRoundRepository.save(this.activeRound);
    this.logger.log(
      `Round #${this.activeRound.roundNumber} rolling started for ${rollDuration}s with dice: [${finalDice.join(", ")}]`,
    );
  }

  /**
   * Calculates optimal 6-dice outcome to guarantee admin minimum profit percentage
   * while giving money to winning players whenever possible.
   */
  private calculateProfitConstrainedDice(
    bets: GameBet[],
    minProfitPercentage: number,
  ): number[] {
    const totalPool = bets.reduce((sum, b) => sum + (b.amount || 0), 0);
    if (totalPool <= 0) {
      return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
    }

    // Tally total bets by face (1 to 6)
    const faceBets: { [face: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const b of bets) {
      if (b.selectedNumber >= 1 && b.selectedNumber <= 6) {
        faceBets[b.selectedNumber] += b.amount;
      }
    }

    const minRequiredProfit = totalPool * (minProfitPercentage / 100);

    // Compute payout for a given 6-face count distribution [c1, c2, c3, c4, c5, c6]
    const computePayout = (counts: number[]) => {
      let payout = 0;
      for (let face = 1; face <= 6; face++) {
        const count = counts[face - 1];
        if (count > 0 && faceBets[face] > 0) {
          payout += faceBets[face] * (1 + count);
        }
      }
      return payout;
    };

    // Generate all 462 partitions of 6 dice across 6 faces (c1+c2+c3+c4+c5+c6 = 6)
    const allDistributions: number[][] = [];
    const generatePartitions = (current: number[], remainingDice: number, faceIndex: number) => {
      if (faceIndex === 5) {
        current.push(remainingDice);
        allDistributions.push([...current]);
        current.pop();
        return;
      }
      for (let count = 0; count <= remainingDice; count++) {
        current.push(count);
        generatePartitions(current, remainingDice - count, faceIndex + 1);
        current.pop();
      }
    };
    generatePartitions([], 6, 0);

    interface ScoredDist {
      counts: number[];
      payout: number;
      profit: number;
      profitPct: number;
    }

    const validWithWinners: ScoredDist[] = [];
    const validZeroPayout: ScoredDist[] = [];
    let bestProfitDist: ScoredDist | null = null;

    for (const counts of allDistributions) {
      const payout = computePayout(counts);
      const profit = totalPool - payout;
      const profitPct = (profit / totalPool) * 100;
      const scored: ScoredDist = { counts, payout, profit, profitPct };

      if (!bestProfitDist || profit > bestProfitDist.profit) {
        bestProfitDist = scored;
      }

      if (profit >= minRequiredProfit) {
        if (payout > 0) {
          validWithWinners.push(scored);
        } else {
          validZeroPayout.push(scored);
        }
      }
    }

    let chosenDist: ScoredDist;
    if (validWithWinners.length > 0) {
      // Prioritize exciting rounds where players win while house meets or exceeds target profit
      const randIdx = Math.floor(Math.random() * validWithWinners.length);
      chosenDist = validWithWinners[randIdx];
      this.logger.log(
        `[AUTO PROFIT ENGINE] Selected outcome with winners! Total Pool: ₹${totalPool}, Payout: ₹${chosenDist.payout}, House Profit: ₹${chosenDist.profit} (${chosenDist.profitPct.toFixed(1)}% >= target ${minProfitPercentage}%)`,
      );
    } else if (validZeroPayout.length > 0) {
      // If no valid outcome could pay winners and meet target profit, pick a zero-payout outcome
      const randIdx = Math.floor(Math.random() * validZeroPayout.length);
      chosenDist = validZeroPayout[randIdx];
      this.logger.log(
        `[AUTO PROFIT ENGINE] Target ${minProfitPercentage}% met with zero payout outcome (Total Pool: ₹${totalPool}, Profit: 100%).`,
      );
    } else if (bestProfitDist) {
      // In edge cases where bets are spread across all faces and mathematically impossible to reach exact target %, use highest profit outcome
      chosenDist = bestProfitDist;
      this.logger.warn(
        `[AUTO PROFIT ENGINE] Target ${minProfitPercentage}% mathematically unreachable with spread bets. Using highest profit outcome: ₹${chosenDist.profit} (${chosenDist.profitPct.toFixed(1)}%)`,
      );
    } else {
      return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
    }

    // Convert face counts to 6-dice array and shuffle for natural appearance
    const dice: number[] = [];
    for (let face = 1; face <= 6; face++) {
      const count = chosenDist.counts[face - 1];
      for (let k = 0; k < count; k++) {
        dice.push(face);
      }
    }

    // Fisher-Yates shuffle
    for (let i = dice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dice[i], dice[j]] = [dice[j], dice[i]];
    }

    return dice;
  }

  private async settleRound() {
    if (!this.activeRound) return;

    const roundId = this.activeRound.id;
    const roundNumber = this.activeRound.roundNumber;
    const diceResults = this.activeRound.diceResults || [1, 2, 3, 4, 5, 6];

    // Fetch all pending bets for this round
    const bets = await this.gameBetRepository.find({
      where: [{ round: { id: roundId } }, { roundNumber }],
      relations: { user: true },
    });

    let totalBets = 0;
    let totalPayout = 0;

    for (const bet of bets) {
      if (bet.status !== GameBetStatus.PENDING) continue;

      totalBets += bet.amount;
      const matchCount = diceResults.filter((roll) => roll === bet.selectedNumber).length;
      bet.matchingCount = matchCount;
      bet.diceRolls = diceResults;

      if (matchCount > 0) {
        const payout = bet.amount + bet.amount * matchCount;
        bet.status = GameBetStatus.WON;
        bet.payout = payout;
        totalPayout += payout;

        await this.userService.updateWalletBalance(bet.user.id, payout);
        await this.createTransactionRecord(
          bet.user.id,
          WalletTransactionType.BET_WIN,
          payout,
          `Won bet on face #${bet.selectedNumber} in Round #${roundNumber}. Matches: ${matchCount}. Dice: [${diceResults.join(", ")}]`,
        );
      } else {
        bet.status = GameBetStatus.LOST;
        bet.payout = 0;
        await this.createTransactionRecord(
          bet.user.id,
          WalletTransactionType.BET_LOSS,
          bet.amount,
          `Lost bet on face #${bet.selectedNumber} in Round #${roundNumber}. Dice: [${diceResults.join(", ")}]`,
        );
      }

      await this.gameBetRepository.save(bet);
    }

    // Set round to SETTLED and set interval timer for next round wait time
    this.activeRound.phase = GameRoundPhase.SETTLED;
    this.activeRound.totalBetsAmount = totalBets;
    this.activeRound.totalPayoutAmount = totalPayout;
    const intervalDuration = this.activeRound.intervalTimeSeconds || 10;
    this.activeRound.phaseEndsAt = new Date(Date.now() + intervalDuration * 1000);

    this.activeRound = await this.gameRoundRepository.save(this.activeRound);
    this.logger.log(
      `Round #${roundNumber} settled. Displaying results for ${intervalDuration}s before next round. Total Bets: ₹${totalBets}, Payout: ₹${totalPayout}`,
    );
  }

  private async spawnNextRound() {
    if (!this.activeRound) return;

    if (this.activeRound.mode === GameMode.STOPPED) {
      return;
    }

    const nextRoundNumber = this.activeRound.roundNumber + 1;
    const betDuration = this.activeRound.betTimeSeconds || 30;

    const nextRound = this.gameRoundRepository.create({
      roundNumber: nextRoundNumber,
      phase: GameRoundPhase.BETTING_OPEN,
      mode: this.activeRound.mode,
      diceResults: this.activeRound.diceResults || [1, 2, 3, 4, 5, 6],
      betTimeSeconds: this.activeRound.betTimeSeconds || 30,
      rollTimeSeconds: this.activeRound.rollTimeSeconds || 8,
      intervalTimeSeconds: this.activeRound.intervalTimeSeconds || 10,
      minProfitPercentage: this.activeRound.minProfitPercentage ?? null,
      stopMessage: this.activeRound.stopMessage ?? null,
      phaseEndsAt: new Date(Date.now() + betDuration * 1000),
      totalBetsAmount: 0,
      totalPayoutAmount: 0,
    });

    this.activeRound = await this.gameRoundRepository.save(nextRound);
    this.logger.log(
      `New Round #${this.activeRound.roundNumber} started! Betting open for ${betDuration}s.`,
    );
  }

  private createTransactionRecord(userId: string, type: WalletTransactionType, amount: number, note: string) {
    return this.transactionRepository.save(
      this.transactionRepository.create({
        user: { id: userId } as any,
        type,
        amount,
        status: "completed" as any,
        note,
      }),
    );
  }

  // --- Public APIs ---

  async getGameState(userId?: string) {
    if (!this.activeRound) {
      await this.initActiveRound();
    }

    const now = Date.now();
    const phaseEndsMs = new Date(this.activeRound!.phaseEndsAt).getTime();
    const timeLeft = this.activeRound!.mode === GameMode.STOPPED
      ? 0
      : Math.max(0, Math.ceil((phaseEndsMs - now) / 1000));

    // Get current round bets to compute face pools
    const currentBets = await this.gameBetRepository.find({
      where: [{ round: { id: this.activeRound!.id } }, { roundNumber: this.activeRound!.roundNumber }],
      relations: { user: true },
    });

    const poolTotals: { [key: number]: { totalAmount: number; bettorsCount: number } } = {
      1: { totalAmount: 0, bettorsCount: 0 },
      2: { totalAmount: 0, bettorsCount: 0 },
      3: { totalAmount: 0, bettorsCount: 0 },
      4: { totalAmount: 0, bettorsCount: 0 },
      5: { totalAmount: 0, bettorsCount: 0 },
      6: { totalAmount: 0, bettorsCount: 0 },
    };

    const userCountByFace: { [key: number]: Set<string> } = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
      6: new Set(),
    };

    let userBetsForRound: any[] = [];

    for (const bet of currentBets) {
      if (poolTotals[bet.selectedNumber]) {
        poolTotals[bet.selectedNumber].totalAmount += bet.amount;
        if (bet.user?.id) {
          userCountByFace[bet.selectedNumber].add(bet.user.id);
        }
      }
      if (userId && bet.user?.id === userId) {
        userBetsForRound.push({
          id: bet.id,
          selectedNumber: bet.selectedNumber,
          amount: bet.amount,
          status: bet.status,
          matchingCount: bet.matchingCount,
          payout: bet.payout,
        });
      }
    }

    for (let face = 1; face <= 6; face++) {
      poolTotals[face].bettorsCount = userCountByFace[face].size;
    }

    // Previous settled round info for results notification
    const lastSettledRound = await this.gameRoundRepository.findOne({
      where: { phase: GameRoundPhase.SETTLED },
      order: { roundNumber: "DESC" },
    });

    let lastRoundUserResult: any = null;
    if (userId && lastSettledRound) {
      const lastRoundBets = await this.gameBetRepository.find({
        where: [{ round: { id: lastSettledRound.id } }, { roundNumber: lastSettledRound.roundNumber }],
        relations: { user: true },
      });

      const userLastBets = lastRoundBets.filter((b) => b.user?.id === userId);
      if (userLastBets.length > 0) {
        const totalWon = userLastBets.reduce((sum, b) => sum + (b.payout || 0), 0);
        const totalBet = userLastBets.reduce((sum, b) => sum + b.amount, 0);
        const hasWon = userLastBets.some((b) => b.status === GameBetStatus.WON);
        lastRoundUserResult = {
          roundNumber: lastSettledRound.roundNumber,
          diceResults: lastSettledRound.diceResults,
          totalBet,
          totalWon,
          hasWon,
          bets: userLastBets.map((b) => ({
            selectedNumber: b.selectedNumber,
            amount: b.amount,
            payout: b.payout,
            matchingCount: b.matchingCount,
            status: b.status,
          })),
        };
      }
    }

    const recentRounds = await this.gameRoundRepository.find({
      order: { roundNumber: "DESC" },
      take: 10,
    });

    return {
      roundId: this.activeRound!.id,
      roundNumber: this.activeRound!.roundNumber,
      phase: this.activeRound!.phase,
      mode: this.activeRound!.mode,
      timeLeft,
      betTimeSeconds: this.activeRound!.betTimeSeconds || 30,
      rollTimeSeconds: this.activeRound!.rollTimeSeconds || 8,
      intervalTimeSeconds: this.activeRound!.intervalTimeSeconds || 10,
      diceResults: this.activeRound!.diceResults || [1, 2, 3, 4, 5, 6],
      presetDice: this.presetDice,
      minProfitPercentage: this.activeRound!.minProfitPercentage ?? null,
      stopMessage: this.activeRound!.stopMessage ?? null,
      betPools: poolTotals,
      myBets: userBetsForRound,
      lastRoundUserResult,
      recentHistory: recentRounds.map((r) => ({
        roundNumber: r.roundNumber,
        diceResults: r.diceResults,
        phase: r.phase,
        totalBetsAmount: r.totalBetsAmount,
        totalPayoutAmount: r.totalPayoutAmount,
        createdAt: r.createdAt,
      })),
    };
  }

  async updateGameControl(dto: GameControlDto) {
    if (!this.activeRound) {
      await this.initActiveRound();
    }

    if (dto.mode === GameMode.STOPPED || dto.action === "stop") {
      this.activeRound!.mode = GameMode.STOPPED;
      if (dto.stopMessage !== undefined) {
        this.activeRound!.stopMessage = dto.stopMessage ? dto.stopMessage.trim() : null;
      }
      if (!this.activeRound!.stopMessage) {
        this.activeRound!.stopMessage = "Game is temporarily paused by admin. Please check back shortly.";
      }
      this.logger.log(`Game stopped by admin with message: "${this.activeRound!.stopMessage}"`);
    } else if (dto.mode === GameMode.AUTOMATIC || dto.mode === GameMode.MANUAL || dto.action === "start") {
      if (dto.mode) {
        this.activeRound!.mode = dto.mode;
      }
      // When resuming/starting, clear the stop message
      this.activeRound!.stopMessage = null;
      this.logger.log(`Game started / resumed by admin in ${this.activeRound!.mode} mode`);
    } else if (dto.mode) {
      this.activeRound!.mode = dto.mode;
    }

    if (dto.stopMessage !== undefined && this.activeRound!.mode === GameMode.STOPPED) {
      this.activeRound!.stopMessage = dto.stopMessage ? dto.stopMessage.trim() : null;
    }

    if (dto.minProfitPercentage !== undefined) {
      if (dto.minProfitPercentage === null || dto.minProfitPercentage <= 0) {
        this.activeRound!.minProfitPercentage = null;
        this.logger.log("Admin disabled minimum profit constraint (pure random auto mode)");
      } else {
        const clamped = Math.min(95, Math.max(1, Number(dto.minProfitPercentage)));
        this.activeRound!.minProfitPercentage = clamped;
        this.logger.log(`Admin set minimum profit percentage: ${clamped}%`);
      }
    }

    if (dto.betTimeSeconds && dto.betTimeSeconds >= 5) {
      this.activeRound!.betTimeSeconds = dto.betTimeSeconds;
    }

    if (dto.rollTimeSeconds && dto.rollTimeSeconds >= 3) {
      this.activeRound!.rollTimeSeconds = dto.rollTimeSeconds;
    }

    if (dto.intervalTimeSeconds && dto.intervalTimeSeconds >= 3) {
      this.activeRound!.intervalTimeSeconds = dto.intervalTimeSeconds;
    }

    if (dto.manualDice && dto.manualDice.length === 6) {
      this.presetDice = dto.manualDice;
      this.logger.log(`Admin configured manual dice: [${dto.manualDice.join(", ")}]`);
    }

    if (dto.action === "start") {
      this.activeRound!.mode = dto.mode || this.activeRound!.mode || GameMode.AUTOMATIC;
      this.activeRound!.stopMessage = null;
      if (this.activeRound!.phase === GameRoundPhase.SETTLED) {
        await this.spawnNextRound();
      } else {
        this.activeRound!.phaseEndsAt = new Date(Date.now() + (this.activeRound!.betTimeSeconds || 30) * 1000);
      }
    } else if (dto.action === "stop") {
      this.activeRound!.mode = GameMode.STOPPED;
    } else if (dto.action === "roll_now") {
      await this.transitionToRolling();
    } else if (dto.action === "next_round") {
      if (this.activeRound!.phase === GameRoundPhase.SETTLED) {
        await this.spawnNextRound();
      } else {
        await this.settleRound();
      }
    }

    this.activeRound = await this.gameRoundRepository.save(this.activeRound!);

    return {
      message: "Game control updated successfully",
      data: await this.getGameState(),
    };
  }

  async placeBet(userId: string, selectedNumber: number, amount: number) {
    if (!this.activeRound) {
      await this.initActiveRound();
    }

    if (this.activeRound!.phase !== GameRoundPhase.BETTING_OPEN) {
      throw new BadRequestException("Betting is currently closed for this round. Please wait for the next round.");
    }

    if (this.activeRound!.mode === GameMode.STOPPED) {
      const msg = this.activeRound!.stopMessage || "Game is currently paused. Please wait for admin to start.";
      throw new BadRequestException(msg);
    }

    if (!Number.isInteger(selectedNumber) || selectedNumber < 1 || selectedNumber > 6) {
      throw new BadRequestException("Selected dice face must be between 1 and 6");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Bet amount must be greater than zero");
    }

    const user = await this.userService.getUserById(userId);
    if (user.isActive === false) {
      throw new BadRequestException("Your account has been deactivated. Please contact the administrator.");
    }

    if (user.walletBalance < amount) {
      throw new BadRequestException(`Insufficient wallet balance (Current: ₹${user.walletBalance})`);
    }

    // Deduct bet amount immediately
    const updatedUser = await this.userService.updateWalletBalance(userId, -amount);

    const bet = this.gameBetRepository.create({
      user,
      round: this.activeRound!,
      roundNumber: this.activeRound!.roundNumber,
      selectedNumber,
      amount,
      matchingCount: 0,
      payout: 0,
      status: GameBetStatus.PENDING,
      diceRolls: [],
    });

    const savedBet = await this.gameBetRepository.save(bet);

    await this.createTransactionRecord(
      userId,
      WalletTransactionType.BET,
      amount,
      `Placed bet of ₹${amount} on face #${selectedNumber} in Round #${this.activeRound!.roundNumber}`,
    );

    return {
      message: "Bet placed successfully",
      data: {
        id: savedBet.id,
        userId: savedBet.user.id,
        roundNumber: savedBet.roundNumber,
        selectedNumber: savedBet.selectedNumber,
        amount: savedBet.amount,
        status: savedBet.status,
        walletBalance: updatedUser.walletBalance,
        createdAt: savedBet.createdAt,
      },
    };
  }

  async getUserBets(userId: string) {
    const bets = await this.gameBetRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: "DESC" },
      take: 50,
    });

    return bets.map((bet) => ({
      id: bet.id,
      roundNumber: bet.roundNumber,
      selectedNumber: bet.selectedNumber,
      amount: bet.amount,
      matchingCount: bet.matchingCount,
      payout: bet.payout,
      diceRolls: bet.diceRolls,
      status: bet.status,
      createdAt: bet.createdAt,
    }));
  }

  async getAllBets() {
    const bets = await this.gameBetRepository.find({
      relations: { user: true },
      order: { createdAt: "DESC" },
      take: 100,
    });

    return bets.map((bet) => ({
      id: bet.id,
      user: {
        id: bet.user?.id,
        name: bet.user?.name,
        mobile: bet.user?.mobile,
      },
      roundNumber: bet.roundNumber,
      selectedNumber: bet.selectedNumber,
      amount: bet.amount,
      matchingCount: bet.matchingCount,
      payout: bet.payout,
      diceRolls: bet.diceRolls,
      status: bet.status,
      createdAt: bet.createdAt,
    }));
  }

  async getRecentRounds(limit = 20) {
    const rounds = await this.gameRoundRepository.find({
      order: { roundNumber: "DESC" },
      take: limit,
    });
    return rounds;
  }
}
