import { routes, deploymentEnv, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'next build',
  framework: 'nextjs',
  devCommand: 'npm run dev',
  installCommand: 'npm install',

  // Cron jobs for automated tasks
  crons: [
    {
      path: '/api/cron/subscription-sync',
      schedule: '0 2 * * *', // Daily at 2 AM UTC
    },
    {
      path: '/api/cron/due-generation',
      schedule: '30 20 * * *', // Daily at 8:30 PM UTC (2:30 AM IST)
    },
  ],

  // Headers for security and caching
  headers: [
    routes.cacheControl('/static/(.*)', { public: true, maxAge: '1 year', immutable: true }),
    routes.header('/api/(.*)', [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]),
  ],

  // Rewrites for API routes if needed
  rewrites: [
    routes.rewrite('/health', '/api/health'),
  ],

  // Regions for edge functions (if any)
  regions: ['bom1'], // Mumbai region for India-based users
};