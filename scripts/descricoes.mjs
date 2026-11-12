// Gera o nome completo e a descrição de cada produto, e grava como uma leva
// de ajuste (admin/importacoes/descricoes-1.json) que o painel aplica com o
// botão "Adicionar ao catálogo".
//
// Regra: só a informação que já está no cadastro (nome, mensagem do WhatsApp,
// modelo, cor, material). Nada de material, peso, garantia ou acompanhamento
// inventado. O painel só preenche o que estiver VAZIO: o que você escreveu à
// mão em "Editar produto" nunca é sobrescrito.
//
// Uso: node scripts/descricoes.mjs [número da leva]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { salvarLote } from './lib-importacao.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lote = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'admin', 'importacoes', id + '.json'), 'utf8'));

// ---------------------------------------------------------------- montagem
// No nome completo, algumas características precisam do rótulo para fazer
// sentido ("fundo prata"); outras não ("dourada").
const ROTULO_NO_NOME = {
  Pulseira: 'pulseira ', Caixa: 'caixa ', Mostrador: 'fundo ', Fundo: 'fundo ', Luneta: 'luneta ',
  Lentes: 'lentes ', Armação: 'armação ', Estampa: 'estampa ', Acabamento: 'acabamento ', Ferragens: 'ferragens ',
};

function montar(base, specs, codigo) {
  const nome = base + (specs.length ? ' – ' + specs.map(([k, v]) => (ROTULO_NO_NOME[k] || '') + v).join(', ') : '');
  const linhas = specs.map(([k, v]) => `${k}: ${v.charAt(0).toUpperCase() + v.slice(1)}`);
  if (codigo) linhas.push(`Código: ${codigo}`);
  const descricao = base + '.' + (linhas.length ? '\n\n' + linhas.join('\n') : '');
  return { full_name: nome, description: descricao };
}

// ------------------------------------------------- levas que eu cadastrei
// A mensagem do WhatsApp segue um padrão: "Base (CÓDIGO) - detalhe, detalhe…".
function partes(cartName) {
  const m = cartName.match(/^(.*?)\s*\(([A-Z]{2}\d{2,})\)\s*-\s*(.*)$/);
  if (!m) throw new Error('fora do padrão: ' + cartName);
  return { base: m[1].trim(), codigo: m[2], detalhe: m[3].trim() };
}

function relogioRolex(p) {
  const { base, codigo, detalhe } = partes(p.cart_name);
  const PREFIXOS = [['pulseira ', 'Pulseira'], ['caixa ', 'Caixa'], ['fundo ', 'Mostrador'], ['luneta ', 'Luneta']];
  const specs = [];
  detalhe.split(', ').forEach((seg) => {
    const achado = PREFIXOS.find(([pre]) => seg.startsWith(pre));
    if (achado) specs.push([achado[1], seg.slice(achado[0].length)]);
    else specs[specs.length - 1][1] += ', ' + seg; // ex.: "coroa do lado esquerdo" continua a luneta
  });
  return montar(base + ' masculino', specs, codigo);
}

function materialEDetalhes(p) {
  const { base, codigo, detalhe } = partes(p.cart_name);
  const [primeiro, ...resto] = detalhe.split(', ');
  const specs = [['Material e cor', primeiro]];
  if (resto.length) specs.push(['Detalhes', resto.join(', ')]);
  return montar(base, specs, codigo);
}

const saida = {};
for (const id of ['relogios-masculinos-1', 'relogios-masculinos-2']) lote(id).produtos.forEach((p) => (saida[p.id] = relogioRolex(p)));
for (const id of ['bolsas-1', 'bolsas-2', 'calcados-1']) lote(id).produtos.forEach((p) => (saida[p.id] = materialEDetalhes(p)));

// ------------------------------------------------------ produtos antigos
// Escritos um a um a partir do nome e da mensagem do WhatsApp de cada peça.
// [frase base, [[característica, valor], …]]
const ANTIGOS = {
  // Acessórios
  'acessorio-cartier-1': ['Pulseira Cartier modelo tradicional', [['Cor', 'dourada']]],
  'acessorio-cartier-2': ['Pulseira Cartier Juste un Clou', [['Cor', 'dourada']]],
  'acessorio-tiffany-1': ['Pulseira Tiffany HardWear', [['Cor', 'dourada']]],
  'acessorio-tiffany-2': ['Pulseira Tiffany Knot', [['Cor', 'ouro amarelo'], ['Detalhe', 'com pedra']]],
  'acessorio-tiffany-11': ['Pulseira Tiffany Knot', [['Cor', 'ouro amarelo']]],
  'acessorio-tiffany-12': ['Pulseira Tiffany Knot', [['Cor', 'prata'], ['Detalhe', 'com pedra']]],
  'acessorio-tiffany-13': ['Pulseira Tiffany Knot', [['Cor', 'rosé'], ['Detalhe', 'com pedra']]],
  'acessorio-tiffany-14': ['Pulseira Tiffany Knot', [['Cor', 'rosé']]],
  'acessorio-tiffany-3': ['Colar Tiffany Laço', [['Cor', 'dourada']]],
  'acessorio-tiffany-5': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'ouro amarelo'], ['Detalhe', 'com pedras']]],
  'acessorio-tiffany-6': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'ouro amarelo'], ['Detalhe', 'cravejado em pedras']]],
  'acessorio-tiffany-7': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'prata'], ['Detalhe', 'com pedras']]],
  'acessorio-tiffany-8': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'prata'], ['Detalhe', 'cravejado em pedras']]],
  'acessorio-tiffany-9': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'rosé'], ['Detalhe', 'com pedras']]],
  'acessorio-tiffany-10': ['Bracelete Tiffany Lock versão Narrow', [['Cor', 'rosé'], ['Detalhe', 'cravejado em pedras']]],
  'acessorio-tiffany-4': ['Bracelete Tiffany Bone', [['Cor', 'prata']]],
  'acessorio-swarovski-1': ['Pulseira Swarovski Una', [['Cor', 'prata']]],
  'acessorio-hermes-1': ['Pulseira Hermès', []],
  'acessorio-bulgari-1': ['Pulseira Bvlgari Serpenti Viper', [['Cor', 'prata']]],
  // Bolsas
  'bolsas-bolsa-chanel-nokr': ['Bolsa Chanel', [['Cor', 'preta']]],
  'bolsas-bolsa-chanel-yvae': ['Bolsa Chanel', [['Cor', 'branca']]],
  'bolsa-chanel-small': ['Bolsa Chanel Small 25', [['Cores', 'branca e dourada']]],
  'bolsa-dior-book-tote': ['Bolsa Dior Book Tote', [['Cor', 'azul']]],
  'bolsa-gucci-dionysus': ['Bolsa Gucci Dionysus', [['Estampa', 'GG tradicional']]],
  'bolsa-gucci-giglio': ['Bolsa Gucci Giglio Large', [['Cor', 'marrom']]],
  'bolsa-gucci-tiracolo': ['Bolsa tiracolo Gucci GG', [['Cor', 'preta']]],
  'bolsa-louis-vuitton-keepall': ['Bolsa Louis Vuitton Keepall', [['Versão', 'clássica']]],
  'bolsa-miu-miu-aventure': ['Bolsa Miu Miu Aventure', [['Cor', 'marrom']]],
  'bolsa-saint-laurent-college': ['Bolsa Saint Laurent College', [['Material', 'couro matelassê']]],
  'bolsa-saint-laurent-loulou-2': ['Bolsa Saint Laurent Loulou', [['Cores', 'branca e dourada'], ['Tamanho', '30 cm']]],
  'bolsa-saint-laurent-loulou-1': ['Bolsa Saint Laurent Loulou', [['Material e cor', 'couro preto'], ['Tamanho', '30 cm']]],
  'bolsa-valentino-garavani': ['Bolsa Valentino Garavani', [['Cores', 'preta e dourada']]],
  'bolsa-miu-miu-wander': ['Bolsa Miu Miu Wander', [['Material', 'couro matelassê'], ['Cor', 'branca']]],
  'bolsa-ysl-mini': ['Bolsa Saint Laurent Le 5 à 7 Mini', [['Material e cor', 'couro preto'], ['Ferragens', 'douradas']]],
  'bolsa-ysl-sacola': ['Bolsa sacola Saint Laurent', [['Cor', 'preta']]],
  // Calçados
  'calcado-chanel-1': ['Sapatilha Chanel clássica', [['Cores', 'bege e preta']]],
  'calcado-lv-1': ['Bota de cano alto Louis Vuitton Biker', [['Cor', 'preta']]],
  'calcado-lv-2': ['Bota de cano alto Louis Vuitton Biker', [['Cor', 'marrom']]],
  'calcado-dolce-1': ['Sandália Dolce & Gabbana Keira', [['Detalhe', 'logo barroco dourado']]],
  'calcado-givenchy-1': ['Bota de cano alto Givenchy', [['Material e cor', 'couro preto']]],
  'calcado-gucci-7': ['Bota Gucci', [['Cor', 'preta']]],
  'calcado-gucci-1': ['Tênis Gucci Screener', [['Versão', 'tradicional']]],
  'calcado-gucci-2': ['Tênis Gucci Screener', [['Cor', 'branca']]],
  'calcado-hermes-1': ['Bota Hermès', [['Material e cor', 'camurça preta']]],
  'calcado-hermes-2': ['Bota Hermès', [['Material e cor', 'camurça bege']]],
  'calcado-hermes-3': ['Bota Hermès de cano baixo', [['Cor', 'preta']]],
  'calcado-hermes-4': ['Bota Hermès', [['Material e cor', 'couro preto']]],
  'calcado-newbalance-1': ['Tênis New Balance x Miu Miu', [['Cor', 'branca']]],
  'calcado-prada-5': ['Bota Prada', [['Cor', 'preta']]],
  'calcado-prada-4': ['Sandália Prada de crochê', [['Cor', 'bege']]],
  'calcado-caovilla-1': ['Sandália de salto René Caovilla Cleo', [['Cor', 'bege']]],
  'calcado-saint-laurent-5': ['Bota Saint Laurent', []],
  'calcado-gucci-5': ['Sapato de salto Gucci', [['Cor', 'preta']]],
  'calcado-saint-laurent-1': ['Sapato de salto Saint Laurent', []],
  'calcado-valentino-2': ['Sapato de salto Valentino Slingback', [['Cores', 'preta e vermelha']]],
  'calcado-valentino-3': ['Sapato de salto Valentino VLogo Signature', [['Material', 'couro envernizado'], ['Cor', 'rosa cannelle']]],
  'calcado-gucci-3': ['Scarpin Gucci', [['Versão', 'tradicional']]],
  'calcado-gucci-4': ['Scarpin Gucci', [['Material', 'couro envernizado'], ['Cor', 'vermelha']]],
  'calcado-gucci-6': ['Scarpin Gucci', [['Material', 'couro envernizado'], ['Cor', 'preta']]],
  'calcado-miu-miu-1': ['Scarpin Miu Miu', [['Material', 'couro escovado'], ['Cor', 'preta']]],
  'calcado-miu-miu-2': ['Scarpin Miu Miu', [['Material', 'couro envernizado'], ['Cor', 'vermelha']]],
  'calcado-prada-1': ['Scarpin Prada', [['Material e cor', 'couro branco']]],
  'calcado-prada-2': ['Scarpin Prada', [['Material', 'couro escovado'], ['Cor', 'preta']]],
  'calcado-prada-3': ['Scarpin Prada', [['Material', 'couro escovado'], ['Cor', 'bege']]],
  'calcado-saint-laurent-2': ['Scarpin Saint Laurent', [['Cor', 'marrom']]],
  'calcado-saint-laurent-4': ['Scarpin Saint Laurent', [['Cor', 'preta']]],
  'calcado-valentino-1': ['Sandália Valentino Rockstud', [['Cor', 'branca']]],
  'calcado-valentino-4': ['Sandália Valentino Rockstud', [['Cor', 'preta']]],
  'calcado-valentino-5': ['Sandália Valentino Rockstud', [['Cor', 'dourada']]],
  'calcado-valentino-6': ['Bota Valentino VLogo Signature', [['Cor', 'preta']]],
  'calcado-saint-laurent-3': ['Sandália Saint Laurent Opyum', [['Material', 'couro envernizado']]],
  // Cintos
  'cinto-chloe': ['Cinto Chloé', [['Cor', 'marrom']]],
  'cinto-gucci-preto': ['Cinto Gucci', [['Cor', 'preta']]],
  'cinto-gucci-rosa': ['Cinto Gucci', [['Cor', 'rosa-claro']]],
  'cinto-valentino-preto': ['Cinto Valentino Garavani', [['Cor', 'preta'], ['Detalhe', 'logo dourado']]],
  'cinto-valentino-branco': ['Cinto Valentino Garavani', [['Cores', 'branca e rosé'], ['Detalhe', 'logo dourado']]],
  'cinto-lv-tradicional': ['Cinto Louis Vuitton', [['Versão', 'tradicional']]],
  'cinto-lv-preto': ['Cinto Louis Vuitton', [['Cor', 'preta']]],
  'cinto-lv-preto-quadriculado': ['Cinto Louis Vuitton', [['Cor', 'preta'], ['Estampa', 'quadriculada'], ['Detalhe', 'logo prateado']]],
  'cinto-hermes-branco': ['Cinto Hermès Kelly', [['Cor', 'branca']]],
  'cinto-hermes-preto': ['Cinto Hermès Kelly', [['Cor', 'preta']]],
  'cinto-gucci-branco': ['Cinto Gucci Double G', [['Cor', 'branca']]],
  'cinto-dior-montaigne': ['Cinto Dior Montaigne', [['Detalhe', 'reversível']]],
  'cinto-dior-saddle': ['Cinto Christian Dior Saddle', [['Cor', 'branca'], ['Detalhe', 'logo dourado']]],
  'cinto-ysl': ['Cinto Saint Laurent', [['Cor', 'preta'], ['Detalhe', 'logo dourado']]],
  // Óculos
  'oculos-miu-miu-1': ['Óculos Miu Miu Regard oval', [['Armação', 'tartaruga'], ['Lentes', 'marrom']]],
  'oculos-miu-miu-2': ['Óculos Miu Miu Glimpse', [['Cor', 'preta'], ['Detalhe', 'logo dourado']]],
  'oculos-miu-miu-3': ['Óculos Miu Miu Eyewear oval', [['Detalhe', 'logo em metal dourado']]],
  'Miu Miu Aube': ['Óculos Miu Miu Aube', [['Lentes', 'cinza']]],
  'Miu Miu Aube-2': ['Óculos Miu Miu Aube', [['Lentes', 'rosé']]],
  'Miu Miu Glimpse': ['Óculos Miu Miu Glimpse', [['Armação', 'tartaruga']]],
  'oculos-bottega-1': ['Óculos de sol Bottega Veneta Sardine Aviator', [['Armação', 'dourada'], ['Lentes', 'cor chá']]],
  'oculos-bottega-2': ['Óculos de sol Bottega Veneta Angle Cat', [['Cor', 'marrom']]],
  'Chanel Gatinho': ['Óculos Chanel gatinho', [['Cores', 'preta e branca']]],
  'Chanel Gatinho-2': ['Óculos Chanel gatinho', [['Cores', 'preta e bege']]],
  'oculos-cartier-1': ['Óculos Cartier Panthère', [['Lentes', 'cinza'], ['Acabamento', 'dourado']]],
  'Celine Triomphe': ['Óculos Celine Triomphe', [['Armação', 'tartaruga']]],
  'Gucci geométrico': ['Óculos Gucci geométrico', [['Lentes', 'cinza']]],
  'Prada Symbole oversized': ['Óculos Prada Symbole oversized', [['Cor', 'preta']]],
  'oculos-tom-ford-1': ['Óculos Tom Ford Falconer', [['Armação', 'tartaruga'], ['Lentes', 'marrom']]],
  'oculos-tom-ford-2': ['Óculos Tom Ford Icon Pilot', [['Cor', 'preta']]],
  'oculos-treasure-1': ['Óculos Dior Treasure', [['Cor', 'preta']]],
  'oculos-valentino-1': ['Óculos de sol Valentino geométrico', [['Detalhe', 'corrente com logo V']]],
  'oculos-YSL-1': ['Óculos de sol Saint Laurent SL', [['Cor', 'preta']]],
  // Relógios
  'relogio-cartier-panthe-1': ['Relógio Cartier Panthère', [['Material', 'aço'], ['Detalhe', 'com pedra']]],
  'relogio-cartier-panthe-2': ['Relógio Cartier Panthère', [['Cor', 'dourada']]],
  'relogio-cartier-panthe-3': ['Relógio Cartier Panthère', [['Cores', 'aço e dourado']]],
  'relogio-cartier-ballon-prata': ['Relógio Cartier Ballon Bleu', [['Material', 'aço'], ['Cor', 'prata']]],
  'relogio-cartier-ballon-dourado': ['Relógio Cartier Ballon Bleu', [['Cor', 'dourada']]],
  'relogio-cartier-baignoire': ['Relógio Cartier Baignoire', [['Cor', 'dourada']]],
  'relogio-bulgari-serpenti': ['Relógio Bvlgari Serpenti', [['Cor', 'misto (dois tons)'], ['Fundo', 'branco'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-8': ['Relógio Bvlgari Serpenti', [['Material', 'aço'], ['Fundo', 'branco'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-9': ['Relógio Bvlgari Serpenti', [['Material', 'aço'], ['Fundo', 'preto'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-10': ['Relógio Bvlgari Serpenti', [['Cor', 'rosé'], ['Fundo', 'branco'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-11': ['Relógio Bvlgari Serpenti', [['Cor', 'rosé'], ['Fundo', 'preto'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-12': ['Relógio Bvlgari Serpenti', [['Cor', 'dourada'], ['Fundo', 'branco'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-13': ['Relógio Bvlgari Serpenti', [['Cores', 'rosé e aço'], ['Fundo', 'branco'], ['Pulseira', 'tamanho menor']]],
  'relogio-bulgari-serpenti-3': ['Relógio Bvlgari Serpenti', [['Cores', 'rosé e aço'], ['Fundo', 'branco']]],
  'relogio-bulgari-serpenti-2': ['Relógio Bvlgari Serpenti', [['Cor', 'dourada'], ['Fundo', 'preto']]],
  'relogio-bulgari-serpenti-4': ['Relógio Bvlgari Serpenti', [['Material', 'aço'], ['Fundo', 'preto']]],
  'relogio-bulgari-serpenti-5': ['Relógio Bvlgari Serpenti', [['Material', 'aço'], ['Fundo', 'branco']]],
  'relogio-bulgari-serpenti-6': ['Relógio Bvlgari Serpenti', [['Cor', 'dourada'], ['Fundo', 'branco']]],
  'relogio-bulgari-serpenti-14': ['Relógio Bvlgari Serpenti', [['Cor', 'misto (dois tons)'], ['Fundo', 'branco']]],
  'relogio-bulgari-serpenti-7': ['Relógio Bvlgari Serpenti', [['Cor', 'preta'], ['Fundo', 'preto']]],
  'relogio-bulgari-seductori': ['Relógio Bvlgari Serpenti Seduttori', [['Cor', 'dourada'], ['Detalhe', 'com pedra']]],
  'relogio-bulgari-seductori-1': ['Relógio Bvlgari Serpenti Seduttori', [['Cor', 'misto (dois tons)'], ['Fundo', 'branco']]],
  'relogio-bulgari-seductori-2': ['Relógio Bvlgari Serpenti Seduttori', [['Material', 'aço'], ['Fundo', 'branco']]],
  'relogio-bulgari-seductori-3': ['Relógio Bvlgari Serpenti Seduttori', [['Material', 'aço'], ['Fundo', 'preto']]],
  'relogio-bulgari-seductori-4': ['Relógio Bvlgari Serpenti Seduttori', [['Cor', 'rosé'], ['Fundo', 'branco']]],
  'relogio-bulgari-1': ['Relógio Bvlgari Bvlgari', [['Material', 'aço'], ['Fundo', 'madrepérola'], ['Detalhe', 'com pedra']]],
  'relogio-bulgari-2': ['Relógio Bvlgari Bvlgari', [['Material', 'aço'], ['Fundo', 'preto'], ['Detalhe', 'com pedra']]],
  'relogio-bulgari-3': ['Relógio Bvlgari Bvlgari', [['Material', 'aço'], ['Fundo', 'madrepérola']]],
  'relogio-bulgari-4': ['Relógio Bvlgari Bvlgari', [['Material', 'aço'], ['Fundo', 'preto'], ['Detalhe', 'anel dourado com pedra']]],
  'relogio-bulgari-5': ['Relógio Bvlgari Bvlgari', [['Cores', 'aço e rosé'], ['Fundo', 'preto'], ['Detalhe', 'anel dourado com pedra']]],
  'relogio-bulgari-6': ['Relógio Bvlgari Bvlgari', [['Material', 'aço'], ['Fundo', 'madrepérola'], ['Detalhe', 'anel dourado com pedra']]],
  'relogio-rolex-lady-1': ['Relógio Rolex Lady-Datejust', [['Cores', 'aço e rosé']]],
  'relogio-rolex-lady-2': ['Relógio Rolex Lady-Datejust', [['Cores', 'aço prateado com dourado'], ['Fundo', 'verde'], ['Detalhe', 'com pedras']]],
  'relogio-rolex-lady-11': ['Relógio Rolex Lady-Datejust', [['Cores', 'aço e rosé']]],
  'relogio-rolex-lady-12': ['Relógio Rolex Lady-Datejust', [['Cor', 'bronze'], ['Fundo', 'verde']]],
};

for (const [id, [base, specs]] of Object.entries(ANTIGOS)) {
  if (saida[id]) throw new Error('id repetido: ' + id);
  saida[id] = montar(base, specs);
}

// Depois de uma leva nova de produtos, rode com o próximo número
// (node scripts/descricoes.mjs 2): leva já aplicada não roda de novo, e
// repetir os produtos antigos não faz mal (só preenche o que está vazio).
const NUMERO = process.argv[2] || '1';
salvarLote({
  id: 'descricoes-' + NUMERO,
  titulo: `nome completo e descrição de ${Object.keys(saida).length} produtos`,
  detalhes: Object.entries(saida).map(([id, details]) => ({ id, details })),
});
console.log(Object.keys(saida).length, 'produtos com nome completo e descrição');
