const { Worker } = require('bullmq')
const { connection } = require('../config/queue')
const { saleDistributionService } = require('../services/saleDistributionService')
const { insertMany } = require('../db/query')

const worker = new Worker('sale-import', async job => {
  const { rowData, branchId, tenantId } = job.data
  const rows = saleDistributionService.expand({ ...rowData, branch_id: branchId })
  const rowsWithTenant = tenantId ? rows.map(r => ({ ...r, tenant_id: tenantId })) : rows
  await insertMany('sales', rowsWithTenant)
}, { connection, concurrency: 5 })

worker.on('failed', (job, err) => {
  console.error(`Import job ${job?.id} failed:`, err.message)
})

module.exports = worker
