# Painel administrativo — Imports de Luxo

Este site agora tem um painel em `/admin` onde dá para trocar textos, fotos e
produtos **sem mexer em código e sem publicar o site de novo**.

- Site público: continua sendo HTML estático (nada foi reescrito).
- Conteúdo: fica no Supabase e é lido pelo navegador do visitante.
- Se o Supabase estiver fora do ar, o site continua funcionando com o conteúdo
  que já está no HTML — nada quebra.

---

## 1. Configurar o Supabase (uma vez só)

### 1.1 Criar o projeto

Projeto em uso: **`yywfpikvquksnganoeyx`** (conta do GitHub `julentartarelli6-coder`).

Se um dia precisar recriar: **New project** → região **South America (São Paulo)**.

O plano gratuito cobre este site com folga: o conteúdo é texto e fotos, e o site
público faz **uma única requisição** por visita.

### 1.2 Criar as tabelas — ✅ já executado

As migrations já rodaram neste projeto em 16/09/2026. Se um dia precisar refazer
do zero, abra **SQL Editor** → **New query** e rode, nesta ordem:

1. Cole todo o conteúdo de `supabase/migrations/0001_schema.sql` → **Run**.
2. Cole todo o conteúdo de `supabase/migrations/0002_seed.sql` → **Run**.

O primeiro cria as tabelas, as permissões e o espaço das imagens.
O segundo carrega **o conteúdo que já está no site hoje**: 124 campos de texto e
imagem e os 141 produtos reais, com preços e galerias de fotos.

> Rodar o `0002` de novo não apaga as suas edições — ele só recria o que faltar.

### 1.3 Criar o seu usuário de administrador — ✅ já executado

O login abaixo já existe e está confirmado. Para recriar ou trocar a senha, rode
`supabase/criar-admin.sql` no **SQL Editor**.

Login do painel:

- e-mail: `reneetartarelli@gmail.com`
- senha: definida por você (não fica guardada neste repositório, que é público)

O script cria o usuário confirmado e o libera como administrador. No fim ele
mostra uma linha de conferência — se ela aparecer, está tudo certo.

Só quem está na tabela `admin_users` consegue editar. Ter conta no Supabase não
basta — é essa linha que dá o acesso.

Para trocar a senha depois: mude `v_senha` no arquivo e rode de novo, ou use
**Authentication → Users → … → Reset password**.

> Se o Supabase reclamar de `extensions.crypt`, use o caminho manual:
> **Authentication → Users → Add user**, com **Auto Confirm User** marcado, e
> depois rode só o bloco final do arquivo (o `insert into public.admin_users`).

### 1.4 Ligar o site ao Supabase — ✅ já configurado

O arquivo `assets/cms-config.js` já está preenchido com o endereço e a chave
pública deste projeto. Se precisar trocar a chave um dia, ela fica em
**Project Settings → API Keys** (serve tanto a `anon public` quanto a
`Publishable key`).

Esses dois valores são **públicos por natureza** — eles ficam no navegador de
qualquer visitante e não dão poder de editar nada, porque as permissões (RLS) do
banco só liberam escrita para administradores logados.

**Nunca** coloque a chave `service_role` neste arquivo nem no repositório.

---

## 2. Publicar na Vercel

O site é estático, então não há build.

1. Vercel → **Add New → Project** → importe este repositório do GitHub.
2. Em **Framework Preset** escolha **Other**.
3. **Build Command**: deixe vazio. **Output Directory**: deixe vazio (raiz).
4. **Deploy**.
5. Em **Settings → Domains**, aponte `importsdeluxo.com.br` para o projeto.

O arquivo `vercel.json` já cuida de:

- abrir o painel em `importsdeluxo.com.br/admin`;
- marcar o painel como `noindex` (ele não aparece no Google);
- cabeçalhos básicos de segurança.

Depois do deploy, **nenhuma alteração de conteúdo exige deploy novo**: textos,
fotos e produtos vêm do Supabase em tempo real.

Só é preciso publicar de novo na Vercel quando o **código** mudar (layout, novas
seções, novas páginas).

---

## 3. Como o dono do site usa o painel

1. Abrir `importsdeluxo.com.br/admin`.
2. Entrar com e-mail e senha.
3. Escolher a página no menu da esquerda (ex.: **Página inicial**).
4. Alterar um texto, ou clicar em **Alterar imagem** e enviar uma foto.
5. Clicar em **Salvar**.
6. Clicar em **Pré-visualizar** para ver o resultado — dá para alternar entre
   **Computador** e **Celular**.
7. Clicar em **Publicar no site**. Pronto: os clientes já veem a mudança.

### Salvar x Publicar

| Ação | O que acontece |
|---|---|
| **Salvar** | Guarda a alteração no rascunho. Os clientes **ainda não veem**. |
| **Pré-visualizar** | Abre o site de verdade mostrando o rascunho. |
| **Publicar no site** | Coloca o rascunho no ar para todo mundo. |

Enquanto houver algo salvo e não publicado, aparece uma faixa amarela no topo do
painel avisando.

### O que dá para editar

**Configurações do site** (valem para todas as páginas): nome da marca, logo,
WhatsApp, e-mail, horário de atendimento, itens do menu, textos do carrinho,
rodapé inteiro e bandeiras de pagamento.

**Página inicial**: faixa do topo, banner principal (inclusive as duas imagens de
fundo — celular e computador), títulos das vitrines, benefícios, frase de
destaque, depoimentos, selos de garantia, chamada final do WhatsApp e SEO.

**Páginas de categoria** (Bolsas, Relógios, Óculos, Calçados, Acessórios,
Cintos): aviso do topo, título, subtítulo e SEO.

**Página de busca**: aviso do topo, textos da busca e SEO.

**Produtos**: nome, preço, categoria, foto principal, galeria de fotos, descrição
que vai para o WhatsApp, ordem, se aparece na página inicial e se está visível.
O mesmo catálogo alimenta a home, as páginas de categoria e a busca — cadastrar
um produto uma vez basta.

**Imagens**: biblioteca com tudo o que você já enviou, para reaproveitar.

### Imagens

- Formatos: **JPG, PNG e WebP**, até **5 MB** por arquivo.
- A imagem antiga só é substituída depois que o envio dá certo. Se falhar, nada
  se perde.
- As fotos ficam no Supabase Storage, em um espaço público de leitura e privado
  de escrita.

---

## 4. Manutenção do código (para quem programa)

```
assets/cms-config.js     endereço e chave pública do Supabase
assets/cms.js            runtime do site público (aplica conteúdo e produtos)
admin/index.html         casca do painel
admin/app.js             painel (login, editores, upload, publicação)
supabase/migrations/     SQL a rodar no Supabase (schema + conteúdo inicial)
scripts/extract-content  lê o HTML atual e monta o catálogo de produtos
scripts/content-map.mjs  inventário dos campos editáveis (fonte da verdade)
scripts/generate-seed    gera o 0002_seed.sql
scripts/instrument.mjs   marca o HTML com data-cms (idempotente)
scripts/mock-server.mjs  servidor local que simula o Supabase
scripts/smoke-test.mjs   testes no Chrome headless
```

### Como o conteúdo chega na página

Cada elemento editável tem um atributo:

```html
<h1 data-cms="hero.title">O luxo que você merece,</h1>
<img data-cms-src="hero.image_desktop" src="...">
<a data-cms="cta.button_label" data-cms-href="cta.button_url" href="...">…</a>
<div data-cms-products="category:bolsas">…HTML original como reserva…</div>
```

O `cms.js` busca uma linha só (`site_snapshot` com `id = 'published'`), aplica os
valores e monta as vitrines. O HTML que já estava na página funciona como
conteúdo reserva e aparece se o banco não responder.

### Testar localmente

```bash
node scripts/mock-server.mjs     # http://localhost:4173/index.html
node scripts/smoke-test.mjs      # 34 verificações no Chrome headless
```

O servidor de teste imita o Supabase inteiro (login, banco, storage) com dados
em memória, então dá para mexer no painel sem tocar no projeto de verdade:

- `http://localhost:4173/admin/` — painel; entre com `admin@teste.local` / `123456`
- `http://localhost:4173/admin/e2e.html` — roteiro automático (login → editar →
  salvar → publicar → produtos → enviar imagem)
- `http://localhost:4173/admin/mobile.html` — o mesmo roteiro em 375px de largura
- `MOCK_UPLOAD_FAIL=1 node scripts/mock-server.mjs` — simula falha de envio de imagem

### Ao adicionar uma seção nova no HTML

1. Acrescente o campo em `scripts/content-map.mjs`.
2. Acrescente a regra em `scripts/instrument.mjs` (ou marque o HTML à mão).
3. `node scripts/generate-seed.mjs` e rode o `0002_seed.sql` atualizado no
   Supabase — ele acrescenta só o que falta.

---

## 5. Limitações conhecidas

- **SEO**: título e descrição são aplicados pelo navegador. O Google executa
  JavaScript e enxerga a versão nova, mas alguns robôs mais simples leem o que
  está no HTML. Se mudar o SEO de forma definitiva, vale atualizar também o HTML
  e publicar na Vercel.
- **Favicon**: trocar pelo painel funciona na maioria dos navegadores; alguns
  insistem no ícone em cache por um tempo.
- **Conteúdo reserva**: o HTML guarda os produtos de hoje. Com o tempo ele fica
  desatualizado em relação ao banco — é só a rede de segurança, não o que o
  visitante vê normalmente.
