/* Gera a versão em arquivo único do Ninho Fofo. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
const css = read('css/style.css');
const scripts = ['js/engine.js', 'js/ai.js', 'js/pieces.js', 'js/game.js']
  .map((f) => '<!-- ' + f + ' -->\n<script>\n' + read(f) + '\n</script>')
  .join('\n');

html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>');
const scriptsTag = /<script src="js\/engine\.js"><\/script>[\s\S]*?<script src="js\/game\.js"><\/script>/;
if (!scriptsTag.test(html)) throw new Error('não encontrei as tags de script para substituir');
html = html.replace(scriptsTag, scripts);
html = html.replace('<title>Ninho Fofo — filhotes no bosque</title>',
  '<title>Ninho Fofo — filhotes no bosque (arquivo único)</title>');

const out = path.join(root, 'ninho-fofo.html');
fs.writeFileSync(out, html);
console.log('gerado:', path.relative(process.cwd(), out), '(' + Math.round(html.length / 1024) + ' KB)');
