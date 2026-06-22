import type { Context, Next } from 'hono';
export declare function rateLimit(c: Context, next: Next): Promise<(Response & import("hono").TypedResponse<{
    error: string;
}, 429, "json">) | undefined>;
//# sourceMappingURL=rate-limit.d.ts.map