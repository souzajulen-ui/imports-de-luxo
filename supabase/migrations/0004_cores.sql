-- ============================================================================
-- Imports de Luxo — Migration 4: cores editáveis pelo painel.
--
-- Acrescenta os campos de cor em Configurações do site → Cores do site.
-- Os valores abaixo são as cores que o site já usa hoje, então nada muda de
-- aparência até alguém escolher outra cor no painel.
--
-- Rode no SQL Editor do Supabase, depois das migrations anteriores.
-- ============================================================================

insert into public.content_blocks (page_slug, key, label, help, type, value, section, section_label, sort) values
  ('_global', 'theme.accent', 'Cor principal', 'Usada nos botões, nos detalhes e nos destaques do site inteiro.', 'color', '#06b6d4', 'aparencia', 'Cores do site', 0),
  ('_global', 'theme.topbar_bg', 'Faixa do topo — fundo', null, 'color', '#06b6d4', 'aparencia', 'Cores do site', 10),
  ('_global', 'theme.topbar_text', 'Faixa do topo — letras', null, 'color', '#000000', 'aparencia', 'Cores do site', 20),
  ('_global', 'theme.button_text', 'Letras dos botões coloridos', null, 'color', '#ffffff', 'aparencia', 'Cores do site', 30)
on conflict (page_slug, key) do update set
  label = excluded.label, help = excluded.help, type = excluded.type,
  section = excluded.section, section_label = excluded.section_label, sort = excluded.sort;

-- A seção de cores fica logo no começo das configurações.
update public.content_blocks set sort = sort where page_slug = '_global';

-- Atualiza rascunho e publicado para os campos novos já chegarem ao site.
insert into public.site_snapshot (id, data, updated_at) values ('draft', public.build_snapshot(), now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
insert into public.site_snapshot (id, data, updated_at) values ('published', public.build_snapshot(), now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
