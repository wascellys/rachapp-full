// Sobe a API Django isolada para os testes E2E: banco SQLite temporário, seed fixo e sem R2/e-mail reais.
// Usado pelo webServer do playwright.config.ts. Python: $PYTHON, o venv do rachas_api ou "python".
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(aqui, "../../rachas_api");
const porta = process.env.E2E_API_PORT || "8100";

const candidatos = [
  process.env.PYTHON,
  path.join(apiDir, "venv", "Scripts", "python.exe"),
  path.join(apiDir, "venv", "bin", "python"),
].filter(Boolean);
const python = candidatos.find(p => fs.existsSync(p)) || "python";

const banco = path.join(os.tmpdir(), "rachapp-e2e.sqlite3").replace(/\\/g, "/");
const env = {
  ...process.env,
  DATABASE_URL: `sqlite:///${banco}`,
  E2E_SEED: "1",
  DEBUG: "True",
  ALLOWED_HOSTS: "127.0.0.1,localhost",
  CORS_ALLOW_ALL_ORIGINS: "True",
  BASE_URL_SYSTEM: `http://127.0.0.1:${porta}`,
  FRONTEND_URL: "http://127.0.0.1:3100",
  CLOUDFLARE_R2_BUCKET: "",
  RESEND_API_KEY: "",
  EMAIL_BACKEND: "django.core.mail.backends.console.EmailBackend",
  PYTHONIOENCODING: "utf-8",
};

function rodar(args) {
  const r = spawnSync(python, ["manage.py", ...args], { cwd: apiDir, env, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`[e2e] falhou: python manage.py ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

rodar(["migrate", "--noinput", "-v", "0"]);
rodar(["seed_e2e", "--fixtures", path.join(aqui, "fixtures")]);

const servidor = spawn(python, ["manage.py", "runserver", `127.0.0.1:${porta}`, "--noreload"], { cwd: apiDir, env, stdio: "inherit" });
const encerrar = () => servidor.kill();
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
process.on("exit", encerrar);
servidor.on("exit", codigo => process.exit(codigo ?? 0));
