/**
 * Unit tests — errorHandler middleware
 *
 * Uses a minimal in-test Express app so these tests are fully isolated
 * from the main application. The error handler is required directly from
 * its source file.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import express from 'express'
import request from 'supertest'

const _require = createRequire(import.meta.url)
const { errorHandler } = _require('../middleware/errorHandler.js')

/**
 * Build a minimal Express app that immediately forwards the given error
 * to the error handler via next(err).
 *
 * @param {Error} err - The error to forward to the handler
 * @returns {import('express').Express}
 */
function makeApp(err) {
  const app = express()
  app.get('/test', (req, res, next) => next(err))
  app.use(errorHandler)
  return app
}

describe('errorHandler middleware', () => {

  it('returns 500 and the error message for a generic Error', async () => {
    const app = makeApp(new Error('Something went wrong'))
    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Something went wrong')
  })

  it('returns the custom status code when err.status is set', async () => {
    const err = new Error('Bad input')
    err.status = 400
    const app = makeApp(err)
    const res = await request(app).get('/test')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Bad input')
  })

  it('returns 500 and the Arabic fallback when error message is empty', async () => {
    // new Error() sets message to '' — empty string is falsy so fallback is used
    const err = Object.assign(new Error(), { message: '' })
    const app = makeApp(err)
    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('حدث خطأ داخلي في الخادم')
  })

  it('does not include a stack trace in the response body', async () => {
    const app = makeApp(new Error('Test'))
    const res = await request(app).get('/test')
    expect(res.body).not.toHaveProperty('stack')
  })
})
