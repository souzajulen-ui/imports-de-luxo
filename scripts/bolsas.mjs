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
import { salvarLote } from './lib-importacao.mjs';

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
  // BL13 em diante: segunda leva (fotos do WhatsApp de 11/11, na ordem em que o
  // computador ordena os nomes: "22.22.23 (1)" vem antes de "22.22.23").
  ['Louis Vuitton', 'Speedy Bandoulière 25', 'Damier', 'Damier Ebène xadrez marrom, alças de couro vermelho, cadeado'],
  ['Chanel', 'Executive Tote', 'Verde Escuro', 'couro croco verde escuro, CC dourado, alças longas'],
  ['Chanel', 'Tote Matelassê', 'Vinho', 'camurça matelassê vinho com CC grande, alças de corrente, com nécessaire'],
  ['Louis Vuitton', 'Wallet on Chain Ivy', 'Monogram', 'Monogram marrom, alça de couro e corrente dourada'],
  ['Chanel', 'Executive Tote', 'Verde Oliva', 'couro croco verde oliva, CC dourado, alças longas'],
  ['Chanel', 'Bucket Matelassê', 'Chocolate', 'couro caviar matelassê chocolate, alça de corrente, com nécessaire'],
  ['Chanel', 'Bucket Matelassê', 'Caramelo', 'couro caviar matelassê caramelo, alça de corrente, com nécessaire'],
  ['Louis Vuitton', 'Alma BB', 'Vinho', 'couro Monogram Empreinte vinho, cadeado'],
  ['Chanel', 'Bucket Matelassê', 'Preta', 'couro caviar matelassê preto, alça de corrente, bolsos laterais'],
  ['Louis Vuitton', 'Vanity', 'Monogram', 'Monogram marrom com couro preto, cadeado, alça de corrente e alça transversal'],
  ['Gucci', 'Horsebit 1955', 'GG', 'lona GG Supreme bege e marrom, couro marrom, fecho Horsebit dourado'],
  ['Louis Vuitton', 'Trunk Messenger', 'Verde Água', 'couro Monogram Taurillon verde água, ferragens prateadas, alça transversal'],
  ['Chanel', 'Vanity', 'Preta Croco', 'couro croco preto brilhante, CC dourado, alça de mão'],
  ['Chanel', 'Vanity', 'Cinza Croco', 'couro croco cinza, CC dourado, alça de mão'],
  ['Chanel', 'Vanity', 'Verde Croco', 'couro croco verde, CC dourado, alça de mão'],
  ['Gucci', 'Ombro GG', 'Preta', 'couro preto com GG perfurado, corrente dourada com GG, alça de ombro'],
  ['Louis Vuitton', 'Alma BB', 'Monogram', 'Monogram marrom, couro natural, cadeado, alça transversal'],
  ['Chanel', 'Bucket Matelassê Pequena', 'Vermelha', 'couro caviar matelassê vermelho, alça de corrente, bolsos laterais'],
  ['Chanel', 'Bucket Matelassê Pequena', 'Cinza', 'couro caviar matelassê cinza, alça de corrente, bolsos laterais'],
];

// Cada leva vira um arquivo SQL próprio. Assim uma leva nova não traz de volta
// uma bolsa que já foi apagada no painel.
const LEVAS = [
  { de: 1, ate: 12, arquivo: '0009_bolsas_louis_vuitton.sql', titulo: 'Migration 9', lote: 'bolsas-1', resumo: 'bolsas Louis Vuitton (sem preço)' },
  { de: 13, ate: 31, arquivo: '0010_bolsas_chanel_lv_gucci.sql', titulo: 'Migration 10', lote: 'bolsas-2', resumo: 'bolsas Chanel, Louis Vuitton e Gucci (sem preço)' },
];

const sql = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");

const todas = BOLSAS.map(([marca, modelo, cor, descricao], i) => {
  const n = String(i + 1).padStart(2, '0');
  const codigo = 'BL' + n;
  const imagem = `assets/img/produtos/bolsas/bl-${n}.webp`;
  const nome = `Bolsa ${marca} ${modelo} ${cor}`;
  const whatsapp = `Bolsa ${marca} ${modelo} (${codigo}) - ${descricao}`;
  const alt = `Bolsa ${marca} ${modelo}, ${descricao}`;
  return {
    id: 'bolsa-' + codigo.toLowerCase(), category: 'bolsas', gender: null,
    name: nome, cart_name: whatsapp, alt, price: 0, image: imagem, gallery: [imagem],
    featured: false, featured_sort: null, sort: 1000 + (i + 1) * 10, active: false,
  };
});

const linhaSql = (p) =>
  `  (${sql(p.id)}, ${sql(p.category)}, ${sql(p.gender)}, ${sql(p.name)}, ${sql(p.cart_name)}, ${sql(p.alt)}, ` +
  `${p.price}, ${sql(p.image)}, ${sql(JSON.stringify(p.gallery))}::jsonb, ${p.featured}, null, ${p.sort}, ${p.active})`;

if (LEVAS[LEVAS.length - 1].ate !== BOLSAS.length) {
  throw new Error(`A última leva termina em ${LEVAS[LEVAS.length - 1].ate}, mas a lista tem ${BOLSAS.length} bolsas.`);
}

for (const leva of LEVAS) {
  const produtos = todas.slice(leva.de - 1, leva.ate);
  const linhas = produtos.map(linhaSql);
  salvarLote({ id: leva.lote, titulo: `${produtos.length} ${leva.resumo}`, produtos });
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
