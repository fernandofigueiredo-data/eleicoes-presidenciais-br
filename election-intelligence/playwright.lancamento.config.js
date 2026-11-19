import { defineConfig, devices } from '@playwright/test';

// Verificação de lançamento contra um site publicado (padrão: produção) ou o build local.
// Uso: PW_CHANNEL=chrome npx playwright test -c playwright.lancamento.config.js
//      BASE_URL=http://localhost:4173 ... para o build local (sobe o vite preview)
const channel = process.env.PW_CHANNEL || undefined;
const baseURL = process.env.BASE_URL || 'https://eleicoes-presidenciais-br.vercel.app';
const local = baseURL.startsWith('http://localhost');

export default defineConfig({
  testDir: 'tests/lancamento',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/lancamento',
  use: { baseURL, locale: 'pt-BR', ...devices['Desktop Chrome'], channel },
  webServer: local ? { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 } : undefined,
});
