// Confere o site em larguras de tablet e celular, procurando os erros clássicos:
// rolagem lateral, logo colidindo com o menu, e menu que não abre.
//
// Uso: node scripts/teste-tablet.mjs   (sobe o servidor de teste sozinho)
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('Chrome/Edge não encontrado.');
  process.exit(1);
}

const PORTA = Number(process.env.PORTA || 4300 + Math.floor(Math.random() * 600));
const BASE = `http://localhost:${PORTA}`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'tablet-'));

const servidor = spawn(process.execPath, [path.join(RAIZ, 'scripts', 'mock-server.mjs'), String(PORTA)], {
  stdio: 'ignore',
});
process.on('exit', () => {
  servidor.kill();
  fs.rmSync(perfil, { recursive: true, force: true });
});

for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${BASE}/index.html`)).ok) break;
  } catch {
    /* subindo */
  }
  await new Promise((r) => setTimeout(r, 200));
}

// Tamanhos reais de aparelhos, em CSS pixels.
const APARELHOS = [
  ['iPhone', 390, 844],
  ['iPad mini retrato', 744, 1133],
  ['iPad retrato', 768, 1024],
  ['iPad Air retrato', 820, 1180],
  ['iPad paisagem', 1024, 768],
  ['iPad Air paisagem', 1180, 820],
  ['iPad Pro paisagem', 1366, 1024],
];
const PAGINAS = ['index.html', 'bolsas.html', 'relogios.html'];

// Página que carrega o site num iframe do tamanho exato e mede tudo por dentro.
const medidor = (url, largura, altura) => `<!DOCTYPE html><meta charset="utf-8"><body style="margin:0">
<iframe id="f" src="${url}" style="width:${largura}px;height:${altura}px;border:0"></iframe>
<pre id="r">medindo</pre>
<script>
var n = 0;
var t = setInterval(function () {
  n++;
  var q = document.getElementById('f'), d = q.contentDocument, w = q.contentWindow;
  if ((!d || !d.querySelector('header')) && n < 80) return;
  clearInterval(t);
  var problemas = [];
  var raiz = d.documentElement;

  // 1. rolagem lateral
  if (d.body.scrollWidth > raiz.clientWidth + 1)
    problemas.push('rolagem lateral (' + d.body.scrollWidth + ' > ' + raiz.clientWidth + ')');

  // 2. elementos estourando a largura
  var todos = d.querySelectorAll('header *, section *, footer *');
  for (var i = 0; i < todos.length; i++) {
    var r = todos[i].getBoundingClientRect();
    if (r.width > 20 && r.right > raiz.clientWidth + 2) {
      problemas.push('estoura a tela: ' + todos[i].tagName + '.' + String(todos[i].className).slice(0, 30));
      break;
    }
  }

  // 3. logo colidindo com o menu
  var logo = d.querySelector('header .font-serif');
  var nav = d.querySelector('header nav');
  if (logo && nav && w.getComputedStyle(nav).display !== 'none') {
    var a = logo.getBoundingClientRect(), b = nav.getBoundingClientRect();
    if (a.right > b.left + 1 && a.top < b.bottom && a.bottom > b.top) problemas.push('logo sobrepõe o menu');
  }

  // 4. se o botão do menu aparece, o menu precisa abrir
  var botao = d.getElementById('mobileMenuButton');
  var menu = d.getElementById('mobileNav');
  if (botao && w.getComputedStyle(botao).display !== 'none') {
    if (!menu) problemas.push('botão do menu sem menu');
    else {
      botao.click();
      if (w.getComputedStyle(menu).display === 'none') problemas.push('menu não abre');
      botao.click();
    }
  }

  document.getElementById('r').textContent = problemas.length ? problemas.join(' ;; ') : 'OK';
}, 150);
</script></body>`;

const tmpHtml = path.join(RAIZ, 'teste-tablet-tmp.html');
let falhas = 0;
let total = 0;

for (const [nomeAparelho, largura, altura] of APARELHOS) {
  for (const pagina of PAGINAS) {
    fs.writeFileSync(tmpHtml, medidor(`/${pagina}`, largura, altura), 'utf8');
    const saida = execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--virtual-time-budget=20000',
        `--user-data-dir=${perfil}`,
        '--dump-dom',
        `${BASE}/teste-tablet-tmp.html`,
      ],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const m = saida.match(/<pre id="r">([^<]*)/);
    const resultado = m ? m[1] : 'sem resposta';
    total++;
    const ok = resultado === 'OK';
    if (!ok) falhas++;
    console.log(`  ${ok ? 'ok   ' : 'FALHA'} ${nomeAparelho} (${largura}px) · ${pagina}${ok ? '' : ' — ' + resultado}`);
  }
}

fs.rmSync(tmpHtml, { force: true });
console.log(`\n${total - falhas}/${total} combinações de aparelho e página sem problema.`);
process.exit(falhas ? 1 : 0);
