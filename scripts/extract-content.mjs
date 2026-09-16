// Lê os arquivos HTML atuais do site e extrai o catálogo real de produtos,
// as galerias de fotos e os ids usados na home. Gera scripts/content.json.
// Uso: node scripts/extract-content.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const CATEGORIES = [
  { slug: 'bolsas', file: 'bolsas.html', label: 'Bolsas' },
  { slug: 'relogios', file: 'relogios.html', label: 'Relógios' },
  { slug: 'oculos', file: 'oculos.html', label: 'Óculos' },
  { slug: 'calcados', file: 'calcados.html', label: 'Calçados' },
  { slug: 'acessorios', file: 'acessorios.html', label: 'Acessórios' },
  { slug: 'cintos', file: 'cintos.html', label: 'Cintos' },
];

const decode = (s) =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? decode(m[1]) : null;
};

// Extrai o literal de objeto `const productGalleries = { ... }` de um HTML.
function extractGalleries(html) {
  const start = html.indexOf('productGalleries = {');
  if (start === -1) return {};
  const open = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return {};
  const literal = html.slice(open, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${literal}`)();
}

// Extrai a lista `const products = [ ... ]` da pesquisa.
function extractSearchList(html) {
  const start = html.indexOf('const products = [');
  if (start === -1) return [];
  const open = html.indexOf('[', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '[') depth++;
    else if (html[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const literal = html.slice(open, end + 1);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${literal}`)();
}

// Extrai os cards `.product` de um HTML.
function extractProductCards(html) {
  const out = [];
  const re = /<div class="product[\s\S]*?<\/button>\s*<\/div>/g;
  const blocks = html.match(re) || [];
  for (const block of blocks) {
    const imgTag = (block.match(/<img[^>]*>/) || [])[0] || '';
    const btnTag = (block.match(/<button[\s\S]*?>/) || [])[0] || '';
    const h3 = decode((block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '').replace(/\s+/g, ' ');
    const priceRaw = decode((block.match(/<p[^>]*>\s*R\$\s*([\d.,]+)\s*<\/p>/) || [])[1] || '');
    const onclick = attr(imgTag, 'onclick') || attr(block.match(/<div class="relative[^"]*"[^>]*>/)?.[0] || '', 'onclick') || '';
    const galleryId = (onclick.match(/openGallery\('([^']+)'\)/) || [])[1] || null;
    const price = priceRaw ? Number(priceRaw.replace(/\./g, '').replace(',', '.')) : Number(attr(btnTag, 'data-price') || 0);
    out.push({
      galleryId,
      name: h3,
      price,
      image: attr(imgTag, 'src'),
      alt: attr(imgTag, 'alt') || h3,
      cartName: attr(btnTag, 'data-name') || h3,
      cartPrice: Number(attr(btnTag, 'data-price') || price || 0),
      cartImage: attr(btnTag, 'data-image') || attr(imgTag, 'src'),
    });
  }
  return out;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// ---------------------------------------------------------------- catálogo
const catalog = new Map(); // id -> produto
const galleries = {};
const byImage = new Map(); // primeira imagem -> id (para casar a home com o catálogo)

for (const cat of CATEGORIES) {
  const html = read(cat.file);
  Object.assign(galleries, extractGalleries(html));
  const cards = extractProductCards(html);
  cards.forEach((card, i) => {
    const id = card.galleryId || slugify(`${cat.slug}-${card.name}`);
    if (catalog.has(id)) return;
    catalog.set(id, {
      id,
      category: cat.slug,
      name: card.name,
      cart_name: card.cartName,
      alt: card.alt,
      price: card.cartPrice || card.price,
      image: card.image,
      sort: i * 10,
      featured: false,
      featured_sort: null,
      active: true,
    });
    if (card.image && !byImage.has(card.image)) byImage.set(card.image, id);
  });
}

// pesquisa.html: garante que nada do catálogo de busca fique de fora
const searchHtml = read('pesquisa.html');
Object.assign(galleries, extractGalleries(searchHtml));
const searchList = extractSearchList(searchHtml);
for (const p of searchList) {
  if (!catalog.has(p.id)) {
    const cat = CATEGORIES.find((c) => p.id.startsWith(c.slug.slice(0, 5))) || null;
    catalog.set(p.id, {
      id: p.id,
      category: cat ? cat.slug : 'outros',
      name: p.name,
      cart_name: p.name,
      alt: p.name,
      price: p.price,
      image: p.image,
      sort: 9990,
      featured: false,
      featured_sort: null,
      active: true,
    });
  }
  if (p.image && !byImage.has(p.image)) byImage.set(p.image, p.id);
}

// ---------------------------------------------------------------- home
const indexHtml = read('index.html');
Object.assign(galleries, extractGalleries(indexHtml));
const homeCards = extractProductCards(indexHtml);
const homeByCategory = {};
let homeSection = null;
// A ordem dos cards na home segue a ordem das seções de categoria.
const sectionOrder = (indexHtml.match(/<section id="(Bolsas|Relogios|Oculos|Calcados|Acessorios|Cintos)"/g) || []).map(
  (m) => m.match(/id="([^"]+)"/)[1].toLowerCase()
);
const perSection = 4;
homeCards.forEach((card, i) => {
  homeSection = sectionOrder[Math.floor(i / perSection)] || 'bolsas';
  const id = byImage.get(card.image) || card.galleryId || slugify(`${homeSection}-${card.name}`);
  (homeByCategory[homeSection] ||= []).push(id);
  if (!catalog.has(id)) {
    catalog.set(id, {
      id,
      category: homeSection,
      name: card.name,
      cart_name: card.cartName,
      alt: card.alt,
      price: card.cartPrice || card.price,
      image: card.image,
      sort: 9990,
      featured: false,
      featured_sort: null,
      active: true,
    });
  }
  // registra galeria da home sob o id canônico
  if (card.galleryId && galleries[card.galleryId] && !galleries[id]) galleries[id] = galleries[card.galleryId];
});

Object.entries(homeByCategory).forEach(([catSlug, ids]) => {
  ids.forEach((id, i) => {
    const p = catalog.get(id);
    if (p) {
      p.featured = true;
      p.featured_sort = i * 10;
    }
  });
});

const products = [...catalog.values()].map((p) => ({ ...p, gallery: galleries[p.id] || (p.image ? [p.image] : []) }));

const result = {
  generatedAt: new Date().toISOString(),
  categories: CATEGORIES,
  products,
  counts: {
    products: products.length,
    featured: products.filter((p) => p.featured).length,
    withGallery: products.filter((p) => p.gallery.length > 1).length,
    byCategory: Object.fromEntries(CATEGORIES.map((c) => [c.slug, products.filter((p) => p.category === c.slug).length])),
  },
};

fs.writeFileSync(path.join(ROOT, 'scripts', 'content.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.counts, null, 2));
