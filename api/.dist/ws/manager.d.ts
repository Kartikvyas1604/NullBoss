type WebSocketLike = {
    send(data: string): void;
};
type WebSocketHandler = {
    open?: (ws: WebSocketLike) => void;
    message?: (ws: WebSocketLike, message: {
        toString(): string;
    }) => void;
    close?: (ws: WebSocketLike) => void;
};
declare class WSManager {
    private clients;
    private heartbeatInterval;
    private vaultAddress;
    private registryAddress;
    constructor();
    getWebSocketHandler(): WebSocketHandler;
    private handleMessage;
    private send;
    broadcastHeartbeat(): Promise<void>;
    broadcastTrade(trade: any): void;
    stop(): void;
}
export declare const wsManager: WSManager;
export {};
//# sourceMappingURL=manager.d.ts.map