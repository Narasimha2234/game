import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PlaceBetDto, ResolveBetDto } from "./dto/place-bet.dto.js";
import { GameService } from "./game.service.js";

@Controller("api/game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post("bets")
  async placeBet(@Body() placeBetDto: PlaceBetDto) {
    const response = await this.gameService.placeBet(
      placeBetDto.userId,
      Number(placeBetDto.selectedNumber),
      Number(placeBetDto.amount),
    );

    return response;
  }

  @Post("bets/:betId/resolve")
  async resolveBet(@Param("betId") betId: string, @Body() resolveBetDto: ResolveBetDto) {
    const response = await this.gameService.resolveBet(betId, resolveBetDto.diceRolls);
    return response;
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
}
