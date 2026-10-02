// Roda os testes E2E com o navegador visível e em câmera lenta, para acompanhar na tela.
// Uso: npm run test:e2e:assistir [-- filtro]   (SLOWMO=900 npm run test:e2e:assistir para ir mais devagar)
import { spawn } from "node:child_process";

const env = { ...process.env, SLOWMO: process.env.SLOWMO || "500" };
const filho = spawn("npx", ["playwright", "test", "--headed", ...process.argv.slice(2)], { stdio: "inherit", env, shell: true });
filho.on("exit", codigo => process.exit(codigo ?? 0));
