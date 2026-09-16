// Servidor local para testar o site E o painel sem precisar do Supabase real.
// Serve os arquivos do projeto e imita as rotas do Supabase (auth, REST, RPC)
// com dados em memória.
//
// Uso: node scripts/mock-server.mjs [porta]
//      http://localhost:4173/index.html   → site
//      http://localhost:4173/admin/       → painel (login: admin@teste.local / 123456)
//      http://localhost:4173/admin/e2e.html → painel executando o roteiro de teste
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allBlocks } from './content-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 4173);
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'content.json'), 'utf8'));

const LOGIN = { email: 'admin@teste.local', senha: '123456', id: '00000000-0000-4000-8000-000000000001' };
const TOKEN = 'token-de-teste';

// Permite simular uma edição já publicada: MOCK_OVERRIDES=index:hero.title=Novo
const overrides = Object.fromEntries(
  (process.env.MOCK_OVERRIDES || '')
    .split(';')
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf('=');
      return [pair.slice(0, i), pair.slice(i + 1)];
    })
);

// ------------------------------------------------------------ dados em memória
const db = {
  content_blocks: allBlocks().map((b, i) => ({
    ...b,
    id: `blk-${String(i).padStart(4, '0')}`,
    value: overrides[`${b.page_slug}:${b.key}`] ?? b.value,
    updated_at: new Date().toISOString(),
  })),
  products: content.products.map((p) => ({ ...p, updated_at: new Date().toISOString() })),
  media_assets: [],
  admin_users: [{ user_id: LOGIN.id, email: LOGIN.email, name: 'Administrador' }],
  snapshot: { draft: null, published: null },
};

function buildSnapshot() {
  const blocks = {};
  for (const b of db.content_blocks) {
    blocks[b.page_slug] ||= {};
    blocks[b.page_slug][b.key] = b.value;
  }
  return {
    generated_at: new Date().toISOString(),
    blocks,
    products: db.products
      .filter((p) => p.active !== false)
      .map((p) => ({
        id: p.id,
        category: p.category,
        name: p.name,
        cart_name: p.cart_name,
        alt: p.alt,
        price: p.price,
        image: p.image,
        gallery: p.gallery,
        featured: p.featured,
        featured_sort: p.featured_sort,
        sort: p.sort,
      })),
  };
}
function refreshDraft() {
  db.snapshot.draft = { data: buildSnapshot(), updated_at: new Date().toISOString() };
}
refreshDraft();
db.snapshot.published = { data: buildSnapshot(), updated_at: new Date().toISOString() };

// ---------------------------------------------------------------- utilidades
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-expose-headers': '*',
  });
  res.end(JSON.stringify(body));
}

function body(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Traduz os filtros do PostgREST (?key=eq.valor) usados pelo painel.
function applyFilters(rows, url) {
  let out = rows;
  for (const [k, v] of url.searchParams.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const [op, ...rest] = v.split('.');
    const alvo = rest.join('.');
    if (op === 'eq') out = out.filter((r) => String(r[k]) === alvo);
  }
  return out;
}

// O roteiro de teste do painel, injetado em /admin/e2e.html.
const E2E = `
<div id="e2e-result" style="position:fixed;bottom:0;left:0;background:#000;color:#0f0;font:12px monospace;z-index:99999;padding:6px">e2e: iniciando…</div>
<script>
(function () {
  var passos = [];
  window.addEventListener('error', function (e) {
    passos.push('ERRO-JS: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno);
    document.getElementById('e2e-result').textContent = 'e2e: ' + passos.join(' | ');
  });
  var registra = function (nome, ok, extra) { passos.push((ok ? 'OK ' : 'FALHA ') + nome + (extra ? ' (' + extra + ')' : '')); pinta(); };
  var pinta = function () { document.getElementById('e2e-result').textContent = 'e2e: ' + passos.join(' | '); };
  var espera = function (fn, ms) {
    ms = ms || 8000;
    var t0 = Date.now();
    return new Promise(function (ok, erro) {
      (function tenta() {
        var r; try { r = fn(); } catch (e) { r = null; }
        if (r) return ok(r);
        if (Date.now() - t0 > ms) return erro(new Error('timeout'));
        setTimeout(tenta, 80);
      })();
    });
  };

  // Pode já existir sessão salva no navegador: nesse caso o login é pulado.
  espera(function () { return document.getElementById('login-form') || document.querySelector('[data-go="page:index"]'); })
    .then(function (el) {
      if (el.id !== 'login-form') {
        registra('sessão já aberta', true);
        return el;
      }
      registra('tela de login', true);
      document.getElementById('email').value = 'admin@teste.local';
      document.getElementById('senha').value = '123456';
      document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      return espera(function () { return document.querySelector('[data-go="page:index"]'); });
    })
    .then(function (link) {
      registra('painel carregado', true);
      registra('contagem de produtos', /141/.test(document.body.textContent), 'catálogo carregado');
      link.click();
      return espera(function () { return document.querySelector('[data-block]'); });
    })
    .then(function (input) {
      registra('editor da página inicial', true);
      registra('campos de imagem', !!document.querySelector('[data-image-field]'));
      input.value = 'VALOR EDITADO NO TESTE ' + Date.now();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return espera(function () { return document.querySelector('[data-save-blocks]'); });
    })
    .then(function (botao) {
      registra('barra de salvar apareceu', true);
      botao.click();
      return espera(function () { return document.getElementById('toasts').textContent.indexOf('salvas') > -1; });
    })
    .then(function () {
      registra('salvou no banco', true);
      var publicar = document.querySelector('[data-publish]');
      publicar.click();
      return espera(function () { return document.getElementById('toasts').textContent.indexOf('publicado') > -1; });
    })
    .then(function () {
      registra('publicou o site', true);
      document.querySelector('[data-go="produtos"]').click();
      return espera(function () { return document.querySelector('[data-edit-product]'); });
    })
    .then(function (botao) {
      registra('lista de produtos', true);
      botao.click();
      return espera(function () { return document.querySelector('[data-save]'); });
    })
    .then(function () {
      registra('editor de produto abriu', true);
      registra('galeria no editor', !!document.querySelector('[data-gallery] img'));
      document.querySelector('[data-close]').click();

      // setas de reordenar
      var cartoes = document.querySelectorAll('[data-edit-product]');
      var primeiroNome = cartoes[0].closest('.card').querySelector('.font-serif').textContent;
      window.__primeiroNome = primeiroNome;
      var subir = document.querySelectorAll('[data-move][data-dir="-1"]');
      registra('seta de subir desativada no 1o item', subir[0].disabled);
      var descer = document.querySelector('[data-move][data-dir="1"]');
      registra('botao de previa na tela de produtos', !!document.querySelector('[data-preview]'));
      descer.click();
      return espera(function () {
        var atual = document.querySelectorAll('[data-edit-product]')[0].closest('.card').querySelector('.font-serif').textContent;
        return atual !== window.__primeiroNome ? atual : null;
      });
    })
    .then(function (novoPrimeiro) {
      registra('setas trocam a ordem', true, novoPrimeiro.slice(0, 22));
      return espera(function () {
        var b = document.querySelector('[data-discard-draft]');
        return b && !b.disabled ? b : null;
      });
    })
    .then(function (botao) {
      registra('botao de descartar habilita apos alteracao', true);
      botao.click();
      return espera(function () { return document.querySelector('[data-ok]'); });
    })
    .then(function (ok) {
      ok.click();
      return espera(function () { return document.getElementById('toasts').textContent.indexOf('descartadas') > -1; }, 20000);
    })
    .then(function () {
      registra('descartou e voltou ao publicado', true);
      // Volta para a página inicial e testa o envio de imagem.
      document.querySelector('[data-go="page:index"]').click();
      return espera(function () { return document.querySelector('[data-image-field] input[type=file]'); });
    })
    .then(function (input) {
      var campo = input.closest('[data-image-field]');
      var antes = campo.querySelector('img') ? campo.querySelector('img').src : '';
      window.__imagemAntes = antes;
      var dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'foto-nova.png', { type: 'image/png' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return espera(function () {
        var s = document.querySelector('[data-status]');
        // ignora o estado intermediário "Enviando…"
        return s && s.textContent && !/Enviando/i.test(s.textContent) ? s.textContent : null;
      }, 12000);
    })
    .then(function (texto) {
      var falhaEsperada = location.search.indexOf('falha') > -1;
      if (falhaEsperada) {
        registra('upload com erro avisa o usuário', /Erro/i.test(texto), texto.slice(0, 40));
        registra('imagem antiga preservada', !!document.querySelector('[data-image-field] img'));
      } else {
        registra('upload concluído', /enviada/i.test(texto), texto.slice(0, 40));
      }
      // Diagnóstico de largura: encontra elementos que estouram a tela.
      var largos = [];
      document.querySelectorAll('*').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.right > document.documentElement.clientWidth + 2 && r.width > 40)
          largos.push(el.tagName + '.' + (el.className || '').toString().slice(0, 45) + '=' + Math.round(r.right));
      });
      registra('sem rolagem lateral (' + document.documentElement.clientWidth + 'px)',
        document.body.scrollWidth <= document.documentElement.clientWidth + 1 && !largos.length,
        largos.slice(0, 3).join(' , '));
      passos.push('FIM');
      pinta();
    })
    .catch(function (e) {
      var s = document.querySelector('[data-status]');
      var sb = document.getElementById('savebar');
      var inp = document.querySelector('[data-block]');
      registra('erro: ' + e.message, false, 'status=' + (s ? JSON.stringify(s.textContent) : 'ausente') +
        ' campos=' + document.querySelectorAll('[data-image-field]').length +
        ' savebar=' + (sb ? sb.className : 'ausente') +
        ' input=' + (inp ? JSON.stringify(inp.value).slice(0, 30) : 'ausente') +
        ' hash=' + location.hash);
    });
})();
</script>`;

// ------------------------------------------------------------------ servidor
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;
    if (process.env.MOCK_LOG === '1' && !p.startsWith('/assets') && !p.endsWith('.html')) console.log(req.method, p);

    if (req.method === 'OPTIONS') return json(res, 200, {});

    // ---------------------------------------------------------------- auth
    if (p === '/auth/v1/token') {
      const dados = await body(req);
      if (dados.email === LOGIN.email && dados.password === LOGIN.senha) {
        return json(res, 200, {
          access_token: TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'refresh-de-teste',
          user: { id: LOGIN.id, email: LOGIN.email, aud: 'authenticated', role: 'authenticated' },
        });
      }
      return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }
    if (p === '/auth/v1/user') {
      const auth = req.headers.authorization || '';
      if (auth.indexOf(TOKEN) === -1) return json(res, 401, { message: 'unauthorized' });
      return json(res, 200, { id: LOGIN.id, email: LOGIN.email, aud: 'authenticated', role: 'authenticated' });
    }
    if (p === '/auth/v1/logout') return json(res, 204, {});

    // ------------------------------------------------------------- storage
    // Imita o Supabase Storage. O caminho "falha/" devolve erro de propósito,
    // para exercitar o tratamento de falha de upload no painel.
    if (p.startsWith('/storage/v1/object/')) {
      const chave = p.replace('/storage/v1/object/', '');
      if (req.method === 'POST' || req.method === 'PUT') {
        if (process.env.MOCK_UPLOAD_FAIL === '1')
          return json(res, 500, { statusCode: '500', message: 'Falha simulada no envio' });
        return json(res, 200, { Key: chave });
      }
      if (req.method === 'DELETE') return json(res, 200, [{ Key: chave }]);
      res.writeHead(200, { 'content-type': 'image/png' });
      return res.end(Buffer.from('iVBORw0KGgo=', 'base64'));
    }

    // ---------------------------------------------------------------- RPC
    if (p === '/rest/v1/rpc/restore_from_published') {
      const pub = db.snapshot.published;
      for (const b of db.content_blocks) {
        const v = pub.data.blocks?.[b.page_slug]?.[b.key];
        if (v !== undefined) b.value = v;
      }
      const publicados = new Map(pub.data.products.map((x) => [x.id, x]));
      for (const prod of db.products) {
        const orig = publicados.get(prod.id);
        if (orig) Object.assign(prod, orig, { active: true });
        else prod.active = false;
      }
      db.snapshot.draft = { data: buildSnapshot(), updated_at: pub.updated_at };
      return json(res, 200, pub.updated_at);
    }

    if (p === '/rest/v1/rpc/publish_site') {
      db.snapshot.published = { data: buildSnapshot(), updated_at: new Date().toISOString() };
      return json(res, 200, db.snapshot.published.updated_at);
    }

    // --------------------------------------------------------------- REST
    if (p.startsWith('/rest/v1/')) {
      const tabela = p.replace('/rest/v1/', '');

      if (tabela === 'site_snapshot') {
        const id = (url.searchParams.get('id') || '').replace('eq.', '');
        const linhas = ['draft', 'published']
          .filter((k) => !id || k === id)
          .map((k) => ({ id: k, data: db.snapshot[k].data, updated_at: db.snapshot[k].updated_at }));
        return json(res, 200, linhas);
      }

      const rows = db[tabela];
      if (!rows) return json(res, 404, { message: 'tabela desconhecida: ' + tabela });

      if (req.method === 'GET') return json(res, 200, applyFilters(rows, url));

      if (req.method === 'PATCH') {
        const patch = await body(req);
        const alvos = applyFilters(rows, url);
        alvos.forEach((r) => Object.assign(r, patch));
        refreshDraft();
        return json(res, 200, alvos);
      }
      if (req.method === 'POST') {
        const novo = await body(req);
        const item = Array.isArray(novo) ? novo[0] : novo;
        rows.push(item);
        refreshDraft();
        return json(res, 201, [item]);
      }
      if (req.method === 'DELETE') {
        const alvos = applyFilters(rows, url);
        db[tabela] = rows.filter((r) => alvos.indexOf(r) === -1);
        refreshDraft();
        return json(res, 200, alvos);
      }
    }

    // ------------------------------------------------------------ arquivos
    let file = decodeURIComponent(p);
    if (file === '/') file = '/index.html';
    if (file === '/admin' || file === '/admin/') file = '/admin/index.html';

    // Roda o roteiro dentro de um iframe estreito, para testar a largura de
    // celular (a janela do Chrome headless não fica menor que ~490px).
    if (file === '/admin/mobile.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(`<!DOCTYPE html><html><body style="margin:0">
<iframe src="${url.searchParams.get('src') || '/admin/e2e.html'}" style="width:375px;height:812px;border:0"></iframe>
<div id="espelho">aguardando…</div>
<script>
setInterval(function () {
  try {
    var d = document.querySelector('iframe').contentDocument;
    var r = d.getElementById('e2e-result');
    if (r) document.getElementById('espelho').textContent = r.textContent;
  } catch (e) {}
}, 200);
</script></body></html>`);
    }

    if (file === '/admin/e2e.html') {
      const html = fs.readFileSync(path.join(ROOT, 'admin', 'index.html'), 'utf8').replace('</body>', E2E + '</body>');
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(html);
    }

    const full = path.join(ROOT, file);
    if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('404');
    }

    let conteudo = fs.readFileSync(full);
    if (file.endsWith('cms-config.js')) {
      conteudo = Buffer.from(`window.CMS_CONFIG = { url: 'http://localhost:${PORT}', anonKey: 'chave-de-teste' };`);
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(conteudo);
  })
  .listen(PORT, () => console.log(`Teste local em http://localhost:${PORT}/index.html`));
