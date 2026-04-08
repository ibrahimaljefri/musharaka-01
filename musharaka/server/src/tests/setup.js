// Test environment setup — runs before any test file is imported
// Sets all required env vars so the server modules initialise without crashing

process.env.SUPABASE_URL             = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ENCRYPTION_KEY            = 'a'.repeat(64)
process.env.NODE_ENV                  = 'test'
process.env.REDIS_URL                 = 'redis://localhost:6379'
process.env.SEINOMY_MOCK              = 'true'
