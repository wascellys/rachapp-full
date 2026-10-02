# Testes de integração ponta a ponta (Playwright)

Testam o frontend contra a API Django real, com banco SQLite temporário e um cenário fixo
(`rachas_api/social/management/commands/seed_e2e.py`): Ana e Beto são amigos, Beto e Caio são amigos,
Duda é de outro racha. Senha de todos: `Teste#2026`.

```bash
cd rachas_web
npx playwright install chromium   # só na primeira vez
npm run test:e2e                  # roda tudo e grava um vídeo por teste em e2e/resultados/
npm run test:e2e:assistir         # abre o navegador na tela, em câmera lenta (SLOWMO=900 para mais devagar)
npm run test:e2e:relatorio        # relatório HTML com vídeos de cada teste
```

Os servidores sobem sozinhos (API em `:8100`, site em `:3100`). O Python usado é `$PYTHON`,
o `venv` de `rachas_api` ou `python`. O seed **apaga o banco** e por isso só roda em SQLite com `E2E_SEED=1`.

- `rede-social.spec.ts` — desktop: feed, publicar com foto e marcação, curtir/comentar/compartilhar, perfil,
  amizade entre rachas, notificações, privacidade, reel e exclusão (rodam em ordem, no mesmo banco).
- `celular.spec.ts` — Pixel 7: menu inferior e reels em tela cheia.

Os vídeos de teste usam WebM porque o Chromium do Playwright não reproduz H.264 (MP4).
