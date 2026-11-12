"""Gera as páginas de compartilhamento dos produtos (p/<id>.html).

Por que existe: o WhatsApp (e Instagram, Facebook…) monta a prévia do link
lendo as tags Open Graph do HTML que o servidor entrega, SEM rodar JavaScript.
A página de produto (produto.html?p=…) preenche essas tags com JavaScript,
então no WhatsApp a prévia mostrava só a logo. Aqui cada produto ganha um
HTML pequeno com título, preço e foto já escritos, e uma foto em JPG (formato
que o WhatsApp mostra). Quem clica no link é levado na hora para a página do
produto.

Os dados vêm do conteúdo PUBLICADO no Supabase (o mesmo que o site lê).
Roda sozinho no GitHub (.github/workflows/compartilhamento.yml) a cada
3 horas; para rodar na mão:  python scripts/gerar-compartilhamento.py

Requer: Pillow (pip install pillow).
"""
import hashlib
import html
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'p')
PASTA_IMG = os.path.join(PASTA, 'img')
MANIFESTO = os.path.join(PASTA, 'manifesto.json')
LADO_MAX = 1200          # px; o WhatsApp recomenda imagens leves
QUALIDADE = 82
AGENTE = 'Mozilla/5.0 (compatible; gerador-de-previas/1.0)'


def ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()


def configuracao():
    cfg = ler(os.path.join(RAIZ, 'assets', 'cms-config.js'))
    url = re.search(r"url:\s*'([^']+)'", cfg).group(1).rstrip('/')
    chave = re.search(r"anonKey:\s*'([^']+)'", cfg).group(1)
    dominio = ler(os.path.join(RAIZ, 'CNAME')).strip()
    return url, chave, 'https://' + dominio


def nome_arquivo(pid):
    """Mesmo nome que assets/produto.js calcula (sem acento; espaço vira hífen)."""
    s = ''.join(c for c in unicodedata.normalize('NFD', pid) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Za-z0-9_-]+', '-', s).strip('-')


def baixar(url, cabecalhos=None, limite=8 * 1024 * 1024, tentativas=2):
    req = urllib.request.Request(url, headers=dict({'User-Agent': AGENTE}, **(cabecalhos or {})))
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            dados = r.read(limite + 1)
    except urllib.error.HTTPError as e:
        # 429 = o site da foto pediu para ir mais devagar: espera e tenta de novo.
        if e.code == 429 and tentativas > 1:
            time.sleep(8)
            return baixar(url, cabecalhos, limite, tentativas - 1)
        raise
    if len(dados) > limite:
        raise ValueError('arquivo grande demais')
    return dados


def publicado(url, chave):
    dados = baixar(url + '/rest/v1/site_snapshot?id=eq.published&select=data',
                   {'apikey': chave, 'Authorization': 'Bearer ' + chave})
    linhas = json.loads(dados)
    return linhas[0]['data'] if linhas else {}


def dinheiro(n):
    s = '{:,.2f}'.format(float(n)).replace(',', 'X').replace('.', ',').replace('X', '.')
    return 'R$ ' + s


def descricao(p):
    d = (p.get('details') or {}).get('description') or ''
    if not d:
        partes = (p.get('cart_name') or '').split(' - ')
        d = ' - '.join(partes[1:]) if len(partes) > 1 else ''
    d = re.sub(r'\s+', ' ', d).strip()
    preco = float(p.get('price') or 0)
    prefixo = dinheiro(preco) if preco > 0 else 'Preço sob consulta'
    return (prefixo + (' · ' + d if d else ''))[:190]


def gerar_jpg(origem, destino):
    """origem: caminho do site (assets/…) ou endereço externo."""
    if re.match(r'^https?://', origem):
        time.sleep(1.2)  # educado com os sites de onde vêm as fotos
        bruto = baixar(origem)
    else:
        caminho = os.path.normpath(os.path.join(RAIZ, origem.split('?')[0]))
        if not caminho.startswith(RAIZ):
            raise ValueError('caminho fora do site')
        with open(caminho, 'rb') as f:
            bruto = f.read()
    img = Image.open(io.BytesIO(bruto))
    img.load()
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
        fundo = Image.new('RGB', img.size, 'white')
        fundo.paste(img, mask=img.split()[-1])
        img = fundo
    else:
        img = img.convert('RGB')
    img.thumbnail((LADO_MAX, LADO_MAX))
    img.save(destino, 'JPEG', quality=QUALIDADE, optimize=True, progressive=True)
    return img.size


PAGINA = """<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{titulo} | Imports de Luxo</title>
<meta name="description" content="{descricao}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="{destino}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Imports de Luxo">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{imagem}">
<meta property="og:image:secure_url" content="{imagem}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="{largura}">
<meta property="og:image:height" content="{altura}">
<meta property="og:image:alt" content="{titulo}">
{preco_meta}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{descricao}">
<meta name="twitter:image" content="{imagem}">
<meta http-equiv="refresh" content="0; url={destino}">
<script>location.replace({destino_js});</script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:3rem">
<p><a href="{destino}">Ver {titulo}</a></p>
</body>
</html>
"""


def main():
    url, chave, site = configuracao()
    dados = publicado(url, chave)
    produtos = dados.get('products') or []
    if not produtos:
        print('Nenhum produto publicado: nada a fazer (as páginas atuais foram mantidas).')
        return 0
    os.makedirs(PASTA_IMG, exist_ok=True)
    manifesto = json.loads(ler(MANIFESTO)) if os.path.exists(MANIFESTO) else {}
    novo_manifesto, ids = {}, set()
    feitos = reaproveitados = falhas = 0

    for p in produtos:
        pid_real = str(p.get('id') or '')
        pid = nome_arquivo(pid_real)
        if not pid or pid in ids:
            continue
        ids.add(pid)
        fotos = [f for f in (p.get('gallery') or []) if f] or [p.get('image')]
        origem = fotos[0] or ''
        jpg = os.path.join(PASTA_IMG, pid + '.jpg')
        assinatura = hashlib.sha1(origem.encode('utf-8')).hexdigest()
        anterior = manifesto.get(pid) or {}
        if anterior.get('origem') == assinatura and os.path.exists(jpg) and anterior.get('tamanho'):
            tamanho = anterior['tamanho']
            reaproveitados += 1
        else:
            try:
                tamanho = list(gerar_jpg(origem, jpg))
                feitos += 1
            except Exception as e:  # foto externa fora do ar etc.: usa a logo
                print('  sem foto para', pid, '->', e, file=sys.stderr)
                falhas += 1
                tamanho = None
        if tamanho:
            imagem = site + '/p/img/' + pid + '.jpg'
            novo_manifesto[pid] = {'origem': assinatura, 'tamanho': tamanho}
        else:
            imagem, tamanho = site + '/assets/img/logo-512.jpg', [512, 512]
            novo_manifesto[pid] = {'origem': None, 'tamanho': None}

        destino = site + '/produto.html?p=' + urllib.parse.quote(pid_real, safe='')
        preco = float(p.get('price') or 0)
        preco_meta = ('<meta property="product:price:amount" content="%.2f">\n'
                      '<meta property="product:price:currency" content="BRL">\n' % preco) if preco > 0 else ''
        e = lambda s: html.escape(str(s), quote=True)
        pagina = PAGINA.format(
            titulo=e(p.get('name') or 'Produto'), descricao=e(descricao(p)), url=e(site + '/p/' + pid),  # a Cloudflare tira o .html do endereço
            destino=e(destino), destino_js=json.dumps(destino), imagem=e(imagem),
            largura=tamanho[0], altura=tamanho[1], preco_meta=preco_meta)
        caminho = os.path.join(PASTA, pid + '.html')
        if not os.path.exists(caminho) or ler(caminho) != pagina:
            with open(caminho, 'w', encoding='utf-8', newline='\n') as f:
                f.write(pagina)

    # Produto que saiu do site: some a página e a foto de compartilhamento.
    removidos = 0
    for nome in os.listdir(PASTA):
        base, ext = os.path.splitext(nome)
        if ext == '.html' and base not in ids:
            os.remove(os.path.join(PASTA, nome)); removidos += 1
    for nome in os.listdir(PASTA_IMG):
        base, ext = os.path.splitext(nome)
        if ext == '.jpg' and base not in ids:
            os.remove(os.path.join(PASTA_IMG, nome))

    with open(MANIFESTO, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(novo_manifesto, f, ensure_ascii=False, indent=0, sort_keys=True)
        f.write('\n')
    print('%d produtos: %d fotos novas, %d reaproveitadas, %d sem foto, %d páginas removidas'
          % (len(ids), feitos, reaproveitados, falhas, removidos))
    return 0


if __name__ == '__main__':
    sys.exit(main())
