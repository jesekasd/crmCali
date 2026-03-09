-- Enable UUID support
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

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

create table if not exists public.student_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  metric text not null check (metric in ('pullups', 'pushups', 'muscle_ups', 'handstand_seconds')),
  target_value integer not null check (target_value >= 0),
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_coach on public.students(coach_id);
create index if not exists idx_students_coach_status_created on public.students(coach_id, status, created_at desc);
create index if not exists idx_students_name_trgm on public.students using gin (name gin_trgm_ops);
create index if not exists idx_students_goal_trgm on public.students using gin (goal gin_trgm_ops);
create index if not exists idx_workouts_coach on public.workouts(coach_id);
create index if not exists idx_progress_student_date on public.progress(student_id, date desc);
create index if not exists idx_payments_student_date on public.payments(student_id, date desc);
create index if not exists idx_payments_student_status_date on public.payments(student_id, status, date desc);
create index if not exists idx_student_goals_student on public.student_goals(student_id, target_date desc);
create index if not exists idx_student_goals_student_status_target on public.student_goals(student_id, status, target_date desc);

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

create or replace function public.dashboard_student_summary(
  p_student_ids uuid[],
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  student_id uuid,
  records integer,
  latest_date date,
  best_pullups integer,
  paid_for_student numeric
)
language sql
stable
set search_path = public
as $$
  with progress_filtered as (
    select
      progress.student_id,
      count(*)::integer as records,
      max(progress.date) as latest_date,
      max(progress.pullups)::integer as best_pullups
    from public.progress
    where progress.student_id = any(p_student_ids)
      and (p_start_date is null or progress.date >= p_start_date)
      and (p_end_date is null or progress.date <= p_end_date)
    group by progress.student_id
  ),
  payments_filtered as (
    select
      payments.student_id,
      coalesce(sum(case when payments.status = 'paid' then payments.amount else 0 end), 0)::numeric as paid_for_student
    from public.payments
    where payments.student_id = any(p_student_ids)
      and (p_start_date is null or payments.date >= p_start_date)
      and (p_end_date is null or payments.date <= p_end_date)
    group by payments.student_id
  )
  select
    coalesce(progress_filtered.student_id, payments_filtered.student_id) as student_id,
    coalesce(progress_filtered.records, 0) as records,
    progress_filtered.latest_date,
    coalesce(progress_filtered.best_pullups, 0) as best_pullups,
    coalesce(payments_filtered.paid_for_student, 0)::numeric as paid_for_student
  from progress_filtered
  full outer join payments_filtered on payments_filtered.student_id = progress_filtered.student_id
$$;

create or replace function public.dashboard_trend_metrics(
  p_student_ids uuid[],
  p_reference_date date default current_date
)
returns table (
  sort_order integer,
  label text,
  current_value numeric,
  previous_value numeric,
  delta_percentage numeric,
  format text
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select
      date_trunc('month', p_reference_date)::date as current_start,
      (date_trunc('month', p_reference_date) - interval '1 month')::date as previous_start
  ),
  payment_agg as (
    select
      coalesce(
        sum(case when payments.status = 'paid' and payments.date >= bounds.current_start and payments.date <= p_reference_date then payments.amount else 0 end),
        0
      )::numeric as current_revenue,
      coalesce(
        sum(case when payments.status = 'paid' and payments.date >= bounds.previous_start and payments.date < bounds.current_start then payments.amount else 0 end),
        0
      )::numeric as previous_revenue
    from public.payments
    cross join bounds
    where payments.student_id = any(p_student_ids)
      and payments.date >= bounds.previous_start
      and payments.date <= p_reference_date
  ),
  progress_agg as (
    select
      count(*) filter (where progress.date >= bounds.current_start and progress.date <= p_reference_date)::numeric as current_records,
      count(*) filter (where progress.date >= bounds.previous_start and progress.date < bounds.current_start)::numeric as previous_records,
      coalesce(avg(progress.pullups) filter (where progress.date >= bounds.current_start and progress.date <= p_reference_date), 0)::numeric as current_pullups,
      coalesce(avg(progress.pullups) filter (where progress.date >= bounds.previous_start and progress.date < bounds.current_start), 0)::numeric as previous_pullups,
      coalesce(avg(progress.handstand_seconds) filter (where progress.date >= bounds.current_start and progress.date <= p_reference_date), 0)::numeric as current_handstand,
      coalesce(avg(progress.handstand_seconds) filter (where progress.date >= bounds.previous_start and progress.date < bounds.current_start), 0)::numeric as previous_handstand
    from public.progress
    cross join bounds
    where progress.student_id = any(p_student_ids)
      and progress.date >= bounds.previous_start
      and progress.date <= p_reference_date
  ),
  metrics as (
    select
      1 as sort_order,
      'Ingresos del mes'::text as label,
      payment_agg.current_revenue as current_value,
      payment_agg.previous_revenue as previous_value,
      'currency'::text as format
    from payment_agg
    union all
    select
      2,
      'Registros del mes',
      progress_agg.current_records,
      progress_agg.previous_records,
      'integer'
    from progress_agg
    union all
    select
      3,
      'Promedio pullups',
      progress_agg.current_pullups,
      progress_agg.previous_pullups,
      'integer'
    from progress_agg
    union all
    select
      4,
      'Promedio handstand',
      progress_agg.current_handstand,
      progress_agg.previous_handstand,
      'seconds'
    from progress_agg
  )
  select
    metrics.sort_order,
    metrics.label,
    metrics.current_value,
    metrics.previous_value,
    case
      when metrics.previous_value = 0 and metrics.current_value = 0 then 0
      when metrics.previous_value = 0 then null
      else ((metrics.current_value - metrics.previous_value) / metrics.previous_value) * 100
    end as delta_percentage,
    metrics.format
  from metrics
  order by metrics.sort_order
$$;

grant execute on function public.dashboard_student_summary(uuid[], date, date) to authenticated, service_role;
grant execute on function public.dashboard_trend_metrics(uuid[], date) to authenticated, service_role;

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
alter table public.student_goals enable row level security;

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

-- student goals
drop policy if exists "student_goals_manage_own" on public.student_goals;
create policy "student_goals_manage_own" on public.student_goals
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
