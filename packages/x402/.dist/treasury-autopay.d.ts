import { type Hash } from 'viem';
import type { TreasuryAutopayConfig } from './types';
export declare class TreasuryAutopay {
    private config;
    private walletClient;
    private publicClient;
    private account;
    private dailySpent;
    private lastResetDay;
    constructor(treasuryKey: `0x${string}`, config: TreasuryAutopayConfig, chainId?: number);
    private resetDailyIfNeeded;
    checkAndTopUp(): Promise<Hash | null>;
    get remainingDailyAllowance(): bigint;
}
//# sourceMappingURL=treasury-autopay.d.ts.map