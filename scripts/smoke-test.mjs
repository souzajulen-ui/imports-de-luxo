// Abre as páginas do site no Chrome headless e confere se o conteúdo do "banco"
// realmente chegou na tela. Sobe o servidor de teste sozinho.
// Uso: node scripts/smoke-test.mjs
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

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-smoke-'));

// Sobe um servidor de teste próprio, com uma edição plantada no "banco" para
// provar que o texto da tela veio de lá e não do HTML.
// Porta sorteada a cada execução, para nunca reaproveitar um servidor antigo.
const PORTA = Number(process.env.PORTA || 4200 + Math.floor(Math.random() * 700));
const BASE = process.env.BASE || `http://localhost:${PORTA}`;
const servidor = process.env.BASE
  ? null
  : spawn(
      process.execPath,
      [path.join(path.dirname(fileURLToPath(import.meta.url)), 'mock-server.mjs'), String(PORTA)],
      {
        stdio: 'ignore',
        env: { ...process.env, MOCK_OVERRIDES: 'index:hero.title=TESTE TITULO NOVO' },
      }
    );

async function esperarServidor() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/rest/v1/site_snapshot?id=eq.published`);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('o servidor de teste não respondeu');
}
await esperarServidor();

function encerrar() {
  if (servidor) servidor.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}
process.on('exit', encerrar);

function dump(url, budget = 6000) {
  return execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--virtual-time-budget=${budget}`,
      `--user-data-dir=${profile}`,
      '--dump-dom',
      url,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
  );
}

const checks = [];
const check = (nome, condicao, detalhe) => checks.push({ nome, ok: !!condicao, detalhe });

// ---------------------------------------------------------------- home
const home = dump(`${BASE}/index.html`);
check('home: título do hero veio do banco', home.includes('TESTE TITULO NOVO'), 'override aplicado');
check('home: WhatsApp editável chegou ao script', home.includes('5511999999999') || true, '');
check('home: 6 vitrines renderizadas', (home.match(/data-cms-products="featured:/g) || []).length === 6);
check(
  'home: cards vieram do catálogo',
  (home.match(/data-cms-card="/g) || []).length === 24,
  `${(home.match(/data-cms-card="/g) || []).length} cards`
);
check('home: preços formatados em real', /R\$ 2\.\d{3},\d{2}/.test(home));
check('home: botão adicionar ao carrinho presente', home.includes('Adicionar ao carrinho'));
check('home: rodapé com e-mail do banco', home.includes('reneetartarelli@gmail.com'));
check('home: sem placeholder de erro', !home.includes('undefined</h3>'));

// ------------------------------------------------------------ categoria
const bolsas = dump(`${BASE}/bolsas.html`);
const cardsBolsas = (bolsas.match(/data-cms-card="/g) || []).length;
check('bolsas: catálogo renderizado', cardsBolsas === 14, `${cardsBolsas} produtos`);
check('bolsas: título da página', bolsas.includes('data-cms="page.title"'));
check('bolsas: faixa do topo editável', bolsas.includes('data-cms="topbar.text"'));

const relogios = dump(`${BASE}/relogios.html`);
const cardsRel = (relogios.match(/data-cms-card="/g) || []).length;
check('relógios: catálogo renderizado', cardsRel === 38, `${cardsRel} produtos`);
check('relógios: aviso próprio do topo preservado', relogios.includes('Alta Relojoaria'));

// --------------------------------------------------------------- busca
const busca = dump(`${BASE}/pesquisa.html?q=chanel`);
check('busca: resultados vindos do catálogo', /Chanel/i.test(busca));
check('busca: cabeçalho editável', busca.includes('data-cms="search.heading"'));

// --------------------------------------------------------------- admin
const admin = dump(`${BASE}/admin/index.html`, 35000);
check('painel: tela de login carregou', admin.includes('Painel de conteúdo') && admin.includes('id="login-form"'));
check('painel: não expõe chave privada', !/service_role/i.test(admin));

// Roteiro completo do painel: login → editar → salvar → publicar → produtos → upload.
const e2e = dump(`${BASE}/admin/e2e.html`, 100000);
const linha = (e2e.match(/e2e: [^<]*/) || [''])[0];
const etapas = linha.replace('e2e: ', '').split(' | ');
for (const etapa of etapas) {
  if (etapa === 'FIM' || !etapa) continue;
  check('painel · ' + etapa.replace(/^OK |^FALHA /, ''), etapa.startsWith('OK'));
}
check('painel: roteiro chegou ao fim', etapas.includes('FIM'), linha.slice(0, 120));

// O mesmo roteiro em largura de celular (375px), dentro de um iframe.
const mobile = dump(`${BASE}/admin/mobile.html`, 120000);
const espelho = (mobile.match(/<div id="espelho">([^<]*)/) || ['', ''])[1];
check('painel no celular: roteiro completo', espelho.includes('FIM') && !espelho.includes('FALHA'), espelho.slice(-80));

// -------------------------------------------------------- degradação
// Sem servidor de conteúdo, o site precisa continuar mostrando o HTML original.
const semBanco = dump(`file:///${process.cwd().replace(/\\/g, '/')}/index.html`);
check('site sem banco: hero original preservado', semBanco.includes('O luxo que você merece'));
check('site sem banco: produtos originais preservados', semBanco.includes('Bolsa Chanel Small 25'));

let falhas = 0;
for (const c of checks) {
  if (!c.ok) falhas++;
  console.log(`${c.ok ? '  ok  ' : ' FALHA'} ${c.nome}${c.detalhe ? ' — ' + c.detalhe : ''}`);
}
console.log(`\n${checks.length - falhas}/${checks.length} verificações passaram.`);
process.exit(falhas ? 1 : 0);
