import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entity/user.entity.js";
import { GameRound } from "./game-round.entity.js";

export enum GameBetStatus {
  PENDING = "pending",
  WON = "won",
  LOST = "lost",
}

@Entity({ name: "game_bets" })
export class GameBet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int", nullable: true })
  roundNumber?: number;

  @ManyToOne(() => GameRound, (round) => round.bets, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "round_id" })
  round?: GameRound;

  @Column({ type: "int" })
  selectedNumber: number;

  @Column({ type: "int" })
  amount: number;

  @Column({ type: "int", default: 0 })
  matchingCount: number;

  @Column({ type: "int", default: 0 })
  payout: number;

  @Column({ type: "simple-array", nullable: true })
  diceRolls?: number[];

  @Column({ type: "enum", enum: GameBetStatus, default: GameBetStatus.PENDING })
  status: GameBetStatus;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}

