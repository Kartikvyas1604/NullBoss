import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from 'viem/chains';
export class TreasuryAutopay {
    config;
    walletClient;
    publicClient;
    account;
    dailySpent = 0n;
    lastResetDay = 0;
    constructor(treasuryKey, config, chainId = 43114) {
        this.config = config;
        this.account = privateKeyToAccount(treasuryKey);
        this.walletClient = createWalletClient({
            account: this.account,
            chain: chainId === 43114 ? avalanche : avalancheFuji,
            transport: http()
        });
        this.publicClient = createPublicClient({
            chain: chainId === 43114 ? avalanche : avalancheFuji,
            transport: http()
        });
        this.resetDailyIfNeeded();
    }
    resetDailyIfNeeded() {
        const today = Math.floor(Date.now() / 86400000);
        if (today !== this.lastResetDay) {
            this.dailySpent = 0n;
            this.lastResetDay = today;
        }
    }
    async checkAndTopUp() {
        this.resetDailyIfNeeded();
        if (this.dailySpent >= this.config.maxDailyAllowance) {
            console.warn('Daily allowance exhausted');
            return null;
        }
        const balance = await this.publicClient.getBalance({
            address: this.config.hotWalletAddress
        });
        if (balance < this.config.topUpThreshold) {
            const topUpActual = this.config.topUpAmount >
                (this.config.maxDailyAllowance - this.dailySpent)
                ? (this.config.maxDailyAllowance - this.dailySpent)
                : this.config.topUpAmount;
            const tx = await this.walletClient.sendTransaction({
                to: this.config.hotWalletAddress,
                value: topUpActual,
                chain: null
            });
            this.dailySpent += topUpActual;
            console.log(`Topped up hot wallet with ${topUpActual} wei. Tx: ${tx}`);
            return tx;
        }
        return null;
    }
    get remainingDailyAllowance() {
        this.resetDailyIfNeeded();
        return this.config.maxDailyAllowance - this.dailySpent;
    }
}
//# sourceMappingURL=treasury-autopay.js.map