const { Queue, Worker } = require('bullmq')
const Redis = require('ioredis')

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const saleImportQueue = new Queue('sale-import', { connection })

module.exports = { saleImportQueue, connection }
