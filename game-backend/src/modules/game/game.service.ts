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

    // Generate random 6 dice results (or use admin manual preset)
    let finalDice: number[];
    if (this.presetDice && Array.isArray(this.presetDice) && this.presetDice.length === 6) {
      finalDice = [...this.presetDice];
      this.logger.log(
        `[MANUAL MODE] Using admin configured dice for Round #${this.activeRound.roundNumber}: [${finalDice.join(", ")}]`,
      );
      this.presetDice = null; // Clear after applying to this round
    } else {
      finalDice = Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
      this.logger.log(
        `[FALLBACK] Random dice generated for Round #${this.activeRound.roundNumber}: [${finalDice.join(", ")}]`,
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

    if (dto.mode) {
      this.activeRound!.mode = dto.mode;
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
      throw new BadRequestException("Game is currently paused. Please wait for admin to start.");
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
