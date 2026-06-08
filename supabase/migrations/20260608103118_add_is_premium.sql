-- ============================================================================
-- LUVR — add is_premium flag to profiles
--
-- Architectural groundwork for a future paywall. When real payments are added,
-- set is_premium = true on successful purchase and the app gating will apply.
-- Idempotent.
-- ============================================================================

alter table public.profiles
  add column if not exists is_premium boolean not null default false;
