// Gera supabase/migrations/0002_seed.sql a partir do conteúdo real do site
// (scripts/content.json + scripts/content-map.mjs).
// Uso: node scripts/extract-content.mjs && node scripts/generate-seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allBlocks } from './content-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'content.json'), 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const qb = (v) => (v ? 'true' : 'false');
const qn = (v) => (v === null || v === undefined || v === '' ? 'null' : Number(v));

const lines = [];
lines.push('-- ============================================================================');
lines.push('-- Imports de Luxo — Migration 2/2: conteúdo inicial.');
lines.push('-- Gerado automaticamente a partir do site atual por scripts/generate-seed.mjs.');
lines.push(`-- Gerado em: ${new Date().toISOString()}`);
lines.push('-- Rode DEPOIS de 0001_schema.sql.');
lines.push('-- ============================================================================');
lines.push('');

// ------------------------------------------------------------------ blocos --
const blocks = allBlocks();
lines.push(`-- ${blocks.length} campos de texto/imagem editáveis`);
lines.push('insert into public.content_blocks (page_slug, key, label, help, type, value, section, section_label, sort) values');
lines.push(
  blocks
    .map(
      (b) =>
        `  (${q(b.page_slug)}, ${q(b.key)}, ${q(b.label)}, ${q(b.help)}, ${q(b.type)}, ${q(b.value)}, ${q(b.section)}, ${q(
          b.section_label
        )}, ${b.sort})`
    )
    .join(',\n')
);
lines.push('on conflict (page_slug, key) do update set');
lines.push('  label = excluded.label, help = excluded.help, type = excluded.type,');
lines.push('  section = excluded.section, section_label = excluded.section_label, sort = excluded.sort;');
lines.push('-- Obs.: o texto (value) só é gravado na primeira vez. Reexecutar não apaga suas edições.');
lines.push('');

// ---------------------------------------------------------------- produtos --
const products = content.products;
lines.push(`-- ${products.length} produtos reais extraídos das páginas atuais`);
lines.push(
  'insert into public.products (id, category, name, cart_name, alt, price, image, gallery, featured, featured_sort, sort, active) values'
);
lines.push(
  products
    .map(
      (p) =>
        `  (${q(p.id)}, ${q(p.category)}, ${q(p.name)}, ${q(p.cart_name)}, ${q(p.alt)}, ${Number(p.price).toFixed(2)}, ${q(
          p.image
        )}, ${q(JSON.stringify(p.gallery))}::jsonb, ${qb(p.featured)}, ${qn(p.featured_sort)}, ${p.sort}, true)`
    )
    .join(',\n')
);
lines.push('on conflict (id) do nothing;');
lines.push('');

// ------------------------------------------------------------- publicação ---
lines.push('-- Gera o rascunho e publica o conteúdo inicial.');
lines.push("insert into public.site_snapshot (id, data) values ('draft', public.build_snapshot())");
lines.push('  on conflict (id) do update set data = excluded.data, updated_at = now();');
lines.push("insert into public.site_snapshot (id, data) values ('published', public.build_snapshot())");
lines.push('  on conflict (id) do update set data = excluded.data, updated_at = now();');
lines.push('');

const out = path.join(ROOT, 'supabase', 'migrations', '0002_seed.sql');
fs.writeFileSync(out, lines.join('\n'), 'utf8');


console.log(`0002_seed.sql: ${blocks.length} campos, ${products.length} produtos.`);
