import { UserRole } from "../roles/user.role.js";

export class CreateUserDto {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    role?: UserRole;
    walletBalance?: number;
}

export class LoginUserDto {
    mobile: string;
    password: string;
}

export class WalletActionDto {
    userId: string;
    amount: number;
    type?: string;
    note?: string;
    isHidden?: boolean;
}

export class ResetPasswordDto {
    password: string;
}

