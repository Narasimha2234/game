import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserService } from "../user/user.service.js";
import { Transaction, WalletTransactionType } from "../transaction/entity/transaction.entity.js";
import { GameBet, GameBetStatus } from "./entity/game-bet.entity.js";

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameBet)
    private readonly gameBetRepository: Repository<GameBet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly userService: UserService,
  ) {}

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

  async placeBet(userId: string, selectedNumber: number, amount: number) {
    const user = await this.userService.getUserById(userId);

    if (!Number.isInteger(selectedNumber) || selectedNumber < 1 || selectedNumber > 6) {
      throw new BadRequestException("Selected number must be between 1 and 6");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Bet amount must be greater than zero");
    }

    if (user.walletBalance < amount) {
      throw new BadRequestException("Insufficient wallet balance to place this bet");
    }

    const updatedUser = await this.userService.updateWalletBalance(userId, -amount);

    const bet = this.gameBetRepository.create({
      user,
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
      `Bet placed on number ${selectedNumber}`,
    );

    return {
      message: "Bet placed successfully",
      data: {
        id: savedBet.id,
        userId: savedBet.user.id,
        selectedNumber: savedBet.selectedNumber,
        amount: savedBet.amount,
        status: savedBet.status,
        walletBalance: updatedUser.walletBalance,
        createdAt: savedBet.createdAt,
      },
    };
  }

  async resolveBet(betId: string, diceRolls: number[]) {
    const bet = await this.gameBetRepository.findOne({
      where: { id: betId },
      relations: { user: true },
    });

    if (!bet) {
      throw new NotFoundException("Bet not found");
    }

    if (bet.status !== GameBetStatus.PENDING) {
      throw new BadRequestException("This bet has already been resolved");
    }

    if (!Array.isArray(diceRolls) || diceRolls.length !== 6) {
      throw new BadRequestException("Dice rolls must contain exactly 6 values");
    }

    const validDiceRolls = diceRolls.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 6);
    if (!validDiceRolls) {
      throw new BadRequestException("Dice values must be between 1 and 6");
    }

    const matchCount = diceRolls.filter((roll) => roll === bet.selectedNumber).length;
    bet.matchingCount = matchCount;
    bet.diceRolls = diceRolls;

    if (matchCount === 0) {
      bet.status = GameBetStatus.LOST;
      bet.payout = 0;

      await this.gameBetRepository.save(bet);
      await this.createTransactionRecord(
        bet.user.id,
        WalletTransactionType.BET_LOSS,
        bet.amount,
        `Bet lost on number ${bet.selectedNumber}. Dice: ${diceRolls.join(", ")}`,
      );

      return {
        message: "Bet lost",
        data: {
          betId: bet.id,
          selectedNumber: bet.selectedNumber,
          diceRolls,
          matchingCount: matchCount,
          payout: 0,
          status: bet.status,
          walletBalance: bet.user.walletBalance,
        },
      };
    }

    const paidAmount = bet.amount + bet.amount * matchCount;
    bet.status = GameBetStatus.WON;
    bet.payout = paidAmount;

    await this.userService.updateWalletBalance(bet.user.id, paidAmount);
    await this.gameBetRepository.save(bet);
    await this.createTransactionRecord(
      bet.user.id,
      WalletTransactionType.BET_WIN,
      paidAmount,
      `Won bet on number ${bet.selectedNumber}. Matches: ${matchCount}. Dice: ${diceRolls.join(", ")}`,
    );

    return {
      message: "Bet resolved and winnings credited",
      data: {
        betId: bet.id,
        selectedNumber: bet.selectedNumber,
        diceRolls,
        matchingCount: matchCount,
        payout: paidAmount,
        status: bet.status,
        walletBalance: (await this.userService.getUserById(bet.user.id)).walletBalance,
      },
    };
  }

  async getUserBets(userId: string) {
    const user = await this.userService.getUserById(userId);
    const bets = await this.gameBetRepository.find({
      where: { user: { id: user.id } },
      relations: { user: true },
      order: { createdAt: "DESC" },
    });

    return bets.map((bet) => ({
      id: bet.id,
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
    });

    return bets.map((bet) => ({
      id: bet.id,
      user: {
        id: bet.user.id,
        name: bet.user.name,
        mobile: bet.user.mobile,
      },
      selectedNumber: bet.selectedNumber,
      amount: bet.amount,
      matchingCount: bet.matchingCount,
      payout: bet.payout,
      diceRolls: bet.diceRolls,
      status: bet.status,
      createdAt: bet.createdAt,
    }));
  }
}
