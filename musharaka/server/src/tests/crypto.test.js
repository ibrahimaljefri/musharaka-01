import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

// IMPORTANT: ENCRYPTION_KEY must be set BEFORE the crypto module is required,
// because it evaluates KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex') at load time.
// We set it here at module evaluation time (top-level, before any require).
process.env.ENCRYPTION_KEY = 'a'.repeat(64) // valid 32-byte hex key

const require = createRequire(import.meta.url)
const { encrypt, decrypt } = require('../utils/crypto')

describe('crypto utils', () => {

  it('encrypt returns a string in IV:ciphertext format (hex:hex)', () => {
    const result = encrypt('hello world')
    expect(typeof result).toBe('string')
    // Must contain exactly one colon separating two hex strings
    const parts = result.split(':')
    expect(parts).toHaveLength(2)
    const [ivHex, encHex] = parts
    // IV is 16 bytes = 32 hex chars
    expect(ivHex).toHaveLength(32)
    expect(ivHex).toMatch(/^[0-9a-f]+$/i)
    // Ciphertext should be non-empty hex
    expect(encHex.length).toBeGreaterThan(0)
    expect(encHex).toMatch(/^[0-9a-f]+$/i)
  })

  it('decrypt reverses encrypt for ASCII text', () => {
    const plaintext = 'Hello, Musharaka!'
    const ciphertext = encrypt(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('decrypt reverses encrypt for Unicode/Arabic text', () => {
    const arabic = 'فرع رقم واحد'
    const ciphertext = encrypt(arabic)
    expect(decrypt(ciphertext)).toBe(arabic)
  })

  it('decrypt reverses encrypt for mixed Arabic/English/numbers', () => {
    const mixed = 'Branch فرع 123 — Test'
    const ciphertext = encrypt(mixed)
    expect(decrypt(ciphertext)).toBe(mixed)
  })

  it('two encryptions of the same plaintext produce different ciphertexts (random IV)', () => {
    const plaintext = 'same input'
    const ct1 = encrypt(plaintext)
    const ct2 = encrypt(plaintext)
    // Different IVs → different ciphertexts
    expect(ct1).not.toBe(ct2)
    // Both still decrypt correctly
    expect(decrypt(ct1)).toBe(plaintext)
    expect(decrypt(ct2)).toBe(plaintext)
  })

  it('decrypt throws on tampered ciphertext (modified enc portion)', () => {
    const ct = encrypt('sensitive data')
    const [ivHex, encHex] = ct.split(':')
    // Flip the last hex character to corrupt the ciphertext
    const lastChar = encHex[encHex.length - 1]
    const flipped  = lastChar === 'f' ? '0' : 'f'
    const tampered = ivHex + ':' + encHex.slice(0, -1) + flipped
    expect(() => decrypt(tampered)).toThrow()
  })

  it('decrypt throws on completely invalid input', () => {
    expect(() => decrypt('not-valid-ciphertext')).toThrow()
  })

  it('encrypt handles empty string and round-trips correctly', () => {
    const ct = encrypt('')
    expect(typeof ct).toBe('string')
    expect(ct).toContain(':')
    expect(decrypt(ct)).toBe('')
  })

  it('encrypt handles long Arabic text', () => {
    const long = 'أ'.repeat(500)
    const ct = encrypt(long)
    expect(decrypt(ct)).toBe(long)
  })
})
