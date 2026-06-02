-- ============================================================================
-- LUVR — grant table privileges
--
-- Fixes "permission denied for table ..." errors. RLS only decides WHICH rows
-- a role may touch; the role must first hold table-level privileges at all.
--   - service_role: used by edge functions (bypasses RLS) -> needs full access.
--   - authenticated: the signed-in app user -> our RLS policies are "to
--     authenticated", so this role must hold privileges for those policies to
--     apply (RLS still restricts to the user's own rows).
--   - anon: standard Supabase default; RLS still gates every row.
--
-- Idempotent: GRANT is repeatable and ALTER DEFAULT PRIVILEGES is upsert-like.
-- ============================================================================

-- Schema access.
grant usage on schema public to anon, authenticated, service_role;

-- Existing objects.
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- Future objects inherit the same grants automatically.
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
