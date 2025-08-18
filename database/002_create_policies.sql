-- Enable Row Level Security
ALTER TABLE therapy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Therapy Plans Policies
CREATE POLICY "Anyone can view active therapy plans" ON therapy_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all therapy plans" ON therapy_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and managers can insert therapy plans" ON therapy_plans
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and managers can update therapy plans" ON therapy_plans
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and managers can delete therapy plans" ON therapy_plans
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Plan Categories Policies
CREATE POLICY "Anyone can view active categories" ON plan_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can view all categories" ON plan_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage categories" ON plan_categories
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Plan Sessions Policies
CREATE POLICY "View sessions of viewable plans" ON plan_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM therapy_plans 
      WHERE id = plan_sessions.plan_id 
      AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can view all sessions" ON plan_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and managers can manage sessions" ON plan_sessions
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Plan Templates Policies
CREATE POLICY "View public templates" ON plan_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "View own templates" ON plan_templates
  FOR SELECT TO authenticated 
  USING (created_by = auth.uid());

CREATE POLICY "Admin can view all templates" ON plan_templates
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create templates" ON plan_templates
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates" ON plan_templates
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid());

CREATE POLICY "Admin can update all templates" ON plan_templates
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "Admin can manage all profiles" ON profiles
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'receptionist')
  );
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();