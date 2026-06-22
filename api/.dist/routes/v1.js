import { Hono } from 'hono';
import { vaultRouter } from './vault';
import { agentRouter } from './agents';
import { tradeRouter } from './trades';
import { feeRouter } from './fees';
import { authRouter } from './auth';
import { privacyRouter } from './privacy';
export const v1Router = new Hono();
v1Router.route('/auth', authRouter);
v1Router.route('/vault', vaultRouter);
v1Router.route('/agents', agentRouter);
v1Router.route('/trades', tradeRouter);
v1Router.route('/fees', feeRouter);
v1Router.route('/privacy', privacyRouter);
//# sourceMappingURL=v1.js.map