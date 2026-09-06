import { Controller, Get, Optional } from '@nestjs/common';
import { AppService } from './app.service.js';
import { DatabaseService } from './common/database.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db-status')
  getDbStatus() {
    if (!this.databaseService) {
      return {
        status: 'Disconnected',
        connected: false,
      };
    }

    return this.databaseService.getConnectionStatus();
  }
}

