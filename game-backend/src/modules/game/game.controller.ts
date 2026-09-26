import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { PlaceBetDto } from "./dto/place-bet.dto.js";
import { GameControlDto } from "./dto/game-control.dto.js";
import { GameService } from "./game.service.js";
import { UserService } from "../user/user.service.js";

@Controller("api/game")
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly userService: UserService,
  ) {}

  @Get("state")
  async getGameState(
    @Query("userId") userId?: string,
    @Query("sessionId") sessionId?: string,
  ) {
    const state = await this.gameService.getGameState(userId);
    let sessionValid = true;
    if (userId) {
      sessionValid = await this.userService.validateAndUpdateSession(userId, sessionId);
    }
    return { success: true, sessionValid, data: state };
  }

  @Post("control")
  async updateGameControl(@Body() controlDto: GameControlDto) {
    const result = await this.gameService.updateGameControl(controlDto);
    return { success: true, ...result };
  }

  @Post("bets")
  async placeBet(@Body() placeBetDto: PlaceBetDto) {
    const response = await this.gameService.placeBet(
      placeBetDto.userId,
      Number(placeBetDto.selectedNumber),
      Number(placeBetDto.amount),
    );

    return { success: true, ...response };
  }

  @Get("bets/user/:userId")
  async getUserBets(@Param("userId") userId: string) {
    const bets = await this.gameService.getUserBets(userId);
    return { success: true, data: bets };
  }

  @Get("bets")
  async getAllBets() {
    const bets = await this.gameService.getAllBets();
    return { success: true, data: bets };
  }

  @Get("history")
  async getHistory(@Query("limit") limit?: string) {
    const history = await this.gameService.getRecentRounds(Number(limit) || 20);
    return { success: true, data: history };
  }
}
