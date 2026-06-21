import { Hono } from 'hono'

const feeRouter = new Hono()

feeRouter.get('/breakdown', (c) => {
  return c.json({
    managementFee: '1500000',
    performanceFee: '8500000',
    totalAccrued: '10000000',
    parentTreasuryShare: '4000000',
    subAgentShare: '3000000',
    protocolTreasuryShare: '3000000',
    annualizedRate: '2.0',
    performanceRate: '20.0',
    highWaterMark: '125000000',
    currentSharePrice: '127000000',
    lastHarvest: Date.now() - 86400000
  })
})

feeRouter.get('/history', (c) => {
  return c.json({
    history: [
      { date: Date.now() - 86400000 * 7, mgmtFee: '500000', perfFee: '2500000', sharePrice: '115000000' },
      { date: Date.now() - 86400000 * 6, mgmtFee: '520000', perfFee: '0', sharePrice: '114500000' },
      { date: Date.now() - 86400000 * 5, mgmtFee: '530000', perfFee: '3100000', sharePrice: '120000000' },
    ],
    total: 3
  })
})

export { feeRouter }
