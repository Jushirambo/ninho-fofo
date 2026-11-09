/*
 * Testes do motor + simulações de partidas completas com a IA.
 * Rodar com: node tests/engine.test.js
 */
'use strict';

var assert = require('assert');
var E = require('../js/engine.js');
var AI = require('../js/ai.js');

var passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (err) {
    console.error('  FALHOU  ' + name);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

/** rng determinístico (mulberry32) para testes reprodutíveis */
function seeded(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('Ninho Fofo — testes do motor\n');

test('49 peças únicas: 7 cores x 7 espécies', function () {
  var seen = {};
  for (var i = 0; i < E.N_TILES; i++) {
    var key = E.colorOf(i) + '-' + E.shapeOf(i);
    assert.strictEqual(seen[key], undefined, 'combinação repetida: ' + key);
    seen[key] = true;
  }
  assert.strictEqual(Object.keys(seen).length, 49);
});

test('peça inicial fica na célula 0 e cada jogador recebe 4 peças', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], rng: seeded(1) });
  assert.notStrictEqual(s.grid[0], null);
  s.players.forEach(function (p) { assert.strictEqual(p.hand.length, 4); });
  var totalTiles = 1 + s.players.length * 4 + s.bag.length;
  assert.strictEqual(totalTiles, 49, 'soma de peças deve ser 49');
});

test('não é permitido repetir cor ou espécie na linha/coluna', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(2) });
  var p = E.activePlayer(s);
  var illegalFound = false;

  for (var i = 0; i < E.N_TILES; i++) {
    var r = E.rowOf(i), c = E.colOf(i);
    // peça de mesma cor da peça inicial, na mesma linha
    var sameColor = E.makeTile(E.colorOf(s.grid[0]), (E.shapeOf(s.grid[0]) + 1) % 7);
    assert.strictEqual(E.isLegal(s, sameColor, 0, c), false, 'mesma cor deveria ser ilegal');
    // peça de mesma espécie, na mesma coluna
    var sameShape = E.makeTile((E.colorOf(s.grid[0]) + 1) % 7, E.shapeOf(s.grid[0]));
    assert.strictEqual(E.isLegal(s, sameShape, r, 0), false, 'mesma espécie deveria ser ilegal');
    illegalFound = true;
  }
  assert.ok(illegalFound);
  assert.ok(p.hand.length === 4);
});

test('célula precisa ter vizinha ocupada', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(3) });
  var far = E.idx(6, 6);
  for (var t = 0; t < E.N_TILES; t++) {
    assert.strictEqual(E.isLegal(s, t, 6, 6), false, 'canto oposto não pode ser jogado no início');
  }
  assert.ok(far >= 0);
});

test('colocar peça remove da mão, preenche a célula e abre a fase de compra', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(4) });
  var p = E.activePlayer(s);
  var tile = p.hand.find(function (t) { return E.legalCells(s, t).length > 0; });
  var cell = E.legalCells(s, tile)[0];
  var res = E.place(s, tile, E.rowOf(cell), E.colOf(cell));
  assert.strictEqual(res.ok, true);
  assert.strictEqual(s.grid[cell], tile);
  assert.strictEqual(p.hand.length, 3);
  assert.strictEqual(s.phase, 'draw');
  assert.strictEqual(E.activePlayer(s), p, 'ainda é a vez de quem jogou, para decidir a compra');
});

test('não comprar trava o limite de mão para baixo', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(5) });
  var p = E.activePlayer(s);
  var tile = p.hand.find(function (t) { return E.legalCells(s, t).length > 0; });
  var cell = E.legalCells(s, tile)[0];
  E.place(s, tile, E.rowOf(cell), E.colOf(cell));
  E.drawOrSkip(s, false);
  assert.strictEqual(p.limit, 3, 'limite igual ao tamanho da mão');
});

test('comprar respeita o limite e a cestinha', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(6) });
  var p = E.activePlayer(s);
  var bagBefore = s.bag.length;
  var tile = p.hand.find(function (t) { return E.legalCells(s, t).length > 0; });
  var cell = E.legalCells(s, tile)[0];
  E.place(s, tile, E.rowOf(cell), E.colOf(cell));
  var res = E.drawOrSkip(s, true);
  assert.strictEqual(res.drew, true);
  assert.strictEqual(p.hand.length, 4);
  assert.strictEqual(s.bag.length, bagBefore - 1);
});

test('jogador sem jogada é eliminado e leva as peças restantes', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(7) });
  // esvazia a cestinha e troca a mão do jogador 0 por uma peça impossível de jogar
  var p = E.activePlayer(s);
  p.hand = [E.makeTile(E.colorOf(s.grid[0]), E.shapeOf(s.grid[0]))]; // mesma cor e espécie da inicial
  assert.strictEqual(E.hasAnyMove(s, p), false);
  E.beginTurn(s);
  assert.strictEqual(p.out, true);
  assert.strictEqual(p.outReason, 'stuck');
  assert.strictEqual(p.hand.length, 1);
});

test('colocar a última peça elimina com zero', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }], rng: seeded(8) });
  var p = E.activePlayer(s);
  p.hand = p.hand.slice(0, 1);
  p.limit = 1;
  var tile = p.hand[0];
  if (E.legalCells(s, tile).length === 0) {
    // garante uma peça jogável
    for (var t = 0; t < E.N_TILES; t++) {
      if (E.legalCells(s, t).length > 0) { p.hand = [t]; tile = t; break; }
    }
  }
  var cell = E.legalCells(s, tile)[0];
  E.place(s, tile, E.rowOf(cell), E.colOf(cell));
  assert.strictEqual(p.hand.length, 0);
  assert.strictEqual(p.out, true);
  assert.strictEqual(p.outReason, 'finished');
});

test('ranking ordena por peças na mão e usa o último a jogar como desempate', function () {
  var s = E.createGame({ players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], rng: seeded(9) });
  s.players[0].hand = [1, 2];
  s.players[1].hand = [3];
  s.players[2].hand = [4];
  s.players[1].lastOrder = 10;
  s.players[2].lastOrder = 4;
  var rank = E.ranking(s);
  assert.strictEqual(rank[0].seat, 1, 'quem jogou por último vence o empate');
  assert.strictEqual(rank[1].seat, 2);
  assert.strictEqual(rank[2].seat, 0);
});

test('simulação: 120 partidas de IA sem quebrar regras', function () {
  var wins = [0, 0, 0];
  for (var g = 0; g < 120; g++) {
    var rng = seeded(1000 + g);
    var s = E.createGame({
      players: [
        { name: 'IA fácil', human: false },
        { name: 'IA média', human: false },
        { name: 'IA difícil', human: false }
      ],
      rng: rng
    });
    var diffs = ['easy', 'medium', 'hard'];
    var steps = 0;

    while (!s.over && steps++ < 400) {
      var p = E.activePlayer(s);
      assert.ok(p, 'deve haver jogador ativo');

      if (s.phase === 'place') {
        var mv = AI.chooseMove(s, diffs[p.seat], rng);
        if (!mv) { E.beginTurn(s); continue; }
        assert.ok(E.isLegal(s, mv.tile, E.rowOf(mv.cell), E.colOf(mv.cell)), 'IA só joga jogadas legais');
        var r = E.place(s, mv.tile, E.rowOf(mv.cell), E.colOf(mv.cell));
        assert.strictEqual(r.ok, true);
      } else if (s.phase === 'draw') {
        var want = AI.chooseDraw(s, diffs[p.seat], rng);
        var d = E.drawOrSkip(s, want);
        assert.strictEqual(d.ok, true);
      } else {
        break;
      }

      // invariantes
      var total = s.bag.length + E.occupiedCount(s);
      s.players.forEach(function (pl) { total += pl.hand.length; });
      assert.strictEqual(total, 49, 'nenhuma peça pode surgir ou desaparecer');
    }

    assert.ok(s.over, 'a partida precisa terminar (seed ' + (1000 + g) + ')');
    assert.strictEqual(s.ranking.length, s.players.length);
    wins[s.ranking[0].seat]++;
  }
  console.log('      vitórias por dificuldade: fácil ' + wins[0] + ', média ' + wins[1] + ', difícil ' + wins[2]);
  assert.ok(wins[2] >= wins[0], 'a IA difícil deve vencer ao menos tanto quanto a fácil');
});

test('simulação solo: 40 partidas terminam consistentes', function () {
  for (var g = 0; g < 40; g++) {
    var rng = seeded(5000 + g);
    var s = E.createGame({ players: [{ name: 'Solo', human: false }], rng: rng });
    var steps = 0;
    while (!s.over && steps++ < 300) {
      var p = E.activePlayer(s);
      if (s.phase === 'place') {
        var mv = AI.chooseMove(s, 'hard', rng);
        if (!mv) { E.beginTurn(s); continue; }
        E.place(s, mv.tile, E.rowOf(mv.cell), E.colOf(mv.cell));
      } else if (s.phase === 'draw') {
        E.drawOrSkip(s, AI.chooseDraw(s, 'hard', rng));
      } else break;
    }
    assert.ok(s.over, 'solo deve terminar (seed ' + (5000 + g) + ')');
    assert.strictEqual(E.occupiedCount(s), 49 - s.players[0].hand.length - s.bag.length);
  }
});

console.log('\n' + passed + ' teste(s) passaram.' + (process.exitCode ? ' Houve falhas.' : ''));
