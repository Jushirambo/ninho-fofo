/*
 * Ninho Fofo — interface e controle de turnos.
 */
(function () {
  'use strict';

  var E = window.NinhoEngine;
  var AI = window.NinhoAI;
  var P = window.NinhoPieces;

  var $ = function (sel) { return document.querySelector(sel); };

  var DEFAULT_CONFIG = {
    seats: [
      { name: 'Você', human: true, difficulty: 'medium' },
      { name: 'Máquina', human: false, difficulty: 'medium' }
    ],
    sound: true
  };

  var config = loadConfig();
  var state = null;
  var cells = [];
  var selectedTile = null;
  var hoverCell = null;
  var aiTimer = null;
  var audioCtx = null;

  /* ------------------------------------------------------- persistência */

  function loadConfig() {
    try {
      var raw = localStorage.getItem('ninho.config');
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      var parsed = JSON.parse(raw);
      if (!parsed.seats || !parsed.seats.length) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      return parsed;
    } catch (err) {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  function saveConfig() {
    try { localStorage.setItem('ninho.config', JSON.stringify(config)); } catch (err) { /* ignora */ }
  }

  /* ------------------------------------------------------------- som */

  function sound(kind) {
    if (!config.sound) return;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var now = audioCtx.currentTime;
      var notes = { place: [523.25, 659.25], draw: [392], skip: [311.1, 233.1], bad: [174.6], win: [523.25, 659.25, 783.99, 1046.5] }[kind] || [440];
      notes.forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = kind === 'bad' ? 'sawtooth' : 'triangle';
        osc.frequency.value = freq;
        var t0 = now + i * 0.085;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.18);
      });
    } catch (err) { /* som é opcional */ }
  }

  /* --------------------------------------------------------- utilidades */

  function difficultyFor(seat) {
    var cfg = config.seats[seat];
    return (cfg && cfg.difficulty) || 'medium';
  }

  function isHumanTurn() {
    if (!state || state.over) return false;
    var p = E.activePlayer(state);
    return !!(p && p.human);
  }

  function seatClass(seat) { return 'p' + ((seat % 5) + 1); }

  function handCountText(n) { return n === 1 ? '1 filhote' : n + ' filhotes'; }

  /* ------------------------------------------------------------ partida */

  function newGame() {
    clearTimeout(aiTimer);
    selectedTile = null;
    hoverCell = null;
    state = E.createGame({
      players: config.seats.map(function (s) {
        return { name: s.name, human: s.human };
      }),
      handSize: 4
    });
    buildBoard();
    render();
    scheduleAI();
  }

  function buildBoard() {
    var board = $('#board');
    board.innerHTML = '';
    cells = [];
    for (var i = 0; i < E.N_TILES; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell empty';
      btn.dataset.index = String(i);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', 'toca ' + E.cellLabel(i));
      board.appendChild(btn);
      cells.push(btn);
    }
  }

  /* ------------------------------------------------------------- render */

  function render() {
    renderTurn();
    renderPlayers();
    renderBoard();
    renderHand();
    renderActions();
    renderLog();
    $('#fill-count').textContent = E.occupiedCount(state);
    $('#bag-count').textContent = state.bag.length;
  }

  function renderTurn() {
    var line = $('#turn-line');
    var name = $('#turn-name');
    var sub = $('#turn-sub');
    var badge = line.querySelector('.badge');

    if (state.over) {
      badge.className = 'badge';
      badge.textContent = '★';
      name.firstChild.nodeValue = 'Partida encerrada';
      sub.textContent = 'veja o resultado';
      return;
    }

    var p = E.activePlayer(state);
    badge.className = 'badge ' + seatClass(p.seat);
    badge.textContent = String(p.seat + 1);
    name.firstChild.nodeValue = p.name;
    if (p.human) {
      sub.textContent = state.phase === 'draw'
        ? 'sua vez — comprar ou segurar?'
        : 'sua vez — acomode um filhote';
    } else {
      sub.textContent = 'pensando…';
    }
  }

  function renderPlayers() {
    var ul = $('#players');
    ul.innerHTML = '';
    state.players.forEach(function (p) {
      var li = document.createElement('li');
      if (!state.over && state.turn === p.seat && !p.out) li.classList.add('active');
      if (p.out) li.classList.add('out');

      var badge = document.createElement('span');
      badge.className = 'badge ' + seatClass(p.seat);
      badge.textContent = String(p.seat + 1);

      var nm = document.createElement('span');
      nm.className = 'p-name';
      nm.textContent = p.name + (p.human ? '' : ' · IA');

      var meta = document.createElement('span');
      meta.className = 'p-meta';
      if (p.out) {
        meta.textContent = p.outReason === 'finished' ? 'zerou a mão' : 'sem jogada';
      } else {
        meta.textContent = 'limite ' + p.limit + ' · ' + p.placed + ' no ninho';
      }

      var count = document.createElement('span');
      count.className = 'p-count';
      count.textContent = String(p.hand.length);

      li.appendChild(badge);
      li.appendChild(nm);
      li.appendChild(meta);
      li.appendChild(count);
      ul.appendChild(li);
    });
  }

  function renderBoard() {
    var active = state.over ? null : E.activePlayer(state);
    var selected = selectedTile;

    for (var i = 0; i < E.N_TILES; i++) {
      var el = cells[i];
      var tile = state.grid[i];
      var filled = tile !== null && tile !== undefined;

      if (filled) {
        if (el.dataset.tile !== String(tile)) {
          el.innerHTML = P.svgFor(E.shapeOf(tile), E.colorOf(tile));
          el.dataset.tile = String(tile);
        }
        el.classList.add('filled');
        el.classList.remove('empty', 'legal', 'ghost');
      } else {
        if (el.dataset.tile) {
          el.innerHTML = '';
          el.dataset.tile = '';
        }
        el.classList.add('empty');
        el.classList.remove('filled');
      }

      el.classList.toggle('starter', i === 0);
      el.classList.remove('conflict', 'hl-row', 'hl-col');

      if (!filled) {
        var legal = false;
        if (selected !== null && active && active.human && state.phase === 'place') {
          legal = E.isLegal(state, selected, E.rowOf(i), E.colOf(i));
        } else if (hoverCell === null) {
          legal = false;
        }
        el.classList.toggle('legal', legal);

        // Prévia do filhote selecionado sobre a toca em foco
        if (selected !== null && hoverCell === i && legal) {
          if (el.dataset.ghost !== String(selected)) {
            el.innerHTML = P.svgFor(E.shapeOf(selected), E.colorOf(selected));
            el.dataset.ghost = String(selected);
          }
          el.classList.add('ghost');
        } else if (el.dataset.ghost) {
          el.innerHTML = '';
          el.dataset.ghost = '';
          el.classList.remove('ghost');
        }
      }

      el.disabled = !el.classList.contains('legal');
    }

    // Destaques de conflito na linha/coluna da toca em foco
    if (selected !== null && hoverCell !== null && cells[hoverCell].classList.contains('legal')) {
      var r = E.rowOf(hoverCell), c = E.colOf(hoverCell);
      var conflicts = E.conflicts(state, selected, r, c);
      for (var k = 0; k < 7; k++) {
        cells[E.idx(r, k)].classList.add('hl-row');
        cells[E.idx(k, c)].classList.add('hl-col');
      }
      conflicts.forEach(function (ci) { cells[ci].classList.add('conflict'); });
    }
  }

  function renderHand() {
    var wrap = $('#hand');
    wrap.innerHTML = '';
    var active = state.over ? null : E.activePlayer(state);
    var showHand = active && active.human;

    $('#hand-hint').textContent = showHand
      ? 'clique num filhote e depois numa toca'
      : (state.over ? 'partida encerrada' : 'aguarde a vez da máquina');

    var hand = showHand ? active.hand : (active ? [] : []);

    if (!state.over && !showHand) {
      var wait = document.createElement('div');
      wait.className = 'hand-empty';
      wait.textContent = 'Os filhotes da máquina ficam escondidos na toca.';
      wrap.appendChild(wait);
      return;
    }

    if (!hand.length) {
      var empty = document.createElement('div');
      empty.className = 'hand-empty';
      empty.textContent = state.over ? 'Nenhum filhote na mão.' : 'Sua mão está vazia.';
      wrap.appendChild(empty);
      return;
    }

    hand.forEach(function (tile, idxInHand) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.dataset.tile = String(tile);
      btn.style.background = P.cardBg(E.colorOf(tile));
      var legalTiles = E.legalCells(state, tile).length;
      btn.title = E.tileLabel(tile) + ' · ' +
        (legalTiles === 0 ? 'não cabe em nenhuma toca agora' : legalTiles + (legalTiles === 1 ? ' toca possível' : ' tocas possíveis'));
      btn.setAttribute('aria-label', btn.title);
      btn.innerHTML = P.svgFor(E.shapeOf(tile), E.colorOf(tile));

      var kb = document.createElement('span');
      kb.className = 'kbd';
      kb.textContent = String(idxInHand + 1);
      btn.appendChild(kb);

      var legalCount = E.legalCells(state, tile).length;
      if (legalCount === 0) btn.classList.add('dead');
      if (selectedTile === tile) btn.classList.add('selected');

      btn.addEventListener('click', function () {
        if (!isHumanTurn() || state.phase !== 'place') return;
        if (legalCount === 0) { sound('bad'); return; }
        selectedTile = (selectedTile === tile) ? null : tile;
        hoverCell = null;
        renderBoard();
        renderHand();
        renderActions();
      });

      wrap.appendChild(btn);
    });
  }

  function renderActions() {
    var notice = $('#action-notice');
    var slots = $('#draw-slots');
    var autoBtn = $('#btn-auto');
    notice.className = 'notice';

    slots.hidden = true;
    autoBtn.disabled = !isHumanTurn();

    if (state.over) {
      notice.textContent = 'A partida terminou. Veja o resultado.';
      return;
    }

    var p = E.activePlayer(state);

    if (!p.human) {
      notice.textContent = p.name + ' está escolhendo onde acomodar…';
      return;
    }

    if (state.phase === 'draw') {
      slots.hidden = false;
      notice.className = 'notice good';
      notice.textContent = 'Filhote acomodado. Pegar outro da cestinha (' + state.bag.length +
        ' restantes)? Se não pegar, seu limite de mão cai para ' + p.hand.length + ' e não sobe mais.';
      $('#btn-draw').disabled = !state.canDraw;
      return;
    }

    if (selectedTile === null) {
      var dead = p.hand.filter(function (t) { return E.legalCells(state, t).length === 0; }).length;
      notice.textContent = dead > 0
        ? dead + (dead === 1 ? ' filhote não cabe' : ' filhotes não cabem') +
          ' em nenhuma toca agora (podem voltar a caber conforme o ninho cresce). Jogue com os que cabem.'
        : 'Escolha um filhote da mão para ver as tocas livres.';
      if (dead > 0) notice.className = 'notice warn';
      return;
    }

    var spots = E.legalCells(state, selectedTile).length;
    notice.textContent = E.tileLabel(selectedTile) + ': ' + spots +
      (spots === 1 ? ' toca destacada' : ' tocas destacadas') + '. Clique em uma delas.';
  }

  function renderLog() {
    var ul = $('#log');
    ul.innerHTML = '';
    state.log.slice(-40).forEach(function (entry) {
      var li = document.createElement('li');
      li.className = entry.kind;
      li.textContent = entry.text;
      ul.appendChild(li);
    });
    ul.scrollTop = ul.scrollHeight;
  }

  function renderLegend() {
    var legend = $('#legend');
    legend.innerHTML = '';
    P.COLORS.forEach(function (c, i) {
      var span = document.createElement('span');
      span.innerHTML = '<i style="background:' + c.hex + '"></i>' + E.COLORS[i].name;
      legend.appendChild(span);
    });
  }

  /* --------------------------------------------------------------- IA */

  function scheduleAI() {
    clearTimeout(aiTimer);
    if (!state || state.over) return;
    var p = E.activePlayer(state);
    if (!p || p.human) return;
    aiTimer = setTimeout(aiStep, 480);
  }

  function aiStep() {
    if (!state || state.over) return;
    var p = E.activePlayer(state);
    if (!p || p.human) return;

    if (state.phase === 'place') {
      var move = AI.chooseMove(state, difficultyFor(p.seat));
      if (!move) {
        E.beginTurn(state);
      } else {
        var res = E.place(state, move.tile, E.rowOf(move.cell), E.colOf(move.cell));
        if (res.ok) sound('place');
      }
    } else if (state.phase === 'draw') {
      var wantDraw = AI.chooseDraw(state, difficultyFor(p.seat));
      var out = E.drawOrSkip(state, wantDraw);
      if (out.ok) sound(wantDraw ? 'draw' : 'skip');
    }

    selectedTile = null;
    render();
    if (checkOver()) return;
    scheduleAI();
  }

  /* ------------------------------------------------------ fim de partida */

  function checkOver() {
    if (!state.over) return false;
    showOverModal();
    return true;
  }

  function showOverModal() {
    var ranking = state.ranking.length ? state.ranking : E.ranking(state);
    var ul = $('#ranking');
    ul.innerHTML = '';
    var top = ranking[0];

    ranking.forEach(function (row, i) {
      var li = document.createElement('li');
      if (i === 0 && row.handLeft === top.handLeft && row.lastOrder === top.lastOrder) li.classList.add('winner');
      var pos = document.createElement('span');
      pos.className = 'pos';
      pos.textContent = String(i + 1) + '.';
      var nm = document.createElement('span');
      nm.className = 'r-name';
      nm.textContent = row.name + (row.human ? '' : ' · IA');
      var meta = document.createElement('span');
      meta.className = 'r-meta';
      meta.textContent = handCountText(row.handLeft) + ' na mão · ' + row.placed + ' acomodados';
      li.appendChild(pos); li.appendChild(nm); li.appendChild(meta);
      ul.appendChild(li);
    });

    var solo = state.players.length === 1;
    $('#over-title').textContent = solo ? 'Fim de jogo' : 'Fim de jogo';
    $('#over-sub').textContent = solo
      ? 'Você terminou com ' + handCountText(top.handLeft) + ' na mão.'
      : 'Vence quem tiver menos filhotes na mão — ' + top.name + ' com ' + handCountText(top.handLeft) + '.';
    $('#modal-over').hidden = false;
    sound('win');
  }

  /* ------------------------------------------------------------- ações */

  function humanPlace(cellIndex) {
    if (!isHumanTurn() || state.phase !== 'place' || selectedTile === null) return;
    var r = E.rowOf(cellIndex), c = E.colOf(cellIndex);
    if (!E.isLegal(state, selectedTile, r, c)) { sound('bad'); return; }
    var tile = selectedTile;
    var res = E.place(state, tile, r, c);
    if (!res.ok) { sound('bad'); return; }
    sound('place');
    selectedTile = null;
    hoverCell = null;
    render();
    if (checkOver()) return;
    scheduleAI();
  }

  function humanDraw(wantDraw) {
    if (!isHumanTurn() || state.phase !== 'draw') return;
    var res = E.drawOrSkip(state, wantDraw);
    if (!res.ok) return;
    sound(wantDraw ? 'draw' : 'skip');
    render();
    if (checkOver()) return;
    scheduleAI();
  }

  function autoPlayReal() {
    if (!isHumanTurn()) return;
    if (state.phase === 'draw') { humanDraw(AI.chooseDraw(state, 'hard')); return; }
    var move = AI.chooseMove(state, 'hard');
    if (!move) return;
    selectedTile = move.tile;
    humanPlace(move.cell);
  }

  /* --------------------------------------------------------- eventos */

  function bindEvents() {
    $('#board').addEventListener('click', function (ev) {
      var cell = ev.target.closest('.cell');
      if (!cell) return;
      humanPlace(Number(cell.dataset.index));
    });

    $('#board').addEventListener('mouseover', function (ev) {
      var cell = ev.target.closest('.cell');
      if (!cell) return;
      var i = Number(cell.dataset.index);
      if (hoverCell === i) return;
      hoverCell = i;
      renderBoard();
    });

    $('#board').addEventListener('mouseleave', function () {
      if (hoverCell !== null) { hoverCell = null; renderBoard(); }
    });

    $('#btn-draw').addEventListener('click', function () { humanDraw(true); });
    $('#btn-skip').addEventListener('click', function () { humanDraw(false); });
    $('#btn-auto').addEventListener('click', autoPlayReal);

    $('#btn-rules').addEventListener('click', function () { $('#modal-rules').hidden = false; });
    $('#modal-rules').addEventListener('click', function (ev) {
      if (ev.target.id === 'modal-rules' || ev.target.hasAttribute('data-close')) $('#modal-rules').hidden = true;
    });

    $('#btn-setup').addEventListener('click', openSetup);
    $('#modal-setup').addEventListener('click', function (ev) {
      if (ev.target.id === 'modal-setup' || ev.target.hasAttribute('data-close')) $('#modal-setup').hidden = true;
    });
    $('#btn-over-setup').addEventListener('click', function () {
      $('#modal-over').hidden = true;
      openSetup();
    });
    $('#btn-again').addEventListener('click', function () {
      $('#modal-over').hidden = true;
      newGame();
    });

    $('#btn-sound').addEventListener('click', function () {
      config.sound = !config.sound;
      saveConfig();
      updateSoundButton();
      if (config.sound) sound('place');
    });

    $('#player-count').addEventListener('change', function () {
      renderSeatConfig(Number(this.value));
    });

    $('#seat-config').addEventListener('change', function () {
      collectSeatConfig();
    });

    $('#btn-start').addEventListener('click', function () {
      collectSeatConfig();
      saveConfig();
      $('#modal-setup').hidden = true;
      newGame();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
      if (ev.key === 'Escape') {
        selectedTile = null;
        hoverCell = null;
        renderBoard(); renderHand(); renderActions();
        return;
      }
      if (/^[1-7]$/.test(ev.key) && isHumanTurn() && state.phase === 'place') {
        var p = E.activePlayer(state);
        var tile = p.hand[Number(ev.key) - 1];
        if (tile === undefined) return;
        if (E.legalCells(state, tile).length === 0) { sound('bad'); return; }
        selectedTile = (selectedTile === tile) ? null : tile;
        hoverCell = null;
        renderBoard(); renderHand(); renderActions();
      }
      if (ev.key === 'Enter' && isHumanTurn() && state.phase === 'draw') {
        if (state.canDraw) humanDraw(true); else humanDraw(false);
      }
    });
  }

  /* -------------------------------------------------------------- setup */

  function renderSeatConfig(count) {
    var wrap = $('#seat-config');
    var prev = config.seats.slice();
    wrap.innerHTML = '';

    for (var i = 0; i < count; i++) {
      var old = prev[i] || {};
      var row = document.createElement('div');
      row.className = 'seat-row';

      var badge = document.createElement('span');
      badge.className = 'badge ' + seatClass(i);
      badge.textContent = String(i + 1);

      var name = document.createElement('input');
      name.type = 'text';
      name.value = old.name || (i === 0 ? (count === 1 ? 'Você' : 'Jogador 1') : 'Jogador ' + (i + 1));
      name.dataset.role = 'name';
      name.maxLength = 14;

      var type = document.createElement('select');
      type.dataset.role = 'type';
      [['human', 'Humano'], ['ai', 'Máquina']].forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt[0];
        o.textContent = opt[1];
        type.appendChild(o);
      });
      var wasHuman = old.human !== undefined ? old.human : (i === 0);
      type.value = wasHuman ? 'human' : 'ai';

      var diff = document.createElement('select');
      diff.dataset.role = 'difficulty';
      [['easy', 'IA fácil'], ['medium', 'IA média'], ['hard', 'IA difícil']].forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt[0];
        o.textContent = opt[1];
        diff.appendChild(o);
      });
      diff.value = old.difficulty || 'medium';
      diff.disabled = type.value === 'human';

      type.addEventListener('change', function () {
        diff.disabled = this.value === 'human';
      });

      row.appendChild(badge);
      row.appendChild(name);
      row.appendChild(type);
      row.appendChild(diff);
      wrap.appendChild(row);
    }
  }

  function collectSeatConfig() {
    var rows = $('#seat-config').querySelectorAll('.seat-row');
    var seats = [];
    rows.forEach(function (row) {
      var name = row.querySelector('[data-role="name"]').value.trim();
      var type = row.querySelector('[data-role="type"]').value;
      var diff = row.querySelector('[data-role="difficulty"]').value;
      seats.push({
        name: name || ('Jogador ' + (seats.length + 1)),
        human: type === 'human',
        difficulty: diff
      });
    });
    config.seats = seats;
  }

  function openSetup() {
    var count = Math.min(5, Math.max(1, config.seats.length || 2));
    $('#player-count').value = String(count);
    renderSeatConfig(count);
    $('#modal-setup').hidden = false;
  }

  function updateSoundButton() {
    var btn = $('#btn-sound');
    btn.textContent = 'Som: ' + (config.sound ? 'ligado' : 'desligado');
    btn.setAttribute('aria-pressed', config.sound ? 'true' : 'false');
  }

  /* --------------------------------------------------------------- init */

  function init() {
    $('#svg-defs').innerHTML = P.defs();
    renderLegend();
    bindEvents();
    updateSoundButton();
    newGame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
