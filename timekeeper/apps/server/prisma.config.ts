import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrate: {
    adapter: () => {
      const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL']! });
      return new PrismaPg(pool);
    },
  },
});
