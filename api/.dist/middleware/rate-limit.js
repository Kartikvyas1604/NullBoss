const requests = new Map();
export async function rateLimit(c, next) {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 100;
    let entry = requests.get(ip);
    if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + windowMs };
        requests.set(ip, entry);
    }
    entry.count++;
    if (entry.count > maxRequests) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    await next();
}
//# sourceMappingURL=rate-limit.js.map