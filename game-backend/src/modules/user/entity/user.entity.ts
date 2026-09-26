import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { UserRole } from "../roles/user.role.js"


@Entity({name:"users"})
export class User{
    @PrimaryGeneratedColumn("uuid")
    id:string
    @Column()
    name:string
    @Column({ unique: true, nullable: true })
    email?: string
    @Column({ type: 'varchar', unique: true, nullable: true })
    mobile: string | null
    @Column()
    password:string
    @Column({type:"enum", enum:UserRole, default:UserRole.USER})
    role:UserRole
    @Column({ type: "int", default: 0 })
    walletBalance: number
    @Column({ default: true })
    isActive: boolean
    @Column({ type: 'text', nullable: true })
    refreshToken?: string | null
    @Column({ type: 'varchar', nullable: true })
    activeSessionId?: string | null
    @Column({ type: 'timestamp', nullable: true })
    lastActiveAt?: Date | null
    @Column({ type: 'varchar', nullable: true })
    activeDeviceId?: string | null
    @CreateDateColumn({type:"timestamp"})
    createdAt:Date
    @UpdateDateColumn()
    updatedAt:Date
}