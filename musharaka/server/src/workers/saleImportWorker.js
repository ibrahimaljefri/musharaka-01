const { Worker } = require('bullmq')
const { connection } = require('../config/queue')
const { saleDistributionService } = require('../services/saleDistributionService')
const { supabase } = require('../config/supabase')

const worker = new Worker('sale-import', async job => {
  const { rowData, branchId } = job.data
  const rows = saleDistributionService.expand({ ...rowData, branch_id: branchId })
  const { error } = await supabase.from('sales').insert(rows)
  if (error) throw new Error(error.message)
}, { connection, concurrency: 5 })

worker.on('failed', (job, err) => {
  console.error(`Import job ${job?.id} failed:`, err.message)
})

module.exports = worker
