-- ============================================================================
-- Imports de Luxo — Migration 6: relógios masculinos e femininos.
--
-- O que muda:
--   • produtos ganham o campo "gender" ('masculino' ou 'feminino');
--   • todos os relógios que já estão no site passam a ser femininos;
--   • o conteúdo do site (rascunho e publicado) passa a levar esse campo.
--
-- Rode no SQL Editor do Supabase, depois das migrations anteriores.
-- Rodar de novo não estraga nada.
-- ============================================================================

alter table public.products
  add column if not exists gender text
  check (gender is null or gender in ('masculino', 'feminino'));

comment on column public.products.gender is
  'Público da peça. Usado na página de Relógios para separar Masculino e Feminino.';

-- O snapshot passa a incluir o gênero de cada produto.
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
               featured, featured_sort, sort, gender
        from public.products
        where active
      ) p
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.build_snapshot() from public, anon, authenticated;

-- Todos os relógios atuais são femininos. (O trigger atualiza o rascunho.)
update public.products
   set gender = 'feminino', updated_at = now()
 where category = 'relogios' and gender is null;

-- IMPORTANTE: não chamamos build_snapshot() para 'published' (isso publicaria
-- edições ainda não confirmadas). Só acrescentamos "gender" aos relógios que
-- já estão publicados, sem tocar em mais nada.
update public.site_snapshot s
   set data = jsonb_set(
         s.data,
         '{products}',
         coalesce((
           select jsonb_agg(
                    case
                      when item ->> 'category' = 'relogios' and coalesce(item ->> 'gender', '') = ''
                        then item || '{"gender":"feminino"}'::jsonb
                      else item
                    end
                    order by ord)
           from jsonb_array_elements(s.data -> 'products') with ordinality as e(item, ord)
         ), '[]'::jsonb)
       )
 where s.id = 'published'
   and jsonb_typeof(s.data -> 'products') = 'array';
