-- ============================================================================
-- Imports de Luxo — Painel administrativo
-- Migration 1/2: estrutura, segurança (RLS) e storage.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- ============================================================================

-- ----------------------------------------------------------------- ADMINS ---
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Quem pode editar o site. Só quem está aqui consegue salvar alterações.';

-- Função usada por todas as políticas. SECURITY DEFINER evita recursão de RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- --------------------------------------------------------------- CONTEÚDO ---
-- Todo texto, imagem e link editável do site vive aqui.
-- page_slug '_global' guarda as configurações gerais (WhatsApp, e-mail, logo...).
create table if not exists public.content_blocks (
  id            uuid primary key default gen_random_uuid(),
  page_slug     text not null,
  key           text not null,
  label         text not null,
  help          text,
  type          text not null default 'text'
                check (type in ('text', 'textarea', 'richtext', 'image', 'url', 'color')),
  value         text,
  section       text not null default 'geral',
  section_label text,
  sort          integer not null default 0,
  updated_at    timestamptz not null default now(),
  unique (page_slug, key)
);

create index if not exists content_blocks_page_idx on public.content_blocks (page_slug, sort);

-- ---------------------------------------------------------------- PRODUTOS --
create table if not exists public.products (
  id            text primary key,
  category      text not null,
  name          text not null,
  cart_name     text,
  alt           text,
  price         numeric(10, 2) not null default 0,
  image         text,
  gallery       jsonb not null default '[]'::jsonb,
  featured      boolean not null default false,
  featured_sort integer,
  sort          integer not null default 0,
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category, sort);
create index if not exists products_featured_idx on public.products (featured, featured_sort);

-- ------------------------------------------------------------------ MÍDIA ---
create table if not exists public.media_assets (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,
  url        text not null,
  label      text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- PUBLICAÇÃO ---
-- O site público lê UMA linha só ('published'). 'draft' é o que o painel edita
-- e o que a pré-visualização mostra.
create table if not exists public.site_snapshot (
  id         text primary key check (id in ('draft', 'published')),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Monta o JSON completo do site a partir das tabelas.
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
               featured, featured_sort, sort
        from public.products
        where active
      ) p
    ), '[]'::jsonb)
  );
$$;

-- Atualiza o rascunho. Chamado pelos triggers a cada alteração.
create or replace function public.refresh_draft()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_snapshot (id, data, updated_at, updated_by)
  values ('draft', public.build_snapshot(), now(), auth.uid())
  on conflict (id) do update
    set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by;
  return null;
end;
$$;

drop trigger if exists content_blocks_refresh_draft on public.content_blocks;
create trigger content_blocks_refresh_draft
  after insert or update or delete on public.content_blocks
  for each statement execute function public.refresh_draft();

drop trigger if exists products_refresh_draft on public.products;
create trigger products_refresh_draft
  after insert or update or delete on public.products
  for each statement execute function public.refresh_draft();

-- Publica: copia o rascunho para o site público. É o botão "Publicar" do painel.
create or replace function public.publish_site()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem publicar.';
  end if;

  insert into public.site_snapshot (id, data, updated_at, updated_by)
  values ('published', public.build_snapshot(), ts, auth.uid())
  on conflict (id) do update
    set data = excluded.data, updated_at = ts, updated_by = excluded.updated_by;

  return ts;
end;
$$;

-- Quem pode chamar o quê: só o painel (usuário logado) publica.
revoke all on function public.publish_site() from public, anon;
grant execute on function public.publish_site() to authenticated;
revoke all on function public.build_snapshot() from public, anon, authenticated;
revoke all on function public.refresh_draft() from public, anon, authenticated;

-- ------------------------------------------------------------------- RLS ----
alter table public.admin_users    enable row level security;
alter table public.content_blocks enable row level security;
alter table public.products       enable row level security;
alter table public.media_assets   enable row level security;
alter table public.site_snapshot  enable row level security;

-- admin_users: cada admin enxerga a própria linha; ninguém edita pelo navegador.
drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- Conteúdo, produtos e mídia: leitura e escrita só para administradores.
-- O site público NÃO lê estas tabelas — ele lê o snapshot publicado.
drop policy if exists content_blocks_admin_all on public.content_blocks;
create policy content_blocks_admin_all on public.content_blocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists media_assets_admin_all on public.media_assets;
create policy media_assets_admin_all on public.media_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Snapshot: qualquer visitante lê o publicado; o rascunho só para administradores.
drop policy if exists site_snapshot_public_read on public.site_snapshot;
create policy site_snapshot_public_read on public.site_snapshot
  for select to anon, authenticated using (id = 'published');

drop policy if exists site_snapshot_admin_read on public.site_snapshot;
create policy site_snapshot_admin_read on public.site_snapshot
  for select to authenticated using (public.is_admin());

drop policy if exists site_snapshot_admin_write on public.site_snapshot;
create policy site_snapshot_admin_write on public.site_snapshot
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- STORAGE ----
-- Bucket público de leitura (as fotos precisam abrir no site), escrita só admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images', 'site-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists site_images_public_read on storage.objects;
create policy site_images_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-images');

drop policy if exists site_images_admin_write on storage.objects;
create policy site_images_admin_write on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_admin_update on storage.objects;
create policy site_images_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'site-images' and public.is_admin());

drop policy if exists site_images_admin_delete on storage.objects;
create policy site_images_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());
