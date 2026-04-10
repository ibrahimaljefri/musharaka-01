// In test mode skip real Redis/BullMQ connections entirely
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    saleImportQueue: { add: () => Promise.resolve({ id: 'mock-job' }) },
    connection:       {},
  }
} else {
  const { Queue } = require('bullmq')
  const Redis     = require('ioredis')

  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })

  const saleImportQueue = new Queue('sale-import', { connection })

  module.exports = { saleImportQueue, connection }
}
