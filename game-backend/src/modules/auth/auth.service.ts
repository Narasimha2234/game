import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {}

  async login(mobile: string, password: string) {
    // userService.login validates credentials and returns sanitized user
    const user = await this.userService.login({ mobile, password });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.getTokens(user.id, user.role);
    // hash and store refresh token
    const hashed = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.setRefreshToken(user.id, hashed);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async logout(userId: string) {
    await this.userService.setRefreshToken(userId, null);
    return { ok: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userService.getUserById(userId);
    if (!user || !user.refreshToken || user.isActive === false) {
      throw new UnauthorizedException('Access Denied: Account is deactivated');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) throw new UnauthorizedException('Access Denied');

    const tokens = await this.getTokens(user.id, user.role);
    const hashed = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.setRefreshToken(user.id, hashed);
    return tokens;
  }

  private async getTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_TOKEN_SECRET') || 'defaultAccessSecret',
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_TOKEN_SECRET') || 'defaultRefreshSecret',
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return { accessToken, refreshToken };
  }
}
