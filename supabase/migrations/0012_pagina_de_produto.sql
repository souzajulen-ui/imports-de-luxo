-- ============================================================================
-- Imports de Luxo — Migration 12: página de produto completa.
--
-- O que muda:
--   • produtos ganham "details" (preço antigo, descrição, tamanhos, tabela de
--     medidas), editável no painel;
--   • campos novos em Configurações: parcelas, desconto no Pix, garantias,
--     faixa de benefícios, redes sociais, CNPJ, newsletter e perguntas
--     frequentes. Campo vazio = o trecho não aparece no site;
--   • tabela da newsletter: qualquer visitante pode se inscrever, só o
--     administrador vê os e-mails.
--
-- Rode no SQL Editor do Supabase. Rodar de novo não estraga nada.
-- ============================================================================

alter table public.products
  add column if not exists details jsonb not null default '{}'::jsonb;

comment on column public.products.details is
  'Página de produto: { old_price, description, sizes: [{label, available}], size_table }.';

create or replace function public.build_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'blocks', coalesce((
      select jsonb_object_agg(page_slug, kv)
      from (
        select page_slug, jsonb_object_agg(key, value) as kv
        from public.content_blocks
        group by page_slug
      ) t
    ), '{}'::jsonb),
    'products', coalesce((
      select jsonb_agg(p order by p.category, p.sort, p.name)
      from (
        select id, category, name, cart_name, alt, price, image, gallery,
               featured, featured_sort, sort, gender, details
        from public.products
        where active
      ) p
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.build_snapshot() from public, anon, authenticated;

insert into public.content_blocks (page_slug, key, label, help, type, value, section, section_label, sort) values
  ('_global', 'loja.parcelas', 'Parcelamento: número máximo de parcelas', 'Ex.: 12. Vazio: a linha "ou até 12x de R$ …" não aparece.', 'text', '', 'loja', 'Página de produto: pagamento e garantias', 0),
  ('_global', 'loja.pix_desconto', 'Desconto no Pix (%)', 'Só o número. Ex.: 5. Vazio: o preço no Pix não aparece.', 'text', '', 'loja', 'Página de produto: pagamento e garantias', 10),
  ('_global', 'loja.pagamentos', 'Formas de pagamento aceitas', 'Separe por vírgula. Aparecem como selos na página de produto e no rodapé.', 'text', 'Visa, Mastercard, Elo, Amex, Diners, Pix, Boleto', 'loja', 'Página de produto: pagamento e garantias', 20),
  ('_global', 'loja.garantia1_titulo', 'Garantia 1 — título', null, 'text', 'Envio para todo o Brasil', 'loja', 'Página de produto: pagamento e garantias', 30),
  ('_global', 'loja.garantia1_texto', 'Garantia 1 — texto', 'Ex.: Envio rastreado: 15 a 45 dias úteis.', 'text', '', 'loja', 'Página de produto: pagamento e garantias', 40),
  ('_global', 'loja.garantia2_titulo', 'Garantia 2 — título', null, 'text', 'Devolução garantida', 'loja', 'Página de produto: pagamento e garantias', 50),
  ('_global', 'loja.garantia2_texto', 'Garantia 2 — texto', null, 'text', 'Dinheiro de volta em até 7 dias', 'loja', 'Página de produto: pagamento e garantias', 60),
  ('_global', 'loja.garantia3_titulo', 'Garantia 3 — título', null, 'text', 'Qualidade VIP', 'loja', 'Página de produto: pagamento e garantias', 70),
  ('_global', 'loja.garantia3_texto', 'Garantia 3 — texto', null, 'text', 'A excelência que seu visual exige.', 'loja', 'Página de produto: pagamento e garantias', 80),
  ('_global', 'loja.beneficio1_titulo', 'Benefício 1 — título', null, 'text', 'Envio VIP', 'beneficios', 'Faixa de benefícios e rodapé completo', 0),
  ('_global', 'loja.beneficio1_texto', 'Benefício 1 — texto', null, 'text', 'Para todo o Brasil', 'beneficios', 'Faixa de benefícios e rodapé completo', 10),
  ('_global', 'loja.beneficio2_titulo', 'Benefício 2 — título', null, 'text', 'Compra Segura', 'beneficios', 'Faixa de benefícios e rodapé completo', 20),
  ('_global', 'loja.beneficio2_texto', 'Benefício 2 — texto', null, 'text', 'Pedido confirmado direto com a loja', 'beneficios', 'Faixa de benefícios e rodapé completo', 30),
  ('_global', 'loja.beneficio3_titulo', 'Benefício 3 — título', null, 'text', 'Suporte Exclusivo', 'beneficios', 'Faixa de benefícios e rodapé completo', 40),
  ('_global', 'loja.beneficio3_texto', 'Benefício 3 — texto', null, 'text', 'Atendimento pelo WhatsApp', 'beneficios', 'Faixa de benefícios e rodapé completo', 50),
  ('_global', 'loja.beneficio4_titulo', 'Benefício 4 — título', null, 'text', 'Qualidade Grife', 'beneficios', 'Faixa de benefícios e rodapé completo', 60),
  ('_global', 'loja.beneficio4_texto', 'Benefício 4 — texto', null, 'text', 'A excelência que seu visual exige.', 'beneficios', 'Faixa de benefícios e rodapé completo', 70),
  ('_global', 'loja.newsletter_titulo', 'Newsletter — título', null, 'text', 'Receba novidades', 'beneficios', 'Faixa de benefícios e rodapé completo', 80),
  ('_global', 'loja.newsletter_texto', 'Newsletter — chamada', 'Ex.: Ganhe 3% de desconto na sua primeira compra! Vazio: só o título aparece.', 'text', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 90),
  ('_global', 'loja.cnpj', 'CNPJ (linha de direitos autorais)', 'Ex.: 00.000.000/0001-00. Vazio: não aparece.', 'text', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 100),
  ('_global', 'loja.instagram', 'Instagram — link', null, 'url', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 110),
  ('_global', 'loja.facebook', 'Facebook — link', null, 'url', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 120),
  ('_global', 'loja.tiktok', 'TikTok — link', null, 'url', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 130),
  ('_global', 'loja.youtube', 'YouTube — link', null, 'url', '', 'beneficios', 'Faixa de benefícios e rodapé completo', 140),
  ('_global', 'faq.1_pergunta', 'Pergunta 1', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 0),
  ('_global', 'faq.1_resposta', 'Resposta 1', 'Pergunta sem resposta não aparece no site.', 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 10),
  ('_global', 'faq.2_pergunta', 'Pergunta 2', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 20),
  ('_global', 'faq.2_resposta', 'Resposta 2', null, 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 30),
  ('_global', 'faq.3_pergunta', 'Pergunta 3', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 40),
  ('_global', 'faq.3_resposta', 'Resposta 3', null, 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 50),
  ('_global', 'faq.4_pergunta', 'Pergunta 4', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 60),
  ('_global', 'faq.4_resposta', 'Resposta 4', null, 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 70),
  ('_global', 'faq.5_pergunta', 'Pergunta 5', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 80),
  ('_global', 'faq.5_resposta', 'Resposta 5', null, 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 90),
  ('_global', 'faq.6_pergunta', 'Pergunta 6', null, 'text', '', 'faq', 'Perguntas frequentes (página de produto)', 100),
  ('_global', 'faq.6_resposta', 'Resposta 6', null, 'textarea', '', 'faq', 'Perguntas frequentes (página de produto)', 110)
on conflict (page_slug, key) do update set
  label = excluded.label, help = excluded.help, type = excluded.type,
  section = excluded.section, section_label = excluded.section_label, sort = excluded.sort;

-- Newsletter: o site insere, só o painel lê.
create table if not exists public.newsletter_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 200),
  origem     text,
  created_at timestamptz not null default now()
);
create unique index if not exists newsletter_signups_email_idx on public.newsletter_signups (lower(email));

alter table public.newsletter_signups enable row level security;

drop policy if exists newsletter_insert_public on public.newsletter_signups;
create policy newsletter_insert_public on public.newsletter_signups
  for insert to anon, authenticated with check (true);

drop policy if exists newsletter_admin_read on public.newsletter_signups;
create policy newsletter_admin_read on public.newsletter_signups
  for select to authenticated using (public.is_admin());

drop policy if exists newsletter_admin_delete on public.newsletter_signups;
create policy newsletter_admin_delete on public.newsletter_signups
  for delete to authenticated using (public.is_admin());

grant insert on public.newsletter_signups to anon, authenticated;
grant select, delete on public.newsletter_signups to authenticated;

-- IMPORTANTE: não chamamos build_snapshot() para 'published' (publicaria
-- edições ainda não confirmadas). Só acrescentamos os campos novos ao que já
-- está publicado, sem tocar no resto.
update public.site_snapshot p
   set data = jsonb_set(
         p.data,
         '{blocks,_global}',
         jsonb_build_object(
           'loja.parcelas', '',
           'loja.pix_desconto', '',
           'loja.pagamentos', 'Visa, Mastercard, Elo, Amex, Diners, Pix, Boleto',
           'loja.garantia1_titulo', 'Envio para todo o Brasil',
           'loja.garantia1_texto', '',
           'loja.garantia2_titulo', 'Devolução garantida',
           'loja.garantia2_texto', 'Dinheiro de volta em até 7 dias',
           'loja.garantia3_titulo', 'Qualidade VIP',
           'loja.garantia3_texto', 'A excelência que seu visual exige.',
           'loja.beneficio1_titulo', 'Envio VIP',
           'loja.beneficio1_texto', 'Para todo o Brasil',
           'loja.beneficio2_titulo', 'Compra Segura',
           'loja.beneficio2_texto', 'Pedido confirmado direto com a loja',
           'loja.beneficio3_titulo', 'Suporte Exclusivo',
           'loja.beneficio3_texto', 'Atendimento pelo WhatsApp',
           'loja.beneficio4_titulo', 'Qualidade Grife',
           'loja.beneficio4_texto', 'A excelência que seu visual exige.',
           'loja.newsletter_titulo', 'Receba novidades',
           'loja.newsletter_texto', '',
           'loja.cnpj', '',
           'loja.instagram', '',
           'loja.facebook', '',
           'loja.tiktok', '',
           'loja.youtube', '',
           'faq.1_pergunta', '',
           'faq.1_resposta', '',
           'faq.2_pergunta', '',
           'faq.2_resposta', '',
           'faq.3_pergunta', '',
           'faq.3_resposta', '',
           'faq.4_pergunta', '',
           'faq.4_resposta', '',
           'faq.5_pergunta', '',
           'faq.5_resposta', '',
           'faq.6_pergunta', '',
           'faq.6_resposta', ''
         ) || coalesce(p.data -> 'blocks' -> '_global', '{}'::jsonb)
       )
 where p.id = 'published';
