// Carimba uma versão nos scripts e no CSS do site e do painel (ex.: cms.js?v=3).
//
// Por que isso existe: o GitHub Pages manda o navegador guardar os arquivos .js
// por 4 horas. Sem o carimbo, quem já abriu o painel continuaria vendo a versão
// antiga depois de uma atualização. Mudando o número, o navegador é obrigado a
// baixar de novo.
//
// Uso: node scripts/bump-version.mjs        (usa a data de hoje)
//      node scripts/bump-version.mjs 7      (usa o número 7)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSAO = process.argv[2] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

const ALVOS = [
  ...['index', 'bolsas', 'relogios', 'oculos', 'calcados', 'acessorios', 'cintos', 'pesquisa', 'produto', 'politica-de-privacidade', 'trocas-e-devolucoes', 'frete-e-envio'].map((s) => `${s}.html`),
  'admin/index.html',
];

// Casa "assets/cms.js", "assets/cms.js?v=123", "app.js", "app.js?v=123"…
// e também o CSS: "assets/tailwind.css", "../assets/tailwind.css?v=123".
// O CSS ficou de fora até nov/2026, e o menu novo não aparecia no computador
// de quem já tinha a versão antiga guardada (o servidor manda guardar 4 horas).
const ARQUIVOS_JS = /((?:src|href)=")((?:\.\.\/)?(?:assets\/)?(?:cms-config\.js|cms\.js|produto\.js|app\.js|tailwind\.css))(\?v=[^"]*)?(")/g;

let total = 0;
for (const alvo of ALVOS) {
  const p = path.join(ROOT, alvo);
  const antes = fs.readFileSync(p, 'utf8');
  let n = 0;
  const depois = antes.replace(ARQUIVOS_JS, (m, ini, arquivo, _v, fim) => {
    n++;
    return `${ini}${arquivo}?v=${VERSAO}${fim}`;
  });
  if (depois !== antes) fs.writeFileSync(p, depois, 'utf8');
  total += n;
  console.log(`  ${alvo}: ${n} arquivo(s)`);
}

console.log(`\nVersão ${VERSAO} aplicada em ${total} referências.`);
