import { Module, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { dbConfig } from "./database.config.js";
import { DatabaseService } from "./database.service.js";

const logger = new Logger('DataBaseModule');

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '.env',
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async () => {
                // If a full DB URL is provided (SUPABASE_DB_URL or DATABASE_URL), skip DNS pre-check
                const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || null;
                if (dbUrl) {
                    logger.log('Using DATABASE_URL / SUPABASE_DB_URL; skipping host DNS check');
                    return dbConfig();
                }

                // validate DB host early to log potential DNS issues when using host/port envs
                const dns = await import('dns');
                const host = process.env.host || 'localhost';
                try {
                    await dns.promises.lookup(host);
                } catch (err: any) {
                    logger.warn(`DNS lookup for database host "${host}" failed (${err?.message ?? err}). Attempting connection anyway...`);
                }

                return dbConfig();
            },
        }),
    ],
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DataBaseModule {}