import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Transaction } from "../transaction/entity/transaction.entity.js";
import { UserModule } from "../user/user.module.js";
import { GameBet } from "./entity/game-bet.entity.js";
import { GameRound } from "./entity/game-round.entity.js";
import { GameController } from "./game.controller.js";
import { GameService } from "./game.service.js";

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([GameBet, GameRound, Transaction]),
  ],
  providers: [GameService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}

