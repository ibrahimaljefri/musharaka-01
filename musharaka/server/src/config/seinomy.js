module.exports = {
  baseUrl: process.env.SEINOMY_BASE_URL || '',
  mock: process.env.SEINOMY_MOCK === 'true',
  timeout: parseInt(process.env.SEINOMY_TIMEOUT || '10000'),
}
