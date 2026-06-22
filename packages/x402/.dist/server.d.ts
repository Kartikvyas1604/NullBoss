export declare function createX402Middleware(config: {
    price: bigint;
    token: `0x${string}`;
    recipient: `0x${string}`;
    verifyPayment: (hash: string) => Promise<boolean>;
}): (request: Request) => Promise<Response | null>;
//# sourceMappingURL=server.d.ts.map