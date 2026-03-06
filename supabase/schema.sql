-- AcademicTracker Supabase schema
-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  cgpa_scale integer not null default 5 check (cgpa_scale in (4, 5)),
  grading_scale jsonb null,
  total_degree_credits integer null check (total_degree_credits > 0),
  current_level integer null check (current_level between 100 and 900),
  current_semester text null check (current_semester in ('First','Second','Summer')),
  has_seen_onboarding boolean not null default false,
  base_cgpa numeric(3,2) null check (base_cgpa >= 0 and base_cgpa <= cgpa_scale),
  base_total_credits integer null check (base_total_credits >= 0),
  target_gpa numeric(3,2) null check (target_gpa >= 0 and target_gpa <= cgpa_scale),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists cgpa_scale integer not null default 5 check (cgpa_scale in (4, 5));

alter table public.profiles
  add column if not exists grading_scale jsonb null;

alter table public.profiles
  add column if not exists total_degree_credits integer null check (total_degree_credits > 0);

alter table public.profiles
  add column if not exists current_level integer null check (current_level between 100 and 900);

alter table public.profiles
  add column if not exists current_semester text null check (current_semester in ('First','Second','Summer'));

alter table public.profiles
  add column if not exists has_seen_onboarding boolean not null default false;

alter table public.profiles
  add column if not exists base_cgpa numeric(3,2) null check (base_cgpa >= 0 and base_cgpa <= 5);

alter table public.profiles
  add column if not exists base_total_credits integer null check (base_total_credits >= 0);

alter table public.profiles
  add column if not exists target_gpa numeric(3,2) null check (target_gpa >= 0 and target_gpa <= 5);

update public.profiles
set cgpa_scale = 5
where cgpa_scale is null or cgpa_scale not in (4, 5);

alter table public.profiles
  drop constraint if exists profiles_cgpa_scale_check;

alter table public.profiles
  add constraint profiles_cgpa_scale_check
  check (cgpa_scale in (4, 5));

alter table public.profiles
  drop constraint if exists profiles_base_cgpa_check;

alter table public.profiles
  add constraint profiles_base_cgpa_check
  check (base_cgpa is null or (base_cgpa >= 0 and base_cgpa <= cgpa_scale));

alter table public.profiles
  drop constraint if exists profiles_target_gpa_check;

alter table public.profiles
  add constraint profiles_target_gpa_check
  check (target_gpa is null or (target_gpa >= 0 and target_gpa <= cgpa_scale));

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  title text not null,
  units integer not null check (units between 1 and 10),
  level integer not null default 100 check (level between 100 and 900),
  grade text null check (grade in ('A','B+','B','C+','C','D+','D','E','F')),
  target_grade text null check (target_grade in ('A','B+','B','C+','C','D+','D','E','F')),
  current_score numeric(6,2) not null default 0 check (current_score >= 0),
  max_assessment_score integer not null default 30 check (max_assessment_score in (30, 40)),
  semester text not null check (semester in ('First','Second','Summer')),
  year integer not null check (year between 2000 and 2100),
  status text not null check (status in ('in-progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_code)
);

alter table public.courses
  add column if not exists target_grade text null check (target_grade in ('A','B+','B','C+','C','D+','D','E','F'));

alter table public.courses
  add column if not exists current_score numeric(6,2) not null default 0 check (current_score >= 0);

alter table public.courses
  add column if not exists max_assessment_score integer not null default 30 check (max_assessment_score in (30, 40));

alter table public.courses
  add column if not exists level integer not null default 100 check (level between 100 and 900);

create table if not exists public.insights (
  user_id uuid primary key references auth.users(id) on delete cascade,
  insights jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  last_sync_status text null check (last_sync_status in ('success','error')),
  last_sync_at timestamptz null,
  last_sync_detail text null
);

create index if not exists idx_courses_user_id on public.courses(user_id);
create index if not exists idx_courses_user_semester_year on public.courses(user_id, year desc, semester);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.insights enable row level security;

drop policy if exists "Profiles are selectable by owner" on public.profiles;
create policy "Profiles are selectable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Courses are owned by user" on public.courses;
create policy "Courses are owned by user"
  on public.courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Insights are owned by user" on public.insights;
create policy "Insights are owned by user"
  on public.insights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
