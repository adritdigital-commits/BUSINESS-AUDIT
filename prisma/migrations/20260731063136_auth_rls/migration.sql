-- Auto-provision a `profiles` row for every new Supabase Auth user, and
-- lock the whole schema down with Row Level Security.
--
-- Access model:
--   * Next.js API routes are the primary write path. They use Prisma over
--     a direct Postgres connection (DATABASE_URL), which runs as the
--     database owner and bypasses RLS — authorization for that path is
--     enforced in application code (see src/lib/auth.ts) by checking the
--     caller's Supabase session + profiles.role before every query.
--   * RLS below is defense-in-depth for any query that goes through the
--     Supabase client directly (anon/authenticated keys), e.g. future
--     realtime subscriptions or client-side reads.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS self-recursion on profiles)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS "Role"
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT "clientId" FROM public.profiles WHERE id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile whenever someone signs up via Supabase Auth.
-- Role can only come from `raw_app_meta_data` (server/admin-settable via
-- the service role), never `raw_user_meta_data` (client-settable at
-- signup) — otherwise a user could self-signup as ADMIN.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, "fullName", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE((NEW.raw_app_meta_data ->> 'role')::"Role", 'CLIENT'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent a non-admin from granting themselves a higher role via a direct
-- Supabase-client update to their own profile row.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND public.current_role_name() IS DISTINCT FROM 'ADMIN' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals   ENABLE ROW LEVEL SECURITY;

-- profiles: everyone can read/update their own row; admins can do anything;
-- staff can read everyone (needed to work client accounts).
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.current_role_name() IN ('ADMIN', 'STAFF'));

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.current_role_name() = 'ADMIN')
  WITH CHECK (id = auth.uid() OR public.current_role_name() = 'ADMIN');

CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL USING (public.current_role_name() = 'ADMIN')
  WITH CHECK (public.current_role_name() = 'ADMIN');

-- question bank: publicly readable (anonymous visitors take the audit),
-- writable only by admin/staff.
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "categories_staff_write" ON public.categories
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));

CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT USING (true);
CREATE POLICY "questions_staff_write" ON public.questions
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));

CREATE POLICY "options_public_read" ON public.options
  FOR SELECT USING (true);
CREATE POLICY "options_staff_write" ON public.options
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));

CREATE POLICY "services_public_read" ON public.services
  FOR SELECT USING (true);
CREATE POLICY "services_staff_write" ON public.services
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));

-- clients: admin/staff manage everything; a CLIENT profile can only read
-- its own business record.
CREATE POLICY "clients_staff_all" ON public.clients
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));
CREATE POLICY "clients_self_read" ON public.clients
  FOR SELECT USING (id = public.current_client_id());

-- assessments: admin/staff manage everything. Anonymous/public visitors may
-- create an assessment (the audit can start before login). A client user
-- may read/update assessments tied to their business or that they claimed.
CREATE POLICY "assessments_staff_all" ON public.assessments
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));
CREATE POLICY "assessments_public_insert" ON public.assessments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "assessments_owner_select" ON public.assessments
  FOR SELECT USING (
    "clientId" = public.current_client_id()
    OR "claimedByProfileId" = auth.uid()
  );
CREATE POLICY "assessments_owner_update" ON public.assessments
  FOR UPDATE USING (
    "clientId" = public.current_client_id()
    OR "claimedByProfileId" = auth.uid()
  )
  WITH CHECK (
    "clientId" = public.current_client_id()
    OR "claimedByProfileId" = auth.uid()
  );

-- proposals: admin/staff manage everything; client can read/accept its own.
CREATE POLICY "proposals_staff_all" ON public.proposals
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));
CREATE POLICY "proposals_owner_select" ON public.proposals
  FOR SELECT USING ("clientId" = public.current_client_id());
CREATE POLICY "proposals_owner_update" ON public.proposals
  FOR UPDATE USING ("clientId" = public.current_client_id())
  WITH CHECK ("clientId" = public.current_client_id());
