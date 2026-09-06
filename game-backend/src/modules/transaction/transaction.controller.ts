import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from "@nestjs/common";
import { WalletActionDto } from "../user/dto/create-user.dto.js";
import { TransactionService } from "./transaction.service.js";

@Controller("api/transactions")
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    @Post("deposit")
    @HttpCode(HttpStatus.OK)
    async depositCoins(@Body() walletActionDto: WalletActionDto) {
        const response = await this.transactionService.depositCoins(
            walletActionDto.userId,
            Number(walletActionDto.amount),
            walletActionDto.note,
            Boolean(walletActionDto.isHidden),
        );

        return response;
    }

    @Post("withdraw")
    @HttpCode(HttpStatus.OK)
    async withdrawCoins(@Body() walletActionDto: WalletActionDto) {
        const response = await this.transactionService.withdrawCoins(
            walletActionDto.userId,
            Number(walletActionDto.amount),
            walletActionDto.note,
            Boolean(walletActionDto.isHidden),
        );

        return response;
    }

    @Post("game-play")
    @HttpCode(HttpStatus.OK)
    async deductForGamePlay(@Body() walletActionDto: WalletActionDto) {
        const response = await this.transactionService.deductForGamePlay(
            walletActionDto.userId,
            Number(walletActionDto.amount),
            walletActionDto.note,
        );

        return response;
    }

    @Get("user/:userId")
    async getTransactionsForUser(
        @Param("userId") userId: string,
        @Query("includeHidden") includeHidden?: string,
    ) {
        const transactions = await this.transactionService.getUserTransactions(
            userId,
            includeHidden === "true",
        );
        return {
            success: true,
            data: transactions,
        };
    }

    @Get()
    async getAllTransactions() {
        const transactions = await this.transactionService.getAllTransactions();
        return {
            success: true,
            data: transactions,
        };
    }
}
