/*
 * Ninho Fofo — inteligência artificial.
 * Prefere bloquear tocas dos outros e para de pegar filhotes perto da metade do ninho.
 */
(function (root, factory) {
  'use strict';
  var E = root && root.NinhoEngine ? root.NinhoEngine : require('./engine.js');
  var api = factory(E);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NinhoAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E) {
  'use strict';

  var DIFFICULTY = {
    //                     escolhe jogada aleatória   peso do bloqueio   flexibilidade   peça apertada   limiar de compra
    easy: { randomChance: 0.80, block: 0.0, wFlex: 1.0, wWeak: 1.0, wFew: 0.0, drawThreshold: 0.30 },
    medium: { randomChance: 0.12, block: 0.9, wFlex: 1.0, wWeak: 2.0, wFew: 1.0, drawThreshold: 0.43 },
    hard: { randomChance: 0.0, block: 2.0, wFlex: 0.6, wWeak: 1.0, wFew: 1.0, drawThreshold: 0.49 }
  };

  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

  /** Total de células legais somando todas as peças da mão. */
  function totalFlex(state, player) {
    var total = 0;
    for (var i = 0; i < player.hand.length; i++) {
      total += E.legalCells(state, player.hand[i]).length;
    }
    return total;
  }

  /** Menor número de células legais entre as peças da mão. */
  function weakestTileFlex(state, player) {
    var min = Infinity;
    for (var i = 0; i < player.hand.length; i++) {
      var n = E.legalCells(state, player.hand[i]).length;
      if (n < min) min = n;
    }
    return min === Infinity ? 0 : min;
  }

  function opponentFlex(state, player) {
    var total = 0;
    for (var i = 0; i < state.players.length; i++) {
      var other = state.players[i];
      if (other.out || other.seat === player.seat) continue;
      total += totalFlex(state, other);
    }
    return total;
  }

  /** Pontuação de uma jogada (quanto maior, melhor). */
  function evaluate(state, player, move, cfg) {
    var sim = E.cloneState(state);
    var me = sim.players[player.seat];
    var pos = me.hand.indexOf(move.tile);
    if (pos >= 0) me.hand.splice(pos, 1);
    sim.grid[move.cell] = move.tile;

    var score = cfg.wFlex * totalFlex(sim, me) + cfg.wWeak * weakestTileFlex(sim, me);

    if (cfg.block > 0) score -= cfg.block * opponentFlex(sim, me) * 0.35;

    // Peças com poucas tocas disponíveis devem ser acomodados logo
    var cellsNow = E.legalCells(state, move.tile).length;
    score += cfg.wFew * Math.max(0, 8 - cellsNow);

    // Desempate leve: prefere o centro, que mantém mais tocas vizinhas abertas
    var r = E.rowOf(move.cell), c = E.colOf(move.cell);
    score += (3 - Math.abs(3 - r)) * 0.15 + (3 - Math.abs(3 - c)) * 0.15;

    return score;
  }

  /** Escolhe { tile, cell } para o jogador ativo. */
  function chooseMove(state, difficulty, rng) {
    rng = rng || Math.random;
    var player = E.activePlayer(state);
    var moves = E.legalMoves(state, player);
    if (!moves.length) return null;

    var cfg = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    if (cfg.randomChance && rng() < cfg.randomChance) return pick(moves, rng);

    var best = null, bestScore = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var score = evaluate(state, player, moves[i], cfg);
      if (score > bestScore) { bestScore = score; best = moves[i]; }
    }
    return best;
  }

  /**
   * Compra uma peça depois de acomodar?
   * Comprar mantém opções; parar de comprar trava o limite de mão e é o caminho
   * para zerar. O limiar calibrado fica perto da metade do tabuleiro.
   */
  function chooseDraw(state, difficulty, rng) {
    rng = rng || Math.random;
    var player = E.activePlayer(state);
    if (!player) return false;
    if (state.bag.length === 0) return false;
    if (player.hand.length >= player.limit) return false;

    var cfg = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    var fill = E.occupiedCount(state) / E.N_TILES;
    var dangerous = weakestTileFlex(state, player) <= 1;

    var draw = fill < cfg.drawThreshold && !dangerous;
    if (cfg.randomChance && rng() < cfg.randomChance * 0.9) draw = !draw;
    return draw;
  }

  return {
    DIFFICULTY: DIFFICULTY,
    chooseMove: chooseMove,
    chooseDraw: chooseDraw,
    evaluate: evaluate,
    totalFlex: totalFlex,
    weakestTileFlex: weakestTileFlex,
    opponentFlex: opponentFlex
  };
});
