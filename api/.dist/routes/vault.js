import { Hono } from 'hono';
import { createPublicClient, http } from 'viem';
import { avalancheFuji, avalanche } from 'viem/chains';
const vaultRouter = new Hono();
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '43113');
const RPC_URL = process.env.RPC_URL || (CHAIN_ID === 43114
    ? 'https://api.avax.network/ext/bc/C/rpc'
    : 'https://api.avax-test.network/ext/bc/C/rpc');
const CHAIN = CHAIN_ID === 43114 ? avalanche : avalancheFuji;
const client = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL, { timeout: 8_000 }),
});
const readContract = client.readContract;
const getLogs = client.getLogs;
const VAULT_ABI = [
    { type: 'function', name: 'totalAssets', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'totalSupply', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'highWaterMark', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
    { type: 'function', name: 'paused', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
];
vaultRouter.get('/state', async (c) => {
    const vaultAddress = process.env.VAULT_ADDRESS;
    if (!vaultAddress)
        return c.json({ error: 'Vault not configured' }, 500);
    try {
        const [totalAssets, totalSupply, highWaterMark, paused] = await Promise.all([
            readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'totalAssets' }),
            readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'totalSupply' }),
            readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'highWaterMark' }),
            readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'paused' }),
        ]);
        const sharePrice = totalSupply > 0n ? (totalAssets * BigInt(10 ** 18)) / totalSupply : BigInt(10 ** 18);
        return c.json({
            totalAssets: totalAssets.toString(),
            totalSupply: totalSupply.toString(),
            sharePrice: sharePrice.toString(),
            highWaterMark: highWaterMark.toString(),
            paused,
            timestamp: Date.now()
        });
    }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'RPC error' }, 500);
    }
});
vaultRouter.get('/deposits', async (c) => {
    const vaultAddress = process.env.VAULT_ADDRESS;
    if (!vaultAddress)
        return c.json({ error: 'Vault not configured' }, 500);
    try {
        const deposits = await getLogs({
            address: vaultAddress,
            event: {
                type: 'event',
                name: 'Deposit',
                inputs: [
                    { type: 'address', name: 'sender', indexed: true },
                    { type: 'address', name: 'owner', indexed: true },
                    { type: 'uint256', name: 'assets' },
                    { type: 'uint256', name: 'shares' },
                ],
            },
            fromBlock: 0n,
            toBlock: 'latest',
        });
        return c.json({
            deposits: deposits.map((d) => ({
                sender: d.args.sender,
                owner: d.args.owner,
                assets: d.args.assets?.toString(),
                shares: d.args.shares?.toString(),
                timestamp: Number(d.blockNumber),
            })),
            total: deposits.length,
        });
    }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'RPC error' }, 500);
    }
});
vaultRouter.get('/withdrawals', async (c) => {
    const vaultAddress = process.env.VAULT_ADDRESS;
    if (!vaultAddress)
        return c.json({ error: 'Vault not configured' }, 500);
    try {
        const withdrawals = await getLogs({
            address: vaultAddress,
            event: {
                type: 'event',
                name: 'Withdraw',
                inputs: [
                    { type: 'address', name: 'sender', indexed: true },
                    { type: 'address', name: 'receiver', indexed: true },
                    { type: 'address', name: 'owner', indexed: true },
                    { type: 'uint256', name: 'assets' },
                    { type: 'uint256', name: 'shares' },
                ],
            },
            fromBlock: 0n,
            toBlock: 'latest',
        });
        return c.json({
            withdrawals: withdrawals.map((w) => ({
                sender: w.args.sender,
                receiver: w.args.receiver,
                owner: w.args.owner,
                assets: w.args.assets?.toString(),
                shares: w.args.shares?.toString(),
                timestamp: Number(w.blockNumber),
            })),
            total: withdrawals.length,
        });
    }
    catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'RPC error' }, 500);
    }
});
export { vaultRouter };
//# sourceMappingURL=vault.js.map