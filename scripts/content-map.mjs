// Inventário de TUDO que é editável pelo painel, com os valores reais que já
// estão no site hoje. Este arquivo é a fonte da verdade: dele saem o seed do
// banco e os atributos data-cms injetados no HTML.
//
// Campos: [key, label, type, value, help?]
// type: text | textarea | richtext | image | url | color

export const GLOBAL = [
  {
    section: 'marca',
    label: 'Marca e topo do site',
    fields: [
      ['brand.name_main', 'Nome no cabeçalho', 'text', 'IMPORTS'],
      ['brand.name_accent', 'Complemento do nome (itálico)', 'text', 'de Luxo'],
      ['brand.logo', 'Logo / imagem da marca', 'image', 'logo_redonda (1).png', 'Usada no favicon e no compartilhamento em redes sociais.'],
    ],
  },
  {
    section: 'aparencia',
    label: 'Cores do site',
    fields: [
      ['theme.accent', 'Cor principal', 'color', '#06b6d4', 'Usada nos botões, nos detalhes e nos destaques do site inteiro.'],
      ['theme.topbar_bg', 'Faixa do topo — fundo', 'color', '#06b6d4'],
      ['theme.topbar_text', 'Faixa do topo — letras', 'color', '#000000'],
      ['theme.button_text', 'Letras dos botões coloridos', 'color', '#ffffff'],
    ],
  },
  {
    section: 'contato',
    label: 'Contato e atendimento',
    fields: [
      ['contact.whatsapp_number', 'Número do WhatsApp (só números, com DDI)', 'text', '5544998214237', 'Usado para finalizar o pedido do carrinho. Ex.: 5544998214237'],
      ['contact.whatsapp_link', 'Link do botão de WhatsApp', 'url', 'https://wa.me/message/6AMQ5WF2AWS2L1'],
      ['contact.email', 'E-mail de atendimento', 'text', 'reneetartarelli@gmail.com'],
      ['contact.hours', 'Horário de atendimento', 'text', 'Segunda a domingo: 09h às 22h'],
    ],
  },
  {
    section: 'menu',
    label: 'Menu de navegação',
    fields: [
      ['nav.1_label', 'Item 1 — texto', 'text', 'Início'],
      ['nav.1_url', 'Item 1 — link', 'url', 'index.html'],
      ['nav.2_label', 'Item 2 — texto', 'text', 'Bolsas'],
      ['nav.2_url', 'Item 2 — link', 'url', 'bolsas.html'],
      ['nav.3_label', 'Item 3 — texto', 'text', 'Relógios'],
      ['nav.3_url', 'Item 3 — link', 'url', 'relogios.html'],
      ['nav.4_label', 'Item 4 — texto', 'text', 'Óculos'],
      ['nav.4_url', 'Item 4 — link', 'url', 'oculos.html'],
      ['nav.5_label', 'Item 5 — texto', 'text', 'Calçados'],
      ['nav.5_url', 'Item 5 — link', 'url', 'calcados.html'],
      ['nav.6_label', 'Item 6 — texto', 'text', 'Acessórios'],
      ['nav.6_url', 'Item 6 — link', 'url', 'acessorios.html'],
      ['nav.7_label', 'Item 7 — texto', 'text', 'Cintos'],
      ['nav.7_url', 'Item 7 — link', 'url', 'cintos.html'],
    ],
  },
  {
    section: 'carrinho',
    label: 'Carrinho e botões de compra',
    fields: [
      ['cart.title', 'Título do carrinho', 'text', 'Seu Carrinho'],
      ['cart.empty', 'Mensagem de carrinho vazio', 'text', 'Seu carrinho está vazio.'],
      ['cart.checkout_label', 'Botão de finalizar pedido (página inicial)', 'text', 'Finalizar Pedido via WhatsApp'],
      ['cart.checkout_label_short', 'Botão de finalizar pedido (demais páginas)', 'text', 'Finalizar no WhatsApp'],
      ['cart.add_label', 'Botão dos produtos', 'text', 'Adicionar ao carrinho'],
    ],
  },
  {
    section: 'rodape',
    label: 'Rodapé',
    fields: [
      ['footer.brand', 'Nome no rodapé', 'text', 'IMPORTS DE LUXO'],
      ['footer.description', 'Descrição da empresa', 'textarea', 'Sua boutique de confiança para itens premium internacionais. Unindo o desejo da alta moda e Elegância.'],
      ['footer.institucional_title', 'Título da coluna institucional', 'text', 'Institucional'],
      ['footer.link1_label', 'Link institucional 1 — texto', 'text', 'Políticas de Privacidade'],
      ['footer.link1_url', 'Link institucional 1 — endereço', 'url', '#'],
      ['footer.link2_label', 'Link institucional 2 — texto', 'text', 'Trocas e Devoluções'],
      ['footer.link2_url', 'Link institucional 2 — endereço', 'url', '#'],
      ['footer.link3_label', 'Link institucional 3 — texto', 'text', 'Termos de Uso'],
      ['footer.link3_url', 'Link institucional 3 — endereço', 'url', '#'],
      ['footer.atendimento_title', 'Título da coluna de atendimento', 'text', 'Atendimento'],
      ['footer.payment_title', 'Título das formas de pagamento', 'text', 'Formas de Pagamento'],
      ['footer.copyright', 'Direitos autorais (página inicial)', 'text', '© 2015 IMPORTS DE LUXO'],
      ['footer.copyright_long', 'Direitos autorais (demais páginas)', 'text', '© 2015 IMPORTS DE LUXO - Todos os direitos reservados'],
    ],
  },
  {
    section: 'pagamento',
    label: 'Bandeiras de pagamento',
    fields: [
      ['footer.pay1', 'Bandeira 1', 'image', 'https://logosmarcas.net/wp-content/uploads/2020/04/Visa-Logo-2014%E2%80%93presente.jpg'],
      ['footer.pay2', 'Bandeira 2', 'image', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQtLk6e-zGF6C2RSMHVg57wBxu6F-Aufauew&s'],
      ['footer.pay3', 'Bandeira 3', 'image', 'https://upload.wikimedia.org/wikipedia/commons/8/89/Hipercard_logo.svg'],
      ['footer.pay4', 'Bandeira 4', 'image', 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcSg6kd87KuRiNiDqwgI3AKAnvYLgxNaeOvyQntCfuzp6PSgh9bX'],
      ['footer.pay5', 'Bandeira 5', 'image', 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRSXwrqUH2v6eZ2JlpoHtDLxUbLc4YcgWS922B58C_KH5RBXaZD'],
      ['footer.pay6', 'Bandeira 6', 'image', 'https://images.seeklogo.com/logo-png/39/1/pix-logo-png_seeklogo-392002.png'],
    ],
  },
];

const CATEGORY_SECTIONS = [
  ['bolsas', 'Bolsas'],
  ['relogios', 'Relógios'],
  ['oculos', 'Óculos'],
  ['calcados', 'Calçados'],
  ['acessorios', 'Acessórios'],
  ['cintos', 'Cintos'],
];

export const PAGES = [
  {
    slug: 'index',
    name: 'Página inicial',
    file: 'index.html',
    sort: 0,
    sections: [
      {
        section: 'seo',
        label: 'SEO (Google e redes sociais)',
        fields: [
          ['seo.title', 'Título da página', 'text', 'Imports de Luxo | O Padrão da Elegância'],
          ['seo.description', 'Descrição para o Google', 'textarea', 'CONFIRA NOSSA COLEÇÃO EXCLUSIVA DE BOLSAS DE LUXO COM OS MELHORES PREÇOS E QUALIDADE.'],
          ['seo.image', 'Imagem de compartilhamento', 'image', 'https://importsdeluxo.com.br/logo_redonda%20(1).png'],
        ],
      },
      {
        section: 'topo',
        label: 'Faixa do topo',
        fields: [['topbar.text', 'Aviso na faixa superior', 'text', 'marcas Exclusivas | Frete em todo Brasil']],
      },
      {
        section: 'hero',
        label: 'Banner principal',
        fields: [
          ['hero.image_desktop', 'Imagem de fundo — computador', 'image', 'https://raw.githubusercontent.com/souzajulen-ui/bolsas-hermes/main/bolsas_direita%20(1).png'],
          ['hero.image_mobile', 'Imagem de fundo — celular', 'image', 'https://raw.githubusercontent.com/souzajulen-ui/imagem-hermes/main/Bolsas%20de%20luxo%20em%20pedestais%20perfeitos.png'],
          ['hero.eyebrow', 'Texto de destaque (acima do título)', 'text', 'A recompensa do seu sucesso'],
          ['hero.title', 'Título principal', 'text', 'O luxo que você merece,'],
          ['hero.subtitle', 'Segunda linha do título (itálico)', 'text', 'agora ao seu alcance.'],
          ['hero.social_proof', 'Prova social', 'text', '+ de 1.000 clientes satisfeitas'],
        ],
      },
      {
        section: 'vitrines',
        label: 'Vitrines de categorias',
        fields: CATEGORY_SECTIONS.flatMap(([slug, label]) => [
          [`home.${slug}_title`, `${label} — título da seção`, 'text', label],
          [`home.${slug}_link`, `${label} — texto do link`, 'text', 'Exibir Mais'],
        ]),
      },
      {
        section: 'beneficios',
        label: 'Benefícios',
        fields: [
          ['beneficios.1_title', 'Benefício 1 — título', 'text', 'Acabamento Impecável'],
          ['beneficios.1_text', 'Benefício 1 — texto', 'textarea', 'Nossas peças seguem o padrão 1:1. O mesmo peso, a mesma textura do couro e as marcações idênticas aos modelos de boutique.'],
          ['beneficios.2_title', 'Benefício 2 — título', 'text', 'Curadoria Premium'],
          ['beneficios.2_text', 'Benefício 2 — texto', 'richtext', 'Não vendemos réplicas comuns. Cada item da <strong>Imports de Luxo</strong> passa por uma inspeção manual antes de chegar até você.'],
          ['beneficios.3_title', 'Benefício 3 — título', 'text', 'Discrição & Segurança'],
          ['beneficios.3_text', 'Benefício 3 — texto', 'textarea', 'Embalagens premium e envio segurado. Sua experiência de compra é tratada com o sigilo e a exclusividade que o luxo exige.'],
        ],
      },
      {
        section: 'experiencia',
        label: 'Seção de destaque',
        fields: [
          ['experiencia.quote', 'Frase em destaque', 'text', 'Elegância é a única beleza que nunca desaparece.'],
          ['experiencia.text', 'Texto', 'richtext', 'Portar um acessório de grife não é sobre o objeto, é sobre a <strong>sensação</strong>. É a confiança ao entrar em uma reunião, o brilho no olhar em um jantar especial e o respeito que sua presença impõe. Na Imports de Luxo, entregamos essa experiência incrível.'],
        ],
      },
      {
        section: 'depoimentos',
        label: 'Depoimentos de clientes',
        fields: [
          ['depoimentos.title', 'Título da seção', 'text', 'Relatos de clientes'],
          ['depoimentos.1_text', 'Depoimento 1', 'textarea', '"Eu tenho bolsas originais e comprei uma da Imports de Luxo para testar. Fiquei chocada, é impossível notar a diferença. O metal, o fecho... tudo perfeito."'],
          ['depoimentos.1_author', 'Depoimento 1 — assinatura', 'text', '— Cláudia M., Brasília'],
          ['depoimentos.2_text', 'Depoimento 2', 'textarea', '"O relógio é lindo e a caixa é magnífica. Atendimento impecável via WhatsApp."'],
          ['depoimentos.2_author', 'Depoimento 2 — assinatura', 'text', '— Dr. Renato F., Porto Alegre'],
          ['depoimentos.3_text', 'Depoimento 3', 'textarea', '"Comprei um óculos e chegou em 4 dias em SP. A lente é ótima e o acabamento da haste é muito boa"'],
          ['depoimentos.3_author', 'Depoimento 3 — assinatura', 'text', '— Juliana P., São Paulo'],
        ],
      },
      {
        section: 'garantia',
        label: 'Selos de garantia',
        fields: [
          ['garantia.1_text', 'Selo 1', 'text', 'atendimento rápido'],
          ['garantia.2_text', 'Selo 2', 'text', 'Pagamento seguro'],
          ['garantia.3_text', 'Selo 3', 'text', 'Inspeção Pré-Envio'],
          ['garantia.4_text', 'Selo 4', 'text', 'Qualidade premium'],
        ],
      },
      {
        section: 'cta',
        label: 'Chamada final (WhatsApp)',
        fields: [
          ['cta.title', 'Título', 'text', 'Faça parte do mundo Imports de Luxo'],
          ['cta.text', 'Texto', 'textarea', 'Clique no botão abaixo para acessar o atendimento via WhatsApp.'],
          ['cta.button_label', 'Texto do botão', 'text', 'acesso ao WhatsApp'],
          ['cta.button_url', 'Link do botão', 'url', 'https://wa.me/message/6AMQ5WF2AWS2L1'],
        ],
      },
    ],
  },
  ...[
    ['bolsas', 'Bolsas', 'Bolsas', 'Curadoria Premium Padrão 1:1', 'Bolsas de Grife | Imports de Luxo', 'Bolsas de grife com acabamento padrão 1:1, curadoria premium e envio para todo o Brasil.', 'marcas Exclusivas | Frete em todo Brasil'],
    ['relogios', 'Relógios', 'Relógios', 'Precisão e Status em cada segundo', 'Relógios Exclusivos | Imports de Luxo', 'Relógios de luxo com acabamento impecável e inspeção antes do envio.', 'Alta Relojoaria | acabamento premium'],
    ['oculos', 'Óculos', 'Óculos', 'O toque final da elegância moderna', 'Óculos de Sol Premium | Imports de Luxo', 'Óculos de sol premium das grifes mais desejadas, com envio para todo o Brasil.', 'Proteção UV400 | Acetato Italiano'],
    ['calcados', 'Calçados', 'Calçados', 'Onde o conforto encontra o design de alta costura', 'Calçados de Luxo | Imports de Luxo', 'Calçados de luxo: sandálias, tênis e saltos com acabamento padrão 1:1.', 'Passos de Elegância | Curadoria Exclusiva'],
    ['acessorios', 'Acessórios', 'Acessórios', 'o luxo em detalhes', 'Acessórios de Luxo | Imports de Luxo', 'Pulseiras, colares e acessórios de luxo selecionados peça a peça.', 'toque de Elegância | material impecável'],
    ['cintos', 'Cintos', 'Cintos', 'A Elegância na sua cintura', 'Cintos elegante | Imports de Luxo', 'Cintos de grife com fivelas icônicas e acabamento premium.', 'O Toque Final | material Premium'],
  ].map(([slug, name, h1, subtitle, seoTitle, seoDesc, topbar], i) => ({
    slug,
    name,
    file: `${slug}.html`,
    sort: i + 1,
    category: slug,
    sections: [
      {
        section: 'seo',
        label: 'SEO (Google e redes sociais)',
        fields: [
          ['seo.title', 'Título da página', 'text', seoTitle],
          ['seo.description', 'Descrição para o Google', 'textarea', seoDesc],
        ],
      },
      {
        section: 'topo',
        label: 'Topo da página',
        fields: [
          ['topbar.text', 'Aviso na faixa superior', 'text', topbar],
          ['page.title', 'Título', 'text', h1],
          ['page.subtitle', 'Subtítulo', 'text', subtitle],
        ],
      },
    ],
  })),
  {
    slug: 'pesquisa',
    name: 'Página de busca',
    file: 'pesquisa.html',
    sort: 7,
    sections: [
      {
        section: 'seo',
        label: 'SEO',
        fields: [['seo.title', 'Título da página', 'text', 'Resultados da Pesquisa | Imports de Luxo']],
      },
      {
        section: 'topo',
        label: 'Textos da busca',
        fields: [
          ['topbar.text', 'Aviso na faixa superior', 'text', 'marcas Exclusivas | Frete em todo Brasil'],
          ['search.heading', 'Texto antes do termo buscado', 'text', 'Resultados para:'],
          ['search.empty', 'Mensagem quando não encontra nada', 'text', 'Nenhum item encontrado.'],
        ],
      },
    ],
  },
];

// Achata tudo em linhas prontas para o banco.
export function allBlocks() {
  const rows = [];
  const push = (pageSlug, section, sectionLabel, fields) => {
    fields.forEach(([key, label, type, value, help], i) => {
      rows.push({
        page_slug: pageSlug,
        key,
        label,
        help: help ?? null,
        type,
        value: value ?? '',
        section,
        section_label: sectionLabel,
        sort: i * 10,
      });
    });
  };
  GLOBAL.forEach((g) => push('_global', g.section, g.label, g.fields));
  PAGES.forEach((p) => p.sections.forEach((s) => push(p.slug, s.section, s.label, s.fields)));
  return rows;
}
