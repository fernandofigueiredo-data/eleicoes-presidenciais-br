import { defineConfig, devices } from '@playwright/test';

// Os testes rodam contra o build de produção (vite preview).
// PW_CHANNEL=chrome usa o Google Chrome instalado se o Chromium do Playwright não estiver disponível.
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: [['list'], ['json', { outputFile: 'docs/playwright-resultados.json' }]],
  use: { baseURL: 'http://localhost:4173', trace: 'off', locale: 'pt-BR' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.js/ },
    { name: 'mobile', use: { ...devices['Pixel 5'], channel }, testMatch: /mobile\.spec\.js/ },
  ],
});
