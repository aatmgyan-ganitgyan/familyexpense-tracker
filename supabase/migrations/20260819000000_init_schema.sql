-- Create updated_at handler function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: families
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  invite_code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Security helper function to fetch current user's family_id without RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS uuid SECURITY DEFINER AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql;

-- Enable RLS on families and profiles
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: families
CREATE POLICY select_families ON public.families
  FOR SELECT TO authenticated USING (true);

CREATE POLICY insert_families ON public.families
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY update_families ON public.families
  FOR UPDATE TO authenticated USING (id = public.get_my_family_id()) WITH CHECK (id = public.get_my_family_id());

-- RLS Policies: profiles
CREATE POLICY select_profiles ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR family_id = public.get_my_family_id());

CREATE POLICY insert_profiles ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY update_profiles ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Table: categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: categories
CREATE POLICY select_categories ON public.categories
  FOR SELECT TO authenticated USING (family_id IS NULL OR family_id = public.get_my_family_id());

CREATE POLICY modify_categories ON public.categories
  FOR ALL TO authenticated USING (family_id = public.get_my_family_id()) WITH CHECK (family_id = public.get_my_family_id());

-- Seed Default Categories (Global, family_id IS NULL)
INSERT INTO public.categories (name, icon) VALUES
  ('Food', 'Utensils'),
  ('Groceries', 'ShoppingCart'),
  ('Travel', 'Car'),
  ('Home', 'Home'),
  ('Bills', 'FileText'),
  ('Shopping', 'ShoppingBag'),
  ('Education', 'GraduationCap'),
  ('Health', 'HeartPulse'),
  ('Entertainment', 'Film'),
  ('Personal', 'User'),
  ('Other', 'Coins');

-- Table: merchants
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  merchant_name text NOT NULL,
  default_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  upi_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id, merchant_name)
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_merchants ON public.merchants
  FOR ALL TO authenticated USING (family_id = public.get_my_family_id()) WITH CHECK (family_id = public.get_my_family_id());

-- Table: expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  merchant text,
  upi_id text,
  payment_method text NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Card', 'Bank')),
  expense_date date NOT NULL DEFAULT current_date,
  expense_time time without time zone NOT NULL DEFAULT current_time,
  note text,
  source text NOT NULL CHECK (source IN ('manual', 'upi_qr', 'recurring', 'future_bank_integration')),
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'ignored', 'expected')),
  is_private boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_expenses ON public.expenses
  FOR ALL TO authenticated USING (family_id = public.get_my_family_id()) WITH CHECK (family_id = public.get_my_family_id());

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Table: budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- Nullable if family-wide budget
  period text NOT NULL DEFAULT 'monthly',
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_budgets ON public.budgets
  FOR ALL TO authenticated USING (family_id = public.get_my_family_id()) WITH CHECK (family_id = public.get_my_family_id());

-- Table: recurring_expenses
CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  merchant text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'cancelled')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_recurring ON public.recurring_expenses
  FOR ALL TO authenticated USING (family_id = public.get_my_family_id()) WITH CHECK (family_id = public.get_my_family_id());

-- Indexes for performance
CREATE INDEX idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX idx_categories_family_id ON public.categories(family_id);
CREATE INDEX idx_merchants_family_id ON public.merchants(family_id);
CREATE INDEX idx_expenses_family_id ON public.expenses(family_id);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_budgets_family_id ON public.budgets(family_id);
CREATE INDEX idx_recurring_family_id ON public.recurring_expenses(family_id);

-- Profile creation trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
