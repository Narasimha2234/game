import dns from "node:dns";

try {
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
    // Ignore if not supported in environment
}

const originalLookup = dns.lookup.bind(dns);

export function setupDnsFix() {
    // Monkey-patch dns.lookup so that pg, TypeORM, and Node's network layer
    // can resolve Supabase / AWS CNAME domains reliably via public DNS servers
    // when local OS / router getaddrinfo fails.
    const patchedLookup: any = (hostname: string, options: any, callback: any) => {
        let cb = callback;
        let opts = options;
        if (typeof options === "function") {
            cb = options;
            opts = {};
        }

        if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
            return originalLookup(hostname, opts, cb);
        }

        dns.resolve4(hostname, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                return originalLookup(hostname, opts, cb);
            }

            if (opts && (opts.all || opts.all === true)) {
                const results = addresses.map((addr) => ({ address: addr, family: 4 }));
                return cb(null, results);
            }

            return cb(null, addresses[0], 4);
        });
    };

    dns.lookup = patchedLookup;
}

setupDnsFix();
