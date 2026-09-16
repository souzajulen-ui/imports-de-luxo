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

-- IMPORTANTE: uma migration NUNCA deve chamar build_snapshot() para 'published'.
-- Isso publicaria, junto, qualquer alteração que o administrador tenha salvo e
-- ainda não confirmado. Abaixo os campos novos são acrescentados ao que já está
-- publicado, um a um, sem tocar no resto.
update public.site_snapshot p
   set data = jsonb_set(
         p.data,
         '{blocks,_global}',
         coalesce(p.data -> 'blocks' -> '_global', '{}'::jsonb) || jsonb_build_object(
           'theme.accent',      coalesce(p.data -> 'blocks' -> '_global' ->> 'theme.accent',      '#06b6d4'),
           'theme.topbar_bg',   coalesce(p.data -> 'blocks' -> '_global' ->> 'theme.topbar_bg',   '#06b6d4'),
           'theme.topbar_text', coalesce(p.data -> 'blocks' -> '_global' ->> 'theme.topbar_text', '#000000'),
           'theme.button_text', coalesce(p.data -> 'blocks' -> '_global' ->> 'theme.button_text', '#ffffff')
         )
       )
 where p.id = 'published';
