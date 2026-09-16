// Gera assets/tailwind.css com as classes realmente usadas no site e no painel.
//
// Por que existe: antes o site carregava o Tailwind por CDN (398 KB de
// JavaScript que montava o CSS dentro do navegador, atrasando a primeira
// tela no celular). Agora o CSS vem pronto, com 23 KB.
//
// QUANDO RODAR: só quando o CÓDIGO HTML mudar (classes novas). Alterações
// feitas pelo painel — textos, fotos, produtos, cores — NÃO exigem isto.
//
// Uso: node scripts/build-css.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-build-'));

fs.writeFileSync(
  path.join(tmp, 'tailwind.config.js'),
  `module.exports = {
  content: [
    ${JSON.stringify(ROOT + '/*.html')},
    ${JSON.stringify(ROOT + '/admin/index.html')},
    ${JSON.stringify(ROOT + '/admin/app.js')},
    ${JSON.stringify(ROOT + '/assets/cms.js')},
  ],
  theme: { extend: {} },
  plugins: [],
};`
);
fs.writeFileSync(path.join(tmp, 'entrada.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

const saida = path.join(ROOT, 'assets', 'tailwind.css');
console.log('Gerando o CSS (pode demorar na primeira vez, baixa o Tailwind)…');
// No Windows o npx é um .cmd e precisa passar pelo shell.
execFileSync(
  'npx',
  ['-y', 'tailwindcss@3.4.17', '-c', path.join(tmp, 'tailwind.config.js'), '-i', path.join(tmp, 'entrada.css'), '-o', saida, '--minify'],
  { stdio: 'inherit', cwd: tmp, shell: true }
);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nassets/tailwind.css: ${(fs.statSync(saida).size / 1024).toFixed(0)} KB`);
console.log('Lembre de rodar "node scripts/bump-version.mjs" depois, para os navegadores pegarem o arquivo novo.');
