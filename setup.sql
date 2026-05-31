-- ═══════════════════════════════════════════════════
--  MUNDIAL 2026 PRODE — Setup de Supabase
--  Copiá y pegá esto en: Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════

-- 1. Perfiles de usuario
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- 2. Predicciones de partidos
create table predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  match_id bigint not null,
  home_score smallint not null,
  away_score smallint not null,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

-- 3. Predicciones bonus
create table bonus_predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique not null,
  champion text default '',
  runner_up text default '',
  top_scorer text default '',
  best_player text default '',
  created_at timestamptz default now()
);

-- 4. Resultados bonus (admin los carga manualmente acá en Supabase)
create table bonus_results (
  key text primary key,
  value text not null default ''
);

insert into bonus_results (key, value) values
  ('champion', ''),
  ('runner_up', ''),
  ('top_scorer', ''),
  ('best_player', '');

-- ═══════════════════════════════════════════════════
--  SEGURIDAD: Row Level Security
-- ═══════════════════════════════════════════════════

alter table profiles enable row level security;
alter table predictions enable row level security;
alter table bonus_predictions enable row level security;
alter table bonus_results enable row level security;

-- Profiles: todos leen, cada uno escribe el suyo
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Predictions: todos leen (para el leaderboard), cada uno escribe el suyo
create policy "predictions_select" on predictions for select using (true);
create policy "predictions_insert" on predictions for insert with check (auth.uid() = user_id);
create policy "predictions_update" on predictions for update using (auth.uid() = user_id);

-- Bonus predictions: ídem
create policy "bonus_select" on bonus_predictions for select using (true);
create policy "bonus_insert" on bonus_predictions for insert with check (auth.uid() = user_id);
create policy "bonus_update" on bonus_predictions for update using (auth.uid() = user_id);

-- Bonus results: solo lectura pública (vos los editás desde el dashboard)
create policy "bonus_results_select" on bonus_results for select using (true);

-- ═══════════════════════════════════════════════════
--  CÓMO CARGAR LOS RESULTADOS BONUS (al final del torneo)
--  Ejecutá estas queries cuando se conozcan los ganadores:
-- ═══════════════════════════════════════════════════

-- update bonus_results set value = 'Argentina' where key = 'champion';
-- update bonus_results set value = 'Francia' where key = 'runner_up';
-- update bonus_results set value = 'Lionel Messi' where key = 'top_scorer';
-- update bonus_results set value = 'Lionel Messi' where key = 'best_player';
