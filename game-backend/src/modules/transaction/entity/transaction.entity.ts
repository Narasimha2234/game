import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../user/entity/user.entity.js";

export enum WalletTransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    GAME_PLAY = "game_play",
    BONUS = "bonus",
    BET = "bet",
    BET_WIN = "bet_win",
    BET_LOSS = "bet_loss",
}

export enum WalletTransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    REJECTED = "rejected",
}

@Entity({ name: "transactions" })
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User, { eager: true, nullable: false })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: "enum", enum: WalletTransactionType })
    type: WalletTransactionType;

    @Column({ type: "int" })
    amount: number;

    @Column({ type: "enum", enum: WalletTransactionStatus, default: WalletTransactionStatus.COMPLETED })
    status: WalletTransactionStatus;

    @Column({ nullable: true })
    note?: string;

    @Column({ type: "boolean", default: false })
    isHidden: boolean;

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;
}