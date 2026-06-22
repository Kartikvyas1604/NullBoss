export function createX402Middleware(config) {
    return async (request) => {
        const paymentHash = request.headers.get('X-Payment-Hash');
        if (!paymentHash) {
            return new Response(JSON.stringify({
                status: 402,
                paymentUrl: '/api/payments',
                amount: config.price.toString(),
                token: config.token,
                recipient: config.recipient,
                chainId: 43114
            }), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const isValid = await config.verifyPayment(paymentHash);
        if (!isValid) {
            return new Response('Invalid payment', { status: 402 });
        }
        return null;
    };
}
//# sourceMappingURL=server.js.map