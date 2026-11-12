// Grava uma leva de produtos para o painel importar com um clique.
//
// Por que existe: cadastrar em massa pelo SQL Editor do Supabase é trabalhoso
// para quem administra a loja. Cada leva vira um arquivo em admin/importacoes/,
// e o painel mostra "Adicionar ao catálogo" enquanto houver leva pendente.
// O painel insere os produtos com o login do administrador e anota que a leva
// foi importada; produtos apagados depois NÃO voltam.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = path.join(ROOT, 'admin', 'importacoes');

// lote: { id, titulo, produtos: [{ id, category, gender, name, cart_name, alt,
//         price, image, gallery, featured, featured_sort, sort, active }] }
export function salvarLote(lote) {
  fs.mkdirSync(PASTA, { recursive: true });
  fs.writeFileSync(path.join(PASTA, lote.id + '.json'), JSON.stringify(lote, null, 2) + '\n');
  const ids = fs
    .readdirSync(PASTA)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  fs.writeFileSync(path.join(PASTA, 'index.json'), JSON.stringify({ lotes: ids }, null, 2) + '\n');
}
