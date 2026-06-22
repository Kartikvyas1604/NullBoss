export async function requireAuth(c, next) {
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = auth.slice(7);
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [prefix, address] = decoded.split(':');
        if (prefix !== 'nullboss' || !address) {
            return c.json({ error: 'Invalid token' }, 401);
        }
        c.set('userAddress', address);
        await next();
    }
    catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
}
export async function requireAgentAuth(c, next) {
    const agentKey = c.req.header('X-Agent-Key');
    if (!agentKey) {
        return c.json({ error: 'Agent authentication required' }, 401);
    }
    c.set('agentKey', agentKey);
    await next();
}
//# sourceMappingURL=auth.js.map