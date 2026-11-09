# Ninho Fofo

[![testes](https://github.com/Jushirambo/ninho-fofo/actions/workflows/test.yml/badge.svg)](https://github.com/Jushirambo/ninho-fofo/actions/workflows/test.yml)

### ▶️ Jogue agora: **https://jushirambo.github.io/ninho-fofo/**

Um jogo de lógica original com filhotes fofinhos, feito em HTML, CSS e JavaScript puros.

Pintinho, porquinho, corujinha, axolote, capivara, ouriço e foca precisam de uma toca no ninho — mas ninguém quer dividir a mesma linha ou coluna com outro filhote da **mesma cor** ou da **mesma espécie**.

> Projeto independente. Nome, textos, regras escritas e todas as ilustrações (49 filhotes em SVG gerado no código) foram criados para este repositório. Não é adaptação, clone ou produto derivado de nenhum jogo comercial.

## Jogar

**Online:** https://jushirambo.github.io/ninho-fofo/

**Local:** abra o `index.html` no navegador. Não precisa instalar nada.

Arquivo único:

```bash
node tools/build.mjs
```

Gera `ninho-fofo.html`.

## O que tem

- Solo, 2 a 5 jogadores no mesmo aparelho, ou contra a IA.
- Ninho compartilhado **7×7**, com 49 filhotes únicos (7 espécies × 7 pelagens).
- Sem repetir cor nem espécie na linha/coluna; cada toca precisa ser vizinha.
- Depois de acomodar: pegar outro da cestinha ou reduzir o limite da mão para sempre.
- Vence quem terminar com menos filhotes na mão.
- Três níveis de IA, histórico, som, atalhos e layout responsivo.

## Como jogar em 30 segundos

1. Cada um começa com 4 filhotes; um já está no ninho.
2. Clique num filhote da mão e depois numa toca destacada.
3. Passe o mouse para ver a prévia e os conflitos.
4. Depois, escolha **Pegar filhote** ou **Não pegar**.
5. Quem ficar sem jogada sai; no fim, menos filhotes na mão ganha.

Atalhos: `1`–`7` escolhem o filhote, `Esc` desmarca, `Enter` confirma a compra.

## Testes

```bash
npm test
```

## Licença

MIT. Veja `LICENSE`.
