-- SavePoint: tabelas, regras e segurança por linha (RLS).
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar de novo sem problema: o que já existe
-- é mantido.

-- ---------------------------------------------------------------------------
-- Jogos
-- ---------------------------------------------------------------------------
create table if not exists public.jogos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  plataforma text not null check (length(trim(plataforma)) > 0),
  generos text[] not null default '{}' check (cardinality(generos) <= 3),
  -- Só o caminho da imagem no armazenamento; a capa fica no bucket "capas".
  capa_caminho text,
  situacao text not null check (situacao in ('Jogando', 'Pausado', 'Concluído', 'Quero jogar')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists jogos_user_id_idx on public.jogos (user_id);

-- ---------------------------------------------------------------------------
-- Sessões
-- ---------------------------------------------------------------------------
create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  jogo_id uuid not null,
  numero integer not null check (numero > 0),
  inicio timestamptz not null,
  fim timestamptz,
  -- Milissegundos pausados, como no app.
  tempo_pausado bigint not null default 0 check (tempo_pausado >= 0),
  pausado_em timestamptz,
  o_que_fiz text not null default '',
  onde_parei text not null default '',
  proximo_passo text not null default '',
  -- A sessão pertence a um jogo do mesmo usuário; apagar o jogo apaga as sessões.
  foreign key (jogo_id, user_id) references public.jogos (id, user_id) on delete cascade,
  check (fim is null or fim >= inicio),
  unique (jogo_id, numero),
  unique (id, user_id),
  unique (id, jogo_id, user_id)
);

create index if not exists sessoes_user_id_idx on public.sessoes (user_id);
create index if not exists sessoes_jogo_id_idx on public.sessoes (jogo_id);

-- Só existe uma sessão ativa (sem fim) por usuário.
create unique index if not exists sessoes_uma_ativa_por_usuario
  on public.sessoes (user_id)
  where fim is null;

-- ---------------------------------------------------------------------------
-- Registros (anotações)
-- ---------------------------------------------------------------------------
create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  jogo_id uuid not null,
  sessao_id uuid not null,
  tipo text not null check (tipo in (
    'Diário', 'Senhas', 'Documentos', 'Puzzles', 'Lembretes',
    'Marco', 'Região mapeada', 'Objetivo'
  )),
  texto text not null check (length(trim(texto)) > 0),
  tags text[] not null default '{}',
  data_hora timestamptz not null default now(),
  -- Campos de conclusão: só para Objetivo.
  concluido boolean,
  concluido_em timestamptz,
  concluido_sessao_id uuid,
  -- Todo registro tem sessão, e a sessão é do mesmo jogo e do mesmo usuário.
  foreign key (sessao_id, jogo_id, user_id)
    references public.sessoes (id, jogo_id, user_id) on delete cascade,
  -- Apagar a sessão em que um objetivo foi concluído mantém o objetivo concluído.
  foreign key (concluido_sessao_id, user_id)
    references public.sessoes (id, user_id) on delete set null (concluido_sessao_id),
  check (tipo = 'Objetivo' or (concluido is null and concluido_em is null and concluido_sessao_id is null))
);

create index if not exists registros_user_id_idx on public.registros (user_id);
create index if not exists registros_jogo_id_idx on public.registros (jogo_id);
create index if not exists registros_sessao_id_idx on public.registros (sessao_id);

-- ---------------------------------------------------------------------------
-- Segurança por linha: cada usuário lê e grava só os próprios dados.
-- ---------------------------------------------------------------------------
alter table public.jogos enable row level security;
alter table public.sessoes enable row level security;
alter table public.registros enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['jogos', 'sessoes', 'registros'] loop
    execute format('drop policy if exists "dono le" on public.%I', tabela);
    execute format('drop policy if exists "dono cria" on public.%I', tabela);
    execute format('drop policy if exists "dono altera" on public.%I', tabela);
    execute format('drop policy if exists "dono apaga" on public.%I', tabela);

    execute format(
      'create policy "dono le" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono cria" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono altera" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      tabela);
    execute format(
      'create policy "dono apaga" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      tabela);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Capas: bucket privado, uma pasta por usuário (capas/<id do usuário>/...).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capas', 'capas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "capas: dono le" on storage.objects;
drop policy if exists "capas: dono envia" on storage.objects;
drop policy if exists "capas: dono troca" on storage.objects;
drop policy if exists "capas: dono apaga" on storage.objects;

create policy "capas: dono le" on storage.objects for select to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "capas: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "capas: dono troca" on storage.objects for update to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "capas: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = (select auth.uid())::text);
