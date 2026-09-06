import { UserRole } from "./roles/user.role.js";
import { UserService } from "./user.service.js";
import {
    Controller,
    Post,
    Patch,
    Body,
    Logger,
    HttpCode,
    HttpStatus,
    BadRequestException,
    ConflictException,
    Get,
    Param,
} from "@nestjs/common";
import { CreateUserDto, LoginUserDto } from "./dto/create-user.dto.js";

@Controller("api/users")
export class UserController {
    private readonly logger = new Logger(UserController.name);

    constructor(private readonly userService: UserService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createUser(@Body() createUserDto: CreateUserDto) {
        try {
            if (!createUserDto.name || !createUserDto.mobile || !createUserDto.password) {
                throw new BadRequestException("Name, mobile, and password are required");
            }

            createUserDto.role = createUserDto.role || UserRole.USER;

            const user = await this.userService.createUser(createUserDto);
            this.logger.log(`User created with mobile: ${createUserDto.mobile}`);

            return {
                message: "User created successfully",
                success: true,
                data: {
                    id: user.id,
                    name: user.name,
                    mobile: user.mobile,
                    email: user.email,
                    role: user.role,
                    walletBalance: user.walletBalance,
                    createdAt: user.createdAt,
                },
            };
        } catch (error) {
            if (error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create user: ${errorMessage}`);
            throw new BadRequestException("Failed to create user: " + errorMessage);
        }
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginUserDto: LoginUserDto) {
        const user = await this.userService.login(loginUserDto);

        return {
            message: "Login successful",
            success: true,
            data: user,
        };
    }

    @Get()
    async getAllUsers() {
        const users = await this.userService.getAllUsers();
        return {
            success: true,
            data: users.map((user) => ({
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                role: user.role,
                walletBalance: user.walletBalance,
                isActive: user.isActive,
                createdAt: user.createdAt,
            })),
        };
    }

    @Get(":id/wallet")
    async getWallet(@Param("id") userId: string) {
        const wallet = await this.userService.getUserWallet(userId);
        return {
            success: true,
            data: wallet,
        };
    }

    @Patch(":id/status")
    async updateUserStatus(
        @Param("id") userId: string,
        @Body() body: { isActive?: boolean },
    ) {
        const updatedUser = await this.userService.updateUserStatus(userId, body.isActive);
        return {
            message: `User marked as ${updatedUser.isActive ? "active" : "inactive"}`,
            success: true,
            data: {
                id: updatedUser.id,
                name: updatedUser.name,
                isActive: updatedUser.isActive,
            },
        };
    }
}