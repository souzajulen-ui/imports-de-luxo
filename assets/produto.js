/* ===========================================================================
   Imports de Luxo — página de produto (produto.html?p=<id do produto>).

   Um único modelo para todos os produtos. Os dados vêm do mesmo lugar que o
   resto do site (o conteúdo publicado pelo painel, via assets/cms.js):
     • nome, preço, fotos, categoria e mensagem do WhatsApp: cadastro do painel;
     • preço antigo, descrição, tamanhos e tabela de medidas: campo "details"
       do produto (editável no painel, em "Editar produto");
     • textos da loja (parcelas, Pix, garantias, perguntas…): Configurações;
     • perguntas frequentes: Configurações → Perguntas frequentes.
   Campo vazio = o trecho some. Nada é inventado aqui.
   =========================================================================== */
(function () {
  'use strict';

  var CATEGORIAS = {
    bolsas: { nome: 'Bolsas', pagina: 'bolsas.html' },
    relogios: { nome: 'Relógios', pagina: 'relogios.html' },
    oculos: { nome: 'Óculos', pagina: 'oculos.html' },
    calcados: { nome: 'Calçados', pagina: 'calcados.html' },
    acessorios: { nome: 'Acessórios', pagina: 'acessorios.html' },
    cintos: { nome: 'Cintos', pagina: 'cintos.html' },
  };

  // Tabela usada quando o produto não escolhe uma: depende da categoria.
  var TABELA_PADRAO = { calcados: 'calcados', cintos: 'cintos' };

  // Tabelas de medidas. Calçados: numeração brasileira, europeia e o
  // comprimento do pé. Cintos: o número é o comprimento em cm da fivela até o
  // furo do meio. Anéis: aro brasileiro (medidas aproximadas).
  var TABELAS = {
    calcados: {
      titulo: 'Tabela de medidas',
      colunas: ['BR', 'EUR', 'PÉ (CM)'],
      linhas: [[33, 34, '22'], [34, 35, '22,5'], [35, 36, '23'], [36, 37, '23,5'], [37, 38, '24,5'], [38, 39, '25'],
        [39, 40, '25,5'], [40, 41, '26,5'], [41, 42, '27'], [42, 43, '28'], [43, 44, '28,5'], [44, 45, '29,5']],
      nota: 'Meça o pé do calcanhar até o dedo maior. Na dúvida entre dois tamanhos, chame no WhatsApp.',
    },
    cintos: {
      titulo: 'Tabela de medidas',
      colunas: ['TAMANHO', 'DA FIVELA AO FURO DO MEIO (CM)'],
      linhas: [80, 85, 90, 95, 100, 105, 110, 115, 120].map(function (t) { return [t, String(t)]; }),
      nota: 'Meça um cinto que você já usa, da ponta da fivela até o furo que você mais usa. Na dúvida, chame no WhatsApp.',
    },
    aneis: {
      titulo: 'Tabela de medidas',
      colunas: ['ARO', 'CIRCUNFERÊNCIA (MM)', 'DIÂMETRO (MM)'],
      linhas: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map(function (a) {
        var c = a + 40;
        return [a, String(c), (c / Math.PI).toFixed(1).replace('.', ',')];
      }),
      nota: 'Medidas aproximadas. Meça por dentro um anel que já serve em você. Na dúvida, chame no WhatsApp.',
    },
  };

  var estado = { produto: null, fotos: [], foto: 0, tamanho: null, renderizado: null };

  // ------------------------------------------------------------- utilidades
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dinheiro(n) {
    return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function get(chave, padrao) {
    var v = window.CMS && window.CMS.get ? window.CMS.get(chave) : undefined;
    return v === undefined || v === null || v === '' ? padrao || '' : String(v);
  }

  function numero(chave) {
    var n = parseFloat(String(get(chave)).replace(',', '.').replace(/[^0-9.]/g, ''));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function whatsNumero() {
    return get('contact.whatsapp_number', '5544998214237').replace(/\D/g, '');
  }

  function whatsLink(texto) {
    return 'https://wa.me/' + whatsNumero() + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  function absoluto(caminho) {
    try { return new URL(caminho, location.href).href; } catch (e) { return caminho; }
  }

  function idDoEndereco() {
    return new URLSearchParams(location.search).get('p') || '';
  }

  function urlProduto(p) {
    return window.CMS && window.CMS.productUrl ? window.CMS.productUrl(p) : 'produto.html?p=' + encodeURIComponent(p.id);
  }

  function detalhes(p) {
    return (p && p.details && typeof p.details === 'object') ? p.details : {};
  }

  // A parte da mensagem do WhatsApp depois do " - " é a descrição da peça
  // (ex.: "couro caviar matelassê caramelo, alça de corrente"). Serve de
  // descrição quando o produto ainda não tem uma escrita no painel.
  function descricaoDe(p) {
    var d = detalhes(p).description;
    if (d) return String(d);
    var partes = String(p.cart_name || '').split(' - ');
    return partes.length > 1 ? partes.slice(1).join(' - ') : '';
  }

  function tabelaDe(p) {
    var t = detalhes(p).size_table;
    if (t === 'nenhuma') return null;
    return TABELAS[t] || TABELAS[TABELA_PADRAO[p.category]] || null;
  }

  function tamanhosDe(p) {
    var s = detalhes(p).sizes;
    return Array.isArray(s) ? s.filter(function (t) { return t && t.label; }) : [];
  }

  function precoAntigo(p) {
    var a = Number(detalhes(p).old_price || 0);
    return a > Number(p.price || 0) && Number(p.price) > 0 ? a : 0;
  }

  var ICONES = {
    caminhao: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>',
    caixa: '<path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>',
    estrela: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>',
  };
  var ICONE_WHATS = '<svg class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.47 9.46m8.06-17.53A11.33 11.33 0 0 0 12.04.63C5.76.63.65 5.74.65 12.02c0 2 .52 3.96 1.52 5.69L.55 23.6l6.04-1.58a11.36 11.36 0 0 0 5.45 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05"/></svg>';

  function icone(nome, classe) {
    return '<svg class="' + (classe || 'w-6 h-6') + '" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nome] + '</svg>';
  }

  // Nome completo da peça: o da mensagem do WhatsApp (o mais detalhado do
  // cadastro), sem o código, que aparece separado. Ex.: "Relógio Rolex
  // Datejust (RM01) - pulseira Jubilee aço…" → nome "Relógio Rolex Datejust -
  // pulseira Jubilee aço…" e código "RM01".
  function nomeCompleto(p) {
    var d = detalhes(p);
    // Nome completo escrito no painel (ou pela leva de descrições) tem prioridade.
    if (d.full_name) {
      return { nome: String(d.full_name), codigo: (String(p.cart_name || '').match(/\(([A-Z]{2}\d{2,})\)/) || [])[1] || '' };
    }
    var base = String(p.cart_name || '').trim();
    if (base.length < String(p.name || '').length) base = String(p.name || '');
    var codigo = (base.match(/\(([A-Z]{2}\d{2,})\)/) || [])[1] || '';
    var nome = base.replace(/\s*\([A-Z]{2}\d{2,}\)/, '').replace(/\s+-\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim();
    return { nome: nome.charAt(0).toUpperCase() + nome.slice(1), codigo: codigo };
  }

  // Carrinho: mesmo formato das outras páginas (localStorage "cart").
  function adicionarAoCarrinho() {
    var p = estado.produto;
    if (!validarTamanho()) return false;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch (e) { cart = []; }
    cart.push({
      name: (p.cart_name || p.name) + (estado.tamanho ? ' - Tamanho ' + estado.tamanho : ''),
      price: Number(p.price || 0),
      image: absoluto(p.image),
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
    return true;
  }

  function validarTamanho() {
    if (!tamanhosDe(estado.produto).length || estado.tamanho) return true;
    var aviso = $('#avisoTamanho');
    if (aviso) {
      aviso.textContent = 'Escolha um tamanho para continuar.';
      aviso.classList.remove('hidden');
    }
    var bloco = $('#blocoTamanhos');
    if (bloco) bloco.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  // ------------------------------------------------------- compartilhar
  // O WhatsApp só mostra a foto do produto na prévia se o link apontar para a
  // página de compartilhamento (p/<id>.html, gerada por
  // scripts/gerar-compartilhamento.py). Enquanto ela não existir (produto
  // acabou de entrar), usa o endereço normal da página.
  function nomeArquivo(id) {
    return String(id).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function linkParaCompartilhar() {
    return estado.linkCompartilhar || location.href.split('#')[0];
  }

  function verificarPaginaCompartilhar(p) {
    var url = absoluto('p/' + nomeArquivo(p.id) + '.html');
    return fetch(url, { method: 'HEAD', cache: 'no-cache' })
      .then(function (r) { estado.linkCompartilhar = r.ok ? url : null; })
      .catch(function () { estado.linkCompartilhar = null; })
      .then(function () {
        atualizarWhats();
        montarRodape();
      });
  }

  function compartilhar() {
    var p = estado.produto, url = linkParaCompartilhar(), status = $('#compartilharStatus');
    if (navigator.share) {
      navigator.share({ title: p.name, text: p.name, url: url }).catch(function () {});
      return;
    }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(function () { status.textContent = 'Link copiado! É só colar no WhatsApp.'; })
      .catch(function () { status.textContent = url; });
  }

  function mensagemWhats() {
    var p = estado.produto;
    var linhas = ['Olá! Quero comprar este produto:', '', '*' + (p.cart_name || p.name) + '*'];
    if (estado.tamanho) linhas.push('Tamanho: ' + estado.tamanho);
    linhas.push('Preço: ' + (Number(p.price) > 0 ? dinheiro(p.price) : 'sob consulta'));
    linhas.push('', linkParaCompartilhar());
    return linhas.join('\n');
  }

  // --------------------------------------------------------------- galeria
  function fotosDe(p) {
    var g = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [p.image];
    return g.filter(Boolean);
  }

  function mostrarFoto(i) {
    var n = estado.fotos.length;
    if (!n) return;
    estado.foto = (i + n) % n;
    var img = $('#fotoPrincipal');
    if (img) img.src = estado.fotos[estado.foto];
    $$('[data-miniatura]').forEach(function (b, k) {
      b.classList.toggle('border-cyan-500', k === estado.foto);
      b.classList.toggle('border-transparent', k !== estado.foto);
      b.setAttribute('aria-current', k === estado.foto ? 'true' : 'false');
    });
    var cont = $('#contadorFoto');
    if (cont) cont.textContent = estado.foto + 1 + ' / ' + n;
    if (!$('#lightbox').classList.contains('hidden')) atualizarLightbox();
  }

  function atualizarLightbox() {
    $('#lightboxImg').src = estado.fotos[estado.foto];
    $('#lightboxImg').alt = estado.produto.alt || estado.produto.name;
    $('#lightboxContador').textContent = estado.foto + 1 + ' / ' + estado.fotos.length;
    var varias = estado.fotos.length > 1;
    $$('[data-lb="ant"], [data-lb="prox"]').forEach(function (b) { b.classList.toggle('hidden', !varias); });
  }

  function abrirLightbox() {
    $('#lightbox').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    atualizarLightbox();
    $('[data-lb="fechar"]').focus();
  }

  function fecharLightbox() {
    $('#lightbox').classList.add('hidden');
    document.body.style.overflow = '';
    var palco = $('#palco');
    if (palco) palco.focus();
  }

  // Deslizar o dedo para o lado troca a foto (celular).
  function aceitarSwipe(el, aoTrocar) {
    var x0 = null, y0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        // O navegador transforma o fim do deslize num "clique": sem isto,
        // deslizar a foto também abria a tela cheia.
        estado.deslizouEm = Date.now();
        aoTrocar(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  function acabouDeDeslizar() {
    return Date.now() - (estado.deslizouEm || 0) < 500;
  }

  // ------------------------------------------------------------ montagem
  function htmlGaleria(p) {
    var fotos = estado.fotos;
    var miniaturas = fotos.length > 1
      ? '<div class="flex gap-2 mt-3 overflow-x-auto pdp-carrossel" role="list" aria-label="Miniaturas">' +
        fotos.map(function (f, i) {
          return '<button type="button" role="listitem" data-miniatura="' + i + '" class="shrink-0 w-16 h-16 md:w-20 md:h-20 border-2 ' + (i === 0 ? 'border-cyan-500' : 'border-transparent') + ' rounded-md overflow-hidden bg-white" aria-label="Ver foto ' + (i + 1) + '">' +
            // Foto que não carrega (endereço externo fora do ar): a miniatura some.
            '<img src="' + esc(f) + '" alt="" class="w-full h-full object-contain" loading="lazy" onerror="this.parentNode.hidden=true"></button>';
        }).join('') + '</div>'
      : '';
    return (
      '<div>' +
      '<div id="palco" tabindex="0" class="pdp-palco relative bg-white border border-gray-100 rounded-lg overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-cyan-500" aria-label="Foto do produto. Toque ou pressione Enter para ampliar.">' +
      '<img id="fotoPrincipal" src="' + esc(fotos[0]) + '" alt="' + esc(p.alt || p.name) + '" class="w-full h-full object-contain" fetchpriority="high">' +
      (fotos.length > 1
        ? '<button type="button" data-foto="ant" class="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-lg hover:bg-white" aria-label="Foto anterior">❮</button>' +
          '<button type="button" data-foto="prox" class="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow text-lg hover:bg-white" aria-label="Próxima foto">❯</button>' +
          '<span id="contadorFoto" class="absolute bottom-2 right-3 text-[11px] bg-white/90 px-2 py-0.5 rounded tracking-widest">1 / ' + fotos.length + '</span>'
        : '') +
      '</div>' + miniaturas + '</div>'
    );
  }

  function htmlPreco(p) {
    var preco = Number(p.price || 0);
    if (!(preco > 0)) {
      return '<p class="text-2xl font-semibold uppercase tracking-widest text-gray-500">Preço sob consulta</p>' +
        '<p class="text-sm text-gray-500 mt-1">Fale com a gente pelo WhatsApp para saber o valor.</p>';
    }
    var antigo = precoAntigo(p);
    var parcelas = Math.floor(numero('loja.parcelas'));
    var pix = numero('loja.pix_desconto');
    var off = antigo ? Math.round((1 - preco / antigo) * 100) : 0;
    return (
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">' +
      '<p class="text-3xl font-semibold">' + dinheiro(preco) + '</p>' +
      (antigo ? '<p class="text-gray-400 line-through">' + dinheiro(antigo) + '</p>' : '') +
      (off > 0 ? '<span class="text-xs font-bold bg-black text-white px-2 py-1 rounded">-' + off + '%</span>' : '') +
      '</div>' +
      (parcelas > 1 ? '<p class="text-sm text-gray-600 mt-1">ou até ' + parcelas + 'x de <strong>' + dinheiro(preco / parcelas) + '</strong></p>' : '') +
      (pix > 0 && pix < 100
        ? '<p class="inline-flex items-center gap-2 text-sm mt-3 border border-gray-200 rounded-md px-3 py-2 bg-white">' +
          '<span class="font-bold text-emerald-700">' + dinheiro(preco * (1 - pix / 100)) + '</span> no Pix <span class="text-xs font-bold text-white bg-emerald-700 px-2 py-0.5 rounded">' + String(pix).replace('.', ',') + '% OFF</span></p>'
        : '')
    );
  }

  function htmlTamanhos(p) {
    var tamanhos = tamanhosDe(p);
    if (!tamanhos.length) return '';
    var tabela = tabelaDe(p);
    return (
      '<div id="blocoTamanhos" class="mt-6">' +
      '<div class="flex items-center justify-between mb-2">' +
      '<p class="text-sm" id="rotuloTamanho">Tamanho: <strong id="tamanhoEscolhido" class="font-semibold">escolha</strong></p>' +
      (tabela ? '<a href="#tabelaMedidas" class="text-sm underline underline-offset-2 hover:text-cyan-600">Tabela de medidas</a>' : '') +
      '</div>' +
      '<div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="rotuloTamanho">' +
      tamanhos.map(function (t) {
        var indisponivel = t.available === false;
        return '<button type="button" role="radio" aria-checked="false" data-tamanho="' + esc(t.label) + '"' +
          (indisponivel ? ' aria-disabled="true" title="Esgotado"' : '') +
          ' class="pdp-tam min-w-[3rem] h-12 px-3 border border-gray-300 rounded-md bg-white text-sm font-medium hover:border-black focus:outline-none focus:ring-2 focus:ring-cyan-500">' +
          esc(t.label) + (indisponivel ? '<span class="sr-only"> (esgotado)</span>' : '') + '</button>';
      }).join('') +
      '</div>' +
      '<p id="avisoTamanho" class="hidden text-sm text-red-600 mt-2" role="alert"></p>' +
      '</div>'
    );
  }

  function htmlGarantias() {
    var itens = [['caminhao', 1], ['caixa', 2], ['estrela', 3]].map(function (g) {
      var titulo = get('loja.garantia' + g[1] + '_titulo');
      var texto = get('loja.garantia' + g[1] + '_texto');
      if (!titulo) return '';
      return '<div class="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">' +
        '<span class="shrink-0 w-11 h-11 rounded-md bg-black text-white flex items-center justify-center">' + icone(g[0]) + '</span>' +
        '<div><p class="font-semibold text-sm">' + esc(titulo) + '</p>' + (texto ? '<p class="text-sm text-gray-600">' + esc(texto) + '</p>' : '') + '</div></div>';
    }).join('');
    return itens ? '<div class="mt-6 space-y-3">' + itens + '</div>' : '';
  }

  function paginaDaCategoria(p) {
    var cat = CATEGORIAS[p.category] || { nome: 'Produtos', pagina: 'index.html' };
    return cat.pagina + (p.category === 'relogios' && p.gender ? '?genero=' + encodeURIComponent(p.gender) : '');
  }

  // "Voltar": volta para a página de onde o cliente veio, no mesmo ponto da
  // lista (a página anterior guarda a rolagem, veja assets/cms.js). Quem
  // chegou direto (link do WhatsApp, Google) vai para a categoria da peça.
  function htmlVoltar(p) {
    return '<a href="' + esc(paginaDaCategoria(p)) + '" id="voltar" class="inline-flex items-center gap-2 min-h-[40px] pr-3 mb-3 text-sm font-semibold text-gray-700 hover:text-black">' +
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>' +
      'Voltar</a>';
  }

  function veioDoSite() {
    try {
      return !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1;
    } catch (e) {
      return false;
    }
  }

  function htmlInfo(p) {
    var cat = CATEGORIAS[p.category] || { nome: 'Produtos', pagina: 'index.html' };
    var paginaCat = paginaDaCategoria(p);
    var completo = nomeCompleto(p);
    return (
      '<div>' +
      '<nav aria-label="Você está em" class="text-xs text-gray-500 mb-4"><ol class="flex flex-wrap items-center gap-1">' +
      '<li><a href="index.html" class="hover:text-black">Início</a></li><li aria-hidden="true">›</li>' +
      '<li><a href="' + esc(paginaCat) + '" class="hover:text-black">' + esc(cat.nome) + '</a></li><li aria-hidden="true">›</li>' +
      '<li aria-current="page" class="text-gray-800">' + esc(p.name) + '</li></ol></nav>' +
      '<h1 class="text-2xl md:text-3xl font-serif leading-tight">' + esc(completo.nome) + '</h1>' +
      (completo.codigo ? '<p class="text-xs uppercase tracking-widest text-gray-500 mt-2">Código: ' + esc(completo.codigo) + '</p>' : '') +
      '<div class="border-t border-gray-100 mt-4 pt-4">' + htmlPreco(p) + '</div>' +
      htmlTamanhos(p) +
      // A loja não tem pagamento pelo site: a compra é fechada no WhatsApp.
      // O carrinho junta várias peças numa mensagem só, também no WhatsApp.
      '<div class="mt-6 space-y-3">' +
      '<a id="comprarWhats" href="#" target="_blank" rel="noopener" class="w-full h-14 bg-green-700 hover:bg-green-800 text-white text-lg font-bold rounded-md transition flex items-center justify-center gap-3">' +
      ICONE_WHATS + 'Comprar pelo WhatsApp</a>' +
      '<button type="button" id="adicionarCarrinho" class="w-full h-12 border-2 border-black hover:bg-black hover:text-white font-bold rounded-md transition">Adicionar ao carrinho</button>' +
      '<p class="text-xs text-center text-gray-500">Você fala direto com a loja e combina pagamento e entrega.</p>' +
      '<button type="button" id="compartilhar" class="w-full h-11 text-sm font-semibold text-gray-700 hover:text-black underline underline-offset-4">Compartilhar este produto</button>' +
      '<p id="compartilharStatus" class="text-xs text-center text-emerald-700 min-h-[1rem]" role="status" aria-live="polite"></p>' +
      '</div>' +
      htmlGarantias() +
      '</div>'
    );
  }

  function htmlDescricao(p) {
    var texto = descricaoDe(p);
    var tabela = tabelaDe(p);
    // Parágrafo em que toda linha é "Característica: valor" vira ficha técnica.
    var FICHA = /^([^:\n]{2,30}):\s+(.+)$/;
    var corpo = texto
      ? texto.split(/\n{2,}/).map(function (par) {
          var linhas = par.split('\n').filter(function (l) { return l.trim(); });
          if (linhas.length && linhas.every(function (l) { return FICHA.test(l); })) {
            return '<dl class="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 border-t border-gray-100 pt-3">' +
              linhas.map(function (l) {
                var m = l.match(FICHA);
                return '<dt class="font-semibold text-gray-900">' + esc(m[1]) + '</dt><dd>' + esc(m[2]) + '</dd>';
              }).join('') + '</dl>';
          }
          return '<p>' + esc(par).replace(/\n/g, '<br>') + '</p>';
        }).join('')
      : '<p class="text-gray-500">Fale com a gente pelo WhatsApp para saber mais detalhes desta peça.</p>';
    // Igual para todas as peças: como a compra funciona (pelo WhatsApp).
    var troca = get('loja.garantia2_texto');
    corpo += '<p class="text-gray-600 border-t border-gray-100 pt-3">Para comprar, ' + (tamanhosDe(p).length ? 'escolha o tamanho e ' : '') +
      'toque em <strong>Comprar pelo WhatsApp</strong>: a loja confirma disponibilidade, prazo de entrega e forma de pagamento antes de fechar o pedido.' +
      (troca ? ' ' + esc(troca.charAt(0).toUpperCase() + troca.slice(1)) + ' após o recebimento.' : '') + '</p>';
    return (
      '<section class="mt-12 grid ' + (tabela ? 'lg:grid-cols-2' : '') + ' gap-6" aria-label="Descrição e medidas">' +
      '<div class="border border-gray-200 rounded-lg p-6 bg-white"><h2 class="font-sans font-semibold text-lg mb-4">Descrição</h2>' +
      '<div class="text-sm text-gray-700 leading-relaxed space-y-3">' + corpo + '</div></div>' +
      (tabela
        ? '<div id="tabelaMedidas" class="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-40"><h2 class="font-sans font-semibold text-lg mb-4">' + esc(tabela.titulo) + '</h2>' +
          '<div class="overflow-x-auto"><table class="text-sm border-collapse"><thead><tr>' +
          tabela.colunas.map(function (c) { return '<th scope="col" class="text-left font-semibold bg-gray-50 border border-gray-200 px-3 py-2">' + esc(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          tabela.linhas.map(function (l) { return '<tr>' + l.map(function (v) { return '<td class="border border-gray-200 px-3 py-2">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>' +
          '<p class="text-xs italic text-gray-600 mt-3">' + esc(tabela.nota) + '</p></div>'
        : '') +
      '</section>'
    );
  }

  // ---------------------------------------------------- perguntas frequentes
  function htmlPerguntas() {
    var itens = [];
    for (var n = 1; n <= 6; n++) {
      var q = get('faq.' + n + '_pergunta'), r = get('faq.' + n + '_resposta');
      if (q && r) itens.push([q, r]);
    }
    if (!itens.length) return ''; // sem perguntas cadastradas: a seção nem aparece
    return '<div class="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">' +
      itens.map(function (it) {
        return '<details class="group p-5"><summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex justify-between gap-4 font-semibold">' +
          esc(it[0]) + '<span aria-hidden="true" class="transition-transform group-open:rotate-45 text-xl leading-none">+</span></summary>' +
          '<p class="text-sm text-gray-700 mt-3 leading-relaxed">' + esc(it[1]).replace(/\n/g, '<br>') + '</p></details>';
      }).join('') + '</div>';
  }

  // Só aparece quando há pergunta com resposta em Configurações.
  function htmlSecaoPerguntas() {
    var html = htmlPerguntas();
    return html ? '<section class="mt-12" aria-labelledby="titulo-perguntas"><h2 id="titulo-perguntas" class="font-serif text-2xl mb-6">Perguntas frequentes</h2>' + html + '</section>' : '';
  }

  function relacionados(p) {
    var todos = (window.CMS && window.CMS.products) || [];
    var mesma = todos.filter(function (x) { return x.category === p.category && x.id !== p.id; });
    if (p.category === 'relogios' && p.gender) {
      var mesmoPublico = mesma.filter(function (x) { return (x.gender || 'feminino') === p.gender; });
      if (mesmoPublico.length >= 4) mesma = mesmoPublico;
    }
    return mesma.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }).slice(0, 8);
  }

  function htmlRelacionados(p) {
    var lista = relacionados(p);
    if (lista.length < 2 || !window.CMS.cardHtml) return '';
    return (
      '<section class="mt-16" aria-label="Você também pode gostar">' +
      '<div class="flex items-center justify-between mb-6"><h2 class="font-serif text-2xl">Você também pode gostar</h2>' +
      '<div class="hidden md:flex gap-2"><button type="button" data-rel="-1" class="w-10 h-10 rounded-full border border-gray-300 hover:border-black" aria-label="Anteriores">❮</button>' +
      '<button type="button" data-rel="1" class="w-10 h-10 rounded-full border border-gray-300 hover:border-black" aria-label="Próximos">❯</button></div></div>' +
      '<div id="carrosselRel" class="pdp-carrossel flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2">' +
      lista.map(function (x) { return '<div class="snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[23%]">' + window.CMS.cardHtml(x, { verProduto: true }) + '</div>'; }).join('') +
      '</div></section>'
    );
  }

  // ----------------------------------------------------------------- SEO
  function meta(seletor, atributo, valor) {
    var el = document.head.querySelector(seletor);
    if (!el) {
      el = document.createElement(seletor.indexOf('link') === 0 ? 'link' : 'meta');
      var m = seletor.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/);
      if (m) el.setAttribute(m[1], m[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(atributo, valor);
  }

  function aplicarSeo(p) {
    var url = absoluto(urlProduto(p));
    var foto = absoluto(fotosDe(p)[0] || '');
    var descricao = (descricaoDe(p) || p.name).replace(/\s+/g, ' ').slice(0, 155);
    var preco = Number(p.price || 0);
    document.title = p.name + ' | Imports de Luxo';
    meta('meta[name="description"]', 'content', descricao);
    meta('link[rel="canonical"]', 'href', url);
    meta('meta[property="og:title"]', 'content', p.name);
    meta('meta[property="og:description"]', 'content', descricao);
    meta('meta[property="og:image"]', 'content', foto);
    meta('meta[property="og:url"]', 'content', url);
    meta('meta[name="twitter:title"]', 'content', p.name);
    meta('meta[name="twitter:description"]', 'content', descricao);
    meta('meta[name="twitter:image"]', 'content', foto);
    if (preco > 0) {
      meta('meta[property="product:price:amount"]', 'content', preco.toFixed(2));
      meta('meta[property="product:price:currency"]', 'content', 'BRL');
    }

    var dados = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.id,
      image: fotosDe(p).map(absoluto),
      description: descricaoDe(p) || p.name,
      url: url,
    };
    if (preco > 0) {
      dados.offers = { '@type': 'Offer', url: url, priceCurrency: 'BRL', price: preco.toFixed(2), availability: 'https://schema.org/InStock' };
    }
    var tag = document.getElementById('jsonld-produto');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'jsonld-produto';
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(dados);
  }

  // ------------------------------------------------------- rodapé e extras
  function formatarWhats(n) {
    var m = String(n).match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
    return m ? '+' + m[1] + ' (' + m[2] + ') ' + m[3] + '-' + m[4] : '+' + n;
  }

  var REDES = {
    instagram: ['Instagram', '<path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-9.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/>'],
    facebook: ['Facebook', '<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/>'],
    tiktok: ['TikTok', '<path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 1 1-2-2.7V9.5a6.3 6.3 0 1 0 5.4 6.2V8.8a8.2 8.2 0 0 0 3.8 1.2V6.6l0 .1z"/>'],
    youtube: ['YouTube', '<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>'],
  };

  function montarRodape() {
    var numeroWhats = whatsNumero();
    $('#rodapeWhats').textContent = formatarWhats(numeroWhats);
    $('#rodapeWhats').href = get('contact.whatsapp_link') || whatsLink();
    var email = get('contact.email');
    var liEmail = $('[data-rodape="email"]');
    liEmail.classList.toggle('hidden', !email);
    if (email) { $('#rodapeEmail').textContent = email; $('#rodapeEmail').href = 'mailto:' + email; }
    $('[data-rodape="horario"]').classList.toggle('hidden', !get('contact.hours'));
    $('#whatsFlutuante').href = whatsLink(estado.produto ? 'Olá! Vi o produto "' + estado.produto.name + '" no site: ' + linkParaCompartilhar() : '');

    // Políticas: o link do painel; se ainda estiver "#", as páginas do site.
    var PADRAO = [
      ['Política de Privacidade', 'politica-de-privacidade.html'],
      ['Trocas e Devoluções', 'trocas-e-devolucoes.html'],
      ['Frete e Envio', 'frete-e-envio.html'],
    ];
    var politicas = [1, 2, 3].map(function (n) {
      var url = get('footer.link' + n + '_url');
      var usaPadrao = !url || url === '#';
      var rotulo = usaPadrao ? PADRAO[n - 1][0] : get('footer.link' + n + '_label', PADRAO[n - 1][0]);
      if (usaPadrao) url = PADRAO[n - 1][1];
      return '<li><a class="hover:text-white hover:underline underline-offset-2" href="' + esc(url) + '">' + esc(rotulo) + '</a></li>';
    }).join('');
    $('#rodapePoliticasLista').innerHTML = politicas;
    $('#rodapePoliticas').classList.toggle('hidden', !politicas);

    $('#rodapeRedes').innerHTML = Object.keys(REDES).map(function (k) {
      var url = get('loja.' + k);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + REDES[k][0] + '" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + REDES[k][1] + '</svg></a>' : '';
    }).join('');
    var cnpj = get('loja.cnpj');
    $('#rodapeCnpj').textContent = cnpj ? ' · CNPJ ' + cnpj : '';


    // Benefício sem título some.
    $$('[data-beneficio]').forEach(function (el) {
      el.classList.toggle('hidden', !get('loja.beneficio' + el.getAttribute('data-beneficio') + '_titulo'));
    });
  }

  // A barra aparece quando o botão "Comprar pelo WhatsApp" já passou para CIMA
  // da tela. Conferido a cada rolagem (uma vez por quadro), e não com
  // IntersectionObserver: no celular o botão começa abaixo da tela, e uma
  // rolagem rápida que o pula inteiro não gera aviso nenhum do observador.
  function barraFixa() {
    var p = estado.produto;
    $('#barraNome').textContent = p.name;
    $('#barraPreco').textContent = Number(p.price) > 0 ? dinheiro(p.price) : 'Preço sob consulta';
    atualizarBarra();
    if (estado.barraLigada) return;
    estado.barraLigada = true;
    var agendado = false;
    var agendar = function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () { agendado = false; atualizarBarra(); });
    };
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
  }

  function atualizarBarra() {
    var barra = $('#barraCompra'), alvo = $('#comprarWhats');
    if (!barra || !alvo) return;
    var fora = alvo.getBoundingClientRect().bottom < 0 && window.innerWidth < 1024;
    if (fora === barra.__fora) return;
    barra.__fora = fora;
    barra.classList.toggle('translate-y-full', !fora);
    barra.setAttribute('aria-hidden', fora ? 'false' : 'true');
    $('#barraWhats').tabIndex = fora ? 0 : -1;
    // O botão do WhatsApp sobe para não ficar por cima da barra.
    $('#whatsFlutuante').style.bottom = fora ? '5.5rem' : '';
  }

  // -------------------------------------------------------------- eventos
  // Cliques da página inteira: ligados UMA vez (delegação no <main>).
  function ligarEventos() {
    var raiz = $('#pdp');
    if (raiz.__eventos) return;
    raiz.__eventos = true;

    raiz.addEventListener('click', function (e) {
      var t = e.target;
      var mini = t.closest('[data-miniatura]');
      if (mini) return mostrarFoto(Number(mini.getAttribute('data-miniatura')));
      var seta = t.closest('[data-foto]');
      if (seta) { e.stopPropagation(); return mostrarFoto(estado.foto + (seta.getAttribute('data-foto') === 'prox' ? 1 : -1)); }
      if (t.closest('#palco')) return acabouDeDeslizar() ? null : abrirLightbox();

      var tam = t.closest('[data-tamanho]');
      if (tam) {
        if (tam.getAttribute('aria-disabled') === 'true') return;
        estado.tamanho = tam.getAttribute('data-tamanho');
        $$('[data-tamanho]').forEach(function (b) {
          var sel = b === tam;
          b.setAttribute('aria-checked', sel ? 'true' : 'false');
          b.classList.toggle('border-black', sel);
          b.classList.toggle('ring-2', sel);
          b.classList.toggle('ring-black', sel);
        });
        $('#tamanhoEscolhido').textContent = estado.tamanho;
        $('#avisoTamanho').classList.add('hidden');
        atualizarWhats();
        return;
      }

      if (t.closest('#comprarWhats') && !validarTamanho()) { e.preventDefault(); return; }
      if (t.closest('#voltar') && veioDoSite()) {
        e.preventDefault();
        try { sessionStorage.setItem('voltando', '1'); } catch (err) {}
        history.back();
        return;
      }
      if (t.closest('#compartilhar')) return compartilhar();
      if (t.closest('#adicionarCarrinho')) {
        if (adicionarAoCarrinho() && typeof window.toggleCart === 'function') window.toggleCart();
        return;
      }

      var rel = t.closest('[data-rel]');
      if (rel) {
        var c = $('#carrosselRel');
        c.scrollBy({ left: Number(rel.getAttribute('data-rel')) * c.clientWidth * 0.9, behavior: 'smooth' });
      }
    });

    $('#barraWhats').addEventListener('click', function (e) {
      if (!validarTamanho()) e.preventDefault();
    });
  }

  // Foto principal: recriada a cada montagem, então os eventos dela também.
  function ligarPalco() {
    var palco = $('#palco');
    if (palco) {
      palco.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirLightbox(); }
        if (e.key === 'ArrowRight') mostrarFoto(estado.foto + 1);
        if (e.key === 'ArrowLeft') mostrarFoto(estado.foto - 1);
      });
      // Zoom ao passar o mouse (só com mouse de verdade).
      var img = $('#fotoPrincipal');
      palco.addEventListener('mousemove', function (e) {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        var r = palco.getBoundingClientRect();
        img.style.transformOrigin = ((e.clientX - r.left) / r.width) * 100 + '% ' + ((e.clientY - r.top) / r.height) * 100 + '%';
        palco.classList.add('zoom');
      });
      palco.addEventListener('mouseleave', function () { palco.classList.remove('zoom'); });
      aceitarSwipe(palco, function (dir) { mostrarFoto(estado.foto + dir); });
    }
  }

  function ligarLightbox() {
    var lb = $('#lightbox');
    if (lb.__ligado) return;
    lb.__ligado = true;
    lb.addEventListener('click', function (e) {
      var acao = e.target.closest('[data-lb]');
      if (acao) {
        var a = acao.getAttribute('data-lb');
        if (a === 'fechar') return fecharLightbox();
        return mostrarFoto(estado.foto + (a === 'prox' ? 1 : -1));
      }
      if (e.target === lb) fecharLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.classList.contains('hidden')) return;
      if (e.key === 'Escape') fecharLightbox();
      if (e.key === 'ArrowRight') mostrarFoto(estado.foto + 1);
      if (e.key === 'ArrowLeft') mostrarFoto(estado.foto - 1);
    });
    aceitarSwipe(lb, function (dir) { mostrarFoto(estado.foto + dir); });
  }

  function atualizarWhats() {
    var link = whatsLink(mensagemWhats());
    ['#comprarWhats', '#barraWhats'].forEach(function (sel) {
      var a = $(sel);
      if (a) a.href = link;
    });
  }

  // ---------------------------------------------------------------- render
  function naoEncontrado() {
    var main = $('#pdp');
    main.setAttribute('aria-busy', 'false');
    main.innerHTML =
      '<div class="text-center py-24"><h1 class="text-3xl font-serif mb-4">Produto não encontrado</h1>' +
      '<p class="text-gray-600 mb-8">Esta peça pode ter saído do catálogo. Veja as outras opções da loja.</p>' +
      '<a href="index.html" class="inline-block bg-black text-white px-8 py-4 rounded-md font-semibold">Voltar para o início</a></div>';
    document.title = 'Produto não encontrado | Imports de Luxo';
    meta('meta[name="robots"]', 'content', 'noindex');
  }

  function render() {
    var id = idDoEndereco();
    var produtos = (window.CMS && window.CMS.products) || [];
    var p = produtos.find(function (x) { return x.id === id; });
    if (!p) {
      montarRodape();
      if (window.CMS && window.CMS.ready) naoEncontrado();
      return;
    }
    // Segunda chegada do conteúdo (cópia salva → versão da rede): só refaz a
    // página se o produto mudou, para não perder o tamanho já escolhido.
    var assinatura = JSON.stringify(p);
    if (estado.renderizado === assinatura) {
      aplicarSeo(p);
      montarRodape();
      return;
    }
    estado.renderizado = assinatura;
    estado.produto = p;
    estado.fotos = fotosDe(p);
    estado.foto = 0;
    estado.tamanho = null;

    var main = $('#pdp');
    main.setAttribute('aria-busy', 'false');
    main.innerHTML =
      htmlVoltar(p) +
      '<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">' + htmlGaleria(p) + htmlInfo(p) + '</div>' +
      htmlDescricao(p) + htmlSecaoPerguntas() + htmlRelacionados(p);

    ligarEventos();
    ligarPalco();
    ligarLightbox();
    atualizarWhats();
    barraFixa();
    montarRodape();
    aplicarSeo(p);
    verificarPaginaCompartilhar(p);
  }

  function iniciar() {
    var montar = function () { render(); };
    document.addEventListener('cms:ready', montar);
    // O cms.js pode ter aplicado a cópia salva antes deste arquivo carregar:
    // nesse caso o primeiro "cms:ready" já passou.
    if (window.CMS && window.CMS.ready) montar();
    // Sem Supabase configurado (ou fora do ar e sem cópia salva), o cms:ready
    // nunca chega: depois de um tempo, avisa em vez de deixar o esqueleto.
    setTimeout(function () {
      if (!estado.produto && !(window.CMS && window.CMS.ready)) {
        var main = $('#pdp');
        main.setAttribute('aria-busy', 'false');
        main.innerHTML = '<div class="text-center py-24"><h1 class="text-2xl font-serif mb-4">Não foi possível carregar o produto</h1>' +
          '<p class="text-gray-600 mb-8">Verifique sua conexão e tente de novo.</p>' +
          '<button type="button" onclick="location.reload()" class="bg-black text-white px-8 py-4 rounded-md font-semibold">Tentar de novo</button></div>';
      }
    }, 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
