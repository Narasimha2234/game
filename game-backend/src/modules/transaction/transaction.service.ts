import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserService } from "../user/user.service.js";
import { Transaction, WalletTransactionStatus, WalletTransactionType } from "./entity/transaction.entity.js";

@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly userService: UserService,
    ) {}

    private async createTransaction(
        userId: string,
        type: WalletTransactionType,
        amount: number,
        note?: string,
        isHidden: boolean = false,
    ) {
        const user = await this.userService.getUserById(userId);

        const transaction = this.transactionRepository.create({
            user,
            type,
            amount,
            status: WalletTransactionStatus.COMPLETED,
            note: note || `${type} transaction`,
            isHidden: Boolean(isHidden),
        });

        return this.transactionRepository.save(transaction);
    }

    async depositCoins(userId: string, amount: number, note?: string, isHidden: boolean = false) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException("Deposit amount must be greater than zero");
        }

        const updatedUser = await this.userService.updateWalletBalance(userId, amount);
        const transaction = await this.createTransaction(
            userId,
            WalletTransactionType.DEPOSIT,
            amount,
            note || "Admin deposit",
            isHidden,
        );

        return {
            message: "Deposit successful",
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    mobile: updatedUser.mobile,
                    walletBalance: updatedUser.walletBalance,
                },
                transaction: {
                    id: transaction.id,
                    type: transaction.type,
                    amount: transaction.amount,
                    status: transaction.status,
                    note: transaction.note,
                    isHidden: transaction.isHidden,
                    createdAt: transaction.createdAt,
                },
            },
        };
    }

    async withdrawCoins(userId: string, amount: number, note?: string, isHidden: boolean = false) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException("Withdrawal amount must be greater than zero");
        }

        const currentUser = await this.userService.getUserById(userId);

        if (currentUser.walletBalance < amount) {
            throw new BadRequestException("Insufficient wallet balance for withdrawal");
        }

        const updatedUser = await this.userService.updateWalletBalance(userId, -amount);
        const transaction = await this.createTransaction(
            userId,
            WalletTransactionType.WITHDRAWAL,
            amount,
            note || "Admin withdrawal",
            isHidden,
        );

        return {
            message: "Withdrawal successful",
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    mobile: updatedUser.mobile,
                    walletBalance: updatedUser.walletBalance,
                },
                transaction: {
                    id: transaction.id,
                    type: transaction.type,
                    amount: transaction.amount,
                    status: transaction.status,
                    note: transaction.note,
                    isHidden: transaction.isHidden,
                    createdAt: transaction.createdAt,
                },
            },
        };
    }

    async deductForGamePlay(userId: string, amount: number, note?: string) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new BadRequestException("Game play amount must be greater than zero");
        }

        const currentUser = await this.userService.getUserById(userId);

        if (currentUser.walletBalance < amount) {
            throw new BadRequestException("Insufficient wallet balance to play the game");
        }

        const updatedUser = await this.userService.updateWalletBalance(userId, -amount);
        const transaction = await this.createTransaction(
            userId,
            WalletTransactionType.GAME_PLAY,
            amount,
            note || "Game play deducted",
            false,
        );

        return {
            message: "Game play deduction successful",
            data: {
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    mobile: updatedUser.mobile,
                    walletBalance: updatedUser.walletBalance,
                },
                transaction: {
                    id: transaction.id,
                    type: transaction.type,
                    amount: transaction.amount,
                    status: transaction.status,
                    note: transaction.note,
                    isHidden: transaction.isHidden,
                    createdAt: transaction.createdAt,
                },
            },
        };
    }

    async getUserTransactions(userId: string, includeHidden: boolean = false) {
        const user = await this.userService.getUserById(userId);

        const whereCondition: any = { user: { id: user.id } };
        if (!includeHidden) {
            whereCondition.isHidden = false;
        }

        const transactions = await this.transactionRepository.find({
            where: whereCondition,
            relations: { user: true },
            order: { createdAt: "DESC" },
        });

        return transactions.map((transaction) => ({
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            status: transaction.status,
            note: transaction.note,
            isHidden: transaction.isHidden,
            createdAt: transaction.createdAt,
            user: {
                id: transaction.user.id,
                name: transaction.user.name,
                mobile: transaction.user.mobile,
                walletBalance: transaction.user.walletBalance,
            },
        }));
    }

    async getAllTransactions() {
        const transactions = await this.transactionRepository.find({
            relations: { user: true },
            order: { createdAt: "DESC" },
        });

        return transactions.map((transaction) => ({
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            status: transaction.status,
            note: transaction.note,
            isHidden: transaction.isHidden,
            createdAt: transaction.createdAt,
            user: {
                id: transaction.user.id,
                name: transaction.user.name,
                mobile: transaction.user.mobile,
                walletBalance: transaction.user.walletBalance,
            },
        }));
    }
}