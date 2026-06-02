-- ============================================================================
-- LUVR — initial database schema
-- Solo erotic interactive-story app.
-- Continuous stories -> segments -> 4 choices/segment -> psychological scoring.
--
-- Idempotent: safe to run multiple times.
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- profiles: one row per auth user (id == auth.users.id)
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  gender              text,
  attracted_to        text,
  writing_style       text,
  onboarding_complete boolean default false,
  created_at          timestamptz default now()
);

-- stories: a continuous interactive story owned by a user
create table if not exists public.stories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  setting       text,
  custom_prompt text,
  writing_style text,
  gender_config text,
  status        text default 'active',
  created_at    timestamptz default now()
);

-- segments: an ordered chunk of a story, ending in choices
create table if not exists public.segments (
  id             uuid primary key default gen_random_uuid(),
  story_id       uuid not null references public.stories (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  segment_number integer not null,
  body_text      text,
  choice_made_id uuid,
  created_at     timestamptz default now()
);

-- segment_choices: the four choices at the end of a segment, each scored
create table if not exists public.segment_choices (
  id                 uuid primary key default gen_random_uuid(),
  segment_id         uuid not null references public.segments (id) on delete cascade,
  option_label       text,
  option_text        text,
  score_energetic    numeric default 0,
  score_sensual      numeric default 0,
  score_sexual       numeric default 0,
  score_kinky        numeric default 0,
  score_shapeshifter numeric default 0,
  score_secure       numeric default 0,
  score_anxious      numeric default 0,
  score_avoidant     numeric default 0,
  score_fearful      numeric default 0,
  score_words        numeric default 0,
  score_acts         numeric default 0,
  score_gifts        numeric default 0,
  score_time         numeric default 0,
  score_touch        numeric default 0,
  created_at         timestamptz default now()
);

-- blueprint_scores: accumulated erotic-blueprint profile (one row per user)
create table if not exists public.blueprint_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  energetic    numeric default 0,
  sensual      numeric default 0,
  sexual       numeric default 0,
  kinky        numeric default 0,
  shapeshifter numeric default 0,
  sample_count integer default 0,
  last_updated timestamptz default now()
);

-- attachment_scores: accumulated attachment-style profile (one row per user)
create table if not exists public.attachment_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  secure       numeric default 0,
  anxious      numeric default 0,
  avoidant     numeric default 0,
  fearful      numeric default 0,
  sample_count integer default 0,
  last_updated timestamptz default now()
);

-- lovelanguage_scores: accumulated love-language profile (one row per user)
create table if not exists public.lovelanguage_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  words        numeric default 0,
  acts         numeric default 0,
  gifts        numeric default 0,
  "time"       numeric default 0,
  touch        numeric default 0,
  sample_count integer default 0,
  last_updated timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_segments_story_id        on public.segments (story_id);
create index if not exists idx_segments_user_id         on public.segments (user_id);
create index if not exists idx_segment_choices_segment_id on public.segment_choices (segment_id);
create index if not exists idx_stories_user_id          on public.stories (user_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.stories             enable row level security;
alter table public.segments            enable row level security;
alter table public.segment_choices     enable row level security;
alter table public.blueprint_scores    enable row level security;
alter table public.attachment_scores   enable row level security;
alter table public.lovelanguage_scores enable row level security;

-- profiles: ownership column is id
drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all"
  on public.profiles
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- stories: ownership column is user_id
drop policy if exists "stories_owner_all" on public.stories;
create policy "stories_owner_all"
  on public.stories
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- segments: ownership column is user_id
drop policy if exists "segments_owner_all" on public.segments;
create policy "segments_owner_all"
  on public.segments
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- segment_choices: no user_id column; ownership is inherited from the parent
-- segment (segment_choices.segment_id -> segments.user_id == auth.uid()).
drop policy if exists "segment_choices_owner_all" on public.segment_choices;
create policy "segment_choices_owner_all"
  on public.segment_choices
  for all
  to authenticated
  using (
    exists (
      select 1 from public.segments s
      where s.id = segment_choices.segment_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.segments s
      where s.id = segment_choices.segment_id
        and s.user_id = auth.uid()
    )
  );

-- blueprint_scores: ownership column is user_id
drop policy if exists "blueprint_scores_owner_all" on public.blueprint_scores;
create policy "blueprint_scores_owner_all"
  on public.blueprint_scores
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- attachment_scores: ownership column is user_id
drop policy if exists "attachment_scores_owner_all" on public.attachment_scores;
create policy "attachment_scores_owner_all"
  on public.attachment_scores
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- lovelanguage_scores: ownership column is user_id
drop policy if exists "lovelanguage_scores_owner_all" on public.lovelanguage_scores;
create policy "lovelanguage_scores_owner_all"
  on public.lovelanguage_scores
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- New-user bootstrap: create empty profile + score rows on signup
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;

  insert into public.blueprint_scores (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  insert into public.attachment_scores (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  insert into public.lovelanguage_scores (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- End of migration
-- ============================================================================
