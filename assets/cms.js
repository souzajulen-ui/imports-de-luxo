/* ===========================================================================
   Imports de Luxo — runtime do site público.

   O que este arquivo faz:
     1. lê o conteúdo publicado no Supabase (UMA requisição, uma linha só);
     2. aplica textos, imagens, links e SEO nos elementos marcados com data-cms;
     3. monta as vitrines de produtos a partir do catálogo do banco;
     4. guarda uma cópia local para o site abrir instantâneo na próxima visita.

   Regra de ouro: se o Supabase estiver fora do ar, mal configurado ou lento,
   NADA quebra — o HTML que já está na página continua valendo.
   =========================================================================== */
(function () {
  'use strict';

  var CACHE_KEY = 'cms:snapshot:v1';
  var cfg = window.CMS_CONFIG || {};
  var configured =
    cfg.url && cfg.anonKey && cfg.url.indexOf('SEU-PROJETO') === -1 && cfg.anonKey.indexOf('COLE_AQUI') === -1;

  var params = new URLSearchParams(window.location.search);
  var PREVIEW = params.get('preview') === '1';

  var CMS = (window.CMS = {
    ready: false,
    preview: PREVIEW,
    data: null,
    blocks: {},
    products: [],
    galleries: {},
    get: function (key, fallback) {
      var v = CMS.blocks[key];
      return v === undefined || v === null || v === '' ? fallback : v;
    },
  });

  // ------------------------------------------------------------------ utils
  function pageSlug() {
    var file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!file || file === '/' ) file = 'index.html';
    return file.replace(/\.html?$/, '') || 'index';
  }

  function money(n) {
    return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      /* modo anônimo ou disco cheio: seguimos sem cache */
    }
  }

  // ------------------------------------------------------------ carregamento
  function accessToken() {
    // Na pré-visualização reaproveita a sessão já aberta no painel.
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') > -1) {
          var v = JSON.parse(localStorage.getItem(k));
          if (v && v.access_token) return v.access_token;
        }
      }
    } catch (e) {
      /* ignora */
    }
    return null;
  }

  function fetchSnapshot() {
    if (!configured) return Promise.resolve(null);
    var id = PREVIEW ? 'draft' : 'published';
    var url = cfg.url.replace(/\/+$/, '') + '/rest/v1/site_snapshot?id=eq.' + id + '&select=data,updated_at';
    var headers = { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey };
    if (PREVIEW) {
      var token = accessToken();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    return fetch(url, { headers: headers, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        return rows && rows[0] ? rows[0].data : null;
      })
      .catch(function (err) {
        console.warn('[CMS] não foi possível carregar o conteúdo publicado:', err.message);
        return null;
      });
  }

  // ------------------------------------------------------------- aplicação
  function applyBlocks() {
    var els = document.querySelectorAll('[data-cms]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-cms');
      var value = CMS.blocks[key];
      if (value === undefined || value === null) continue;
      var mode = el.getAttribute('data-cms-attr') || 'text';
      if (mode === 'text') {
        if (el.textContent !== value) el.textContent = value;
      } else if (mode === 'html') {
        if (el.innerHTML !== value) el.innerHTML = value;
      } else {
        if (value === '') continue; // imagem/link vazio: mantém o que está no HTML
        if (el.getAttribute(mode) !== value) el.setAttribute(mode, value);
      }
    }
    // Atributos avulsos: um link pode ter texto e endereço editáveis ao mesmo tempo.
    applyAttribute('data-cms-href', 'href');
    applyAttribute('data-cms-src', 'src');
  }

  function applyAttribute(dataAttr, target) {
    var els = document.querySelectorAll('[' + dataAttr + ']');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var value = CMS.blocks[el.getAttribute(dataAttr)];
      if (!value) continue; // vazio: mantém o que já está no HTML
      if (el.getAttribute(target) !== value) el.setAttribute(target, value);
    }
  }

  // ------------------------------------------------------------------ cores
  // Só aceita cor em formato seguro (#rgb, #rrggbb, #rrggbbaa), para o campo
  // de cor nunca virar uma porta de entrada para código estranho na página.
  function corValida(v) {
    return typeof v === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim());
  }

  function applyTheme() {
    var accent = CMS.get('theme.accent');
    var topoFundo = CMS.get('theme.topbar_bg');
    var topoLetra = CMS.get('theme.topbar_text');
    var botaoLetra = CMS.get('theme.button_text');
    var css = '';

    if (corValida(accent)) {
      css +=
        ':root{--gold:' + accent + '}' +
        '.bg-cyan-500,.bg-cyan-600,.btn-gold{background-color:' + accent + ' !important}' +
        '.text-cyan-500,.text-cyan-600,.text-cyan-700{color:' + accent + ' !important}' +
        '.border-cyan-500,.border-cyan-400,.luxury-card{border-color:' + accent + ' !important}' +
        '.decoration-cyan-400{text-decoration-color:' + accent + ' !important}' +
        '.hover\\:text-cyan-500:hover{color:' + accent + ' !important}' +
        '.hover\\:bg-cyan-600:hover{background-color:' + accent + ' !important}' +
        '.hover\\:border-cyan-500:hover{border-color:' + accent + ' !important}';
    }
    if (corValida(botaoLetra)) {
      css += '.bg-cyan-500,.bg-cyan-600,.btn-gold{color:' + botaoLetra + ' !important}';
    }
    if (corValida(topoFundo) || corValida(topoLetra)) {
      css +=
        '[data-cms="topbar.text"]{' +
        (corValida(topoFundo) ? 'background-color:' + topoFundo + ' !important;' : '') +
        (corValida(topoLetra) ? 'color:' + topoLetra + ' !important;' : '') +
        '}';
    }

    var tag = document.getElementById('cms-theme');
    if (!css) {
      if (tag) tag.remove();
      return;
    }
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'cms-theme';
      document.head.appendChild(tag);
    }
    if (tag.textContent !== css) tag.textContent = css;
  }

  function applySeo() {
    var slug = pageSlug();
    var title = CMS.get('seo.title');
    var desc = CMS.get('seo.description');
    var ogImage = CMS.get('seo.image');
    var logo = CMS.get('brand.logo');

    if (title) document.title = title;

    function meta(selector, content) {
      if (!content) return;
      var tag = document.head.querySelector(selector);
      if (tag) tag.setAttribute('content', content);
    }
    meta('meta[name="description"]', desc);
    meta('meta[property="og:title"]', title);
    meta('meta[property="og:description"]', desc);
    meta('meta[name="twitter:title"]', title);
    meta('meta[name="twitter:description"]', desc);
    meta('meta[property="og:image"]', ogImage);
    meta('meta[name="twitter:image"]', ogImage);

    if (logo) {
      var icons = document.head.querySelectorAll('link[rel*="icon"]');
      for (var i = 0; i < icons.length; i++) icons[i].setAttribute('href', logo);
    }
    return slug;
  }

  // ---------------------------------------------------------- vitrine/cards
  function cardHtml(p) {
    var twoLines = String(p.name || '').length > 22 ? ' h-14 md:h-auto' : '';
    var addLabel = CMS.get('cart.add_label', 'Adicionar ao carrinho');
    return (
      '<div class="product border border-gray-100 shadow-sm hover:shadow-xl transition duration-500 group text-center p-2 md:p-6 bg-white" data-cms-card="' +
      escapeHtml(p.id) +
      '">' +
      '<img src="' +
      escapeHtml(p.image) +
      '" class="w-full h-40 md:h-64 object-contain mb-6 group-hover:scale-105 transition duration-500 cursor-pointer" alt="' +
      escapeHtml(p.alt || p.name) +
      '" loading="lazy" onclick="openGallery(\'' +
      escapeHtml(p.id) +
      '\')">' +
      '<h3 class="font-serif text-lg mb-2' +
      twoLines +
      '">' +
      escapeHtml(p.name) +
      '</h3>' +
      '<p class="text-xl font-semibold mb-4">' +
      money(p.price) +
      '</p>' +
      '<button class="add-cart bg-cyan-500 text-white w-full md:w-auto py-2 md:py-3 text-[10px] md:text-xs px-0 md:px-6 uppercase tracking-widest font-bold block md:inline-block hover:bg-black md:hover:bg-cyan-600 transition" data-name="' +
      escapeHtml(p.cart_name || p.name) +
      '" data-price="' +
      Number(p.price || 0).toFixed(2) +
      '" data-image="' +
      escapeHtml(p.image) +
      '">' +
      escapeHtml(addLabel) +
      '</button>' +
      '</div>'
    );
  }

  function applyProducts() {
    if (!CMS.products.length) return;
    var grids = document.querySelectorAll('[data-cms-products]');
    for (var i = 0; i < grids.length; i++) {
      var grid = grids[i];
      var spec = grid.getAttribute('data-cms-products'); // "featured:bolsas" ou "category:bolsas"
      var parts = spec.split(':');
      var kind = parts[0];
      var cat = parts[1];
      var list = CMS.products.filter(function (p) {
        return p.category === cat && (kind !== 'featured' || p.featured);
      });
      list.sort(function (a, b) {
        var ka = kind === 'featured' ? a.featured_sort : a.sort;
        var kb = kind === 'featured' ? b.featured_sort : b.sort;
        return (ka == null ? 9999 : ka) - (kb == null ? 9999 : kb);
      });
      var limit = parseInt(grid.getAttribute('data-cms-limit') || '0', 10);
      if (limit > 0) list = list.slice(0, limit);
      if (!list.length) continue; // sem produtos: preserva o HTML original
      grid.innerHTML = list.map(cardHtml).join('');
    }
    document.dispatchEvent(new CustomEvent('cms:products-rendered'));
  }

  // -------------------------------------------------------- galeria de fotos
  function installGallery() {
    var modal = document.getElementById('modalGallery');
    if (!modal) return;
    var index = 0;
    var list = [];

    function update() {
      var main = document.getElementById('mainGalleryImage');
      var counter = document.getElementById('imageCounter');
      if (main) main.src = list[index];
      if (counter) counter.textContent = index + 1 + ' / ' + list.length;
      var thumbs = document.querySelectorAll('.gallery-thumb');
      for (var i = 0; i < thumbs.length; i++) {
        thumbs[i].classList.toggle('border-cyan-500', i === index);
        thumbs[i].classList.toggle('border-gray-200', i !== index);
      }
    }

    window.openGallery = function (id) {
      var gallery = CMS.galleries[id];
      if (!gallery || !gallery.length) {
        if (typeof window.__cmsOriginalOpenGallery === 'function') return window.__cmsOriginalOpenGallery(id);
        return;
      }
      list = gallery;
      index = 0;
      var box = document.querySelector('.gallery-thumbs-container');
      if (box) {
        box.innerHTML = '';
        list.forEach(function (src, i) {
          var t = document.createElement('img');
          t.className =
            'gallery-thumb w-20 h-20 object-cover cursor-pointer border-2 border-gray-200 hover:border-cyan-500 transition';
          t.src = src;
          t.onclick = function () {
            index = i;
            update();
          };
          box.appendChild(t);
        });
      }
      modal.classList.remove('hidden');
      var overlay = document.getElementById('galleryOverlay');
      if (overlay) overlay.classList.remove('hidden');
      update();
    };

    window.closeGallery = function () {
      modal.classList.add('hidden');
      var overlay = document.getElementById('galleryOverlay');
      if (overlay) overlay.classList.add('hidden');
    };
    window.nextImage = function () {
      if (!list.length) return;
      index = (index + 1) % list.length;
      update();
    };
    window.prevImage = function () {
      if (!list.length) return;
      index = (index - 1 + list.length) % list.length;
      update();
    };
    window.updateGalleryImage = update;
  }

  // --------------------------------------------------------------- carrinho
  // Todos os cards renderizados pelo painel usam este handler único.
  function installCart() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.add-cart') : null;
      if (!btn || !btn.closest('[data-cms-card]')) return;
      e.stopPropagation(); // evita que a página conte o clique duas vezes
      var cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
      } catch (err) {
        cart = [];
      }
      cart.push({
        name: btn.getAttribute('data-name'),
        price: parseFloat(btn.getAttribute('data-price')),
        image: btn.getAttribute('data-image'),
      });
      localStorage.setItem('cart', JSON.stringify(cart));
      if (typeof window.updateCartCount === 'function') window.updateCartCount();
      if (typeof window.toggleCart === 'function') window.toggleCart();
    }, true); // fase de captura: roda antes dos handlers da página
  }

  // --------------------------------------------------------------- aplicar
  function apply(data) {
    if (!data) return;
    CMS.data = data;
    var slug = pageSlug();
    var global = (data.blocks && data.blocks._global) || {};
    var page = (data.blocks && data.blocks[slug]) || {};
    CMS.blocks = Object.assign({}, global, page);
    CMS.products = (data.products || []).slice();
    CMS.galleries = {};
    CMS.products.forEach(function (p) {
      CMS.galleries[p.id] = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(Boolean);
    });

    applyTheme();
    applySeo();
    applyBlocks();
    applyProducts();
    CMS.ready = true;
    document.dispatchEvent(new CustomEvent('cms:ready', { detail: { preview: PREVIEW } }));
  }

  function previewBadge() {
    if (!PREVIEW) return;
    var bar = document.createElement('div');
    bar.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#111;color:#fff;font:600 12px Inter,sans-serif;' +
      'padding:10px 16px;text-align:center;letter-spacing:.12em;text-transform:uppercase';
    bar.textContent = 'Pré-visualização — alterações ainda não publicadas';
    document.body.appendChild(bar);
  }

  function start() {
    if (typeof window.openGallery === 'function' && !window.__cmsOriginalOpenGallery) {
      window.__cmsOriginalOpenGallery = window.openGallery;
    }
    installGallery();
    installCart();
    previewBadge();

    if (!PREVIEW) {
      var cached = readCache();
      if (cached) apply(cached); // conteúdo instantâneo, sem esperar a rede
    }

    fetchSnapshot().then(function (data) {
      if (!data) return;
      apply(data);
      if (!PREVIEW) writeCache(data);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
