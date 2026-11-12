// Gera as levas de calçados cadastrados em massa (mesma ideia das bolsas).
//
// Cada calçado tem um código (CL01, CL02…) que vai na mensagem do WhatsApp,
// junto com material e cor. Fotos em assets/img/produtos/calcados/cl-NN.webp.
// Entram SEM PREÇO e ESCONDIDOS do site: o preço é colocado no painel, e só
// então se marca "Visível no site".
//
// Uso: node scripts/calcados.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { salvarLote } from './lib-importacao.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// [tipo, marca, modelo, cor no nome do site, descrição para o WhatsApp]
const CALCADOS = [
  // CL01 em diante: primeira leva (fotos do WhatsApp de 11/11, na ordem do computador).
  ['Tênis', 'Chanel', '', 'Preto e Branco', 'camurça preta e branco, CC na lateral, cadarço trançado'],
  ['Sapato', 'Chanel', 'Slingback', 'Marrom', 'camurça marrom café, bico bege com CC dourado, salto bloco'],
  ['Sapato', 'Chanel', 'Slingback', 'Vinho', 'camurça vinho, bico verde menta com CC dourado, salto bloco'],
];

const LEVAS = [
  { de: 1, ate: 3, arquivo: '0011_calcados_chanel.sql', titulo: 'Migration 11', lote: 'calcados-1', resumo: 'calçados Chanel (sem preço)' },
];

const sql = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");

const todos = CALCADOS.map(([tipo, marca, modelo, cor, descricao], i) => {
  const n = String(i + 1).padStart(2, '0');
  const codigo = 'CL' + n;
  const imagem = `assets/img/produtos/calcados/cl-${n}.webp`;
  const base = [tipo, marca, modelo].filter(Boolean).join(' ');
  return {
    id: 'calcado-' + codigo.toLowerCase(), category: 'calcados', gender: null,
    name: `${base} ${cor}`, cart_name: `${base} (${codigo}) - ${descricao}`, alt: `${base}, ${descricao}`,
    price: 0, image: imagem, gallery: [imagem],
    featured: false, featured_sort: null, sort: 1000 + (i + 1) * 10, active: false,
  };
});

const linhaSql = (p) =>
  `  (${sql(p.id)}, ${sql(p.category)}, ${sql(p.gender)}, ${sql(p.name)}, ${sql(p.cart_name)}, ${sql(p.alt)}, ` +
  `${p.price}, ${sql(p.image)}, ${sql(JSON.stringify(p.gallery))}::jsonb, ${p.featured}, null, ${p.sort}, ${p.active})`;

if (LEVAS[LEVAS.length - 1].ate !== CALCADOS.length) {
  throw new Error(`A última leva termina em ${LEVAS[LEVAS.length - 1].ate}, mas a lista tem ${CALCADOS.length} calçados.`);
}

for (const leva of LEVAS) {
  const produtos = todos.slice(leva.de - 1, leva.ate);
  salvarLote({ id: leva.lote, titulo: `${produtos.length} ${leva.resumo}`, produtos });
  const saida = `-- ============================================================================
-- Imports de Luxo — ${leva.titulo}: ${produtos.length} calçados, SEM PREÇO e escondidos do site.
--
-- Gerado por scripts/calcados.mjs. O jeito normal de cadastrar é o botão
-- "Adicionar ao catálogo" do painel; este SQL é a alternativa manual.
-- Rodar de novo não apaga nem sobrescreve edições feitas no painel.
-- ============================================================================

insert into public.products
  (id, category, gender, name, cart_name, alt, price, image, gallery, featured, featured_sort, sort, active)
values
${produtos.map(linhaSql).join(',\n')}
on conflict (id) do nothing;
`;
  fs.writeFileSync(path.join(ROOT, 'supabase', 'migrations', leva.arquivo), saida);
  console.log(`CL${String(leva.de).padStart(2, '0')}–CL${String(leva.ate).padStart(2, '0')}: ${produtos.length} calçados em supabase/migrations/${leva.arquivo}`);
}
