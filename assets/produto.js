/* ===========================================================================
   Imports de Luxo — página de produto (produto.html?p=<id do produto>).

   Um único modelo para todos os produtos. Os dados vêm do mesmo lugar que o
   resto do site (o conteúdo publicado pelo painel, via assets/cms.js):
     • nome, preço, fotos, categoria e mensagem do WhatsApp: cadastro do painel;
     • preço antigo, descrição, tamanhos e tabela de medidas: campo "details"
       do produto (editável no painel, em "Editar produto");
     • textos da loja (parcelas, Pix, garantias, perguntas…): Configurações;
     • avaliações: assets/avaliacoes.json — SÓ avaliações reais de clientes.
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

  var POR_PAGINA_AVALIACOES = 6;

  var estado = { produto: null, fotos: [], foto: 0, tamanho: null, qtd: 1, avaliacoes: [], mostrar: POR_PAGINA_AVALIACOES, ordem: 'recentes', renderizado: null };

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
  function icone(nome, classe) {
    return '<svg class="' + (classe || 'w-6 h-6') + '" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nome] + '</svg>';
  }

  function estrelas(nota, classe) {
    var cheia = Math.round(Number(nota) || 0);
    var s = '';
    for (var i = 1; i <= 5; i++) {
      s += '<span class="' + (i <= cheia ? 'text-amber-400' : 'text-gray-300') + '">★</span>';
    }
    return '<span class="' + (classe || '') + '" aria-label="Nota ' + (Number(nota) || 0).toFixed(1).replace('.', ',') + ' de 5">' + s + '</span>';
  }

  function tempoAtras(data) {
    var t = new Date(data).getTime();
    if (!isFinite(t)) return '';
    var dias = Math.floor((Date.now() - t) / 86400000);
    if (dias < 1) return 'hoje';
    if (dias === 1) return 'há 1 dia';
    if (dias < 30) return 'há ' + dias + ' dias';
    var meses = Math.floor(dias / 30);
    if (meses < 12) return meses === 1 ? 'há 1 mês' : 'há ' + meses + ' meses';
    var anos = Math.floor(meses / 12);
    return anos === 1 ? 'há 1 ano' : 'há ' + anos + ' anos';
  }

  // -------------------------------------------------------------- carrinho
  // Mesmo formato das outras páginas: localStorage "cart" = [{name, price, image}].
  function adicionarAoCarrinho() {
    var p = estado.produto;
    if (!validarTamanho()) return false;
    var nome = (p.cart_name || p.name) + (estado.tamanho ? ' - Tamanho ' + estado.tamanho : '');
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch (e) { cart = []; }
    for (var i = 0; i < estado.qtd; i++) cart.push({ name: nome, price: Number(p.price || 0), image: absoluto(p.image) });
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

  function mensagemWhats() {
    var p = estado.produto;
    var linhas = ['Olá! Quero comprar este produto:', '', '*' + (p.cart_name || p.name) + '*'];
    if (estado.tamanho) linhas.push('Tamanho: ' + estado.tamanho);
    linhas.push('Quantidade: ' + estado.qtd);
    linhas.push('Preço: ' + (Number(p.price) > 0 ? dinheiro(p.price) : 'sob consulta'));
    linhas.push('', location.href.split('#')[0]);
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

  function htmlPagamentos(classeChip) {
    var lista = get('loja.pagamentos').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return lista.map(function (m) {
      return '<span class="' + (classeChip || 'text-[11px] font-semibold border border-gray-200 rounded px-2 py-1 bg-white text-gray-700') + '">' + esc(m) + '</span>';
    }).join('');
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

  function htmlInfo(p) {
    var cat = CATEGORIAS[p.category] || { nome: 'Produtos', pagina: 'index.html' };
    var paginaCat = cat.pagina + (p.category === 'relogios' && p.gender ? '?genero=' + encodeURIComponent(p.gender) : '');
    var media = resumoAvaliacoes();
    var pagamentos = htmlPagamentos();
    return (
      '<div>' +
      '<nav aria-label="Você está em" class="text-xs text-gray-500 mb-4"><ol class="flex flex-wrap items-center gap-1">' +
      '<li><a href="index.html" class="hover:text-black">Início</a></li><li aria-hidden="true">›</li>' +
      '<li><a href="' + esc(paginaCat) + '" class="hover:text-black">' + esc(cat.nome) + '</a></li><li aria-hidden="true">›</li>' +
      '<li aria-current="page" class="text-gray-800">' + esc(p.name) + '</li></ol></nav>' +
      '<h1 class="text-3xl md:text-4xl font-serif leading-tight">' + esc(p.name) + '</h1>' +
      (media.total
        ? '<a href="#avaliacoes" data-aba-link="avaliacoes" class="inline-flex items-center gap-2 text-sm mt-2 hover:underline">' + estrelas(media.media) + ' <span>' + media.total + (media.total === 1 ? ' avaliação' : ' avaliações') + '</span></a>'
        : '') +
      '<div class="border-t border-gray-100 mt-4 pt-4">' + htmlPreco(p) + '</div>' +
      htmlTamanhos(p) +
      '<div class="mt-6 space-y-3">' +
      '<button type="button" id="comprarAgora" class="w-full h-14 bg-black hover:bg-gray-800 text-white font-bold rounded-md transition">Comprar Agora</button>' +
      '<div class="flex gap-3">' +
      '<div class="flex items-center border border-gray-300 rounded-md bg-white" role="group" aria-label="Quantidade">' +
      '<button type="button" data-qtd="-1" class="w-11 h-14 text-xl hover:text-cyan-600" aria-label="Diminuir quantidade">−</button>' +
      '<input id="qtd" type="number" min="1" max="20" value="1" inputmode="numeric" class="w-10 text-center bg-transparent focus:outline-none [appearance:textfield]" aria-label="Quantidade">' +
      '<button type="button" data-qtd="1" class="w-11 h-14 text-xl hover:text-cyan-600" aria-label="Aumentar quantidade">+</button>' +
      '</div>' +
      '<button type="button" id="adicionarSacola" class="flex-1 h-14 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-md transition">Adicionar à sacola</button>' +
      '</div>' +
      '<a id="comprarWhats" href="#" target="_blank" rel="noopener" class="w-full h-12 border-2 border-[#25D366] text-[#128C3E] hover:bg-[#25D366] hover:text-white font-bold rounded-md transition flex items-center justify-center gap-2">Comprar pelo WhatsApp</a>' +
      '</div>' +
      (pagamentos
        ? '<div class="mt-6 border border-gray-200 rounded-lg p-4 bg-white"><p class="text-sm font-semibold text-center mb-3">' + esc(get('footer.payment_title', 'Formas de Pagamento')) + '</p>' +
          '<div class="flex flex-wrap justify-center gap-2">' + pagamentos + '</div></div>'
        : '') +
      htmlGarantias() +
      '</div>'
    );
  }

  function htmlDescricao(p) {
    var texto = descricaoDe(p);
    var tabela = tabelaDe(p);
    var corpo = texto
      ? texto.split(/\n{2,}/).map(function (par) { return '<p>' + esc(par).replace(/\n/g, '<br>') + '</p>'; }).join('')
      : '<p class="text-gray-500">Fale com a gente pelo WhatsApp para saber mais detalhes desta peça.</p>';
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

  // ------------------------------------------------------------ avaliações
  function resumoAvaliacoes() {
    var lista = estado.avaliacoes;
    if (!lista.length) return { total: 0, media: 0 };
    var soma = lista.reduce(function (s, a) { return s + (Number(a.nota) || 0); }, 0);
    return { total: lista.length, media: soma / lista.length };
  }

  function htmlAvaliacoes() {
    var lista = estado.avaliacoes.slice();
    if (!lista.length) {
      return '<div class="text-center py-10"><p class="text-gray-600">Este produto ainda não tem avaliações.</p>' +
        '<a href="' + esc(whatsLink('Olá! Comprei o produto "' + estado.produto.name + '" e quero deixar minha avaliação.')) + '" target="_blank" rel="noopener" class="inline-block mt-4 text-sm underline underline-offset-2 hover:text-cyan-600">Comprou esta peça? Conte para a gente pelo WhatsApp</a></div>';
    }
    if (estado.ordem === 'nota') lista.sort(function (a, b) { return (b.nota || 0) - (a.nota || 0) || new Date(b.data) - new Date(a.data); });
    else lista.sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
    var r = resumoAvaliacoes();
    var visiveis = lista.slice(0, estado.mostrar);
    return (
      '<div class="flex flex-wrap items-center justify-between gap-4 mb-6">' +
      '<div class="flex items-center gap-3"><span class="text-4xl font-semibold">' + r.media.toFixed(1).replace('.', ',') + '</span>' +
      '<div>' + estrelas(r.media, 'text-xl') + '<p class="text-sm text-gray-600">' + r.total + (r.total === 1 ? ' avaliação' : ' avaliações') + '</p></div></div>' +
      '<label class="text-sm flex items-center gap-2">Ordenar por <select id="ordemAvaliacoes" class="border border-gray-300 rounded-md px-2 py-2 bg-white">' +
      '<option value="recentes"' + (estado.ordem === 'recentes' ? ' selected' : '') + '>Mais recentes</option>' +
      '<option value="nota"' + (estado.ordem === 'nota' ? ' selected' : '') + '>Maior nota</option></select></label>' +
      '</div>' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
      visiveis.map(function (a) {
        var fotos = (a.fotos || []).filter(Boolean);
        return '<article class="border border-gray-200 rounded-lg p-5 bg-white">' +
          '<div class="flex items-center justify-between">' + estrelas(a.nota) + '<span class="text-xs text-gray-500">' + esc(tempoAtras(a.data)) + '</span></div>' +
          (a.titulo ? '<h3 class="font-sans font-semibold mt-3">' + esc(a.titulo) + '</h3>' : '') +
          (a.texto ? '<p class="text-sm text-gray-700 mt-2 leading-relaxed">' + esc(a.texto) + '</p>' : '') +
          (fotos.length ? '<div class="flex gap-2 mt-3">' + fotos.map(function (f) { return '<img src="' + esc(f) + '" alt="Foto enviada pelo cliente" class="w-16 h-16 object-cover rounded" loading="lazy">'; }).join('') + '</div>' : '') +
          '<p class="text-sm font-semibold mt-4">' + esc(a.nome || 'Cliente') + '</p>' +
          (a.verificada ? '<p class="text-xs text-emerald-700 font-semibold mt-1">✓ Compra verificada</p>' : '') +
          '</article>';
      }).join('') +
      '</div>' +
      (lista.length > estado.mostrar ? '<div class="text-center mt-6"><button type="button" id="verMaisAvaliacoes" class="border border-black px-6 py-3 rounded-md text-sm font-semibold hover:bg-black hover:text-white transition">Ver mais</button></div>' : '')
    );
  }

  function htmlPerguntas() {
    var itens = [];
    for (var n = 1; n <= 6; n++) {
      var q = get('faq.' + n + '_pergunta'), r = get('faq.' + n + '_resposta');
      if (q && r) itens.push([q, r]);
    }
    if (!itens.length) {
      return '<div class="text-center py-10"><p class="text-gray-600">Ainda não há perguntas sobre este produto.</p>' +
        '<a href="' + esc(whatsLink('Olá! Tenho uma dúvida sobre o produto "' + estado.produto.name + '": ')) + '" target="_blank" rel="noopener" class="inline-block mt-4 text-sm underline underline-offset-2 hover:text-cyan-600">Pergunte pelo WhatsApp</a></div>';
    }
    return '<div class="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">' +
      itens.map(function (it) {
        return '<details class="group p-5"><summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex justify-between gap-4 font-semibold">' +
          esc(it[0]) + '<span aria-hidden="true" class="transition-transform group-open:rotate-45 text-xl leading-none">+</span></summary>' +
          '<p class="text-sm text-gray-700 mt-3 leading-relaxed">' + esc(it[1]).replace(/\n/g, '<br>') + '</p></details>';
      }).join('') + '</div>';
  }

  function htmlAbas() {
    var r = resumoAvaliacoes();
    return (
      '<section class="mt-12" aria-label="Avaliações e perguntas">' +
      '<div class="flex gap-6 border-b border-gray-200" role="tablist">' +
      '<button type="button" role="tab" id="aba-avaliacoes" aria-controls="painel-avaliacoes" aria-selected="true" data-aba="avaliacoes" class="py-3 -mb-px border-b-2 border-black font-semibold">Avaliações' + (r.total ? ' (' + r.total + ')' : '') + '</button>' +
      '<button type="button" role="tab" id="aba-perguntas" aria-controls="painel-perguntas" aria-selected="false" data-aba="perguntas" class="py-3 -mb-px border-b-2 border-transparent text-gray-500 font-semibold">Perguntas</button>' +
      '</div>' +
      '<div id="painel-avaliacoes" role="tabpanel" aria-labelledby="aba-avaliacoes" class="pt-6 scroll-mt-40"><div id="avaliacoes">' + htmlAvaliacoes() + '</div></div>' +
      '<div id="painel-perguntas" role="tabpanel" aria-labelledby="aba-perguntas" class="pt-6 hidden">' + htmlPerguntas() + '</div>' +
      '</section>'
    );
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
      lista.map(function (x) { return '<div class="snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[23%]">' + window.CMS.cardHtml(x) + '</div>'; }).join('') +
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
    // Só com avaliações reais (assets/avaliacoes.json).
    var r = resumoAvaliacoes();
    if (r.total) {
      dados.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.media.toFixed(1), reviewCount: r.total };
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
    var email = get('contact.email');
    var liEmail = $('[data-rodape="email"]');
    liEmail.classList.toggle('hidden', !email);
    if (email) { $('#rodapeEmail').textContent = email; $('#rodapeEmail').href = 'mailto:' + email; }
    $('[data-rodape="horario"]').classList.toggle('hidden', !get('contact.hours'));
    $('#rodapeWhatsBotao').href = get('contact.whatsapp_link') || whatsLink();
    $('#whatsFlutuante').href = whatsLink(estado.produto ? 'Olá! Vi o produto "' + estado.produto.name + '" no site: ' + location.href.split('#')[0] : '');

    // Políticas: só links preenchidos de verdade no painel.
    var politicas = [1, 2, 3].map(function (n) {
      var rotulo = get('footer.link' + n + '_label'), url = get('footer.link' + n + '_url');
      return rotulo && url && url !== '#' ? '<li><a class="hover:text-white hover:underline underline-offset-2" href="' + esc(url) + '">' + esc(rotulo) + '</a></li>' : '';
    }).join('');
    $('#rodapePoliticasLista').innerHTML = politicas;
    $('#rodapePoliticas').classList.toggle('hidden', !politicas);

    $('#rodapePagamentos').innerHTML = htmlPagamentos('text-[11px] font-semibold rounded px-2 py-1 bg-white text-gray-800');
    $('#rodapeRedes').innerHTML = Object.keys(REDES).map(function (k) {
      var url = get('loja.' + k);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + REDES[k][0] + '" class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + REDES[k][1] + '</svg></a>' : '';
    }).join('');
    var cnpj = get('loja.cnpj');
    $('#rodapeCnpj').textContent = cnpj ? ' · CNPJ ' + cnpj : '';

    var chamada = get('loja.newsletter_texto');
    $('#newsletterTexto').classList.toggle('hidden', !chamada);

    // Benefício sem título some.
    $$('[data-beneficio]').forEach(function (el) {
      el.classList.toggle('hidden', !get('loja.beneficio' + el.getAttribute('data-beneficio') + '_titulo'));
    });
  }

  function newsletter() {
    var form = $('#newsletterForm');
    if (!form || form.__ligado) return;
    form.__ligado = true;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var campo = $('#newsletterEmail'), status = $('#newsletterStatus');
      var email = campo.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        status.className = 'text-xs mt-2 min-h-[1rem] text-red-300';
        status.textContent = 'Digite um e-mail válido.';
        campo.focus();
        return;
      }
      var cfg = window.CMS_CONFIG || {};
      status.className = 'text-xs mt-2 min-h-[1rem] text-gray-300';
      status.textContent = 'Enviando…';
      fetch(String(cfg.url || '').replace(/\/+$/, '') + '/rest/v1/newsletter_signups', {
        method: 'POST',
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ email: email, origem: 'produto' }),
      })
        .then(function (r) {
          if (r.ok || r.status === 409) {
            status.className = 'text-xs mt-2 min-h-[1rem] text-emerald-300';
            status.textContent = r.status === 409 ? 'Este e-mail já está inscrito.' : 'Pronto! Você vai receber nossas novidades.';
            campo.value = '';
          } else {
            throw new Error('HTTP ' + r.status);
          }
        })
        .catch(function () {
          status.className = 'text-xs mt-2 min-h-[1rem] text-red-300';
          status.textContent = 'Não foi possível inscrever agora. Tente de novo mais tarde.';
        });
    });
  }

  // A barra aparece quando o botão "Adicionar à sacola" já passou para CIMA
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
    var barra = $('#barraCompra'), alvo = $('#adicionarSacola');
    if (!barra || !alvo) return;
    var fora = alvo.getBoundingClientRect().bottom < 0 && window.innerWidth < 1024;
    if (fora === barra.__fora) return;
    barra.__fora = fora;
    barra.classList.toggle('translate-y-full', !fora);
    barra.setAttribute('aria-hidden', fora ? 'false' : 'true');
    $('#barraAdicionar').tabIndex = fora ? 0 : -1;
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

      var q = t.closest('[data-qtd]');
      if (q) { definirQtd(estado.qtd + Number(q.getAttribute('data-qtd'))); return; }

      if (t.closest('#comprarAgora')) {
        if (adicionarAoCarrinho() && typeof window.finalizarCompra === 'function') window.finalizarCompra();
        return;
      }
      if (t.closest('#adicionarSacola')) {
        if (adicionarAoCarrinho() && typeof window.toggleCart === 'function') window.toggleCart();
        return;
      }
      if (t.closest('#comprarWhats') && !validarTamanho()) { e.preventDefault(); return; }

      var aba = t.closest('[data-aba]');
      if (aba) return trocarAba(aba.getAttribute('data-aba'));
      if (t.closest('[data-aba-link]')) trocarAba('avaliacoes');

      if (t.closest('#verMaisAvaliacoes')) {
        estado.mostrar += POR_PAGINA_AVALIACOES;
        $('#avaliacoes').innerHTML = htmlAvaliacoes();
        return;
      }
      var rel = t.closest('[data-rel]');
      if (rel) {
        var c = $('#carrosselRel');
        c.scrollBy({ left: Number(rel.getAttribute('data-rel')) * c.clientWidth * 0.9, behavior: 'smooth' });
      }
    });

    raiz.addEventListener('change', function (e) {
      if (e.target.id === 'ordemAvaliacoes') {
        estado.ordem = e.target.value;
        $('#avaliacoes').innerHTML = htmlAvaliacoes();
      }
      if (e.target.id === 'qtd') definirQtd(parseInt(e.target.value, 10));
    });

    // Setas do teclado nas abas (padrão de abas acessíveis).
    raiz.addEventListener('keydown', function (e) {
      if (e.target.matches && e.target.matches('[data-aba]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        var outra = e.target.getAttribute('data-aba') === 'avaliacoes' ? 'perguntas' : 'avaliacoes';
        trocarAba(outra);
        $('[data-aba="' + outra + '"]').focus();
      }
    });

    $('#barraAdicionar').addEventListener('click', function () {
      if (adicionarAoCarrinho() && typeof window.toggleCart === 'function') window.toggleCart();
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

  function trocarAba(nome) {
    $$('[data-aba]').forEach(function (b) {
      var ativa = b.getAttribute('data-aba') === nome;
      b.setAttribute('aria-selected', ativa ? 'true' : 'false');
      b.tabIndex = ativa ? 0 : -1;
      b.classList.toggle('border-black', ativa);
      b.classList.toggle('border-transparent', !ativa);
      b.classList.toggle('text-gray-500', !ativa);
    });
    $('#painel-avaliacoes').classList.toggle('hidden', nome !== 'avaliacoes');
    $('#painel-perguntas').classList.toggle('hidden', nome !== 'perguntas');
  }

  function definirQtd(n) {
    estado.qtd = Math.min(20, Math.max(1, isFinite(n) ? n : 1));
    $('#qtd').value = estado.qtd;
    atualizarWhats();
  }

  function atualizarWhats() {
    var a = $('#comprarWhats');
    if (a) a.href = whatsLink(mensagemWhats());
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
      '<div class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">' + htmlGaleria(p) + htmlInfo(p) + '</div>' +
      htmlDescricao(p) + htmlAbas() + htmlRelacionados(p);

    ligarEventos();
    ligarPalco();
    ligarLightbox();
    atualizarWhats();
    barraFixa();
    montarRodape();
    newsletter();
    aplicarSeo(p);
    if (location.hash === '#avaliacoes') trocarAba('avaliacoes');
  }

  function carregarAvaliacoes() {
    return fetch('assets/avaliacoes.json?t=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (todas) {
        var lista = (todas && todas[idDoEndereco()]) || [];
        // Só entra avaliação com nota de 1 a 5 e data: o arquivo é de avaliações reais.
        estado.avaliacoes = Array.isArray(lista)
          ? lista.filter(function (a) { return a && Number(a.nota) >= 1 && Number(a.nota) <= 5 && a.data; })
          : [];
      });
  }

  function iniciar() {
    var avaliacoes = carregarAvaliacoes();
    var montar = function () { avaliacoes.then(render); };
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
