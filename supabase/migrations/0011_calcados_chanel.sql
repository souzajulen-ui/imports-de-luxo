-- ============================================================================
-- Imports de Luxo — Migration 11: 3 calçados, SEM PREÇO e escondidos do site.
--
-- Gerado por scripts/calcados.mjs. O jeito normal de cadastrar é o botão
-- "Adicionar ao catálogo" do painel; este SQL é a alternativa manual.
-- Rodar de novo não apaga nem sobrescreve edições feitas no painel.
-- ============================================================================

insert into public.products
  (id, category, gender, name, cart_name, alt, price, image, gallery, featured, featured_sort, sort, active)
values
  ('calcado-cl01', 'calcados', null, 'Tênis Chanel Preto e Branco', 'Tênis Chanel (CL01) - camurça preta e branco, CC na lateral, cadarço trançado', 'Tênis Chanel, camurça preta e branco, CC na lateral, cadarço trançado', 0, 'assets/img/produtos/calcados/cl-01.webp', '["assets/img/produtos/calcados/cl-01.webp"]'::jsonb, false, null, 1010, false),
  ('calcado-cl02', 'calcados', null, 'Sapato Chanel Slingback Marrom', 'Sapato Chanel Slingback (CL02) - camurça marrom café, bico bege com CC dourado, salto bloco', 'Sapato Chanel Slingback, camurça marrom café, bico bege com CC dourado, salto bloco', 0, 'assets/img/produtos/calcados/cl-02.webp', '["assets/img/produtos/calcados/cl-02.webp"]'::jsonb, false, null, 1020, false),
  ('calcado-cl03', 'calcados', null, 'Sapato Chanel Slingback Vinho', 'Sapato Chanel Slingback (CL03) - camurça vinho, bico verde menta com CC dourado, salto bloco', 'Sapato Chanel Slingback, camurça vinho, bico verde menta com CC dourado, salto bloco', 0, 'assets/img/produtos/calcados/cl-03.webp', '["assets/img/produtos/calcados/cl-03.webp"]'::jsonb, false, null, 1030, false)
on conflict (id) do nothing;
