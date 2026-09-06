import { Body, Controller, Post, Req, UseGuards, InternalServerErrorException, Logger, HttpException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

  @Post('login')
  async login(@Body() body: { mobile?: string; username?: string; email?: string; password: string }) {
    try {
      const identifier = body.mobile || body.username || body.email || '';
      return await this.authService.login(identifier, body.password);
    } catch (error) {
      // If it's an HTTP exception (like Unauthorized), rethrow so client gets correct status
      if (error instanceof HttpException) throw error;
      this.logger.error('Login error', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Login failed, check server logs');
    }
  }


  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    const userId = req.user?.sub;
    return this.authService.logout(userId);
  }

  @Post('refresh')
  async refresh(@Body() body: { userId?: string; refreshToken?: string }) {
    if (!body.userId || !body.refreshToken) {
      throw new BadRequestException('userId and refreshToken are required');
    }
    try {
      return await this.authService.refreshTokens(body.userId, body.refreshToken);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Refresh error', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Refresh failed, check server logs');
    }
  }
}
