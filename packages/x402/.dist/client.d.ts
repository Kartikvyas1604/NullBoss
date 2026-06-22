import { type Hash } from 'viem';
import type { X402Response } from './types';
export declare class X402Client {
    private walletClient;
    private account;
    private chainId;
    constructor(privateKey: `0x${string}`, chainId?: number);
    fetchWithPayment(url: string, options?: RequestInit): Promise<Response>;
    private retryWithPayment;
    sendPayment(request: X402Response): Promise<Hash>;
    verifyPayment(receiptHash: Hash): Promise<boolean>;
}
//# sourceMappingURL=client.d.ts.map