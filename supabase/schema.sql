-- Schema per location-tracker
-- Esegui in Supabase SQL editor

create table if not exists public.markers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  latitude    double precision not null,
  longitude   double precision not null,
  created_at  timestamptz not null default now()
);

create index if not exists markers_created_at_idx
  on public.markers (created_at desc);

-- RLS: per uso personale single-user, abilitiamo accesso pubblico anonimo.
-- ATTENZIONE: in produzione multiutente sostituire con policy basate su auth.uid().
alter table public.markers enable row level security;

drop policy if exists "markers_anon_all" on public.markers;
create policy "markers_anon_all"
  on public.markers
  for all
  to anon
  using (true)
  with check (true);
