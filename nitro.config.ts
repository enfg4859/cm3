import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineNitroConfig } from 'nitropack/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2026-03-19',
  alias: {
    '@shared': resolve(rootDir, 'shared')
  }
});
