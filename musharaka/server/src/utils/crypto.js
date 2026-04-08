const crypto = require('crypto')

const ALGORITHM  = 'aes-256-cbc'
const KEY        = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex')
const IV_LENGTH  = 16

// Validate key in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === '0'.repeat(64)) {
    console.error('[FATAL] ENCRYPTION_KEY is not configured or is using the default placeholder. Exiting.')
    process.exit(1)
  }
  if (process.env.ENCRYPTION_KEY.length !== 64) {
    console.error('[FATAL] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Exiting.')
    process.exit(1)
  }
}

function encrypt(text) {
  const iv         = crypto.randomBytes(IV_LENGTH)
  const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text) {
  const [ivHex, encHex] = text.split(':')
  const iv        = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher  = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

module.exports = { encrypt, decrypt }
