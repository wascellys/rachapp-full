/**
 * Rede social no celular (Pixel 7): menu inferior, feed sem rolagem lateral e reels em tela cheia.
 * Roda depois da suíte desktop (mesmo banco): a Ana já publicou um reel.
 */
import { expect, test } from "@playwright/test";
import { entrar, respiro } from "./apoio";

test("11 · celular: menu inferior leva ao feed, sem rolagem lateral", async ({ page }) => {
  await entrar(page, "beto");
  const menuInferior = page.locator("nav.fixed");
  await menuInferior.getByText("Social").click();
  await expect(page).toHaveURL(/\/social$/);
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  const rolagemLateral = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(rolagemLateral).toBeLessThanOrEqual(0);
  await respiro(page);
});

test("12 · celular: reels tocam sozinhos, curtir e comentar", async ({ page }) => {
  await entrar(page, "beto");
  await page.goto("/social/reels");
  const reel = page.getByTestId("reel").first();
  await expect(reel).toBeVisible();

  // O vídeo começa a tocar (sem som) quando o reel aparece na tela
  const video = reel.locator("video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0), { timeout: 15_000 }).toBe(true);
  await respiro(page, 1200);

  const curtir = reel.getByRole("button", { name: "Curtir reel" });
  const antes = Number(await curtir.innerText());
  await curtir.click();
  await expect(curtir).toHaveAttribute("aria-pressed", "true");
  await expect(curtir).toHaveText(String(antes + 1));
  await respiro(page);

  await reel.getByRole("button", { name: "Comentar reel" }).click();
  const dialogo = page.getByRole("dialog", { name: "Comentários" });
  await dialogo.getByLabel("Escrever comentário").fill("Que lance!");
  await dialogo.getByRole("button", { name: "Enviar" }).click();
  await expect(dialogo.getByText("Que lance!")).toBeVisible();
  await respiro(page);
  await page.keyboard.press("Escape");

  // Rolar para o próximo reel encaixa um por vez
  const total = await page.getByTestId("reel").count();
  if (total > 1) {
    await page.getByTestId("reels-scroller").evaluate(el => el.scrollBy({ top: el.clientHeight }));
    const segundo = page.getByTestId("reel").nth(1).locator("video");
    await expect.poll(() => segundo.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 15_000 }).toBe(true);
    await respiro(page, 1200);
  }
});
