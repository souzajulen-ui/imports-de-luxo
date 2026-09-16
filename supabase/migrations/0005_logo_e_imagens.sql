-- ============================================================================
-- Imports de Luxo — Migration 5: ícone do site e imagens otimizadas.
--
-- O que muda:
--   • novo campo "Ícone do site", separado da logo de compartilhamento;
--   • logo e banner passam a apontar para os arquivos leves do próprio site
--     (o banner tinha 1,3 MB e agora tem 27 KB somando as duas versões).
--
-- Rode no SQL Editor do Supabase, depois das migrations anteriores.
-- ============================================================================

insert into public.content_blocks (page_slug, key, label, help, type, value, section, section_label, sort) values
  ('_global', 'brand.favicon', 'Ícone do site (aba do navegador e Google)',
   'Use uma imagem quadrada. O ideal é que o desenho vá até a borda, sem moldura branca.',
   'image', 'assets/img/favicon-96.png', 'marca', 'Marca e topo do site', 35)
on conflict (page_slug, key) do update set
  label = excluded.label, help = excluded.help, type = excluded.type,
  section = excluded.section, section_label = excluded.section_label, sort = excluded.sort;

update public.content_blocks
   set label = 'Logo (compartilhamento em redes sociais)',
       help  = 'Aparece quando alguém compartilha o site no WhatsApp, Instagram ou Facebook.',
       value = case when value = 'logo_redonda (1).png' then 'assets/img/logo-512.jpg' else value end,
       updated_at = now()
 where page_slug = '_global' and key = 'brand.logo';

-- Banner e imagem de compartilhamento: versões leves servidas pelo próprio site.
update public.content_blocks set value = 'assets/img/hero-desktop.webp', updated_at = now()
 where page_slug = 'index' and key = 'hero.image_desktop'
   and value like '%raw.githubusercontent.com%';

update public.content_blocks set value = 'assets/img/hero-mobile.webp', updated_at = now()
 where page_slug = 'index' and key = 'hero.image_mobile'
   and value like '%raw.githubusercontent.com%';

update public.content_blocks set value = 'assets/img/logo-512.jpg', updated_at = now()
 where page_slug = 'index' and key = 'seo.image'
   and value like '%logo_redonda%';

insert into public.site_snapshot (id, data, updated_at) values ('draft', public.build_snapshot(), now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
insert into public.site_snapshot (id, data, updated_at) values ('published', public.build_snapshot(), now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
