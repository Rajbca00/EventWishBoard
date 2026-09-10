import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': here('./src'),
      // Next provides this module itself; outside Next it does not resolve.
      'server-only': here('./test/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Transforms are re-done on every run otherwise, which on a slow disk is
    // most of the wall-clock time.
    fsModuleCache: true,
    // Every file gets its own module registry, so the in-memory demo store one
    // suite fills cannot leak into another.
    isolate: true,
    env: {
      // Force demo mode: the suite must never reach a real Supabase project.
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
  },
});
