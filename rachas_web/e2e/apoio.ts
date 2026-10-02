import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";

/** Senha de todos os usuários criados pelo comando seed_e2e (rachas_api/social/management/commands). */
export const SENHA = "Teste#2026";
export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export async function entrar(page: Page, usuario: string) {
  await page.goto("/login");
  await page.fill("#username", usuario);
  await page.fill("#password", SENHA);
  await page.click("button[type=submit]");
  await page.waitForURL(url => !url.pathname.startsWith("/login"));
}

/** Card de post que contém o texto informado. */
export function post(page: Page, texto: string | RegExp) {
  return page.getByTestId("post-card").filter({ hasText: texto }).first();
}

/** Digita "@consulta" no campo e escolhe o usuário na lista de marcação. */
export async function marcar(page: Page, campo: ReturnType<Page["getByLabel"]>, consulta: string, nome: string) {
  await campo.pressSequentially(`@${consulta}`, { delay: 40 });
  const lista = page.getByRole("listbox", { name: "Marcar pessoa" });
  await expect(lista).toBeVisible();
  await lista.getByRole("option").filter({ hasText: nome }).click();
}

/** Pausa curta só para o vídeo do teste mostrar o resultado de cada passo. */
export const respiro = (page: Page, ms = 700) => page.waitForTimeout(ms);
