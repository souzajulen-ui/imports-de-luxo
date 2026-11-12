// Gera os SQL dos Rolex masculinos, um arquivo por leva (veja LEVAS abaixo).
//
// Cada relógio tem um código (RM01, RM02…) que vai na mensagem do WhatsApp,
// junto com a pulseira, o fundo e a luneta, para achar a peça na hora.
// As fotos estão em assets/img/produtos/relogios/rolex-mNN.webp.
//
// Uso: node scripts/relogios-masculinos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { salvarLote } from './lib-importacao.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRECO = 1590;

// [modelo, pulseira, fundo, luneta]
const RELOGIOS = [
  ['Datejust', 'Jubilee aço', 'prata', 'canelada'],
  ['Datejust', 'Jubilee aço', 'branco com números romanos', 'canelada'],
  ['Datejust', 'Oyster aço', 'verde', 'lisa'],
  ['Datejust', 'Oyster aço', 'preto', 'lisa'],
  ['Datejust', 'Oyster aço', 'prata', 'lisa'],
  ['Datejust', 'Jubilee aço', 'azul', 'lisa'],
  ['Datejust', 'Jubilee aço', 'verde', 'lisa'],
  ['Datejust', 'Jubilee aço', 'verde', 'canelada'],
  ['Oyster Perpetual', 'Oyster aço', 'cinza', 'lisa'],
  ['Datejust', 'President aço', 'cinza escuro', 'canelada'],
  ['Datejust', 'Jubilee aço', 'verde com textura', 'canelada'],
  ['Datejust', 'Jubilee aço', 'azul com textura', 'canelada'],
  ['Datejust', 'Oyster dourada', 'verde oliva com brilhantes', 'canelada dourada'],
  ['Datejust', 'Jubilee aço', 'azul', 'canelada'],
  ['Datejust', 'Jubilee aço e dourado', 'branco', 'canelada dourada'],
  ['Datejust', 'Jubilee aço e rosé', 'chocolate com brilhantes', 'canelada rosé'],
  ['Datejust', 'President dourada', 'champagne', 'canelada dourada'],
  ['Datejust', 'Jubilee aço e dourado', 'azul', 'canelada dourada'],
  ['Datejust', 'Jubilee aço e rosé', 'chocolate', 'canelada rosé'],
  ['Datejust', 'Jubilee aço', 'azul tiffany', 'canelada'],
  // RM21 em diante: segunda leva (image copy 22 a 35).
  ['Sky-Dweller', 'Jubilee aço', 'verde menta', 'canelada'],
  ['Sky-Dweller', 'couro marrom, caixa rosé', 'chocolate com números', 'canelada rosé'],
  ['Sky-Dweller', 'Jubilee dourada', 'champagne', 'canelada dourada'],
  ['Sky-Dweller', 'Jubilee dourada', 'preto', 'canelada dourada'],
  ['Sky-Dweller', 'borracha preta, caixa aço', 'preto', 'canelada'],
  ['Sky-Dweller', 'Jubilee aço e dourado', 'champagne', 'canelada dourada'],
  ['Sky-Dweller', 'borracha preta, caixa aço', 'branco', 'canelada'],
  ['Sky-Dweller', 'Jubilee aço', 'azul', 'canelada'],
  ['Sky-Dweller', 'Jubilee aço', 'branco', 'canelada'],
  ['Sky-Dweller', 'Jubilee aço e dourado', 'preto', 'canelada dourada'],
  ['Sky-Dweller', 'Jubilee aço e dourado', 'champagne', 'canelada dourada'],
  ['Sky-Dweller', 'Oyster aço e dourado', 'branco', 'canelada dourada'],
  ['Sky-Dweller', 'Oyster aço', 'preto', 'canelada'],
  ['Sky-Dweller', 'borracha preta, caixa dourada', 'preto', 'canelada dourada'],
  // RM35 em diante: terceira leva (image copy 36 a 56).
  ['Daytona', 'Oyster aço', 'preto com mostradores brancos', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'preto', 'aço'],
  ['Daytona', 'Oyster aço', 'cinza com mostradores pretos', 'aço'],
  ['Daytona', 'Oyster aço', 'azul gelo', 'cerâmica marrom'],
  ['Daytona', 'Oyster rosé', 'preto com mostradores rosé', 'rosé'],
  ['Daytona', 'Oyster aço e dourado', 'preto', 'dourada'],
  ['Daytona', 'Oyster aço e dourado', 'branco', 'dourada'],
  ['Daytona', 'Oyster dourada', 'champagne com mostradores pretos', 'dourada'],
  ['Daytona', 'Oyster dourada', 'verde com mostradores champagne', 'dourada'],
  ['Daytona', 'Oyster aço', 'cinza com mostradores pretos', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'preto', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'branco com mostradores pretos', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'preto com mostradores brancos', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'cinza com mostradores pretos', 'aço'],
  ['Daytona', 'borracha preta, caixa aço', 'branco com mostradores pretos', 'cerâmica preta'],
  ['Daytona', 'Oyster aço', 'branco', 'aço'],
  // GMT-Master II: o fundo é sempre preto, o que muda é a luneta. Por isso o
  // 5º campo dá o nome exibido no site.
  ['GMT-Master II', 'Oyster aço', 'preto', 'azul e vermelha', 'Azul e Vermelho'],
  ['GMT-Master II', 'Jubilee aço e dourado', 'preto', 'preta com números dourados', 'Preto e Dourado'],
  ['GMT-Master II', 'Jubilee aço', 'preto', 'preta e cinza', 'Preto e Cinza'],
  ['GMT-Master II', 'Oyster aço', 'preto', 'verde e preta, coroa do lado esquerdo', 'Verde e Preto'],
  ['GMT-Master II', 'Oyster aço', 'preto', 'vermelha e preta', 'Vermelho e Preto'],
];

// Cada leva vira um arquivo SQL próprio. Assim uma leva nova não traz de volta
// um relógio que já foi apagado no painel.
const LEVAS = [
  { de: 1, ate: 34, arquivo: '0007_relogios_masculinos.sql', titulo: 'Migration 7', depois: '0006',
    lote: 'relogios-masculinos-1', resumo: 'relógios masculinos (Datejust e Sky-Dweller)' },
  { de: 35, ate: 55, arquivo: '0008_relogios_masculinos_daytona_gmt.sql', titulo: 'Migration 8', depois: '0007',
    lote: 'relogios-masculinos-2', resumo: 'relógios masculinos (Daytona e GMT-Master II)' },
];

const sql = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const todas = RELOGIOS.map(([modelo, pulseira, fundo, luneta, destaque], i) => {
  const n = String(i + 1).padStart(2, '0');
  const codigo = 'RM' + n;
  const imagem = `assets/img/produtos/relogios/rolex-m${n}.webp`;
  const nome = `Rolex ${modelo} ${destaque || maiuscula(fundo.split(' com ')[0])}`;
  const whatsapp = `Relógio Rolex ${modelo} (${codigo}) - pulseira ${pulseira}, fundo ${fundo}, luneta ${luneta}`;
  const alt = `Relógio Rolex ${modelo} masculino, pulseira ${pulseira}, fundo ${fundo}`;
  return {
    id: 'relogio-rolex-' + codigo.toLowerCase(), category: 'relogios', gender: 'masculino',
    name: nome, cart_name: whatsapp, alt, price: PRECO, image: imagem, gallery: [imagem],
    featured: false, featured_sort: null, sort: 1000 + (i + 1) * 10, active: true,
  };
});

const linhaSql = (p) =>
  `  (${sql(p.id)}, ${sql(p.category)}, ${sql(p.gender)}, ${sql(p.name)}, ${sql(p.cart_name)}, ${sql(p.alt)}, ` +
  `${p.price.toFixed(2)}, ${sql(p.image)}, ${sql(JSON.stringify(p.gallery))}::jsonb, ${p.featured}, null, ${p.sort}, ${p.active})`;

if (LEVAS[LEVAS.length - 1].ate !== RELOGIOS.length) {
  throw new Error(`A última leva termina em ${LEVAS[LEVAS.length - 1].ate}, mas a lista tem ${RELOGIOS.length} relógios.`);
}

for (const leva of LEVAS) {
  const produtos = todas.slice(leva.de - 1, leva.ate);
  const linhas = produtos.map(linhaSql);
  salvarLote({ id: leva.lote, titulo: `${produtos.length} ${leva.resumo}`, produtos });
  const saida = `-- ============================================================================
-- Imports de Luxo — ${leva.titulo}: ${linhas.length} relógios Rolex masculinos (R$ ${PRECO},00).
--
-- Gerado por scripts/relogios-masculinos.mjs — edite lá e rode de novo.
-- Rode no SQL Editor do Supabase DEPOIS da ${leva.depois}.
--
-- Os relógios entram no RASCUNHO. Confira no painel e clique em Publicar.
-- Rodar de novo não apaga nem sobrescreve edições feitas no painel.
-- ============================================================================

insert into public.products
  (id, category, gender, name, cart_name, alt, price, image, gallery, featured, featured_sort, sort, active)
values
${linhas.join(',\n')}
on conflict (id) do nothing;
`;
  fs.writeFileSync(path.join(ROOT, 'supabase', 'migrations', leva.arquivo), saida);
  console.log(`RM${String(leva.de).padStart(2, '0')}–RM${leva.ate}: ${linhas.length} relógios em supabase/migrations/${leva.arquivo}`);
}
