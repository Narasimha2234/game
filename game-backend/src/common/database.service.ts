import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private isConnected = false;

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    await this.checkConnection();
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      this.logger.log('Disconnecting from database...');
      this.isConnected = false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Query the database to verify connection
      await this.dataSource.query('SELECT NOW()');
      this.isConnected = true;
      this.logger.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Database connection failed: ${errorMessage}`);
      return false;
    }
  }

  isDbConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): { status: string; connected: boolean } {
    return {
      status: this.isConnected ? 'Connected' : 'Disconnected',
      connected: this.isConnected,
    };
  }
}
