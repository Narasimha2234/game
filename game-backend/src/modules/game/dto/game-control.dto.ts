import { GameMode } from "../entity/game-round.entity.js";

export class GameControlDto {
  mode?: GameMode;
  betTimeSeconds?: number;
  rollTimeSeconds?: number;
  intervalTimeSeconds?: number;
  manualDice?: number[];
  minProfitPercentage?: number | null;
  stopMessage?: string | null;
  action?: "start" | "stop" | "roll_now" | "next_round";
}
