export interface X402PaymentReceipt {
    hash: `0x${string}`;
    amount: bigint;
    token: `0x${string}`;
    recipient: `0x${string}`;
    timestamp: number;
    chainId: number;
}
export interface X402PaymentRequest {
    amount: bigint;
    token: `0x${string}`;
    recipient: `0x${string}`;
    dataUri: string;
    required: boolean;
}
export interface X402Response {
    status: 402;
    paymentUrl: string;
    amount: string;
    token: string;
    recipient: string;
    chainId: number;
}
export interface TreasuryAutopayConfig {
    maxDailyAllowance: bigint;
    hotWalletAddress: `0x${string}`;
    topUpThreshold: bigint;
    topUpAmount: bigint;
}
//# sourceMappingURL=types.d.ts.map