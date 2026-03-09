-- Enable UUID support
create extension if not exists "pgcrypto";

-- Users profile table (mapped 1:1 to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  experience integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  goal text,
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_assignments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (workout_id, student_id)
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  pullups integer not null default 0,
  pushups integer not null default 0,
  muscle_ups integer not null default 0,
  handstand_seconds integer not null default 0,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_coach on public.students(coach_id);
create index if not exists idx_workouts_coach on public.workouts(coach_id);
create index if not exists idx_progress_student_date on public.progress(student_id, date desc);
create index if not exists idx_payments_student_date on public.payments(student_id, date desc);

-- Helper function to resolve coach ID from auth.uid()
create or replace function public.current_coach_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.coaches
  where user_id = auth.uid()
  limit 1
$$;

-- Auto-provision users + coach profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coach_name text;
begin
  coach_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Coach'
  );

  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  insert into public.coaches (user_id, name)
  values (new.id, coach_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS setup
alter table public.users enable row level security;
alter table public.coaches enable row level security;
alter table public.students enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_assignments enable row level security;
alter table public.progress enable row level security;
alter table public.payments enable row level security;

-- users
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
for select using (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
for update using (id = auth.uid());

-- coaches
drop policy if exists "coaches_manage_own" on public.coaches;
create policy "coaches_manage_own" on public.coaches
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- students
drop policy if exists "students_manage_own" on public.students;
create policy "students_manage_own" on public.students
for all
using (coach_id = public.current_coach_id())
with check (coach_id = public.current_coach_id());

-- workouts
drop policy if exists "workouts_manage_own" on public.workouts;
create policy "workouts_manage_own" on public.workouts
for all
using (coach_id = public.current_coach_id())
with check (coach_id = public.current_coach_id());

-- workout assignments
drop policy if exists "assignments_manage_own" on public.workout_assignments;
create policy "assignments_manage_own" on public.workout_assignments
for all
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
  and exists (
    select 1
    from public.workouts w
    where w.id = workout_id
      and w.coach_id = public.current_coach_id()
  )
);

-- progress
drop policy if exists "progress_manage_own" on public.progress;
create policy "progress_manage_own" on public.progress
for all
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
);

-- payments
drop policy if exists "payments_manage_own" on public.payments;
create policy "payments_manage_own" on public.payments
for all
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.coach_id = public.current_coach_id()
  )
);
