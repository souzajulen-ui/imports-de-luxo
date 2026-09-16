/* ===========================================================================
   Imports de Luxo — painel administrativo.
   Edita textos, imagens e produtos do site sem mexer em código.
   =========================================================================== */
(function () {
  'use strict';

  var cfg = window.CMS_CONFIG || {};
  var configured =
    cfg.url && cfg.anonKey && cfg.url.indexOf('SEU-PROJETO') === -1 && cfg.anonKey.indexOf('COLE_AQUI') === -1;

  var sb = configured ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  var BUCKET = 'site-images';
  var MAX_UPLOAD = 5 * 1024 * 1024; // 5 MB
  var TYPES_OK = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  var PAGES = [
    { slug: 'index', name: 'Página inicial', file: 'index.html', category: null },
    { slug: 'bolsas', name: 'Bolsas', file: 'bolsas.html', category: 'bolsas' },
    { slug: 'relogios', name: 'Relógios', file: 'relogios.html', category: 'relogios' },
    { slug: 'oculos', name: 'Óculos', file: 'oculos.html', category: 'oculos' },
    { slug: 'calcados', name: 'Calçados', file: 'calcados.html', category: 'calcados' },
    { slug: 'acessorios', name: 'Acessórios', file: 'acessorios.html', category: 'acessorios' },
    { slug: 'cintos', name: 'Cintos', file: 'cintos.html', category: 'cintos' },
    { slug: 'pesquisa', name: 'Página de busca', file: 'pesquisa.html', category: null },
  ];
  var CATEGORY_LABEL = {
    bolsas: 'Bolsas',
    relogios: 'Relógios',
    oculos: 'Óculos',
    calcados: 'Calçados',
    acessorios: 'Acessórios',
    cintos: 'Cintos',
  };

  var state = {
    user: null,
    isAdmin: false,
    booting: true,
    view: 'dashboard',
    pageSlug: 'index',
    blocks: [],
    products: [],
    media: [],
    dirty: new Map(), // "page|key" -> valor novo
    publishedAt: null,
    draftAt: null,
    saving: false,
    publishing: false,
    productFilter: 'todas',
    productSearch: '',
    pendingChanges: false,
  };

  // ============================================================== utilidades
  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var app = function () {
    return document.getElementById('app');
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function when(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function toast(message, kind) {
    var box = document.getElementById('toasts');
    var colors = {
      ok: 'background:#065F46;color:#fff',
      erro: 'background:#991B1B;color:#fff',
      info: 'background:#1A1A1A;color:#fff',
    };
    var el = document.createElement('div');
    el.className = 'fade-up';
    el.style.cssText =
      (colors[kind] || colors.info) +
      ';padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18);max-width:340px';
    el.textContent = message;
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3800);
  }

  // Limpa HTML colado no editor de texto rico.
  function sanitize(html) {
    var allowed = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, UL: 1, OL: 1, LI: 1, BR: 1, P: 1, SPAN: 1, DIV: 1 };
    var box = document.createElement('div');
    box.innerHTML = html;
    (function walk(node) {
      var children = Array.prototype.slice.call(node.children);
      children.forEach(function (child) {
        if (!allowed[child.tagName]) {
          child.replaceWith(document.createTextNode(child.textContent));
          return;
        }
        Array.prototype.slice.call(child.attributes).forEach(function (attr) {
          var keep = child.tagName === 'A' && attr.name === 'href' && !/^javascript:/i.test(attr.value);
          if (!keep) child.removeAttribute(attr.name);
        });
        if (child.tagName === 'A') child.setAttribute('target', '_blank');
        walk(child);
      });
    })(box);
    return box.innerHTML.trim();
  }

  function modal(innerHtml, options) {
    options = options || {};
    var wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[70] flex items-center justify-center p-4';
    wrap.innerHTML =
      '<div class="absolute inset-0 bg-black/50" data-close></div>' +
      '<div class="relative card w-full ' +
      (options.width || 'max-w-2xl') +
      ' max-h-[90vh] overflow-y-auto fade-up">' +
      innerHtml +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) close();
    });
    function close() {
      wrap.remove();
    }
    wrap.close = close;
    return wrap;
  }

  function confirmar(titulo, texto, botao) {
    return new Promise(function (resolve) {
      var m = modal(
        '<div class="p-6">' +
          '<h3 class="font-serif text-xl mb-2">' +
          esc(titulo) +
          '</h3>' +
          '<p class="text-sm text-gray-500 mb-6">' +
          esc(texto) +
          '</p>' +
          '<div class="flex justify-end gap-2">' +
          '<button class="btn btn-ghost" data-close>Cancelar</button>' +
          '<button class="btn btn-danger" data-ok>' +
          esc(botao || 'Confirmar') +
          '</button>' +
          '</div></div>',
        { width: 'max-w-md' }
      );
      m.querySelector('[data-ok]').addEventListener('click', function () {
        m.close();
        resolve(true);
      });
      m.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-close')) resolve(false);
      });
    });
  }

  // ================================================================== dados
  function loadAll() {
    return Promise.all([
      sb.from('content_blocks').select('*').order('page_slug').order('sort'),
      sb.from('products').select('*').order('category').order('sort'),
      sb.from('media_assets').select('*').order('created_at', { ascending: false }),
      sb.from('site_snapshot').select('id,updated_at'),
    ]).then(function (res) {
      var erro = res.find(function (r) {
        return r.error;
      });
      if (erro) throw erro.error;
      state.blocks = res[0].data || [];
      state.products = res[1].data || [];
      state.media = res[2].data || [];
      (res[3].data || []).forEach(function (row) {
        if (row.id === 'published') state.publishedAt = row.updated_at;
        if (row.id === 'draft') state.draftAt = row.updated_at;
      });
      // Os dois carimbos vêm do mesmo servidor, então aqui a comparação é segura.
      state.pendingChanges =
        !!state.draftAt &&
        !!state.publishedAt &&
        new Date(state.draftAt).getTime() > new Date(state.publishedAt).getTime();
    });
  }

  function blocksOf(slug) {
    return state.blocks.filter(function (b) {
      return b.page_slug === slug;
    });
  }

  function valueOf(block) {
    var k = block.page_slug + '|' + block.key;
    return state.dirty.has(k) ? state.dirty.get(k) : block.value || '';
  }

  function setValue(block, value) {
    var k = block.page_slug + '|' + block.key;
    if ((block.value || '') === value) state.dirty.delete(k);
    else state.dirty.set(k, value);
    refreshSaveBar();
  }

  // Há algo salvo que ainda não foi publicado?
  // Não comparamos relógios (o do computador pode estar errado): marcamos
  // explicitamente a cada alteração e limpamos ao publicar ou descartar.
  function hasUnpublished() {
    return state.pendingChanges;
  }

  function marcarPendente() {
    state.pendingChanges = true;
    state.draftAt = new Date().toISOString();
    renderTopBar();
  }

  // ================================================================= salvar
  function saveDirty() {
    if (!state.dirty.size) return Promise.resolve(true);
    state.saving = true;
    refreshSaveBar();
    var updates = [];
    state.dirty.forEach(function (value, k) {
      var parts = k.split('|');
      updates.push(
        sb
          .from('content_blocks')
          .update({ value: value, updated_at: new Date().toISOString() })
          .eq('page_slug', parts[0])
          .eq('key', parts[1])
      );
    });
    return Promise.all(updates)
      .then(function (res) {
        var erro = res.find(function (r) {
          return r.error;
        });
        if (erro) throw erro.error;
        state.dirty.forEach(function (value, k) {
          var parts = k.split('|');
          var b = state.blocks.find(function (x) {
            return x.page_slug === parts[0] && x.key === parts[1];
          });
          if (b) b.value = value;
        });
        state.dirty.clear();
        marcarPendente();
        toast('Alterações salvas.', 'ok');
        return true;
      })
      .catch(function (err) {
        toast('Não foi possível salvar: ' + (err.message || 'erro desconhecido'), 'erro');
        return false;
      })
      .finally(function () {
        state.saving = false;
        refreshSaveBar();
        renderTopBar();
      });
  }

  function publish() {
    state.publishing = true;
    refreshSaveBar();
    return saveDirty()
      .then(function (ok) {
        if (!ok) return;
        return sb.rpc('publish_site').then(function (r) {
          if (r.error) throw r.error;
          state.publishedAt = r.data || new Date().toISOString();
          state.pendingChanges = false;
          toast('Site publicado! As alterações já estão no ar.', 'ok');
        });
      })
      .catch(function (err) {
        toast('Falha ao publicar: ' + (err.message || 'erro'), 'erro');
      })
      .finally(function () {
        state.publishing = false;
        refreshSaveBar();
        renderTopBar();
      });
  }

  // ================================================================= upload
  function uploadImage(file) {
    if (!file) return Promise.reject(new Error('Nenhum arquivo escolhido.'));
    if (TYPES_OK.indexOf(file.type) === -1)
      return Promise.reject(new Error('Formato não aceito. Use JPG, PNG ou WebP.'));
    if (file.size > MAX_UPLOAD) return Promise.reject(new Error('Imagem muito grande. O limite é 5 MB.'));

    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var safe = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    var path = new Date().getFullYear() + '/' + Date.now() + '-' + (safe || 'imagem') + '.' + ext;

    return sb.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        var url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        return sb
          .from('media_assets')
          .insert({ path: path, url: url, label: file.name, size_bytes: file.size })
          .select()
          .single()
          .then(function (ins) {
            if (ins.data) state.media.unshift(ins.data);
            return { path: path, url: url };
          });
      });
  }

  // =========================================================== campo imagem
  function imageField(block) {
    var id = 'img-' + block.id;
    var value = valueOf(block);
    return (
      '<div class="flex flex-col sm:flex-row gap-4 items-start" data-image-field="' +
      block.id +
      '">' +
      '<div class="w-28 h-28 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">' +
      (value
        ? '<img src="' + esc(value) + '" class="w-full h-full object-contain" alt="">'
        : '<span class="text-[10px] uppercase tracking-widest text-gray-400">sem imagem</span>') +
      '</div>' +
      '<div class="flex-1 min-w-0 w-full">' +
      '<div class="flex flex-wrap gap-2 mb-2">' +
      '<button class="btn btn-ghost" data-pick="' + block.id + '">Alterar imagem</button>' +
      '<button class="btn btn-ghost" data-library="' + block.id + '">Escolher da biblioteca</button>' +
      '<button class="btn btn-danger' + (value ? '' : ' hidden') + '" data-clear="' + block.id + '">Remover</button>' +
      '</div>' +
      '<p class="text-[11px] text-gray-400 break-all" data-caption>' +
      (value ? esc(value) : 'Nenhuma imagem definida — o site usa a imagem original.') +
      '</p>' +
      '<div class="text-[11px] mt-1 hidden" data-status="' + block.id + '"></div>' +
      '<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" id="' + id + '">' +
      '</div></div>'
    );
  }

  function wireImageFields(root) {
    root.querySelectorAll('[data-image-field]').forEach(function (box) {
      var blockId = box.getAttribute('data-image-field');
      var block = state.blocks.find(function (b) {
        return b.id === blockId;
      });
      if (!block) return;
      var input = box.querySelector('input[type=file]');
      var status = box.querySelector('[data-status]');

      function setStatus(text, color) {
        status.classList.remove('hidden');
        status.style.color = color;
        status.textContent = text;
      }

      // Atualiza o campo sem redesenhar a tela, para a mensagem não sumir.
      function mostrarImagem(url) {
        var moldura = box.querySelector('.w-28');
        moldura.innerHTML = url
          ? '<img src="' + esc(url) + '" class="w-full h-full object-contain" alt="">'
          : '<span class="text-[10px] uppercase tracking-widest text-gray-400">sem imagem</span>';
        box.querySelector('[data-caption]').textContent = url
          ? url
          : 'Nenhuma imagem definida — o site usa a imagem original.';
        box.querySelector('[data-clear]').classList.toggle('hidden', !url);
      }

      box.querySelector('[data-pick]').addEventListener('click', function () {
        input.click();
      });
      input.addEventListener('change', function () {
        var file = input.files[0];
        if (!file) return;
        var anterior = valueOf(block);
        // Mostra a prévia local antes de o upload terminar.
        var preview = box.querySelector('img');
        if (preview) preview.src = URL.createObjectURL(file);
        setStatus('Enviando imagem…', '#6B7280');
        uploadImage(file)
          .then(function (res) {
            setValue(block, res.url);
            mostrarImagem(res.url);
            setStatus('Imagem enviada. Clique em Salvar para aplicar.', '#059669');
          })
          .catch(function (err) {
            // Falhou: a imagem que já estava lá continua valendo.
            mostrarImagem(anterior);
            setStatus('Erro: ' + (err.message || 'não foi possível enviar.'), '#DC2626');
          })
          .finally(function () {
            input.value = '';
          });
      });

      var lib = box.querySelector('[data-library]');
      if (lib)
        lib.addEventListener('click', function () {
          pickFromLibrary().then(function (url) {
            if (!url) return;
            setValue(block, url);
            mostrarImagem(url);
            setStatus('Imagem escolhida. Clique em Salvar para aplicar.', '#059669');
          });
        });

      var clear = box.querySelector('[data-clear]');
      if (clear)
        clear.addEventListener('click', function () {
          setValue(block, '');
          mostrarImagem('');
          setStatus('Imagem removida. Clique em Salvar para aplicar.', '#6B7280');
        });
    });
  }

  function pickFromLibrary() {
    return new Promise(function (resolve) {
      var itens = state.media.length
        ? state.media
            .map(function (m) {
              return (
                '<button class="border border-gray-200 rounded-lg p-2 hover:border-cyan-500 transition" data-url="' +
                esc(m.url) +
                '">' +
                '<img src="' + esc(m.url) + '" class="w-full h-24 object-contain" alt="">' +
                '<span class="block text-[10px] text-gray-400 truncate mt-1">' + esc(m.label || m.path) + '</span>' +
                '</button>'
              );
            })
            .join('')
        : '<p class="col-span-full text-sm text-gray-400 py-10 text-center">Nenhuma imagem enviada ainda. Use “Alterar imagem” para enviar a primeira.</p>';
      var m = modal(
        '<div class="p-6">' +
          '<div class="flex justify-between items-center mb-4">' +
          '<h3 class="font-serif text-xl">Biblioteca de imagens</h3>' +
          '<button class="btn btn-ghost" data-close>Fechar</button></div>' +
          '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' +
          itens +
          '</div></div>',
        { width: 'max-w-3xl' }
      );
      m.querySelectorAll('[data-url]').forEach(function (b) {
        b.addEventListener('click', function () {
          m.close();
          resolve(b.getAttribute('data-url'));
        });
      });
      m.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-close')) resolve(null);
      });
    });
  }

  // ============================================================ campo texto
  function fieldHtml(block) {
    var value = valueOf(block);
    var head =
      '<label class="block text-[13px] font-semibold mb-1">' +
      esc(block.label) +
      '</label>' +
      (block.help ? '<p class="text-[11px] text-gray-400 mb-2">' + esc(block.help) + '</p>' : '');

    var control;
    if (block.type === 'image') {
      control = imageField(block);
    } else if (block.type === 'textarea') {
      control = '<textarea class="field-input" rows="3" data-block="' + block.id + '">' + esc(value) + '</textarea>';
    } else if (block.type === 'color') {
      var cor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
      control =
        '<div class="flex items-center gap-3" data-color-field="' + block.id + '">' +
        '<input type="color" value="' + esc(cor) + '" class="w-14 h-10 rounded border border-gray-200 cursor-pointer p-1 bg-white">' +
        '<input type="text" class="field-input w-36 font-mono" value="' + esc(value) + '" placeholder="#000000" data-hex>' +
        '<button type="button" class="btn btn-ghost" data-reset-color="' + esc(block.value || '') + '">Cor original</button>' +
        '</div>';
    } else if (block.type === 'richtext') {
      control =
        '<div class="border border-gray-200 rounded-lg overflow-hidden">' +
        '<div class="flex gap-1 bg-gray-50 border-b border-gray-200 px-2 py-1">' +
        '<button type="button" class="px-2 py-1 text-xs font-bold hover:bg-gray-200 rounded" data-rt="bold" title="Negrito">N</button>' +
        '<button type="button" class="px-2 py-1 text-xs italic hover:bg-gray-200 rounded" data-rt="italic" title="Itálico">I</button>' +
        '<button type="button" class="px-2 py-1 text-xs hover:bg-gray-200 rounded" data-rt="insertUnorderedList" title="Lista">• Lista</button>' +
        '<button type="button" class="px-2 py-1 text-xs hover:bg-gray-200 rounded" data-rt="createLink" title="Link">🔗 Link</button>' +
        '<button type="button" class="px-2 py-1 text-xs hover:bg-gray-200 rounded" data-rt="removeFormat" title="Limpar formatação">Limpar</button>' +
        '</div>' +
        '<div class="rt-editor p-3 text-sm" contenteditable="true" data-rich="' +
        block.id +
        '">' +
        value +
        '</div></div>';
    } else {
      control =
        '<input type="' +
        (block.type === 'url' ? 'text' : 'text') +
        '" class="field-input" value="' +
        esc(value) +
        '" data-block="' +
        block.id +
        '">';
    }
    return '<div class="mb-5">' + head + control + '</div>';
  }

  function wireFields(root) {
    root.querySelectorAll('[data-block]').forEach(function (input) {
      var block = state.blocks.find(function (b) {
        return b.id === input.getAttribute('data-block');
      });
      if (!block) return;
      input.addEventListener('input', function () {
        setValue(block, input.value);
      });
    });

    root.querySelectorAll('[data-color-field]').forEach(function (box) {
      var block = state.blocks.find(function (b) {
        return b.id === box.getAttribute('data-color-field');
      });
      if (!block) return;
      var seletor = box.querySelector('input[type=color]');
      var hex = box.querySelector('[data-hex]');
      var original = box.querySelector('[data-reset-color]');

      function aplica(valor, vindoDoTexto) {
        setValue(block, valor);
        if (!vindoDoTexto) hex.value = valor;
        if (/^#[0-9a-fA-F]{6}$/.test(valor)) seletor.value = valor;
      }
      seletor.addEventListener('input', function () {
        aplica(seletor.value, false);
      });
      hex.addEventListener('input', function () {
        aplica(hex.value.trim(), true);
      });
      original.addEventListener('click', function () {
        aplica(original.getAttribute('data-reset-color'), false);
        hex.value = original.getAttribute('data-reset-color');
      });
    });

    root.querySelectorAll('[data-rich]').forEach(function (editor) {
      var block = state.blocks.find(function (b) {
        return b.id === editor.getAttribute('data-rich');
      });
      if (!block) return;
      editor.addEventListener('input', function () {
        setValue(block, sanitize(editor.innerHTML));
      });
      var bar = editor.parentElement.querySelector('[data-rt]').parentElement;
      bar.querySelectorAll('[data-rt]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cmd = btn.getAttribute('data-rt');
          editor.focus();
          if (cmd === 'createLink') {
            var url = prompt('Endereço do link (https://…)');
            if (!url) return;
            document.execCommand('createLink', false, url);
          } else {
            document.execCommand(cmd, false, null);
          }
          setValue(block, sanitize(editor.innerHTML));
        });
      });
    });

    wireImageFields(root);
  }

  // ================================================================== views
  function sectionsOf(slug) {
    var groups = [];
    blocksOf(slug).forEach(function (b) {
      var g = groups.find(function (x) {
        return x.section === b.section;
      });
      if (!g) groups.push((g = { section: b.section, label: b.section_label || b.section, fields: [] }));
      g.fields.push(b);
    });
    return groups;
  }

  function viewDashboard() {
    var imagens = state.blocks.filter(function (b) {
      return b.type === 'image';
    }).length;
    var nome = (state.user.email || '').split('@')[0];

    function card(titulo, valor, descricao, acao) {
      return (
        '<div class="card p-5">' +
        '<p class="text-[11px] uppercase tracking-widest text-gray-400 mb-2">' + titulo + '</p>' +
        '<p class="font-serif text-3xl mb-1">' + valor + '</p>' +
        '<p class="text-xs text-gray-400">' + descricao + '</p>' +
        (acao || '') +
        '</div>'
      );
    }

    return (
      '<div class="mb-8">' +
      '<h1 class="font-serif text-3xl md:text-4xl mb-1">Olá, ' + esc(nome) + '.</h1>' +
      '<p class="text-gray-500 text-sm">Aqui você edita tudo o que aparece no site Imports de Luxo.</p>' +
      '</div>' +
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">' +
      card('Páginas', String(PAGES.length), 'páginas editáveis') +
      card('Textos e campos', String(state.blocks.length), 'itens de conteúdo') +
      card('Produtos', String(state.products.length), 'no catálogo') +
      card('Imagens', String(imagens + state.media.length), 'campos de imagem e enviadas') +
      '</div>' +
      '<div class="grid md:grid-cols-3 gap-4 mb-8">' +
      PAGES.slice(0, 3)
        .map(function (p) {
          return (
            '<button class="card p-5 text-left hover:border-cyan-400 transition" data-go="page:' + p.slug + '">' +
            '<p class="font-serif text-xl mb-1">' + esc(p.name) + '</p>' +
            '<p class="text-xs text-gray-400">Editar textos e imagens →</p></button>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="card p-6">' +
      '<h2 class="font-serif text-xl mb-3">Como funciona</h2>' +
      '<ol class="text-sm text-gray-600 space-y-2 list-decimal pl-5">' +
      '<li>Escolha a página no menu da esquerda e altere os textos ou as imagens.</li>' +
      '<li>Clique em <strong>Salvar</strong>. Suas alterações ficam guardadas, mas ainda não aparecem para os clientes.</li>' +
      '<li>Clique em <strong>Pré-visualizar</strong> para ver como ficou, no computador e no celular.</li>' +
      '<li>Quando estiver satisfeito, clique em <strong>Publicar no site</strong>. Pronto — o site já está atualizado.</li>' +
      '</ol>' +
      '<p class="text-xs text-gray-400 mt-4">Última publicação: ' + when(state.publishedAt) + '</p>' +
      '</div>'
    );
  }

  function viewPage(slug) {
    var page = PAGES.find(function (p) {
      return p.slug === slug;
    });
    var groups = sectionsOf(slug);
    var produtos = page.category
      ? state.products.filter(function (p) {
          return p.category === page.category;
        }).length
      : 0;

    return (
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-6">' +
      '<div><h1 class="font-serif text-3xl mb-1">' + esc(page.name) + '</h1>' +
      '<p class="text-gray-500 text-sm">' + esc(page.file) + '</p></div>' +
      '<button class="btn btn-ghost" data-preview="' + esc(page.file) + '">Pré-visualizar</button>' +
      '</div>' +
      (page.category
        ? '<div class="card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">' +
          '<p class="text-sm text-gray-600">Esta página mostra <strong>' + produtos + ' produtos</strong> da categoria ' +
          esc(CATEGORY_LABEL[page.category]) + '.</p>' +
          '<button class="btn btn-ghost" data-go="produtos:' + page.category + '">Editar produtos</button></div>'
        : '') +
      (slug === 'index'
        ? '<div class="card p-4 mb-6 text-sm text-gray-600">As quatro peças de cada vitrine da página inicial saem do catálogo — ' +
          'marque um produto como <strong>destaque</strong> em Produtos para ele aparecer aqui.</div>'
        : '') +
      groups
        .map(function (g) {
          return (
            '<section class="card p-6 mb-5">' +
            '<h2 class="font-serif text-xl mb-5 pb-3 border-b border-gray-100">' + esc(g.label) + '</h2>' +
            g.fields.map(fieldHtml).join('') +
            '</section>'
          );
        })
        .join('')
    );
  }

  function viewSettings() {
    var groups = sectionsOf('_global');
    return (
      '<div class="mb-6"><h1 class="font-serif text-3xl mb-1">Configurações do site</h1>' +
      '<p class="text-gray-500 text-sm">Informações que aparecem em todas as páginas.</p></div>' +
      groups
        .map(function (g) {
          return (
            '<section class="card p-6 mb-5">' +
            '<h2 class="font-serif text-xl mb-5 pb-3 border-b border-gray-100">' + esc(g.label) + '</h2>' +
            g.fields.map(fieldHtml).join('') +
            '</section>'
          );
        })
        .join('')
    );
  }

  function viewSeo() {
    var seoBlocks = state.blocks.filter(function (b) {
      return b.section === 'seo';
    });
    var porPagina = {};
    seoBlocks.forEach(function (b) {
      (porPagina[b.page_slug] = porPagina[b.page_slug] || []).push(b);
    });
    return (
      '<div class="mb-6"><h1 class="font-serif text-3xl mb-1">SEO</h1>' +
      '<p class="text-gray-500 text-sm">O que o Google e as redes sociais mostram sobre cada página.</p></div>' +
      Object.keys(porPagina)
        .map(function (slug) {
          var page = PAGES.find(function (p) {
            return p.slug === slug;
          });
          return (
            '<section class="card p-6 mb-5">' +
            '<h2 class="font-serif text-xl mb-5 pb-3 border-b border-gray-100">' +
            esc(page ? page.name : slug) +
            '</h2>' +
            porPagina[slug].map(fieldHtml).join('') +
            '</section>'
          );
        })
        .join('')
    );
  }

  // Produtos de uma categoria, na ordem em que aparecem no site.
  function categoriaOrdenada(categoria) {
    return state.products
      .filter(function (p) {
        return p.category === categoria;
      })
      .sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0) || (a.name || '').localeCompare(b.name || '');
      });
  }

  // Troca um produto de lugar com o vizinho da mesma categoria.
  function moverProduto(id, direcao) {
    var produto = state.products.find(function (p) {
      return p.id === id;
    });
    if (!produto) return;

    var lista = categoriaOrdenada(produto.category);
    var i = lista.findIndex(function (p) {
      return p.id === id;
    });
    var j = i + direcao;
    if (j < 0 || j >= lista.length) return;

    lista.splice(j, 0, lista.splice(i, 1)[0]);

    // Renumera a categoria inteira e grava só o que mudou.
    var alterados = [];
    lista.forEach(function (p, pos) {
      var novo = pos * 10;
      if (p.sort !== novo) {
        p.sort = novo;
        alterados.push(p);
      }
    });
    if (!alterados.length) return;

    renderMain(); // move na tela na hora, sem esperar o banco

    Promise.all(
      alterados.map(function (p) {
        return sb.from('products').update({ sort: p.sort, updated_at: new Date().toISOString() }).eq('id', p.id);
      })
    ).then(function (res) {
      var erro = res.find(function (r) {
        return r.error;
      });
      if (erro) {
        toast('Não foi possível salvar a nova ordem: ' + erro.error.message, 'erro');
        loadAll().then(renderMain);
        return;
      }
      marcarPendente();
    });
  }

  function viewProducts() {
    var buscando = !!state.productSearch;
    var lista = state.products
      .filter(function (p) {
        var okCat = state.productFilter === 'todas' || p.category === state.productFilter;
        var okBusca =
          !state.productSearch || (p.name || '').toLowerCase().indexOf(state.productSearch.toLowerCase()) > -1;
        return okCat && okBusca;
      })
      .sort(function (a, b) {
        return (
          (a.category || '').localeCompare(b.category || '') ||
          (a.sort || 0) - (b.sort || 0) ||
          (a.name || '').localeCompare(b.name || '')
        );
      });

    // Para saber quem é o primeiro e o último de cada categoria.
    var posicoes = {};
    Object.keys(CATEGORY_LABEL).forEach(function (c) {
      var ordenada = categoriaOrdenada(c);
      ordenada.forEach(function (p, i) {
        posicoes[p.id] = { indice: i, total: ordenada.length };
      });
    });

    var filtros = ['todas']
      .concat(Object.keys(CATEGORY_LABEL))
      .map(function (c) {
        var ativo = state.productFilter === c;
        return (
          '<button class="btn ' + (ativo ? 'btn-accent' : 'btn-ghost') + '" data-filter="' + c + '">' +
          (c === 'todas' ? 'Todas' : esc(CATEGORY_LABEL[c])) +
          '</button>'
        );
      })
      .join('');

    var cards = lista.length
      ? lista
          .map(function (p) {
            var pos = posicoes[p.id] || { indice: 0, total: 1 };
            var primeiro = pos.indice === 0;
            var ultimo = pos.indice === pos.total - 1;
            var motivo = buscando ? 'Limpe a busca para reordenar' : 'Mudar de posição';

            function seta(direcao, simbolo, desativado) {
              return (
                '<button class="btn btn-ghost px-2 py-1 leading-none"' +
                (desativado ? ' disabled' : '') +
                ' title="' + esc(motivo) + '"' +
                ' aria-label="' + (direcao < 0 ? 'Subir' : 'Descer') + ' ' + esc(p.name) + '"' +
                ' data-move="' + esc(p.id) + '" data-dir="' + direcao + '">' +
                simbolo +
                '</button>'
              );
            }

            return (
              '<div class="card p-4 flex gap-3 md:gap-4 items-center">' +
              '<img src="' + esc(p.image) + '" class="w-16 h-16 object-contain shrink-0 bg-gray-50 rounded" alt="" loading="lazy">' +
              '<div class="flex-1 min-w-0">' +
              '<p class="font-serif text-base truncate">' + esc(p.name) + '</p>' +
              '<p class="text-sm font-semibold">' + money(p.price) + '</p>' +
              '<p class="text-[11px] text-gray-400">' +
              esc(CATEGORY_LABEL[p.category] || p.category) +
              ' · ' + (pos.indice + 1) + 'º' +
              (p.featured ? ' · <span class="text-cyan-600 font-bold">destaque na home</span>' : '') +
              (p.gallery && p.gallery.length > 1 ? ' · ' + p.gallery.length + ' fotos' : '') +
              '</p></div>' +
              '<div class="flex gap-1 shrink-0">' +
              seta(-1, '▲', buscando || primeiro) +
              seta(1, '▼', buscando || ultimo) +
              '</div>' +
              '<button class="btn btn-ghost shrink-0" data-edit-product="' + esc(p.id) + '">Editar</button>' +
              '</div>'
            );
          })
          .join('')
      : '<p class="text-sm text-gray-400 py-12 text-center">Nenhum produto encontrado.</p>';

    var arquivoPrevia =
      state.productFilter !== 'todas' ? state.productFilter + '.html' : 'index.html';

    return (
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-6">' +
      '<div><h1 class="font-serif text-3xl mb-1">Produtos</h1>' +
      '<p class="text-gray-500 text-sm">' + state.products.length + ' peças no catálogo. ' +
      'Use as setas ▲▼ para mudar a ordem em que aparecem no site.</p></div>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button class="btn btn-ghost" data-preview="' + esc(arquivoPrevia) + '">Pré-visualizar</button>' +
      '<button class="btn btn-accent" data-new-product>+ Novo produto</button></div></div>' +
      '<div class="flex flex-wrap gap-2 mb-4">' + filtros + '</div>' +
      '<input class="field-input mb-5" placeholder="Buscar pelo nome…" value="' + esc(state.productSearch) + '" data-product-search>' +
      '<div class="grid gap-3" id="product-list">' + cards + '</div>'
    );
  }

  function viewMedia() {
    var itens = state.media.length
      ? state.media
          .map(function (m) {
            return (
              '<div class="card p-3">' +
              '<img src="' + esc(m.url) + '" class="w-full h-32 object-contain mb-2" alt="" loading="lazy">' +
              '<p class="text-[11px] text-gray-500 truncate mb-2">' + esc(m.label || m.path) + '</p>' +
              '<div class="flex gap-2">' +
              '<button class="btn btn-ghost flex-1" data-copy="' + esc(m.url) + '">Copiar link</button>' +
              '<button class="btn btn-danger" data-del-media="' + esc(m.id) + '">Excluir</button>' +
              '</div></div>'
            );
          })
          .join('')
      : '<p class="col-span-full text-sm text-gray-400 py-12 text-center">Nenhuma imagem enviada ainda.</p>';

    return (
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-6">' +
      '<div><h1 class="font-serif text-3xl mb-1">Imagens</h1>' +
      '<p class="text-gray-500 text-sm">Fotos enviadas por você, guardadas no Supabase.</p></div>' +
      '<button class="btn btn-accent" data-upload-media>+ Enviar imagem</button>' +
      '<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" id="media-input" multiple></div>' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-4">' + itens + '</div>'
    );
  }

  function viewHelp() {
    return (
      '<div class="mb-6"><h1 class="font-serif text-3xl mb-1">Ajuda</h1>' +
      '<p class="text-gray-500 text-sm">O essencial para usar o painel sem medo.</p></div>' +
      '<div class="card p-6 space-y-5 text-sm text-gray-700">' +
      '<div><h3 class="font-serif text-lg mb-1">Salvar x Publicar</h3>' +
      '<p><strong>Salvar</strong> guarda a alteração só para você. <strong>Publicar no site</strong> é o que faz os ' +
      'clientes verem. Sempre que houver algo salvo e não publicado, aparece um aviso amarelo no topo.</p></div>' +
      '<div><h3 class="font-serif text-lg mb-1">Trocar uma imagem</h3>' +
      '<p>Clique em “Alterar imagem”, escolha a foto no seu computador ou celular e espere a mensagem de envio ' +
      'concluído. Se der erro, a imagem antiga continua no lugar — nada se perde. Formatos aceitos: JPG, PNG e WebP, ' +
      'até 5 MB.</p></div>' +
      '<div><h3 class="font-serif text-lg mb-1">Produtos da página inicial</h3>' +
      '<p>A home mostra 4 peças de cada categoria. Para trocar, abra <strong>Produtos</strong>, edite a peça e ' +
      'marque ou desmarque “Aparecer na página inicial”. A ordem segue o campo “Posição no destaque”.</p></div>' +
      '<div><h3 class="font-serif text-lg mb-1">Se algo der errado</h3>' +
      '<p>O site nunca fica no ar sem conteúdo: se o banco estiver indisponível, ele continua mostrando a última ' +
      'versão que o visitante recebeu. Nenhuma edição sua apaga o site.</p></div>' +
      '</div>'
    );
  }

  // ====================================================== editor de produto
  function productModal(product) {
    var novo = !product;
    var p = product || {
      id: '',
      category: 'bolsas',
      name: '',
      cart_name: '',
      alt: '',
      price: 0,
      image: '',
      gallery: [],
      featured: false,
      featured_sort: null,
      sort: 500,
      active: true,
    };
    var galeria = (p.gallery || []).slice();

    function galleryHtml() {
      return galeria
        .map(function (src, i) {
          return (
            '<div class="relative group border border-gray-200 rounded-lg overflow-hidden">' +
            '<img src="' + esc(src) + '" class="w-full h-20 object-contain bg-gray-50" alt="">' +
            '<button class="absolute top-1 right-1 bg-white/90 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded" data-rm-gal="' + i + '">✕</button>' +
            '</div>'
          );
        })
        .join('');
    }

    var m = modal(
      '<div class="p-6">' +
        '<h3 class="font-serif text-2xl mb-5">' + (novo ? 'Novo produto' : 'Editar produto') + '</h3>' +
        '<div class="grid md:grid-cols-2 gap-4">' +
        '<div><label class="block text-[13px] font-semibold mb-1">Nome exibido</label>' +
        '<input class="field-input" data-f="name" value="' + esc(p.name) + '"></div>' +
        '<div><label class="block text-[13px] font-semibold mb-1">Preço (R$)</label>' +
        '<input class="field-input" data-f="price" type="number" step="0.01" min="0" value="' + Number(p.price) + '"></div>' +
        '<div><label class="block text-[13px] font-semibold mb-1">Categoria</label>' +
        '<select class="field-input" data-f="category">' +
        Object.keys(CATEGORY_LABEL)
          .map(function (c) {
            return '<option value="' + c + '"' + (p.category === c ? ' selected' : '') + '>' + esc(CATEGORY_LABEL[c]) + '</option>';
          })
          .join('') +
        '</select></div>' +
        '<div><label class="block text-[13px] font-semibold mb-1">Posição na categoria</label>' +
        '<input class="field-input" data-f="sort" type="number" value="' + Number(p.sort || 0) + '"></div>' +
        '<div class="md:col-span-2"><label class="block text-[13px] font-semibold mb-1">Descrição no WhatsApp</label>' +
        '<input class="field-input" data-f="cart_name" value="' + esc(p.cart_name || '') + '" placeholder="Ex.: Bolsa Chanel Small 25 - branca e dourada"></div>' +
        '<div class="md:col-span-2"><label class="block text-[13px] font-semibold mb-1">Texto alternativo da foto (acessibilidade)</label>' +
        '<input class="field-input" data-f="alt" value="' + esc(p.alt || '') + '"></div>' +
        '</div>' +
        '<div class="mt-5"><label class="block text-[13px] font-semibold mb-2">Foto principal</label>' +
        '<div class="flex gap-4 items-start">' +
        '<div class="w-24 h-24 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">' +
        '<img data-main-preview src="' + esc(p.image) + '" class="w-full h-full object-contain" alt=""></div>' +
        '<div><button class="btn btn-ghost" data-pick-main>Alterar foto</button>' +
        '<p class="text-[11px] mt-2" data-main-status></p></div></div></div>' +
        '<div class="mt-5"><label class="block text-[13px] font-semibold mb-2">Galeria de fotos</label>' +
        '<div class="grid grid-cols-4 gap-2 mb-2" data-gallery>' + galleryHtml() + '</div>' +
        '<button class="btn btn-ghost" data-add-gal>+ Adicionar foto</button>' +
        '<p class="text-[11px] mt-2" data-gal-status></p></div>' +
        '<div class="mt-5 flex flex-wrap gap-6">' +
        '<label class="flex items-center gap-2 text-sm"><input type="checkbox" data-f="featured"' + (p.featured ? ' checked' : '') + '> Aparecer na página inicial</label>' +
        '<label class="flex items-center gap-2 text-sm">Posição no destaque <input class="field-input w-20" data-f="featured_sort" type="number" value="' + (p.featured_sort == null ? '' : p.featured_sort) + '"></label>' +
        '<label class="flex items-center gap-2 text-sm"><input type="checkbox" data-f="active"' + (p.active ? ' checked' : '') + '> Visível no site</label>' +
        '</div>' +
        '<div class="flex flex-wrap justify-between gap-2 mt-7 pt-5 border-t border-gray-100">' +
        (novo ? '<span></span>' : '<button class="btn btn-danger" data-delete>Excluir produto</button>') +
        '<div class="flex gap-2"><button class="btn btn-ghost" data-close>Cancelar</button>' +
        '<button class="btn btn-primary" data-save>Salvar produto</button></div></div>' +
        '<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-file-main>' +
        '<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-file-gal multiple>' +
        '</div>',
      { width: 'max-w-3xl' }
    );

    var imagemAtual = p.image;
    var fileMain = m.querySelector('[data-file-main]');
    var fileGal = m.querySelector('[data-file-gal]');

    m.querySelector('[data-pick-main]').addEventListener('click', function () {
      fileMain.click();
    });
    fileMain.addEventListener('change', function () {
      var f = fileMain.files[0];
      if (!f) return;
      var status = m.querySelector('[data-main-status]');
      status.style.color = '#6B7280';
      status.textContent = 'Enviando…';
      uploadImage(f)
        .then(function (r) {
          imagemAtual = r.url;
          m.querySelector('[data-main-preview]').src = r.url;
          status.style.color = '#059669';
          status.textContent = 'Foto enviada.';
        })
        .catch(function (err) {
          status.style.color = '#DC2626';
          status.textContent = 'Erro: ' + err.message;
        })
        .finally(function () {
          fileMain.value = '';
        });
    });

    function redrawGallery() {
      m.querySelector('[data-gallery]').innerHTML = galleryHtml();
      m.querySelectorAll('[data-rm-gal]').forEach(function (b) {
        b.addEventListener('click', function () {
          galeria.splice(Number(b.getAttribute('data-rm-gal')), 1);
          redrawGallery();
        });
      });
    }
    redrawGallery();

    m.querySelector('[data-add-gal]').addEventListener('click', function () {
      fileGal.click();
    });
    fileGal.addEventListener('change', function () {
      var arquivos = Array.prototype.slice.call(fileGal.files);
      if (!arquivos.length) return;
      var status = m.querySelector('[data-gal-status]');
      status.style.color = '#6B7280';
      status.textContent = 'Enviando ' + arquivos.length + ' foto(s)…';
      Promise.all(
        arquivos.map(function (f) {
          return uploadImage(f).then(
            function (r) {
              galeria.push(r.url);
              return true;
            },
            function () {
              return false;
            }
          );
        })
      ).then(function (results) {
        var falhas = results.filter(function (ok) {
          return !ok;
        }).length;
        redrawGallery();
        status.style.color = falhas ? '#DC2626' : '#059669';
        status.textContent = falhas ? falhas + ' foto(s) não puderam ser enviadas.' : 'Fotos enviadas.';
        fileGal.value = '';
      });
    });

    m.querySelector('[data-save]').addEventListener('click', function () {
      var get = function (name) {
        return m.querySelector('[data-f="' + name + '"]');
      };
      var nome = get('name').value.trim();
      if (!nome) return toast('Dê um nome ao produto.', 'erro');
      if (!imagemAtual) return toast('Escolha a foto principal.', 'erro');

      var dados = {
        category: get('category').value,
        name: nome,
        cart_name: get('cart_name').value.trim() || nome,
        alt: get('alt').value.trim() || nome,
        price: Number(get('price').value || 0),
        image: imagemAtual,
        gallery: galeria.length ? galeria : [imagemAtual],
        featured: get('featured').checked,
        featured_sort: get('featured_sort').value === '' ? null : Number(get('featured_sort').value),
        sort: Number(get('sort').value || 0),
        active: get('active').checked,
        updated_at: new Date().toISOString(),
      };

      var acao;
      if (novo) {
        dados.id =
          dados.category +
          '-' +
          nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) +
          '-' +
          Date.now().toString(36).slice(-4);
        acao = sb.from('products').insert(dados).select().single();
      } else {
        acao = sb.from('products').update(dados).eq('id', p.id).select().single();
      }

      acao.then(function (r) {
        if (r.error) return toast('Erro ao salvar: ' + r.error.message, 'erro');
        if (novo) state.products.push(r.data);
        else {
          var i = state.products.findIndex(function (x) {
            return x.id === p.id;
          });
          if (i > -1) state.products[i] = r.data;
        }
        marcarPendente();
        m.close();
        toast('Produto salvo. Publique para aparecer no site.', 'ok');
        renderMain();
        renderTopBar();
      });
    });

    var del = m.querySelector('[data-delete]');
    if (del)
      del.addEventListener('click', function () {
        confirmar('Excluir produto', 'O produto "' + p.name + '" será removido do catálogo.', 'Excluir').then(function (ok) {
          if (!ok) return;
          sb.from('products')
            .delete()
            .eq('id', p.id)
            .then(function (r) {
              if (r.error) return toast('Erro ao excluir: ' + r.error.message, 'erro');
              state.products = state.products.filter(function (x) {
                return x.id !== p.id;
              });
              marcarPendente();
              m.close();
              toast('Produto excluído.', 'ok');
              renderMain();
              renderTopBar();
            });
        });
      });
  }

  // ============================================================ layout/shell
  function navHtml() {
    function item(id, rotulo, icone) {
      var ativo = state.view === id;
      return '<div class="nav-item' + (ativo ? ' active' : '') + '" data-go="' + id + '">' +
        '<span class="w-5 text-center">' + icone + '</span>' + rotulo + '</div>';
    }
    return (
      item('dashboard', 'Início', '⌂') +
      '<p class="text-[10px] uppercase tracking-widest text-gray-600 px-4 mt-6 mb-2">Conteúdo do site</p>' +
      PAGES.map(function (p) {
        var ativo = state.view === 'page' && state.pageSlug === p.slug;
        return (
          '<div class="nav-item' + (ativo ? ' active' : '') + '" data-go="page:' + p.slug + '">' +
          '<span class="w-5 text-center">▸</span>' + esc(p.name) + '</div>'
        );
      }).join('') +
      '<p class="text-[10px] uppercase tracking-widest text-gray-600 px-4 mt-6 mb-2">Catálogo</p>' +
      item('produtos', 'Produtos', '◇') +
      item('imagens', 'Imagens', '▢') +
      '<p class="text-[10px] uppercase tracking-widest text-gray-600 px-4 mt-6 mb-2">Configurações</p>' +
      item('config', 'Configurações do site', '⚙') +
      item('seo', 'SEO', '◎') +
      item('ajuda', 'Ajuda', '?')
    );
  }

  function renderShell() {
    app().innerHTML =
      '<div class="flex min-h-screen">' +
      // sidebar desktop
      '<aside class="hidden lg:flex flex-col w-64 shrink-0 bg-[#1A1A1A] text-white p-4 fixed inset-y-0">' +
      '<div class="px-2 py-4 mb-2">' +
      '<p class="font-serif text-xl font-bold">IMPORTS <span class="italic font-light">de Luxo</span></p>' +
      '<p class="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Painel de conteúdo</p></div>' +
      '<nav class="flex-1 overflow-y-auto" id="nav-desktop">' + navHtml() + '</nav>' +
      '<div class="pt-4 border-t border-white/10 mt-4">' +
      '<p class="text-[11px] text-gray-500 px-4 mb-2 truncate">' + esc(state.user.email) + '</p>' +
      '<div class="nav-item" data-logout><span class="w-5 text-center">⏻</span>Sair</div></div>' +
      '</aside>' +
      // conteúdo
      '<div class="flex-1 lg:ml-64 min-w-0">' +
      '<div id="topbar"></div>' +
      '<main class="p-4 md:p-8 max-w-5xl pb-32" id="main"></main>' +
      '</div>' +
      // menu mobile
      '<div id="drawer" class="lg:hidden fixed inset-0 z-[60] hidden">' +
      '<div class="absolute inset-0 bg-black/50" data-drawer-close></div>' +
      '<div class="absolute inset-y-0 left-0 w-72 bg-[#1A1A1A] text-white p-4 overflow-y-auto">' +
      '<p class="font-serif text-xl font-bold px-2 py-4">IMPORTS <span class="italic font-light">de Luxo</span></p>' +
      '<nav id="nav-mobile">' + navHtml() + '</nav>' +
      '<div class="nav-item mt-6 border-t border-white/10 pt-4" data-logout><span class="w-5 text-center">⏻</span>Sair</div>' +
      '</div></div>' +
      // barra de salvar
      '<div id="savebar" class="fixed bottom-0 inset-x-0 lg:left-64 z-50 hidden"></div>' +
      '</div>';

    app().addEventListener('click', onShellClick);
    renderTopBar();
    renderMain();
  }

  function renderTopBar() {
    var bar = document.getElementById('topbar');
    if (!bar) return;
    var pendente = hasUnpublished();
    bar.innerHTML =
      '<header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-4 md:px-8 py-3 flex flex-wrap items-center gap-2">' +
      '<button class="lg:hidden btn btn-ghost" data-drawer-open>☰</button>' +
      '<div class="flex-1"></div>' +
      '<button class="btn btn-ghost" data-open-site>Ver site</button>' +
      '<button class="btn btn-ghost" data-preview-current>Pré-visualizar</button>' +
      '<button class="btn btn-danger" data-discard-draft' +
      (pendente ? '' : ' disabled title="Não há alterações pendentes para descartar"') +
      '>Descartar alterações</button>' +
      '<button class="btn btn-primary" data-publish' + (state.publishing ? ' disabled' : '') + '>' +
      (state.publishing ? 'Publicando…' : 'Publicar no site') +
      '</button>' +
      '</header>' +
      (pendente
        ? '<div class="bg-amber-50 border-b border-amber-200 text-amber-900 text-[13px] px-4 md:px-8 py-2 flex flex-wrap items-center gap-2">' +
          '<span>Você tem alterações salvas que ainda <strong>não estão no site</strong>.</span>' +
          '<button class="underline font-semibold" data-preview-current>Ver como ficou</button>' +
          '<span class="text-amber-400">·</span>' +
          '<button class="underline font-semibold" data-publish>Publicar agora</button></div>'
        : '');
  }

  function refreshSaveBar() {
    var bar = document.getElementById('savebar');
    if (!bar) return;
    if (!state.dirty.size) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }
    bar.classList.remove('hidden');
    bar.innerHTML =
      '<div class="bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,.06)] px-4 md:px-8 py-3 flex flex-wrap items-center gap-3">' +
      '<span class="text-sm text-gray-600 flex-1">' +
      state.dirty.size +
      ' alteração(ões) não salva(s).</span>' +
      '<button class="btn btn-ghost" data-discard>Descartar</button>' +
      '<button class="btn btn-ghost" data-preview-current>Salvar e pré-visualizar</button>' +
      '<button class="btn btn-accent" data-save-blocks' +
      (state.saving ? ' disabled' : '') +
      '>' +
      (state.saving ? 'Salvando…' : 'Salvar') +
      '</button></div>';
  }

  // Qual página do site faz sentido pré-visualizar de onde o usuário está.
  function currentFile() {
    if (state.view === 'page') {
      var p = PAGES.find(function (x) {
        return x.slug === state.pageSlug;
      });
      return p ? p.file : 'index.html';
    }
    if (state.view === 'produtos' && state.productFilter !== 'todas') return state.productFilter + '.html';
    return 'index.html';
  }

  // Joga fora tudo o que foi salvo mas ainda não publicado.
  function descartarRascunho() {
    confirmar(
      'Descartar alterações',
      'Tudo o que você salvou e ainda não publicou será perdido, e o painel volta a ficar igual ao site que está no ar. ' +
        'Produtos criados depois da última publicação não são apagados — apenas ficam ocultos.',
      'Descartar tudo'
    ).then(function (ok) {
      if (!ok) return;
      toast('Voltando ao conteúdo publicado…', 'info');
      sb.rpc('restore_from_published')
        .then(function (r) {
          if (r.error) throw r.error;
          state.dirty.clear();
          return loadAll().then(function () {
            state.pendingChanges = false;
          });
        })
        .then(function () {
          renderTopBar();
          renderMain();
          toast('Alterações descartadas. O painel está igual ao site.', 'ok');
        })
        .catch(function (err) {
          toast('Não foi possível descartar: ' + (err.message || 'erro'), 'erro');
        });
    });
  }

  function openPreview(file) {
    saveDirty().then(function (ok) {
      if (!ok) return;
      var url = '../' + file + '?preview=1&t=' + Date.now();
      var m = modal(
        '<div class="p-4">' +
          '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
          '<h3 class="font-serif text-xl">Pré-visualização — ' + esc(file) + '</h3>' +
          '<div class="flex gap-2">' +
          '<button class="btn btn-ghost" data-size="100%">Computador</button>' +
          '<button class="btn btn-ghost" data-size="390px">Celular</button>' +
          '<button class="btn btn-ghost" data-new-tab>Abrir em nova aba</button>' +
          '<button class="btn btn-primary" data-close>Fechar</button></div></div>' +
          '<div class="bg-gray-100 rounded-lg p-3 flex justify-center">' +
          '<iframe src="' + url + '" class="bg-white border border-gray-200 rounded" style="width:100%;height:70vh" data-frame></iframe>' +
          '</div>' +
          '<p class="text-[11px] text-gray-400 mt-2">Você está vendo o rascunho. Para os clientes verem, clique em “Publicar no site”.</p>' +
          '</div>',
        { width: 'max-w-6xl' }
      );
      m.querySelectorAll('[data-size]').forEach(function (b) {
        b.addEventListener('click', function () {
          m.querySelector('[data-frame]').style.width = b.getAttribute('data-size');
        });
      });
      m.querySelector('[data-new-tab]').addEventListener('click', function () {
        window.open(url, '_blank');
      });
    });
  }

  function renderMain() {
    var main = document.getElementById('main');
    if (!main) return;
    var html;
    if (state.view === 'dashboard') html = viewDashboard();
    else if (state.view === 'page') html = viewPage(state.pageSlug);
    else if (state.view === 'produtos') html = viewProducts();
    else if (state.view === 'imagens') html = viewMedia();
    else if (state.view === 'config') html = viewSettings();
    else if (state.view === 'seo') html = viewSeo();
    else html = viewHelp();
    main.innerHTML = '<div class="fade-up">' + html + '</div>';
    wireFields(main);
    wireMain(main);
    refreshSaveBar();
    var navs = [document.getElementById('nav-desktop'), document.getElementById('nav-mobile')];
    navs.forEach(function (n) {
      if (n) n.innerHTML = navHtml();
    });
  }

  function wireMain(root) {
    var busca = root.querySelector('[data-product-search]');
    if (busca)
      busca.addEventListener('input', function () {
        state.productSearch = busca.value;
        // Redesenha só a lista, para o campo de busca não perder o foco.
        var lista = root.querySelector('#product-list');
        var tmp = document.createElement('div');
        tmp.innerHTML = viewProducts();
        lista.innerHTML = tmp.querySelector('#product-list').innerHTML;
        wireMain(lista);
      });

    root.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.productFilter = b.getAttribute('data-filter');
        renderMain();
      });
    });

    root.querySelectorAll('[data-move]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        moverProduto(b.getAttribute('data-move'), Number(b.getAttribute('data-dir')));
      });
    });

    root.querySelectorAll('[data-edit-product]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = state.products.find(function (x) {
          return x.id === b.getAttribute('data-edit-product');
        });
        if (p) productModal(p);
      });
    });

    var novo = root.querySelector('[data-new-product]');
    if (novo) novo.addEventListener('click', function () { productModal(null); });

    var upload = root.querySelector('[data-upload-media]');
    if (upload) {
      var input = root.querySelector('#media-input');
      upload.addEventListener('click', function () {
        input.click();
      });
      input.addEventListener('change', function () {
        var arquivos = Array.prototype.slice.call(input.files);
        if (!arquivos.length) return;
        toast('Enviando ' + arquivos.length + ' imagem(ns)…', 'info');
        Promise.all(
          arquivos.map(function (f) {
            return uploadImage(f).then(
              function () { return true; },
              function (e) { toast(f.name + ': ' + e.message, 'erro'); return false; }
            );
          })
        ).then(function () {
          input.value = '';
          renderMain();
          toast('Envio concluído.', 'ok');
        });
      });
    }

    root.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
          toast('Link copiado.', 'ok');
        });
      });
    });

    root.querySelectorAll('[data-del-media]').forEach(function (b) {
      b.addEventListener('click', function () {
        var asset = state.media.find(function (m) {
          return m.id === b.getAttribute('data-del-media');
        });
        if (!asset) return;
        confirmar('Excluir imagem', 'Se ela estiver em uso no site, o espaço ficará vazio.', 'Excluir').then(function (ok) {
          if (!ok) return;
          sb.storage
            .from(BUCKET)
            .remove([asset.path])
            .then(function () {
              return sb.from('media_assets').delete().eq('id', asset.id);
            })
            .then(function () {
              state.media = state.media.filter(function (m) {
                return m.id !== asset.id;
              });
              renderMain();
              toast('Imagem excluída.', 'ok');
            })
            .catch(function (e) {
              toast('Erro ao excluir: ' + e.message, 'erro');
            });
        });
      });
    });

    root.querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        openPreview(b.getAttribute('data-preview'));
      });
    });
  }

  // Endereço do painel na barra do navegador: recarregar não perde o lugar.
  function currentHash() {
    return '#/' + (state.view === 'page' ? 'page/' + state.pageSlug : state.view);
  }

  function navigate(destino) {
    var parts = destino.split(':');
    if (parts[0] === 'page') {
      state.view = 'page';
      state.pageSlug = parts[1];
    } else if (parts[0] === 'produtos') {
      state.view = 'produtos';
      state.productFilter = parts[1] || 'todas';
    } else {
      state.view = parts[0];
    }
    window.location.hash = currentHash();

    var drawer = document.getElementById('drawer');
    if (drawer) drawer.classList.add('hidden');
    window.scrollTo(0, 0);
    renderMain();
  }

  function readHash() {
    var h = (window.location.hash || '').replace(/^#\/?/, '');
    if (!h) return;
    var parts = h.split('/');
    if (parts[0] === 'page' && parts[1]) {
      state.view = 'page';
      state.pageSlug = parts[1];
    } else if (['dashboard', 'produtos', 'imagens', 'config', 'seo', 'ajuda'].indexOf(parts[0]) > -1) {
      state.view = parts[0];
      if (parts[0] === 'produtos' && parts[1]) state.productFilter = parts[1];
    }
  }

  // Só redesenha se o endereço realmente aponta para outro lugar (evita um
  // segundo desenho logo depois de clicar no menu, que descartaria o que o
  // usuário está editando).
  window.addEventListener('hashchange', function () {
    if (window.location.hash === currentHash()) return;
    readHash();
    renderMain();
  });

  function onShellClick(e) {
    var alvo = function (attr) {
      var el = e.target.closest('[' + attr + ']');
      return el ? el.getAttribute(attr) : null;
    };

    var go = alvo('data-go');
    if (go) {
      navigate(go);
      return;
    }

    if (e.target.closest('[data-drawer-open]')) document.getElementById('drawer').classList.remove('hidden');
    if (e.target.closest('[data-drawer-close]')) document.getElementById('drawer').classList.add('hidden');
    if (e.target.closest('[data-logout]')) {
      sb.auth.signOut().then(function () {
        location.reload();
      });
    }
    if (e.target.closest('[data-open-site]')) window.open('../index.html', '_blank');
    if (e.target.closest('[data-publish]')) publish();
    var descartar = e.target.closest('[data-discard-draft]');
    if (descartar && !descartar.disabled) descartarRascunho();
    if (e.target.closest('[data-save-blocks]')) saveDirty();
    if (e.target.closest('[data-preview-current]')) openPreview(currentFile());
    if (e.target.closest('[data-discard]')) {
      state.dirty.clear();
      renderMain();
      toast('Alterações descartadas.', 'info');
    }
  }

  // ================================================================== login
  function renderLogin(erro) {
    app().innerHTML =
      '<div class="min-h-screen flex items-center justify-center p-4">' +
      '<div class="card w-full max-w-sm p-8 fade-up">' +
      '<div class="text-center mb-7">' +
      '<img src="../logo_redonda (1).png" alt="Imports de Luxo" class="w-16 h-16 mx-auto mb-4 object-contain">' +
      '<p class="font-serif text-2xl font-bold">IMPORTS <span class="italic font-light">de Luxo</span></p>' +
      '<p class="text-[10px] uppercase tracking-[0.2em] text-gray-400 mt-2">Painel de conteúdo</p></div>' +
      '<form id="login-form">' +
      '<label class="block text-[13px] font-semibold mb-1">E-mail</label>' +
      '<input class="field-input mb-4" type="email" id="email" required autocomplete="username">' +
      '<label class="block text-[13px] font-semibold mb-1">Senha</label>' +
      '<input class="field-input mb-5" type="password" id="senha" required autocomplete="current-password">' +
      (erro ? '<p class="text-[13px] text-red-600 mb-4">' + esc(erro) + '</p>' : '') +
      '<button class="btn btn-accent w-full" type="submit" id="entrar">Entrar</button>' +
      '</form>' +
      '<p class="text-[11px] text-gray-400 mt-6 text-center">Acesso restrito aos administradores do site.</p>' +
      '</div></div>';

    $('#login-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = $('#entrar');
      btn.disabled = true;
      btn.textContent = 'Entrando…';
      sb.auth
        .signInWithPassword({ email: $('#email').value.trim(), password: $('#senha').value })
        .then(function (r) {
          if (r.error) {
            var msg = /invalid/i.test(r.error.message) ? 'E-mail ou senha incorretos.' : r.error.message;
            renderLogin(msg);
            return;
          }
          boot();
        })
        .catch(function (err) {
          renderLogin('Não foi possível entrar: ' + err.message);
        });
    });
  }

  function renderSemPermissao(email) {
    app().innerHTML =
      '<div class="min-h-screen flex items-center justify-center p-4"><div class="card max-w-md p-8 text-center">' +
      '<h1 class="font-serif text-2xl mb-3">Acesso não autorizado</h1>' +
      '<p class="text-sm text-gray-600 mb-6">A conta <strong>' + esc(email) + '</strong> está autenticada, mas não ' +
      'consta como administradora do site. Peça para incluí-la na tabela <code>admin_users</code>.</p>' +
      '<button class="btn btn-ghost" id="sair">Sair</button></div></div>';
    $('#sair').addEventListener('click', function () {
      sb.auth.signOut().then(function () {
        location.reload();
      });
    });
  }

  function renderErroConfig() {
    app().innerHTML =
      '<div class="min-h-screen flex items-center justify-center p-4"><div class="card max-w-lg p-8">' +
      '<h1 class="font-serif text-2xl mb-3">Falta configurar o Supabase</h1>' +
      '<p class="text-sm text-gray-600 mb-4">Abra o arquivo <code>assets/cms-config.js</code> e preencha:</p>' +
      '<pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-x-auto">window.CMS_CONFIG = {\n' +
      "  url: 'https://xxxxx.supabase.co',\n  anonKey: 'eyJhbGciOi…',\n};</pre>" +
      '<p class="text-xs text-gray-400 mt-4">Os dois valores ficam em Project Settings → API, no painel do Supabase. ' +
      'O passo a passo completo está em PAINEL.md.</p></div></div>';
  }

  function renderCarregando(texto) {
    app().innerHTML =
      '<div class="min-h-screen flex items-center justify-center"><div class="text-center">' +
      '<div class="w-8 h-8 border-2 border-gray-200 border-t-cyan-500 rounded-full spin mx-auto mb-4"></div>' +
      '<p class="text-sm text-gray-400">' + esc(texto || 'Carregando…') + '</p></div></div>';
  }

  // ================================================================== boot
  function boot() {
    renderCarregando('Carregando o painel…');
    sb.auth.getUser().then(function (r) {
      var user = r.data && r.data.user;
      if (!user) return renderLogin();
      state.user = user;
      sb.from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(function (res) {
          if (res.error) throw res.error;
          if (!res.data) return renderSemPermissao(user.email);
          state.isAdmin = true;
          return loadAll().then(function () {
            readHash();
            renderShell();
          });
        })
        .catch(function (err) {
          app().innerHTML =
            '<div class="min-h-screen flex items-center justify-center p-4"><div class="card max-w-lg p-8">' +
            '<h1 class="font-serif text-2xl mb-3">Erro ao carregar</h1>' +
            '<p class="text-sm text-gray-600">' + esc(err.message || 'Erro desconhecido') + '</p>' +
            '<p class="text-xs text-gray-400 mt-4">Verifique se as duas migrations SQL foram executadas no Supabase.</p>' +
            '</div></div>';
        });
    });
  }

  window.addEventListener('beforeunload', function (e) {
    if (state.dirty.size) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  if (!configured) renderErroConfig();
  else boot();
})();
