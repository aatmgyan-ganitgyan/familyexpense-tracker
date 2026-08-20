-- Drop existing policies on families
DROP POLICY IF EXISTS select_families ON public.families;
DROP POLICY IF EXISTS insert_families ON public.families;
DROP POLICY IF EXISTS update_families ON public.families;

-- Re-create with tighter controls
-- SELECT: only allow reading your own family
CREATE POLICY select_families ON public.families
  FOR SELECT TO authenticated 
  USING (id = public.get_my_family_id());

-- INSERT: any authenticated user can create a family
CREATE POLICY insert_families ON public.families
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- UPDATE: only allow updating your own family
CREATE POLICY update_families ON public.families
  FOR UPDATE TO authenticated 
  USING (id = public.get_my_family_id()) 
  WITH CHECK (id = public.get_my_family_id());
