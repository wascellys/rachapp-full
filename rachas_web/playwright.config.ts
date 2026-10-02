import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de integração ponta a ponta (frontend + API Django reais).
 *
 *   npm run test:e2e          roda tudo e grava um vídeo por teste em e2e/resultados/
 *   npm run test:e2e:relatorio abre o relatório HTML (com os vídeos)
 *   npm run test:e2e:assistir  abre o navegador na tela e vai devagar, para acompanhar os testes
 *
 * Os dois servidores sobem sozinhos: a API em :8100 (SQLite temporário + seed_e2e) e o Vite em :3100.
 */
const API = "http://127.0.0.1:8100";
const WEB = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/resultados",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Os testes compartilham o mesmo banco semeado: um de cada vez, na ordem
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/relatorio", open: "never" }],
    ["json", { outputFile: "e2e/resultados/resultados.json" }],
  ],
  use: {
    baseURL: WEB,
    locale: "pt-BR",
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // SLOWMO=500 deixa cada ação mais lenta (útil com --headed para assistir)
    launchOptions: { slowMo: Number(process.env.SLOWMO || 0) },
  },
  projects: [
    {
      name: "desktop",
      testMatch: /rede-social\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        video: { mode: "on", size: { width: 1280, height: 800 } },
      },
    },
    {
      name: "celular",
      testMatch: /celular\.spec\.ts/,
      dependencies: ["desktop"],
      use: {
        ...devices["Pixel 7"],
        video: { mode: "on", size: { width: 412, height: 839 } },
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/start-api.mjs",
      url: `${API}/api/v1/social/resumo/`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
    {
      command: "npx vite --host 127.0.0.1 --port 3100 --strictPort",
      url: WEB,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: `${API}/api/v1`, VITE_AUTH_URL: `${API}/api/auth` },
    },
  ],
});
