import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import dns from "node:dns";

try {
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
    // Ignore if not supported in the current environment
}

export function customDnsLookup(hostname: string, options: any, callback: any) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
        return dns.lookup(hostname, options, callback);
    }
    dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || addresses.length === 0) {
            dns.lookup(hostname, options, callback);
        } else {
            callback(null, addresses[0], 4);
        }
    });
}

export const dbConfig = (): TypeOrmModuleOptions => {
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || null;

    if (dbUrl) {
        // Use single DATABASE_URL / SUPABASE_DB_URL if provided (recommended for Supabase)
        return {
            type: "postgres",
            url: dbUrl,
            ssl: { rejectUnauthorized: false } as any,
            extra: {
                ssl: { rejectUnauthorized: false },
                lookup: customDnsLookup,
            },
            autoLoadEntities: true,
            synchronize: true,
        } as TypeOrmModuleOptions;
    }

    const isSupabase = (process.env.host || "").includes("supabase") || process.env.DB_SSL === "true";

    return {
        type: "postgres",
        host: process.env.host,
        port: Number(process.env.port) || 5432,
        username: process.env.user,
        password: process.env.password,
        database: process.env.database,
        ssl: isSupabase ? ({ rejectUnauthorized: false } as any) : undefined,
        extra: {
            ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
            lookup: customDnsLookup,
        },
        autoLoadEntities: true,
        synchronize: true,
    };
};