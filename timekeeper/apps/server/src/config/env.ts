import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
  // Comma-separated "token:userId" pairs, e.g. "abc:1,def:2"
  MCP_BEARER_TOKENS: z.string().default('demo-token-admin:1,demo-token-member:2'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function parseBearerTokenMap(): Map<string, number> {
  const map = new Map<string, number>();
  for (const pair of env.MCP_BEARER_TOKENS.split(',')) {
    const [token, userId] = pair.trim().split(':');
    if (token && userId) map.set(token, parseInt(userId, 10));
  }
  return map;
}
