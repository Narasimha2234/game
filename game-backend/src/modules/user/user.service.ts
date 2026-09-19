import { Repository } from "typeorm";
import { User } from "./entity/user.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "./roles/user.role.js";
import * as bcrypt from "bcrypt";
import {
    OnModuleInit,
    Injectable,
    Logger,
    ConflictException,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
} from "@nestjs/common";
import { CreateUserDto, LoginUserDto } from "./dto/create-user.dto.js";

@Injectable()
export class UserService implements OnModuleInit {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async onModuleInit() {
        await this.createDefaultAdmin();
    }

    private normalizeMobile(mobile: string): string {
        return mobile?.trim();
    }

    private sanitizeUser(user: User) {
        const { password, ...safeUser } = user;
        return safeUser;
    }

    private async createDefaultAdmin() {
        try {
            let adminUser = await this.userRepository.findOne({
                where: { role: UserRole.ADMIN },
            });

            if (!adminUser) {
                const hashedPassword = await bcrypt.hash("admin123", 10);
                const defaultAdmin = this.userRepository.create({
                    name: "Admin",
                    email: "admin@game.com",
                    mobile: "9999999999",
                    password: hashedPassword,
                    role: UserRole.ADMIN,
                    walletBalance: 0,
                    isActive: true,
                });
                await this.userRepository.save(defaultAdmin);
                this.logger.log("Default admin created");
            } else if (!adminUser.mobile) {
                adminUser.mobile = "9999999999";
                await this.userRepository.save(adminUser);
                this.logger.log("Default admin updated with default mobile 9999999999");
            } else {
                this.logger.log("Default admin already exists");
            }
        } catch (error) {
            this.logger.error("Failed to create default admin", error instanceof Error ? error.stack : undefined);
        }
    }

    public async createUser(createUserDto: CreateUserDto): Promise<User> {
        try {
            const name = createUserDto.name?.trim();
            const mobile = this.normalizeMobile(createUserDto.mobile);
            const email = createUserDto.email?.trim();

            if (!name || !mobile || !createUserDto.password) {
                throw new BadRequestException("Name, mobile, and password are required");
            }

            if (!createUserDto.password || createUserDto.password.length < 6) {
                throw new BadRequestException("Password must be at least 6 characters long");
            }

            const existingUser = await this.userRepository.findOne({
                where: [{ mobile }, ...(email ? [{ email }] : [])],
            });

            if (existingUser) {
                throw new ConflictException("User with this mobile number or email already exists");
            }

            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            const initialBalance = typeof createUserDto.walletBalance === 'number' ? Number(createUserDto.walletBalance) : (createUserDto.walletBalance ? Number(createUserDto.walletBalance) : 0);
            const newUser = this.userRepository.create({
                name,
                mobile,
                email: email || undefined,
                password: hashedPassword,
                role: createUserDto.role || UserRole.USER,
                walletBalance: isNaN(initialBalance) || initialBalance < 0 ? 0 : initialBalance,
                isActive: true,
            });

            const savedUser = await this.userRepository.save(newUser);
            this.logger.log(`User created successfully: ${mobile}`);
            return savedUser;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create user: ${errorMessage}`);
            throw error;
        }
    }

    public async login(loginUserDto: LoginUserDto | { mobile?: string; email?: string; username?: string; password: string }) {
        const identifier = (loginUserDto.mobile || (loginUserDto as any).username || (loginUserDto as any).email || '').trim();

        if (!identifier || !loginUserDto.password) {
            throw new BadRequestException("Username/Mobile/Email and password are required");
        }

        const user = await this.userRepository.findOne({
            where: [
                { mobile: identifier },
                { email: identifier },
                { name: identifier },
            ],
        });

        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (user.isActive === false) {
            throw new UnauthorizedException("Your account has been deactivated. Please contact the administrator.");
        }

        const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        return this.sanitizeUser(user);
    }

    public async getAllUsers(): Promise<User[]> {
        return this.userRepository.find({
            order: { createdAt: "DESC" },
        });
    }

    public async getUserById(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        return user;
    }

    public async getUserWallet(userId: string) {
        const user = await this.getUserById(userId);
        if (user.isActive === false) {
            throw new UnauthorizedException("Your account has been deactivated. Please contact the administrator.");
        }
        return {
            userId: user.id,
            name: user.name,
            mobile: user.mobile,
            walletBalance: user.walletBalance,
            role: user.role,
            isActive: user.isActive,
        };
    }

    public async updateWalletBalance(userId: string, amount: number): Promise<User> {
        const user = await this.getUserById(userId);
        const updatedBalance = user.walletBalance + amount;

        if (updatedBalance < 0) {
            throw new BadRequestException("Insufficient wallet balance");
        }

        user.walletBalance = updatedBalance;
        return this.userRepository.save(user);
    }

    public async setRefreshToken(userId: string, token: string | null) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        user.refreshToken = token ?? null;
        await this.userRepository.save(user);
    }

    public async updateUserStatus(userId: string, isActive?: boolean): Promise<User> {
        const user = await this.getUserById(userId);
        user.isActive = typeof isActive === "boolean" ? isActive : !user.isActive;
        if (!user.isActive) {
            user.refreshToken = null;
        }
        return this.userRepository.save(user);
    }
}