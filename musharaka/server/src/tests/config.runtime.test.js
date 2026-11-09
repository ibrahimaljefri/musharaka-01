/**
 * Unit tests — config/runtime.js (when the server starts listening)
 *
 * Under cPanel's Node.js Selector, Passenger loads src/index.js through its own
 * loader, so `require.main === module` is false. The app must still call
 * listen() or Passenger waits for it until the request times out.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
const { shouldListen, isPassenger } = _require('../config/runtime.js')

describe('shouldListen', () => {
  it('listens when run directly (node src/index.js)', () => {
    expect(shouldListen({ isMain: true, passenger: undefined })).toBe(true)
  })

  it('listens when loaded by Passenger', () => {
    expect(shouldListen({ isMain: false, passenger: { configure() {} } })).toBe(true)
  })

  it('does not listen when merely required (tests, tooling)', () => {
    expect(shouldListen({ isMain: false, passenger: undefined })).toBe(false)
  })
})

describe('isPassenger', () => {
  it('detects the PhusionPassenger global', () => {
    expect(isPassenger({ PhusionPassenger: {} })).toBe(true)
    expect(isPassenger({})).toBe(false)
  })

  it('defaults to the real global scope (absent under vitest)', () => {
    expect(isPassenger()).toBe(false)
  })
})
