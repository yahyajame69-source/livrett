-- À exécuter dans Supabase > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'DJF',
  age_range text,
  cover_url text,
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.products enable row level security;
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.products to anon, authenticated;
grant all on table public.products to service_role;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "products_public_read_available" on public.products for select to anon, authenticated using (is_available=true);
create policy "admin_read_all_products" on public.products for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin_insert_products" on public.products for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin_update_products" on public.products for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "admin_delete_products" on public.products for delete to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
-- Après avoir créé ton utilisateur dans Supabase Authentication, remplace l'UUID ci-dessous :
-- insert into public.profiles(id, role) values ('UUID_DE_TON_UTILISATEUR', 'admin')
-- on conflict (id) do update set role='admin';
