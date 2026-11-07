-- SavePoint: tabela de usuários (perfis).
-- O Supabase já guarda e-mail e senha (com segurança) em auth.users, que o app
-- não consegue consultar. Esta tabela espelha os dados públicos de cada conta:
-- nome e e-mail. É preenchida sozinha a cada novo cadastro.
--
-- Como usar: no SQL Editor, cole e rode (depois do 0001, ou junto com ele).
-- Pode rodar de novo sem problema.

create table if not exists public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Cada pessoa vê e edita só o próprio perfil. Apagar a conta apaga o perfil.
drop policy if exists "dono le perfil" on public.perfis;
drop policy if exists "dono cria perfil" on public.perfis;
drop policy if exists "dono altera perfil" on public.perfis;

create policy "dono le perfil" on public.perfis for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "dono cria perfil" on public.perfis for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "dono altera perfil" on public.perfis for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Cria o perfil no cadastro e mantém nome e e-mail em dia quando mudam.
create or replace function public.sincronizar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id, nome, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (user_id) do update
    set nome = excluded.nome,
        email = excluded.email,
        atualizado_em = now();

  return new;
end;
$$;

-- A função só deve rodar pelo gatilho, nunca ser chamada de fora.
revoke execute on function public.sincronizar_perfil() from public, anon, authenticated;

drop trigger if exists sincronizar_perfil_no_cadastro on auth.users;

create trigger sincronizar_perfil_no_cadastro
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sincronizar_perfil();

-- Contas que já existiam antes desta tabela ganham o perfil agora.
insert into public.perfis (user_id, nome, email)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'nome', ''), split_part(coalesce(email, ''), '@', 1)),
  coalesce(email, '')
from auth.users
on conflict (user_id) do nothing;
