// Marca o HTML do site com atributos data-cms para que o painel possa editar
// textos, imagens e links sem tocar no código. Idempotente: rodar de novo não
// duplica nada (as marcações já aplicadas são detectadas e puladas).
//
// Uso: node scripts/instrument.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES = ['bolsas', 'relogios', 'oculos', 'calcados', 'acessorios', 'cintos'];
const ALL = ['index', ...CATEGORIES, 'pesquisa'];

let changes = 0;
let skipped = 0;
const problems = [];

function edit(file, label, pattern, replacement, { expect = 1, optional = false } = {}) {
  const p = path.join(ROOT, file);
  let html = fs.readFileSync(p, 'utf8');
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  // Contagem precisa exige a flag 'g' — sem ela, match() devolve os grupos de captura.
  const counter = re.flags.includes('g') ? re : new RegExp(re.source, re.flags + 'g');
  const count = (html.match(counter) || []).length;

  if (count === 0) {
    if (!optional) problems.push(`${file}: não encontrei "${label}"`);
    else skipped++;
    return;
  }
  if (expect !== 'any' && count !== expect) {
    problems.push(`${file}: "${label}" apareceu ${count}x (esperado ${expect})`);
    return;
  }
  html = html.replace(re, replacement);
  fs.writeFileSync(p, html, 'utf8');
  changes += count;
}

const already = (file, marker) => fs.readFileSync(path.join(ROOT, file), 'utf8').includes(marker);

// =========================================================== todas as páginas
for (const slug of ALL) {
  const file = `${slug}.html`;

  // --- carrega o runtime do painel
  if (!already(file, 'assets/cms.js')) {
    edit(
      file,
      'scripts do painel',
      /<\/head>/,
      `    <!-- Conteúdo editável pelo painel (/admin) -->\n` +
        `    <script src="assets/cms-config.js"></script>\n` +
        `    <script src="assets/cms.js" defer></script>\n</head>`
    );
  }

  // --- faixa do topo (o aviso muda de página para página)
  edit(
    file,
    'faixa do topo',
    /(<div class="fixed top-0 left-0 w-full z-50 bg-cyan-500[^"]*")(>)\s*([^<]+?)\s*(<\/div>)/,
    '$1 data-cms="topbar.text"$2$3$4',
    { optional: already(file, 'data-cms="topbar.text"') }
  );

  // --- nome da marca no cabeçalho
  edit(
    file,
    'logo textual',
    /IMPORTS <span class="italic font-light">de Luxo<\/span>/g,
    '<span data-cms="brand.name_main">IMPORTS</span> <span class="italic font-light" data-cms="brand.name_accent">de Luxo</span>',
    { expect: 'any', optional: already(file, 'data-cms="brand.name_main"') }
  );

  // --- itens do menu (desktop e mobile)
  const NAV = [
    [1, 'index.html', 'Início'],
    [2, 'bolsas.html', 'Bolsas'],
    [3, 'relogios.html', 'Relógios'],
    [4, 'oculos.html', 'Óculos'],
    [5, 'calcados.html', 'Calçados'],
    [6, 'acessorios.html', 'Acessórios'],
    [7, 'cintos.html', 'Cintos'],
  ];
  for (const [n, href, text] of NAV) {
    edit(
      file,
      `menu ${text}`,
      new RegExp(`<a href="${href}" class="hover:text-cyan-500 transition">${text}</a>`, 'g'),
      `<a href="${href}" class="hover:text-cyan-500 transition" data-cms="nav.${n}_label" data-cms-href="nav.${n}_url">${text}</a>`,
      { expect: 'any', optional: true }
    );
  }

  // --- carrinho
  edit(
    file,
    'título do carrinho',
    /(<h2 class="text-xl (?:font-serif font-bold uppercase tracking-widest|font-bold font-serif)")(>Seu Carrinho<\/h2>)/,
    '$1 data-cms="cart.title"$2',
    { optional: already(file, 'data-cms="cart.title"') }
  );

  // --- número do WhatsApp usado ao finalizar o pedido
  edit(
    file,
    'WhatsApp do carrinho',
    /wa\.me\/5544998214237\?text=/g,
    "wa.me/${(window.CMS && window.CMS.get('contact.whatsapp_number')) || '5544998214237'}?text=",
    { expect: 'any', optional: already(file, "window.CMS && window.CMS.get('contact.whatsapp_number')") }
  );
}

// ============================================================= página inicial
{
  const f = 'index.html';

  // hero — imagens
  edit(
    f,
    'hero imagem mobile (atributo)',
    /(class="block md:hidden w-full h-full object-cover")(>)/,
    '$1 data-cms-src="hero.image_mobile"$2',
    { optional: already(f, 'hero.image_mobile') }
  );
  edit(
    f,
    'hero imagem desktop (atributo)',
    /(class="hidden md:block w-full h-full object-cover object-right")(>)/,
    '$1 data-cms-src="hero.image_desktop"$2',
    { optional: already(f, 'hero.image_desktop') }
  );

  // hero — textos
  edit(
    f,
    'hero texto de destaque',
    /(<span class="text-black uppercase tracking-\[0\.3em\] text-\[13px\] md:text-xs font-bold mb-4 block pt-28")(>)\s*A recompensa do seu sucesso\s*(<\/span>)/,
    '$1 data-cms="hero.eyebrow"$2A recompensa do seu sucesso$3',
    { optional: already(f, 'hero.eyebrow') }
  );
  edit(
    f,
    'hero título',
    /(<h1 class="text-3xl sm:text-4xl md:text-6xl leading-tight font-serif mb-4 ">)\s*O luxo que você merece,\s*\n(\s*)<span class="italic font-light block mt-2 text-3xl sm:text-3xl md:text-5xl underline decoration-cyan-400">\s*agora ao seu alcance\.\s*<\/span>/,
    '$1\n$2<span data-cms="hero.title">O luxo que você merece,</span>\n$2<span class="italic font-light block mt-2 text-3xl sm:text-3xl md:text-5xl underline decoration-cyan-400" data-cms="hero.subtitle">agora ao seu alcance.</span>',
    { optional: already(f, 'hero.title') }
  );
  edit(
    f,
    'hero prova social',
    /(<span class="block text-\[13px\] text-gray-500 uppercase tracking-tighter italic mt-56 md:mt-0")(>)\+ de 1\.000 clientes satisfeitas(<\/span>)/,
    '$1 data-cms="hero.social_proof"$2+ de 1.000 clientes satisfeitas$3',
    { optional: already(f, 'hero.social_proof') }
  );

  // vitrines de categoria: título, link e grade de produtos
  const SECTIONS = [
    ['Bolsas', 'bolsas', 'Bolsas'],
    ['Relogios', 'relogios', 'Relógios'],
    ['Oculos', 'oculos', 'Óculos'],
    ['Calcados', 'calcados', 'Calçados'],
    ['Acessorios', 'acessorios', 'Acessórios'],
    ['Cintos', 'cintos', 'Cintos'],
  ];
  for (const [sectionId, slug, label] of SECTIONS) {
    edit(
      f,
      `título da vitrine ${label}`,
      new RegExp(`(<h2 class="font-serif text-2xl uppercase tracking-widest ml-4")(>)${label}(</h2>)`),
      `$1 data-cms="home.${slug}_title"$2${label}$3`,
      { optional: already(f, `home.${slug}_title`) }
    );
    edit(
      f,
      `link Exibir Mais ${label}`,
      new RegExp(
        `(<a href="${slug}\\.html" class="text-\\[12px\\] uppercase tracking-\\[0\\.2em\\] font-bold border-b border-cyan-500 pb-1 hover:text-cyan-500 transition")(>Exibir Mais</a>)`
      ),
      `$1 data-cms="home.${slug}_link"$2`,
      { optional: already(f, `home.${slug}_link`) }
    );
  }

  // as 6 grades de produtos da home (mesma classe em todas, na ordem das seções)
  if (!already(f, 'data-cms-products="featured')) {
    const p = path.join(ROOT, f);
    let html = fs.readFileSync(p, 'utf8');
    let i = 0;
    html = html.replace(
      /<div class="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-10">/g,
      (m) => {
        const slug = SECTIONS[i] ? SECTIONS[i][1] : null;
        i++;
        return slug
          ? m.replace('>', ` data-cms-products="featured:${slug}" data-cms-limit="4">`)
          : m;
      }
    );
    if (i !== 6) problems.push(`index.html: encontrei ${i} grades de produtos na home (esperado 6)`);
    else {
      fs.writeFileSync(p, html, 'utf8');
      changes += i;
    }
  }

  // benefícios
  const BENEFITS = [
    ['Acabamento Impecável', 1],
    ['Curadoria Premium', 2],
    ['Discrição & Segurança', 3],
  ];
  for (const [title, n] of BENEFITS) {
    edit(
      f,
      `benefício ${n} título`,
      new RegExp(`(<h3 class="font-serif text-2xl mb-4")(>)${title.replace(/&/g, '&')}(</h3>)`),
      `$1 data-cms="beneficios.${n}_title"$2${title}$3`,
      { optional: already(f, `beneficios.${n}_title`) }
    );
  }
  edit(
    f,
    'benefícios textos',
    /(<p class="text-black-500 text-sm leading-relaxed font-light")(>)/g,
    '$1 data-cms-attr="html"$2',
    { expect: 3, optional: already(f, 'beneficios.1_text') }
  );
  // numera os três parágrafos de benefícios
  if (!already(f, 'beneficios.1_text')) {
    const p = path.join(ROOT, f);
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<p class="text-black-500 text-sm leading-relaxed font-light" data-cms-attr="html">/g, () => {
      n++;
      return `<p class="text-black-500 text-sm leading-relaxed font-light" data-cms="beneficios.${n}_text" data-cms-attr="html">`;
    });
    if (n !== 3) problems.push(`index.html: ${n} parágrafos de benefícios (esperado 3)`);
    else {
      fs.writeFileSync(p, html, 'utf8');
      changes += n;
    }
  }

  // seção emocional
  edit(
    f,
    'frase de destaque',
    /(<h2 class="text-3xl md:text-5xl font-serif mb-8 leading-tight italic")(>)Elegância é a única beleza que nunca desaparece\.(<\/h2>)/,
    '$1 data-cms="experiencia.quote"$2Elegância é a única beleza que nunca desaparece.$3',
    { optional: already(f, 'experiencia.quote') }
  );
  edit(
    f,
    'texto da seção emocional',
    /(<p class="text-black-600 text-lg font-light leading-loose mb-10")(>)/,
    '$1 data-cms="experiencia.text" data-cms-attr="html"$2',
    { optional: already(f, 'experiencia.text') }
  );

  // depoimentos
  edit(
    f,
    'título dos depoimentos',
    /(<h2 class="text-center font-serif text-3xl mb-16 uppercase tracking-widest")(>)Relatos de clientes(<\/h2>)/,
    '$1 data-cms="depoimentos.title"$2Relatos de clientes$3',
    { optional: already(f, 'depoimentos.title') }
  );
  if (!already(f, 'depoimentos.1_text')) {
    const p = path.join(ROOT, f);
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<p class="text-gray-600 mb-8 font-light text-sm">/g, () => {
      n++;
      return `<p class="text-gray-600 mb-8 font-light text-sm" data-cms="depoimentos.${n}_text">`;
    });
    let a = 0;
    html = html.replace(/<p class="text-\[10px\] uppercase font-bold tracking-widest">/g, () => {
      a++;
      return `<p class="text-[10px] uppercase font-bold tracking-widest" data-cms="depoimentos.${a}_author">`;
    });
    if (n !== 3 || a !== 3) problems.push(`index.html: depoimentos ${n} textos / ${a} assinaturas (esperado 3/3)`);
    else {
      fs.writeFileSync(p, html, 'utf8');
      changes += n + a;
    }
  }

  // selos de garantia
  if (!already(f, 'garantia.1_text')) {
    const p = path.join(ROOT, f);
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<span class="text-\[10px\] uppercase font-bold tracking-widest">/g, () => {
      n++;
      return `<span class="text-[10px] uppercase font-bold tracking-widest" data-cms="garantia.${n}_text">`;
    });
    if (n !== 4) problems.push(`index.html: ${n} selos de garantia (esperado 4)`);
    else {
      fs.writeFileSync(p, html, 'utf8');
      changes += n;
    }
  }

  // chamada final
  edit(
    f,
    'CTA título',
    /(<h2 class="text-4xl md:text-6xl font-serif mb-8 italic")(>)Faça parte do mundo Imports de Luxo(<\/h2>)/,
    '$1 data-cms="cta.title"$2Faça parte do mundo Imports de Luxo$3',
    { optional: already(f, 'cta.title') }
  );
  edit(
    f,
    'CTA texto',
    /(<p class="text-gray-400 font-light mb-12 text-lg")(>)/,
    '$1 data-cms="cta.text"$2',
    { optional: already(f, 'cta.text') }
  );
  edit(
    f,
    'CTA botão',
    /(<a href="https:\/\/wa\.me\/message\/6AMQ5WF2AWS2L1" class="btn-gold px-12 py-6 text-sm uppercase tracking-\[0\.3em\] font-bold inline-block shadow-xl")(>)\s*acesso ao WhatsApp\s*(<\/a>)/,
    '$1 data-cms="cta.button_label" data-cms-href="cta.button_url"$2acesso ao WhatsApp$3',
    { optional: already(f, 'cta.button_label') }
  );

  // rodapé
  edit(
    f,
    'rodapé marca',
    /(<div class="text-2xl font-serif font-bold mb-6 italic")(>)IMPORTS DE LUXO(<\/div>)/,
    '$1 data-cms="footer.brand"$2IMPORTS DE LUXO$3',
    { optional: already(f, 'footer.brand') }
  );
  edit(
    f,
    'rodapé descrição',
    /(<p class="text-gray-500 text-xs font-light max-w-sm leading-loose uppercase tracking-tighter")(>)/,
    '$1 data-cms="footer.description"$2',
    { optional: already(f, 'footer.description') }
  );
  edit(
    f,
    'rodapé título institucional',
    /(<h4 class="text-\[11px\] font-bold uppercase tracking-widest mb-6")(>)Institucional(<\/h4>)/,
    '$1 data-cms="footer.institucional_title"$2Institucional$3',
    { optional: already(f, 'footer.institucional_title') }
  );
  const FOOTER_LINKS = [
    ['Políticas de Privacidade', 1],
    ['Trocas e Devoluções', 2],
    ['Termos de Uso', 3],
  ];
  for (const [text, n] of FOOTER_LINKS) {
    edit(
      f,
      `rodapé link ${n}`,
      new RegExp(`(<a href="#" class="hover:text-amber-600 transition")(>)${text}(</a>)`),
      `$1 data-cms="footer.link${n}_label" data-cms-href="footer.link${n}_url"$2${text}$3`,
      { optional: already(f, `footer.link${n}_label`) }
    );
  }
  edit(
    f,
    'rodapé título atendimento',
    /(<h4 class="text-\[11px\] font-bold uppercase tracking-widest mb-6")(>)Atendimento(<\/h4>)/,
    '$1 data-cms="footer.atendimento_title"$2Atendimento$3',
    { optional: already(f, 'footer.atendimento_title') }
  );
  edit(
    f,
    'rodapé horário e e-mail',
    /<p class="text-xs text-gray-500 font-light leading-relaxed">\s*Segunda a domingo: 09h às 22h<br>\s*E-mail: reneetartarelli@gmail\.com\s*<\/p>/,
    '<p class="text-xs text-gray-500 font-light leading-relaxed">\n                    <span data-cms="contact.hours">Segunda a domingo: 09h às 22h</span><br>\n                    E-mail: <span data-cms="contact.email">reneetartarelli@gmail.com</span>\n                </p>',
    { optional: already(f, 'data-cms="contact.hours"') }
  );
  edit(
    f,
    'rodapé título pagamento',
    /(<h4 class="text-\[11px\] font-bold uppercase tracking-widest mb-6")(>)Formas de Pagamento(<\/h4>)/,
    '$1 data-cms="footer.payment_title"$2Formas de Pagamento$3',
    { optional: already(f, 'footer.payment_title') }
  );
  if (!already(f, 'footer.pay1')) {
    const p = path.join(ROOT, f);
    let html = fs.readFileSync(p, 'utf8');
    let n = 0;
    html = html.replace(/<img src="([^"]*)" alt="(VISA|Mastercard|Hipercard|Elo|AMEX|Pix)" class="w-full h-auto object-contain">/g, (m, src, alt) => {
      n++;
      return `<img src="${src}" alt="${alt}" class="w-full h-auto object-contain" data-cms-src="footer.pay${n}">`;
    });
    if (n !== 6) problems.push(`index.html: ${n} bandeiras de pagamento (esperado 6)`);
    else {
      fs.writeFileSync(p, html, 'utf8');
      changes += n;
    }
  }
  edit(
    f,
    'rodapé copyright',
    /<p>© 2015 IMPORTS DE LUXO<\/p>/,
    '<p data-cms="footer.copyright">© 2015 IMPORTS DE LUXO</p>',
    { optional: already(f, 'data-cms="footer.copyright"') }
  );
  edit(
    f,
    'botão finalizar (home)',
    /(<button onclick="finalizarCompra\(\)" class="w-full bg-cyan-500 text-white py-4 text-xs uppercase tracking-\[0\.2em\] font-bold hover:bg-black transition")(>)\s*Finalizar Pedido via WhatsApp\s*(<\/button>)/,
    '$1 data-cms="cart.checkout_label"$2Finalizar Pedido via WhatsApp$3',
    { optional: already(f, 'data-cms="cart.checkout_label"') }
  );
}

// ======================================================= páginas de categoria
for (const slug of CATEGORIES) {
  const f = `${slug}.html`;
  edit(
    f,
    'título da página',
    /(<h1 class="text-4xl md:text-6xl font-serif mb-4")(>)/,
    '$1 data-cms="page.title"$2',
    { optional: already(f, 'data-cms="page.title"') }
  );
  edit(
    f,
    'subtítulo da página',
    /(<p class="text-gray-500 uppercase tracking-widest text-xs")(>)/,
    '$1 data-cms="page.subtitle"$2',
    { optional: already(f, 'data-cms="page.subtitle"') }
  );
  edit(
    f,
    'grade de produtos',
    /(<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-8")(>)/,
    `$1 data-cms-products="category:${slug}"$2`,
    { optional: already(f, 'data-cms-products="category:') }
  );
  edit(
    f,
    'copyright',
    /(<p class="text-\[10px\] text-gray-400 uppercase tracking-widest")(>)© 2015 IMPORTS DE LUXO - Todos os direitos reservados(<\/p>)/,
    '$1 data-cms="footer.copyright_long"$2© 2015 IMPORTS DE LUXO - Todos os direitos reservados$3',
    { optional: already(f, 'footer.copyright_long') }
  );
  edit(
    f,
    'botão finalizar',
    /(<button onclick="finalizarCompra\(\)" class="bg-cyan-500 text-white w-full py-3 font-bold hover:bg-cyan-600 transition")(>)Finalizar no WhatsApp(<\/button>)/,
    '$1 data-cms="cart.checkout_label_short"$2Finalizar no WhatsApp$3',
    { optional: already(f, 'cart.checkout_label_short') }
  );
}

// ============================================================ página de busca
{
  const f = 'pesquisa.html';
  edit(
    f,
    'título da busca',
    /<h1 class="text-2xl font-serif mb-8 italic ml-3">Resultados para: <span id="searchLabel"/,
    '<h1 class="text-2xl font-serif mb-8 italic ml-3"><span data-cms="search.heading">Resultados para:</span> <span id="searchLabel"',
    { optional: already(f, 'data-cms="search.heading"') }
  );
  edit(
    f,
    'botão finalizar (busca)',
    /(<button onclick="finalizarCompra\(\)" class="w-full bg-cyan-500 text-white py-4 text-xs uppercase tracking-\[0\.2em\] font-bold hover:bg-cyan-600 transition")(>)Finalizar no WhatsApp(<\/button>)/,
    '$1 data-cms="cart.checkout_label_short"$2Finalizar no WhatsApp$3',
    { optional: already(f, 'cart.checkout_label_short') }
  );
}

// ---------------------------------------------------------------- resultado
if (problems.length) {
  console.error('\nProblemas encontrados:');
  problems.forEach((p) => console.error('  • ' + p));
  process.exitCode = 1;
}
console.log(`\nMarcações aplicadas: ${changes} (${skipped} já estavam no lugar).`);
