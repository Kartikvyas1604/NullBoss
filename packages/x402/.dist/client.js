import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from 'viem/chains';
export class X402Client {
    walletClient;
    account;
    chainId;
    constructor(privateKey, chainId = 43114) {
        this.account = privateKeyToAccount(privateKey);
        this.chainId = chainId;
        this.walletClient = createWalletClient({
            account: this.account,
            chain: chainId === 43114 ? avalanche : avalancheFuji,
            transport: http()
        });
    }
    async fetchWithPayment(url, options = {}) {
        const initialResponse = await fetch(url, {
            ...options,
            headers: { ...options.headers, 'Accept': 'application/json' }
        });
        if (initialResponse.status === 402) {
            const paymentRequest = await initialResponse.json();
            return this.retryWithPayment(url, options, paymentRequest);
        }
        return initialResponse;
    }
    async retryWithPayment(url, options, paymentRequest) {
        const txHash = await this.sendPayment(paymentRequest);
        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'X-Payment-Hash': txHash,
                'X-Payment-Amount': paymentRequest.amount,
                'X-Payment-Token': paymentRequest.token
            }
        });
    }
    async sendPayment(request) {
        const tx = await this.walletClient.sendTransaction({
            to: request.recipient,
            value: parseUnits(request.amount, 18),
            chain: null
        });
        return tx;
    }
    async verifyPayment(receiptHash) {
        const publicClient = createPublicClient({
            chain: this.chainId === 43114 ? avalanche : avalancheFuji,
            transport: http()
        });
        const receipt = await publicClient.getTransactionReceipt({ hash: receiptHash });
        return receipt.status === 'success';
    }
}
//# sourceMappingURL=client.js.map