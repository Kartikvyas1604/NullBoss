import { type Hash } from 'viem';
export declare class VaultService {
    private publicClient;
    private walletClient?;
    private vaultAddress;
    constructor(chainId: number, rpcUrl: string, vaultAddress: `0x${string}`, privateKey?: `0x${string}`);
    getTotalAssets(): Promise<bigint>;
    getSharePrice(): Promise<bigint>;
    harvest(agentId: number): Promise<Hash>;
}
//# sourceMappingURL=vault-service.d.ts.map