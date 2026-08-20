-- Drop the old simple access policy
DROP POLICY IF EXISTS access_expenses ON public.expenses;

-- Create granular policies for expenses supporting is_private logic
CREATE POLICY select_expenses ON public.expenses
  FOR SELECT TO authenticated
  USING (
    family_id = public.get_my_family_id() AND
    (is_private = false OR user_id = auth.uid())
  );

CREATE POLICY insert_expenses ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    family_id = public.get_my_family_id() AND
    user_id = auth.uid()
  );

CREATE POLICY update_expenses ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    family_id = public.get_my_family_id() AND
    user_id = auth.uid()
  )
  WITH CHECK (
    family_id = public.get_my_family_id() AND
    user_id = auth.uid()
  );

CREATE POLICY delete_expenses ON public.expenses
  FOR DELETE TO authenticated
  USING (
    family_id = public.get_my_family_id() AND
    user_id = auth.uid()
  );
