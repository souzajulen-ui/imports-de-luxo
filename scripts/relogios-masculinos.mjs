// Gera supabase/migrations/0007_relogios_masculinos.sql com os Rolex masculinos.
//
// Cada relógio tem um código (RM01, RM02…) que vai na mensagem do WhatsApp,
// junto com a pulseira, o fundo e a luneta, para achar a peça na hora.
// As fotos estão em assets/img/produtos/relogios/rolex-mNN.webp.
//
// Uso: node scripts/relogios-masculinos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
];

const sql = (s) => (s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");
const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const linhas = RELOGIOS.map(([modelo, pulseira, fundo, luneta], i) => {
  const n = String(i + 1).padStart(2, '0');
  const codigo = 'RM' + n;
  const imagem = `assets/img/produtos/relogios/rolex-m${n}.webp`;
  const nome = `Rolex ${modelo} ${maiuscula(fundo.split(' com ')[0])}`;
  const whatsapp = `Relógio Rolex ${modelo} (${codigo}) - pulseira ${pulseira}, fundo ${fundo}, luneta ${luneta}`;
  const alt = `Relógio Rolex ${modelo} masculino, pulseira ${pulseira}, fundo ${fundo}`;
  return (
    `  (${sql('relogio-rolex-' + codigo.toLowerCase())}, 'relogios', 'masculino', ${sql(nome)}, ${sql(whatsapp)}, ${sql(alt)}, ` +
    `${PRECO.toFixed(2)}, ${sql(imagem)}, ${sql(JSON.stringify([imagem]))}::jsonb, false, null, ${1000 + (i + 1) * 10}, true)`
  );
});

const saida = `-- ============================================================================
-- Imports de Luxo — Migration 7: ${RELOGIOS.length} relógios Rolex masculinos (R$ ${PRECO},00).
--
-- Gerado por scripts/relogios-masculinos.mjs — edite lá e rode de novo.
-- Rode no SQL Editor do Supabase DEPOIS da 0006.
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

fs.writeFileSync(path.join(ROOT, 'supabase', 'migrations', '0007_relogios_masculinos.sql'), saida);
console.log(`${RELOGIOS.length} relógios gravados em supabase/migrations/0007_relogios_masculinos.sql`);
