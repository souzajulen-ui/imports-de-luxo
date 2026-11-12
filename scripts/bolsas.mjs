// Gera os SQL das bolsas cadastradas em massa, um arquivo por leva.
//
// Mesma ideia dos relógios: cada bolsa tem um código (BL01, BL02…) que vai
// na mensagem do WhatsApp junto com o material e a cor, para achar a peça.
// As fotos estão em assets/img/produtos/bolsas/bl-NN.webp.
//
// As bolsas entram SEM PREÇO e ESCONDIDAS do site (active = false): o preço é
// colocado no painel, e só então se marca "Visível no site". Assim nenhuma
// bolsa aparece para o cliente custando R$ 0,00.
//
// Uso: node scripts/bolsas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// [marca, modelo, cor no nome do site, descrição para o WhatsApp]
const BOLSAS = [
  // BL01 em diante: primeira leva (image a image copy 11).
  ['Louis Vuitton', 'Pochette Métis East West', 'Preta', 'couro Monogram Empreinte preto, ferragens douradas, alça de couro e corrente'],
  ['Louis Vuitton', 'Pochette Métis East West', 'Creme', 'couro Empreinte creme com monograma rosa e lilás, alça de couro e corrente'],
  ['Louis Vuitton', 'Pochette Métis', 'Rosa', 'couro Monogram Empreinte rosa, ferragens douradas, alça de couro e corrente'],
  ['Louis Vuitton', 'Neverfull', 'Damier', 'Damier Ebène xadrez marrom, forro vermelho, com nécessaire'],
  ['Louis Vuitton', 'OnTheGo PM', 'Monogram Giant', 'Monogram Giant Reverse marrom e caramelo, alça bege e porta-moedas redondo'],
  ['Louis Vuitton', 'Pochette Métis', 'Monogram', 'Monogram marrom, fecho verde, alça transversal'],
  ['Louis Vuitton', 'Neverfull GM', 'Monogram', 'Monogram marrom, couro natural bege, 39 x 32 cm, com nécessaire'],
  ['Louis Vuitton', 'Speedy Bandoulière', 'Azul', 'Monogram azul, couro natural, alça transversal'],
  ['Louis Vuitton', 'Speedy Bandoulière 25', 'Monogram', 'Monogram marrom, couro natural, alça transversal, cadeado'],
  ['Louis Vuitton', 'Capucines Mini', 'Preta Croco', 'couro croco preto brilhante, LV prateado, 14 x 20 cm, alça transversal'],
  ['Louis Vuitton', 'Sunset', 'Jeans', 'Monogram Denim azul, alça de couro'],
  ['Louis Vuitton', 'Passy', 'Monogram', 'Monogram marrom, LV preto, alça com corrente'],
];

// Cada leva vira um arquivo SQL próprio. Assim uma leva nova não traz de volta
// uma bolsa que já foi apagada no painel.
const LEVAS = [{ de: 1, ate: 12, arquivo: '0009_bolsas_louis_vuitton.sql', titulo: 'Migration 9' }];

const sql = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");

const todas = BOLSAS.map(([marca, modelo, cor, descricao], i) => {
  const n = String(i + 1).padStart(2, '0');
  const codigo = 'BL' + n;
  const imagem = `assets/img/produtos/bolsas/bl-${n}.webp`;
  const nome = `Bolsa ${marca} ${modelo} ${cor}`;
  const whatsapp = `Bolsa ${marca} ${modelo} (${codigo}) - ${descricao}`;
  const alt = `Bolsa ${marca} ${modelo}, ${descricao}`;
  return (
    `  (${sql('bolsa-' + codigo.toLowerCase())}, 'bolsas', null, ${sql(nome)}, ${sql(whatsapp)}, ${sql(alt)}, ` +
    `0, ${sql(imagem)}, ${sql(JSON.stringify([imagem]))}::jsonb, false, null, ${1000 + (i + 1) * 10}, false)`
  );
});

if (LEVAS[LEVAS.length - 1].ate !== BOLSAS.length) {
  throw new Error(`A última leva termina em ${LEVAS[LEVAS.length - 1].ate}, mas a lista tem ${BOLSAS.length} bolsas.`);
}

for (const leva of LEVAS) {
  const linhas = todas.slice(leva.de - 1, leva.ate);
  const saida = `-- ============================================================================
-- Imports de Luxo — ${leva.titulo}: ${linhas.length} bolsas, SEM PREÇO e escondidas do site.
--
-- Gerado por scripts/bolsas.mjs — edite lá e rode de novo.
-- Rode no SQL Editor do Supabase.
--
-- No painel: abra cada bolsa, coloque o preço, marque "Visível no site",
-- salve e depois clique em Publicar.
-- Rodar de novo não apaga nem sobrescreve edições feitas no painel.
-- ============================================================================

insert into public.products
  (id, category, gender, name, cart_name, alt, price, image, gallery, featured, featured_sort, sort, active)
values
${linhas.join(',\n')}
on conflict (id) do nothing;
`;
  fs.writeFileSync(path.join(ROOT, 'supabase', 'migrations', leva.arquivo), saida);
  console.log(`BL${String(leva.de).padStart(2, '0')}–BL${String(leva.ate).padStart(2, '0')}: ${linhas.length} bolsas em supabase/migrations/${leva.arquivo}`);
}
