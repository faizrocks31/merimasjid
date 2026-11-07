import { routes, deploymentEnv, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
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

  // Environment variables that should be available at build time
  env: {
    // Required for the app to run
    DATABASE_URL: '@masjid_collection_db_url',
    AUTH_SECRET: '@masjid_collection_auth_secret',

    // Optional - for notifications
    TELEGRAM_BOT_TOKEN: '@masjid_collection_telegram_bot_token',
    TELEGRAM_CHANNEL_ID: '@masjid_collection_telegram_channel_id',

    // Optional - for billing webhooks
    STRIPE_WEBHOOK_SECRET: '@masjid_collection_stripe_webhook_secret',
    PADDLE_WEBHOOK_SECRET: '@masjid_collection_paddle_webhook_secret',

    // Optional - for email
    EMAIL_HOST: '@masjid_collection_email_host',
    EMAIL_PORT: '@masjid_collection_email_port',
    EMAIL_USER: '@masjid_collection_email_user',
    EMAIL_PASS: '@masjid_collection_email_pass',
    EMAIL_FROM: '@masjid_collection_email_from',

    // Optional - for public URL
    NEXT_PUBLIC_APP_URL: '@masjid_collection_app_url',
  },

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