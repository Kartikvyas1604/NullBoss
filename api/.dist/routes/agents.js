import { Hono } from 'hono';
import { createPublicClient, http } from 'viem';
import { avalancheFuji, avalanche } from 'viem/chains';
const agentRouter = new Hono();
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
const REGISTRY_ABI = [
    {
        type: 'function',
        name: 'getAgent',
        inputs: [{ type: 'uint256' }],
        outputs: [{
                type: 'tuple',
                components: [
                    { type: 'uint256', name: 'agentId' },
                    { type: 'address', name: 'owner' },
                    { type: 'uint256', name: 'parentAgentId' },
                    { type: 'string', name: 'metadataUri' },
                    { type: 'bool', name: 'registered' },
                    { type: 'uint256', name: 'revokedAt' },
                ],
            }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isAgentActive',
        inputs: [{ type: 'uint256' }],
        outputs: [{ type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getReputation',
        inputs: [{ type: 'uint256' }],
        outputs: [
            { type: 'uint256', name: 'totalTrades' },
            { type: 'uint256', name: 'successfulTrades' },
        ],
        stateMutability: 'view',
    },
];
const AGENT_LABELS = {
    1: { name: 'Orchestrator', type: 'ORCHESTRATOR' },
    2: { name: 'Arbitrage Hunter', type: 'ARBITRAGE' },
    3: { name: 'Trend Follower', type: 'TREND' },
    4: { name: 'Liquidation Scout', type: 'LIQUIDATION' },
};
async function fetchAgents() {
    const registryAddress = process.env.REGISTRY_ADDRESS;
    if (!registryAddress)
        return [];
    const agents = [];
    for (let i = 1; i <= 10; i++) {
        try {
            const agent = await readContract({
                address: registryAddress,
                abi: REGISTRY_ABI,
                functionName: 'getAgent',
                args: [BigInt(i)],
            });
            const a = agent;
            if (!a.registered)
                continue;
            const isActive = await readContract({
                address: registryAddress,
                abi: REGISTRY_ABI,
                functionName: 'isAgentActive',
                args: [BigInt(i)],
            });
            let totalTrades = 0;
            let successfulTrades = 0;
            try {
                const rep = await readContract({
                    address: registryAddress,
                    abi: REGISTRY_ABI,
                    functionName: 'getReputation',
                    args: [BigInt(i)],
                });
                totalTrades = Number(rep[0]);
                successfulTrades = Number(rep[1]);
            }
            catch { }
            const label = AGENT_LABELS[i] || { name: `Agent #${i}`, type: 'UNKNOWN' };
            const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
            const confidence = Math.round(successRate * 100);
            agents.push({
                id: i,
                name: label.name,
                type: label.type,
                status: isActive ? 'running' : 'idle',
                confidence,
                tradesToday: totalTrades,
                successfulTrades,
                pnlToday: '0',
                parentId: Number(a.parentAgentId) || null,
                owner: a.owner,
            });
        }
        catch {
            break;
        }
    }
    return agents;
}
agentRouter.get('/', async (c) => {
    const agents = await fetchAgents();
    return c.json({ agents });
});
agentRouter.get('/:id', async (c) => {
    const agents = await fetchAgents();
    const id = parseInt(c.req.param('id'));
    const agent = agents.find(a => a.id === id);
    if (!agent)
        return c.json({ error: 'Agent not found' }, 404);
    return c.json(agent);
});
agentRouter.get('/:id/reputation', async (c) => {
    const registryAddress = process.env.REGISTRY_ADDRESS;
    const agentId = parseInt(c.req.param('id'));
    try {
        const rep = await readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: 'getReputation',
            args: [BigInt(agentId)],
        });
        const totalTrades = Number(rep[0]);
        const successfulTrades = Number(rep[1]);
        const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
        return c.json({
            agentId,
            totalTrades,
            successfulTrades,
            successRate,
            averageConfidence: Math.round(successRate * 100),
        });
    }
    catch {
        return c.json({ error: 'Agent not found' }, 404);
    }
});
agentRouter.get('/org-chart', async (c) => {
    const agents = await fetchAgents();
    const parent = agents.find(a => !a.parentId);
    const children = agents.filter(a => a.parentId);
    return c.json({
        root: parent ? {
            id: parent.id,
            name: parent.name,
            type: parent.type,
            children: children.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                status: c.status,
                parentId: parent.id,
            })),
        } : null
    });
});
export { agentRouter };
//# sourceMappingURL=agents.js.map