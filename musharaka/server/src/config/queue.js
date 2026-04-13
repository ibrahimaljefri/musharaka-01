// Skip real Redis/BullMQ when REDIS_URL is absent (test, cPanel, Render free tier)
if (!process.env.REDIS_URL || process.env.NODE_ENV === 'test') {
  module.exports = {
    saleImportQueue: { add: () => Promise.resolve({ id: 'mock-job' }) },
    connection:       {},
  }
} else {
  const { Queue } = require('bullmq')
  const Redis     = require('ioredis')

  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  })

  const saleImportQueue = new Queue('sale-import', { connection })

  module.exports = { saleImportQueue, connection }
}
