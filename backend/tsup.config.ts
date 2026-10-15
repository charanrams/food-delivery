import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/scripts/seed.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  noExternal: ['@a3/contracts'], // contracts ship as TS source — bundle them
});
