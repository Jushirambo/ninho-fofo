/*
 * Ninho Fofo — filhotes vetoriais originais (7 espécies × 7 pelagens).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NinhoPieces = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var COLORS = [
    { id: 'algodao', name: 'Algodão', hex: '#f3c6d8', pattern: 'hearts' },
    { id: 'pessego', name: 'Pêssego', hex: '#f4a574', pattern: 'dots' },
    { id: 'limao', name: 'Limão', hex: '#d4e056', pattern: 'stars' },
    { id: 'hortela', name: 'Hortelã', hex: '#6ec9b4', pattern: 'leaves' },
    { id: 'uva', name: 'Uva', hex: '#b39ddb', pattern: 'clouds' },
    { id: 'caramelo', name: 'Caramelo', hex: '#e0b07a', pattern: 'flowers' },
    { id: 'chiclete', name: 'Chiclete', hex: '#ff8bb0', pattern: 'waves' }
  ];

  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mix(hex, target, amount) {
    var a = hexToRgb(hex), b = hexToRgb(target);
    return 'rgb(' + clamp(a[0] + (b[0] - a[0]) * amount) + ',' +
      clamp(a[1] + (b[1] - a[1]) * amount) + ',' +
      clamp(a[2] + (b[2] - a[2]) * amount) + ')';
  }
  function darken(hex, amount) { return mix(hex, '#000000', amount); }
  function lighten(hex, amount) { return mix(hex, '#ffffff', amount); }

  function patternBody(kind) {
    switch (kind) {
      case 'hearts': return '<path d="M6 10 C2 7 1 4 3 3 C4.5 2 6 3.5 6 4.5 C6 3.5 7.5 2 9 3 C11 4 10 7 6 10Z"/>';
      case 'dots': return '<circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="9" r="1.4"/>';
      case 'stars': return '<path d="M6 1.5 L7.3 4.4 L10.5 4.7 L8 6.8 L8.8 10 L6 8.3 L3.2 10 L4 6.8 L1.5 4.7 L4.7 4.4Z"/>';
      case 'leaves': return '<path d="M2 8 Q2 3 7 3 Q7 8 2 8 M7 10 Q7 6 11 6 Q11 10 7 10"/>';
      case 'clouds': return '<path d="M1 8 Q1 5 4 5 Q5 2 8 4 Q11 4 11 8Z"/>';
      case 'flowers': return '<circle cx="6" cy="3.5" r="2"/><circle cx="8.5" cy="6" r="2"/><circle cx="6" cy="8.5" r="2"/><circle cx="3.5" cy="6" r="2"/>';
      case 'waves': return '<path d="M0 6 Q3 2 6 6 T12 6"/>';
      default: return '';
    }
  }

  function defs() {
    return '<defs>' + COLORS.map(function (c) {
      return '<pattern id="ninho-pat-' + c.id + '" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="scale(1.2)">' +
        '<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
        patternBody(c.pattern) + '</g></pattern>';
    }).join('') + '</defs>';
  }

  var FACE =
    '<circle cx="40" cy="54" r="3.4" fill="#3d3340"/>' +
    '<circle cx="60" cy="54" r="3.4" fill="#3d3340"/>' +
    '<circle cx="41.2" cy="52.8" r="1.1" fill="#fff"/>' +
    '<circle cx="61.2" cy="52.8" r="1.1" fill="#fff"/>' +
    '<path d="M46 64 Q50 67.5 54 64" fill="none" stroke="#3d3340" stroke-width="2.2" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="62" rx="6" ry="3.2" fill="#ffb3c0" opacity=".55"/>' +
    '<ellipse cx="68" cy="62" rx="6" ry="3.2" fill="#ffb3c0" opacity=".55"/>';

  var ANIMALS = [
    // Pintinho
    '<ellipse cx="50" cy="62" rx="30" ry="26" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' +
    '<ellipse cx="22" cy="62" rx="8" ry="12" fill="__LIGHT__" stroke="__OUT__" stroke-width="2"/>' +
    '<circle cx="50" cy="40" r="22" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '<polygon points="50,52 42,58 58,58" fill="#f08a3a"/>' +
    '<polygon points="46,78 50,88 54,78" fill="#f08a3a"/>' + FACE,

    // Porquinho
    '<ellipse cx="50" cy="60" rx="32" ry="28" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' +
    '<ellipse cx="24" cy="38" rx="10" ry="14" fill="__LIGHT__" stroke="__OUT__" stroke-width="2.5"/>' +
    '<ellipse cx="76" cy="38" rx="10" ry="14" fill="__LIGHT__" stroke="__OUT__" stroke-width="2.5"/>' +
    FACE +
    '<ellipse cx="50" cy="66" rx="10" ry="7" fill="__LIGHT__" stroke="__OUT__" stroke-width="2"/>' +
    '<circle cx="46" cy="66" r="1.6" fill="#3d3340"/><circle cx="54" cy="66" r="1.6" fill="#3d3340"/>',

    // Corujinha
    '<ellipse cx="50" cy="60" rx="30" ry="30" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' +
    '<polygon points="22,28 30,8 40,30" fill="__BODY__" stroke="__OUT__" stroke-width="2.5"/>' +
    '<polygon points="78,28 70,8 60,30" fill="__BODY__" stroke="__OUT__" stroke-width="2.5"/>' +
    '<circle cx="38" cy="52" r="11" fill="#fff"/><circle cx="62" cy="52" r="11" fill="#fff"/>' +
    '<circle cx="38" cy="53" r="5.5" fill="#3d3340"/><circle cx="62" cy="53" r="5.5" fill="#3d3340"/>' +
    '<circle cx="40" cy="51" r="1.6" fill="#fff"/><circle cx="64" cy="51" r="1.6" fill="#fff"/>' +
    '<polygon points="50,60 44,68 56,68" fill="#f08a3a"/>',

    // Axolote
    '<ellipse cx="18" cy="42" rx="10" ry="16" fill="#ff9bb8" stroke="__OUT__" stroke-width="2" transform="rotate(-25 18 42)"/>' +
    '<ellipse cx="82" cy="42" rx="10" ry="16" fill="#ff9bb8" stroke="__OUT__" stroke-width="2" transform="rotate(25 82 42)"/>' +
    '<ellipse cx="16" cy="58" rx="8" ry="12" fill="#ff9bb8" stroke="__OUT__" stroke-width="2"/>' +
    '<ellipse cx="84" cy="58" rx="8" ry="12" fill="#ff9bb8" stroke="__OUT__" stroke-width="2"/>' +
    '<ellipse cx="50" cy="58" rx="32" ry="28" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' + FACE +
    '<path d="M44 70 Q50 74 56 70" fill="none" stroke="#3d3340" stroke-width="2" stroke-linecap="round"/>',

    // Capivara
    '<ellipse cx="50" cy="58" rx="34" ry="30" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' +
    '<ellipse cx="28" cy="32" rx="8" ry="10" fill="__BODY__" stroke="__OUT__" stroke-width="2.5"/>' +
    '<ellipse cx="72" cy="32" rx="8" ry="10" fill="__BODY__" stroke="__OUT__" stroke-width="2.5"/>' +
    FACE +
    '<ellipse cx="50" cy="70" rx="14" ry="8" fill="__LIGHT__"/>' +
    '<path d="M42 70 Q50 76 58 70" fill="none" stroke="#3d3340" stroke-width="2" stroke-linecap="round"/>',

    // Ouriço
    '<path d="M18 70 L22 28 L32 48 L40 18 L50 44 L60 16 L68 46 L78 26 L84 70 Z" fill="__OUT__"/>' +
    '<ellipse cx="50" cy="64" rx="30" ry="24" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' + FACE,

    // Foca
    '<ellipse cx="50" cy="62" rx="34" ry="26" fill="__BODY__" stroke="__OUT__" stroke-width="3"/>' +
    '__PAT__' +
    '<ellipse cx="18" cy="72" rx="12" ry="7" fill="__LIGHT__" stroke="__OUT__" stroke-width="2"/>' +
    '<ellipse cx="82" cy="72" rx="12" ry="7" fill="__LIGHT__" stroke="__OUT__" stroke-width="2"/>' +
    FACE +
    '<path d="M28 58 Q22 54 18 58 M72 58 Q78 54 82 58" fill="none" stroke="#3d3340" stroke-width="1.6" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="66" rx="5" ry="3.4" fill="#3d3340"/>'
  ];

  var SHAPE_NAMES = ['Pintinho', 'Porquinho', 'Corujinha', 'Axolote', 'Capivara', 'Ouriço', 'Foca'];

  function svgFor(shape, color) {
    var c = COLORS[color % COLORS.length];
    var body = c.hex;
    var out = darken(body, 0.32);
    var light = lighten(body, 0.7);
    var pattern = '<ellipse cx="50" cy="60" rx="26" ry="22" fill="url(#ninho-pat-' + c.id + ')"/>';
    var markup = ANIMALS[shape % ANIMALS.length]
      .replace(/__BODY__/g, body)
      .replace(/__OUT__/g, out)
      .replace(/__LIGHT__/g, light)
      .replace(/__PAT__/g, pattern);
    return '<svg class="animal-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" focusable="false">' + markup + '</svg>';
  }

  function cardBg(color) { return mix(COLORS[color % COLORS.length].hex, '#ffffff', 0.88); }

  return {
    COLORS: COLORS,
    SHAPE_NAMES: SHAPE_NAMES,
    defs: defs,
    svgFor: svgFor,
    cardBg: cardBg,
    darken: darken,
    lighten: lighten,
    mix: mix
  };
});
