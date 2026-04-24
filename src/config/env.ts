import { z } from 'zod';

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => (value ?? 'true') === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  BASE_URL: z.string().url(),
  API_AUTH_TOKEN: z.string().min(1),
  CORS_ORIGIN: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  GITHUB_TOKEN: z.string().min(1),
  POLL_CRON: z.string().min(1),

  SERVERCHAN_SENDKEY: z.string().optional(),

  RSS_ENABLED: booleanFromString,
  RSS_FEED_TOKEN: z.string().optional(),
  RSS_FEED_LIMIT: z.coerce.number().int().positive().max(100).default(50),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
