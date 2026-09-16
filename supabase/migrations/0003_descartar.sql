-- ============================================================================
-- Imports de Luxo — Migration 3: botão "Descartar alterações".
--
-- Devolve textos, imagens e produtos exatamente ao que está publicado no site,
-- jogando fora tudo o que foi salvo mas ainda não publicado.
--
-- Rode no SQL Editor do Supabase, depois das migrations 1 e 2.
-- ============================================================================

create or replace function public.restore_from_published()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  snap   jsonb;
  pub_ts timestamptz;
  agora  timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem descartar alterações.';
  end if;

  select data, updated_at into snap, pub_ts
    from public.site_snapshot where id = 'published';

  if snap is null then
    raise exception 'Não existe versão publicada para voltar.';
  end if;

  -- 1. textos, imagens e links voltam ao valor publicado
  update public.content_blocks b
     set value = snap->'blocks'->b.page_slug->>b.key,
         updated_at = agora
   where snap->'blocks'->b.page_slug ? b.key
     and b.value is distinct from snap->'blocks'->b.page_slug->>b.key;

  -- 2. produtos que existem na versão publicada voltam como estavam
  insert into public.products (
    id, category, name, cart_name, alt, price, image, gallery,
    featured, featured_sort, sort, active, updated_at
  )
  select e->>'id', e->>'category', e->>'name', e->>'cart_name', e->>'alt',
         coalesce((e->>'price')::numeric, 0), e->>'image',
         coalesce(e->'gallery', '[]'::jsonb),
         coalesce((e->>'featured')::boolean, false),
         nullif(e->>'featured_sort', '')::integer,
         coalesce((e->>'sort')::integer, 0),
         true, agora
    from jsonb_array_elements(snap->'products') e
  on conflict (id) do update set
    category      = excluded.category,
    name          = excluded.name,
    cart_name     = excluded.cart_name,
    alt           = excluded.alt,
    price         = excluded.price,
    image         = excluded.image,
    gallery       = excluded.gallery,
    featured      = excluded.featured,
    featured_sort = excluded.featured_sort,
    sort          = excluded.sort,
    active        = true,
    updated_at    = agora;

  -- 3. produtos criados depois da publicação somem do site, mas NÃO são
  --    apagados — ficam ocultos, para nada ser perdido sem querer.
  update public.products p
     set active = false, updated_at = agora
   where p.active
     and not exists (
       select 1 from jsonb_array_elements(snap->'products') e
        where e->>'id' = p.id
     );

  -- 4. o rascunho volta a ser idêntico ao publicado (some o aviso amarelo)
  insert into public.site_snapshot (id, data, updated_at, updated_by)
  values ('draft', public.build_snapshot(), pub_ts, auth.uid())
  on conflict (id) do update
    set data = excluded.data, updated_at = pub_ts, updated_by = excluded.updated_by;

  return pub_ts;
end;
$$;

revoke all on function public.restore_from_published() from public, anon;
grant execute on function public.restore_from_published() to authenticated;
