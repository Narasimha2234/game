import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UserService } from '../user/user.service.js';
import { UserRole } from '../user/roles/user.role.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {}

  async login(
    mobile: string,
    password: string,
    deviceId?: string,
    clientSessionId?: string,
  ) {
    // userService.login validates credentials and returns sanitized user
    const user = await this.userService.login({ mobile, password });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Strict Single-Device Enforcement
    if (user.role === UserRole.USER) {
      const fullUser = await this.userService.getUserById(user.id);
      const now = Date.now();
      const lastActiveTime = fullUser.lastActiveAt ? new Date(fullUser.lastActiveAt).getTime() : 0;
      const isCurrentlyActive = !!(fullUser.activeSessionId && (now - lastActiveTime < 60 * 1000));

      // Same device check: if re-logging in on the exact same device, allow immediately
      const isSameDevice = !!(
        (deviceId && fullUser.activeDeviceId === deviceId) ||
        (clientSessionId && fullUser.activeSessionId === clientSessionId)
      );

      if (isCurrentlyActive && !isSameDevice) {
        throw new ConflictException(
          'This account is already active in another device. Only 1 active device is allowed per account. Please logout from the old device to login here.',
        );
      }
    }

    const tokens = await this.getTokens(user.id, user.role);
    // hash and store refresh token
    const hashed = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userService.setRefreshToken(user.id, hashed);

    // Generate and register active session
    const sessionId = randomUUID();
    await this.userService.updateActiveSession(user.id, sessionId, deviceId || 'Mobile App');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId,
      user,
    };
  }

  async logout(userId: string) {
    await this.userService.setRefreshToken(userId, null);
    await this.userService.clearActiveSession(userId);
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
