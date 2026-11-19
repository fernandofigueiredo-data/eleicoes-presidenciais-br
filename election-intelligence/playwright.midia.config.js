import { defineConfig, devices } from '@playwright/test';

// Gravação do vídeo e das imagens de divulgação (T4). Não faz parte da suíte de testes.
// Uso: PW_CHANNEL=chrome npx playwright test -c playwright.midia.config.js
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'scripts/midia',
  testMatch: /\.midia\.js$/,
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/midia',
  use: { baseURL: 'http://localhost:4173', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...devices['Desktop Chrome'], channel },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
});
