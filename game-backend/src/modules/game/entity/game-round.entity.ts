import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { GameBet } from "./game-bet.entity.js";

export enum GameRoundPhase {
  BETTING_OPEN = "BETTING_OPEN",
  ROLLING = "ROLLING",
  SETTLED = "SETTLED",
}

export enum GameMode {
  AUTOMATIC = "AUTOMATIC",
  MANUAL = "MANUAL",
  STOPPED = "STOPPED",
}

@Entity({ name: "game_rounds" })
export class GameRound {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int", unique: true })
  roundNumber: number;

  @Column({
    type: "enum",
    enum: GameRoundPhase,
    default: GameRoundPhase.BETTING_OPEN,
  })
  phase: GameRoundPhase;

  @Column({
    type: "enum",
    enum: GameMode,
    default: GameMode.AUTOMATIC,
  })
  mode: GameMode;

  @Column({ type: "simple-array", default: "1,2,3,4,5,6" })
  diceResults: number[];

  @Column({ type: "int", default: 30 })
  betTimeSeconds: number;

  @Column({ type: "int", default: 8 })
  rollTimeSeconds: number;

  @Column({ type: "int", default: 10 })
  intervalTimeSeconds: number;

  @Column({ type: "timestamp" })
  phaseEndsAt: Date;


  @Column({ type: "int", default: 0 })
  totalBetsAmount: number;

  @Column({ type: "int", default: 0 })
  totalPayoutAmount: number;

  @OneToMany(() => GameBet, (bet) => bet.round)
  bets: GameBet[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}
