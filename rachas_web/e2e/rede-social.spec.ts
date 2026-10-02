/**
 * Rede social — fluxos completos no desktop, contra a API real (cenário do seed_e2e):
 *   Ana e Beto são amigos; Beto e Caio são amigos; Duda é de outro racha e não conhece ninguém.
 * Os testes rodam em ordem: cada um parte do que o anterior deixou no banco.
 */
import path from "node:path";
import { expect, test } from "@playwright/test";
import { entrar, FIXTURES, marcar, post, respiro } from "./apoio";

test.describe.configure({ mode: "serial" });

test("01 · menu Social abre o feed de amigos e o Explorar", async ({ page }) => {
  await entrar(page, "ana");
  await page.getByRole("link", { name: "Social" }).first().click();
  await expect(page).toHaveURL(/\/social$/);

  // Feed de amigos: post do Beto (amigo), com a foto e a marcação da Ana
  const doBeto = post(page, "Time campeão da quinta");
  await expect(doBeto).toBeVisible();
  await expect(doBeto.getByRole("img", { name: /Foto de Beto/ })).toBeVisible();
  await expect(doBeto.getByRole("link", { name: "@ana" })).toBeVisible();
  // Post "só amigos" do Caio não aparece para a Ana (não são amigos)
  await expect(page.getByText("Treino amanhã às 7h")).toHaveCount(0);
  await respiro(page);

  await page.getByRole("tab", { name: "Explorar" }).click();
  await expect(post(page, "Pelada de sábado confirmada!")).toBeVisible();
  await expect(post(page, "Defesa do ano")).toBeVisible();
  await expect(page.getByText("Treino amanhã às 7h")).toHaveCount(0);
  await respiro(page);
});

test("02 · publicar post com foto e marcação de amigo", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social");
  const campo = page.getByLabel("Texto da publicação");
  await campo.pressSequentially("Resenha pós-jogo com ", { delay: 20 });
  await marcar(page, campo, "be", "Beto Lima");
  await expect(campo).toHaveValue("Resenha pós-jogo com @beto ");
  await campo.pressSequentially("🔥", { delay: 20 });
  await page.getByTestId("input-midia").setInputFiles(path.join(FIXTURES, "time.jpg"));
  await expect(page.getByRole("img", { name: "Prévia da foto" })).toBeVisible();
  await respiro(page);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Publicado!")).toBeVisible();

  const meu = post(page, "Resenha pós-jogo");
  await expect(meu.getByRole("img", { name: /Foto de Ana/ })).toBeVisible();
  await respiro(page);
  // A marcação vira link para o perfil
  await meu.getByRole("link", { name: "@beto" }).click();
  await expect(page).toHaveURL(/\/social\/perfil\/beto$/);
  await expect(page.getByRole("heading", { name: "Beto Lima" })).toBeVisible();
  await respiro(page);
});

test("03 · curtir, comentar marcando alguém e compartilhar no feed", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social");
  const card = post(page, "Time campeão da quinta");

  await card.getByRole("button", { name: "Curtir" }).click();
  await expect(card.getByText("1 curtida")).toBeVisible();
  await expect(card.getByRole("button", { name: "Curtir" })).toHaveAttribute("aria-pressed", "true");
  await respiro(page);

  await card.getByRole("button", { name: "Comentar" }).click();
  const comentario = card.getByLabel("Escrever comentário");
  await comentario.pressSequentially("Golaço! ", { delay: 20 });
  await marcar(page, comentario, "ca", "Caio Ramos");
  await card.getByRole("button", { name: "Enviar" }).click();
  const comentarios = card.getByTestId("comentarios");
  await expect(comentarios.getByText("Golaço!")).toBeVisible();
  await expect(comentarios.getByRole("link", { name: "@caio" })).toBeVisible();
  await expect(card.getByText("1 comentário")).toBeVisible();
  await respiro(page);

  await card.getByRole("button", { name: "Compartilhar" }).click();
  await page.getByRole("menuitem", { name: "Compartilhar no feed" }).click();
  const dialogo = page.getByRole("dialog", { name: "Compartilhar no feed" });
  await dialogo.getByLabel("Texto do compartilhamento").fill("Que time!");
  await respiro(page, 400);
  await dialogo.getByRole("button", { name: "Compartilhar" }).click();
  await expect(page.getByText("Compartilhado no seu feed!")).toBeVisible();
  const compartilhado = post(page, "Que time!");
  await expect(compartilhado.getByText("compartilhou")).toBeVisible();
  await expect(compartilhado.getByText("Time campeão da quinta")).toBeVisible();
  await respiro(page);
});

test("04 · perfil do jogador mostra estatísticas de todos os rachas", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social/perfil/beto");
  await expect(page.getByRole("heading", { name: "Beto Lima" })).toBeVisible();
  const stats = page.getByRole("region", { name: "Estatísticas em todos os rachas" });
  const valor = (rotulo: string) => stats.locator(".stat-tile").filter({ hasText: rotulo }).locator("span.text-3xl");
  await expect(valor("Gols")).toHaveText("3");
  await expect(valor("Jogos")).toHaveText("2");
  await expect(valor("Rachas")).toHaveText("2");
  await expect(valor("Prêmios")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Amigos" })).toBeVisible();
  await expect(post(page, "Time campeão da quinta")).toBeVisible();
  await respiro(page);
  await page.getByRole("tab", { name: "Reels" }).click();
  await expect(page.getByText("Nada por aqui ainda.")).toBeVisible();
  await respiro(page);
});

test("05 · buscar jogador de outro racha e pedir amizade", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social/amigos");
  await page.getByLabel("Buscar jogadores").fill("Duda");
  await respiro(page, 500);
  await page.getByRole("button", { name: "Adicionar Duda Martins" }).click();
  await expect(page.getByText("Pedido enviado!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviado" })).toBeVisible();
  await expect(page.getByText("Pedidos enviados")).toBeVisible();
  await respiro(page);
});

test("06 · notificação do pedido e aceite da amizade", async ({ page }) => {
  await entrar(page, "duda");
  // Selo no menu lateral: 1 pedido de amizade
  await expect(page.getByRole("link", { name: /Social/ }).first()).toContainText("1");
  await page.goto("/social/notificacoes");
  await expect(page.getByTestId("notificacoes")).toContainText("Ana Souza quer ser seu amigo");
  await respiro(page);
  await page.getByText("quer ser seu amigo").click();
  await expect(page).toHaveURL(/\/social\/amigos$/);
  await page.getByRole("button", { name: "Aceitar Ana Souza" }).click();
  await expect(page.getByText("Agora vocês são amigos!")).toBeVisible();
  await expect(page.getByTestId("lista-amigos")).toContainText("Ana Souza");
  await respiro(page);
  await page.goto("/social/perfil/ana");
  await expect(page.getByRole("button", { name: "Amigos" })).toBeVisible();
  await respiro(page);
});

test("07 · Beto recebe as notificações de curtida, comentário, marcação e compartilhamento", async ({ page }) => {
  await entrar(page, "beto");
  await page.goto("/social/notificacoes");
  const lista = page.getByTestId("notificacoes");
  await expect(lista).toContainText("Ana Souza curtiu seu post");
  await expect(lista).toContainText("Ana Souza comentou no seu post");
  await expect(lista).toContainText("Ana Souza marcou você");
  await expect(lista).toContainText("Ana Souza compartilhou seu post");
  await respiro(page);
  await lista.getByText("marcou você").click();
  await expect(page).toHaveURL(/\/social\/post\//);
  await expect(post(page, "Resenha pós-jogo")).toBeVisible();
  await respiro(page);
});

test("08 · privacidade: post 'só amigos' aparece só para amigos", async ({ page }) => {
  await entrar(page, "beto"); // amigo do Caio
  await page.goto("/social/perfil/caio");
  await expect(post(page, "Treino amanhã às 7h")).toBeVisible();
  await respiro(page);

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await entrar(page, "ana"); // não é amiga do Caio
  await page.goto("/social/perfil/caio");
  await expect(page.getByRole("heading", { name: "Caio Ramos" })).toBeVisible();
  await expect(page.getByText("Treino amanhã às 7h")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Adicionar amigo" })).toBeVisible();
  await respiro(page);
});

test("09 · publicar um reel pelo navegador", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social/reels");
  await page.getByRole("button", { name: "Novo reel" }).click();
  const dialogo = page.getByRole("dialog", { name: "Novo reel" });
  await dialogo.getByLabel("Texto da publicação").fill("Meu primeiro reel do racha");
  await dialogo.getByTestId("input-midia").setInputFiles(path.join(FIXTURES, "lance.webm"));
  await expect(dialogo.getByLabel("Prévia do vídeo")).toBeVisible();
  await respiro(page);
  await dialogo.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Reel publicado!")).toBeVisible();
  await expect(page.getByTestId("reel").filter({ hasText: "Meu primeiro reel do racha" })).toBeVisible();
  await respiro(page, 1500);
});

test("10 · apagar o próprio post", async ({ page }) => {
  await entrar(page, "ana");
  await page.goto("/social/perfil/ana");
  const meu = post(page, "Resenha pós-jogo");
  await meu.getByRole("button", { name: "Opções do post" }).click();
  await page.getByRole("menuitem", { name: "Apagar post" }).click();
  await page.getByRole("button", { name: "Apagar post" }).click();
  await expect(page.getByText("Post apagado.")).toBeVisible();
  await expect(page.getByText("Resenha pós-jogo")).toHaveCount(0);
  await respiro(page);
});
