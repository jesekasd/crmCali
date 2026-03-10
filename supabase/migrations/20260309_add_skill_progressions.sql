create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  skill_slug text not null check (skill_slug in ('handstand', 'muscle_up', 'front_lever', 'planche', 'back_lever', 'l_sit')),
  current_stage integer not null default 0 check (current_stage >= 0),
  target_stage integer not null default 0 check (target_stage >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  notes text,
  started_at date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (student_id, skill_slug)
);

create table if not exists public.skill_progress_logs (
  id uuid primary key default gen_random_uuid(),
  student_skill_id uuid not null references public.student_skills(id) on delete cascade,
  stage_index integer not null check (stage_index >= 0),
  readiness_score integer check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100)),
  passed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_skills_student_status on public.student_skills(student_id, status, updated_at desc);
create index if not exists idx_student_skills_skill_slug on public.student_skills(skill_slug, status, updated_at desc);
create index if not exists idx_skill_progress_logs_skill_created on public.skill_progress_logs(student_skill_id, created_at desc);

alter table public.student_skills enable row level security;
alter table public.skill_progress_logs enable row level security;

drop policy if exists "student_skills_manage_own" on public.student_skills;
create policy "student_skills_manage_own" on public.student_skills
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

drop policy if exists "skill_progress_logs_manage_own" on public.skill_progress_logs;
create policy "skill_progress_logs_manage_own" on public.skill_progress_logs
for all
using (
  exists (
    select 1
    from public.student_skills ss
    join public.students s on s.id = ss.student_id
    where ss.id = student_skill_id
      and s.coach_id = public.current_coach_id()
  )
)
with check (
  exists (
    select 1
    from public.student_skills ss
    join public.students s on s.id = ss.student_id
    where ss.id = student_skill_id
      and s.coach_id = public.current_coach_id()
  )
);
