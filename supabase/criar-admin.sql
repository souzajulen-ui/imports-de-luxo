-- ============================================================================
-- Imports de Luxo — cria (ou atualiza) o usuário do painel administrativo.
--
-- Rode DEPOIS de 0001_schema.sql e 0002_seed.sql, no SQL Editor do Supabase.
--
-- Este script faz tudo de uma vez:
--   1. cria o login de e-mail e senha, já confirmado;
--   2. libera o acesso de administrador (tabela admin_users).
--
-- Para trocar a senha depois, escreva a nova em v_senha e rode o arquivo de novo,
-- ou use Authentication → Users → … → Reset password no painel do Supabase.
--
-- ATENÇÃO: este repositório é público. Nunca deixe a senha de verdade salva
-- aqui — troque-a de volta pelo texto TROQUE-POR-UMA-SENHA depois de rodar.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_email text := 'reneetartarelli@gmail.com';
  v_senha text := 'TROQUE-POR-UMA-SENHA';  -- <<< escreva a senha aqui ANTES de rodar
  v_nome  text := 'Administrador';
  v_id    uuid;
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_senha, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );

    raise notice 'Usuário criado: %', v_email;
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_senha, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;

    raise notice 'Usuário já existia; senha atualizada: %', v_email;
  end if;

  insert into public.admin_users (user_id, email, name)
  values (v_id, v_email, v_nome)
  on conflict (user_id) do update set email = excluded.email, name = excluded.name;
end $$;

-- Confere se deu certo: deve devolver exatamente uma linha.
select u.email, u.email_confirmed_at is not null as confirmado, a.name as papel
from auth.users u
join public.admin_users a on a.user_id = u.id
where u.email = 'reneetartarelli@gmail.com';
