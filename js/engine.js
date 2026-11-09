/*
 * Ninho Fofo — motor de regras original.
 *
 * 49 filhotes (7 espécies × 7 pelagens), um ninho compartilhado 7×7.
 * Cada filhote precisa de uma toca vizinha, sem repetir cor nem espécie
 * na mesma linha ou coluna. Depois de acomodar, o jogador pode pegar
 * outro da cestinha; se não pegar, o limite da mão cai para sempre.
 * Vence quem terminar com menos filhotes na mão.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NinhoEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SIZE = 7;
  var N_TILES = SIZE * SIZE;

  var COLORS = [
    { id: 'algodao', name: 'Algodão', hex: '#f3c6d8', ink: '#7a3d55', pattern: 'hearts' },
    { id: 'pessego', name: 'Pêssego', hex: '#f4a574', ink: '#7a3d1c', pattern: 'dots' },
    { id: 'limao', name: 'Limão', hex: '#d4e056', ink: '#5b6414', pattern: 'stars' },
    { id: 'hortela', name: 'Hortelã', hex: '#6ec9b4', ink: '#1f5c4e', pattern: 'leaves' },
    { id: 'uva', name: 'Uva', hex: '#b39ddb', ink: '#4a3670', pattern: 'clouds' },
    { id: 'caramelo', name: 'Caramelo', hex: '#e0b07a', ink: '#6a4a24', pattern: 'flowers' },
    { id: 'chiclete', name: 'Chiclete', hex: '#ff8bb0', ink: '#7a2d4a', pattern: 'waves' }
  ];

  var SHAPES = [
    { id: 'pintinho', name: 'Pintinho' },
    { id: 'porquinho', name: 'Porquinho' },
    { id: 'coruja', name: 'Corujinha' },
    { id: 'axolote', name: 'Axolote' },
    { id: 'capivara', name: 'Capivara' },
    { id: 'ourico', name: 'Ouriço' },
    { id: 'foca', name: 'Foca' }
  ];

  var COLUMN_LABELS = 'ABCDEFG';

  /* ---------------------------------------------------------------- helpers */

  function colorOf(tile) { return Math.floor(tile / SIZE); }
  function shapeOf(tile) { return tile % SIZE; }
  function idx(r, c) { return r * SIZE + c; }
  function rowOf(i) { return Math.floor(i / SIZE); }
  function colOf(i) { return i % SIZE; }
  function cellLabel(i) { return COLUMN_LABELS[colOf(i)] + (rowOf(i) + 1); }
  function tileLabel(tile) {
    return SHAPES[shapeOf(tile)].name + ' ' + COLORS[colorOf(tile)].name.toLowerCase();
  }

  function makeTile(color, shape) { return color * SIZE + shape; }

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  /* ------------------------------------------------------------- regras base */

  /** Peças (índices de célula) que conflitam com `tile` na linha/coluna de (r,c). */
  function conflicts(state, tile, r, c) {
    var res = [];
    var color = colorOf(tile);
    var shape = shapeOf(tile);
    for (var i = 0; i < SIZE; i++) {
      var inRow = state.grid[idx(r, i)];
      if (inRow !== null && inRow !== undefined &&
        (colorOf(inRow) === color || shapeOf(inRow) === shape)) {
        res.push(idx(r, i));
      }
      var inCol = state.grid[idx(i, c)];
      if (inCol !== null && inCol !== undefined &&
        (colorOf(inCol) === color || shapeOf(inCol) === shape)) {
        res.push(idx(i, c));
      }
    }
    return res.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function hasNeighbor(state, r, c) {
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var k = 0; k < dirs.length; k++) {
      var rr = r + dirs[k][0], cc = c + dirs[k][1];
      if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue;
      var v = state.grid[idx(rr, cc)];
      if (v !== null && v !== undefined) return true;
    }
    return false;
  }

  function isEmptyCell(state, r, c) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    var v = state.grid[idx(r, c)];
    return v === null || v === undefined;
  }

  function isLegal(state, tile, r, c) {
    if (!isEmptyCell(state, r, c)) return false;
    var occupied = occupiedCount(state);
    if (occupied > 0 && !hasNeighbor(state, r, c)) return false;
    return conflicts(state, tile, r, c).length === 0;
  }

  /** Células onde a peça informada pode ser colocada. */
  function legalCells(state, tile) {
    var out = [];
    for (var i = 0; i < N_TILES; i++) {
      var r = rowOf(i), c = colOf(i);
      if (isLegal(state, tile, r, c)) out.push(i);
    }
    return out;
  }

  /** Todas as jogadas legais de um jogador: [{ tile, cell }]. */
  function legalMoves(state, player) {
    var out = [];
    for (var h = 0; h < player.hand.length; h++) {
      var tile = player.hand[h];
      var cells = legalCells(state, tile);
      for (var k = 0; k < cells.length; k++) out.push({ tile: tile, cell: cells[k] });
    }
    return out;
  }

  function hasAnyMove(state, player) {
    for (var h = 0; h < player.hand.length; h++) {
      if (legalCells(state, player.hand[h]).length > 0) return true;
    }
    return false;
  }

  function occupiedCount(state) {
    var n = 0;
    for (var i = 0; i < N_TILES; i++) {
      var v = state.grid[i];
      if (v !== null && v !== undefined) n++;
    }
    return n;
  }

  /* -------------------------------------------------------------- estado */

  function createGame(opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var seats = opts.players && opts.players.length ? opts.players : [
      { name: 'Jogador 1', human: true },
      { name: 'Máquina', human: false }
    ];
    var handSize = opts.handSize || 4;

    var pool = shuffle(range(N_TILES), rng);
    var grid = new Array(N_TILES).fill(null);

    var starter = pool.pop();
    grid[0] = starter;

    var state = {
      grid: grid,
      starter: starter,
      bag: pool,
      players: seats.map(function (p, i) {
        return {
          seat: i,
          name: p.name || ('Jogador ' + (i + 1)),
          human: p.human !== false,
          hand: [],
          limit: handSize,
          out: false,
          outReason: null,
          placed: 0,
          lastOrder: 0,
          draws: 0
        };
      }),
      turn: 0,
      phase: 'place', // 'place' | 'draw' | 'over'
      turnCount: 0,
      canDraw: false,
      over: false,
      ranking: [],
      log: []
    };

    for (var k = 0; k < state.players.length; k++) {
      for (var d = 0; d < handSize && pool.length; d++) {
        state.players[k].hand.push(pool.pop());
      }
    }

    pushLog(state, {
      kind: 'setup',
      text: 'Primeiro filhote no ninho: ' + tileLabel(starter) + '.'
    });

    beginTurn(state);
    return state;
  }

  function pushLog(state, entry) {
    entry.id = state.log.length + 1;
    entry.order = state.turnCount;
    state.log.push(entry);
    if (state.log.length > 200) state.log.shift();
    return entry;
  }

  function activePlayer(state) { return state.players[state.turn] || null; }

  function nextSeat(state, from) {
    var n = state.players.length;
    for (var i = 1; i <= n; i++) {
      var s = (from + i) % n;
      if (!state.players[s].out) return s;
    }
    return -1;
  }

  function everyoneOut(state) {
    return state.players.every(function (p) { return p.out; });
  }

  function finish(state) {
    state.over = true;
    state.phase = 'over';
    state.ranking = ranking(state);
    var winner = state.ranking[0];
    pushLog(state, {
      kind: 'end',
      text: 'Fim de jogo. Vencedor: ' + winner.name + ' (' + winner.handLeft +
        (winner.handLeft === 1 ? ' filhote na mão' : ' filhotes na mão') + ').'
    });
  }

  /** Resolve eliminações e posiciona o jogo no próximo jogador ativo. */
  function beginTurn(state) {
    if (state.over) return state;
    var guard = 0;
    while (guard++ < 64) {
      var p = activePlayer(state);
      if (!p) { finish(state); return state; }

      if (!p.out) {
        if (p.hand.length === 0) {
          p.out = true;
          p.outReason = 'finished';
          pushLog(state, { kind: 'out', seat: p.seat, text: p.name + ' acomodou todos os filhotes e saiu com a mão vazia.' });
        } else if (!hasAnyMove(state, p)) {
          p.out = true;
          p.outReason = 'stuck';
          pushLog(state, {
            kind: 'out', seat: p.seat,
            text: p.name + ' não tem jogada possível e está fora (' + p.hand.length +
              (p.hand.length === 1 ? ' filhote na mão' : ' filhotes na mão') + ').'
          });
        }
      }

      if (everyoneOut(state)) { finish(state); return state; }

      if (p.out) {
        var nxt = nextSeat(state, state.turn);
        if (nxt === -1) { finish(state); return state; }
        state.turn = nxt;
        continue;
      }

      state.phase = 'place';
      state.canDraw = false;
      return state;
    }
    return state;
  }

  /* ----------------------------------------------------------- ações */

  function place(state, tile, r, c) {
    if (state.over) return { ok: false, reason: 'A partida terminou.' };
    if (state.phase !== 'place') return { ok: false, reason: 'Não é hora de colocar peça.' };

    var p = activePlayer(state);
    var at = p.hand.indexOf(tile);
    if (at === -1) return { ok: false, reason: 'Essa peça não está na sua mão.' };
    if (!isLegal(state, tile, r, c)) {
      return { ok: false, reason: 'Jogada inválida: mesma cor ou espécie na linha/coluna.' };
    }

    p.hand.splice(at, 1);
    state.grid[idx(r, c)] = tile;
    state.turnCount++;
    p.placed++;
    p.lastOrder = state.turnCount;

    pushLog(state, {
      kind: 'place', seat: p.seat,
      text: p.name + ' acomodou o ' + tileLabel(tile) + ' na toca ' + cellLabel(idx(r, c)) + '.'
    });

    if (p.hand.length === 0) {
      p.out = true;
      p.outReason = 'finished';
      pushLog(state, { kind: 'out', seat: p.seat, text: p.name + ' acomodou o último filhote da mão.' });
      if (everyoneOut(state)) { finish(state); return { ok: true, ended: true }; }
      var nxt = nextSeat(state, state.turn);
      if (nxt === -1) { finish(state); return { ok: true, ended: true }; }
      state.turn = nxt;
      beginTurn(state);
      return { ok: true, ended: state.over };
    }

    state.phase = 'draw';
    state.canDraw = state.bag.length > 0 && p.hand.length < p.limit;
    return { ok: true };
  }

  function drawOrSkip(state, wantDraw) {
    if (state.over) return { ok: false, reason: 'A partida terminou.' };
    if (state.phase !== 'draw') return { ok: false, reason: 'Não é hora de comprar.' };

    var p = activePlayer(state);
    var canDraw = state.bag.length > 0 && p.hand.length < p.limit;
    var drew = false;

    if (wantDraw && canDraw) {
      p.hand.push(state.bag.pop());
      p.draws++;
      drew = true;
      pushLog(state, { kind: 'draw', seat: p.seat, text: p.name + ' pegou um filhote da cestinha (' + p.hand.length + ' na mão).' });
    } else {
      var before = p.limit;
      p.limit = Math.min(p.limit, p.hand.length);
      pushLog(state, {
        kind: 'skip', seat: p.seat,
        text: p.name + ' não comprou' + (p.limit < before ? ' e agora joga com no máximo ' + p.limit + '.' : '.')
      });
    }

    var nxt = nextSeat(state, state.turn);
    if (nxt === -1) { finish(state); return { ok: true, drew: drew, ended: true }; }
    state.turn = nxt;
    beginTurn(state);
    return { ok: true, drew: drew, ended: state.over };
  }

  /* --------------------------------------------------------- classificação */

  function ranking(state) {
    return state.players.map(function (p) {
      return {
        seat: p.seat,
        name: p.name,
        human: p.human,
        handLeft: p.hand.length,
        placed: p.placed,
        outReason: p.outReason,
        lastOrder: p.lastOrder
      };
    }).sort(function (a, b) {
      if (a.handLeft !== b.handLeft) return a.handLeft - b.handLeft;
      if (a.lastOrder !== b.lastOrder) return b.lastOrder - a.lastOrder;
      return a.seat - b.seat;
    });
  }

  function cloneState(state) {
    return {
      grid: state.grid.slice(),
      starter: state.starter,
      bag: state.bag.slice(),
      players: state.players.map(function (p) {
        return {
          seat: p.seat, name: p.name, human: p.human,
          hand: p.hand.slice(), limit: p.limit, out: p.out,
          outReason: p.outReason, placed: p.placed,
          lastOrder: p.lastOrder, draws: p.draws
        };
      }),
      turn: state.turn,
      phase: state.phase,
      turnCount: state.turnCount,
      canDraw: state.canDraw,
      over: state.over,
      ranking: state.ranking.slice(),
      log: state.log.slice()
    };
  }

  return {
    SIZE: SIZE,
    N_TILES: N_TILES,
    COLORS: COLORS,
    SHAPES: SHAPES,
    COLUMN_LABELS: COLUMN_LABELS,
    colorOf: colorOf,
    shapeOf: shapeOf,
    idx: idx,
    rowOf: rowOf,
    colOf: colOf,
    cellLabel: cellLabel,
    tileLabel: tileLabel,
    makeTile: makeTile,
    createGame: createGame,
    cloneState: cloneState,
    conflicts: conflicts,
    isLegal: isLegal,
    legalCells: legalCells,
    legalMoves: legalMoves,
    hasAnyMove: hasAnyMove,
    hasNeighbor: hasNeighbor,
    occupiedCount: occupiedCount,
    place: place,
    drawOrSkip: drawOrSkip,
    beginTurn: beginTurn,
    activePlayer: activePlayer,
    ranking: ranking,
    pushLog: pushLog,
    shuffle: shuffle,
    range: range
  };
});
