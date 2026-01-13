-- Trigger to automatically create a profile entry when a new user signs up via Supabase Auth.
-- This bypasses RLS issues on the client side.

-- 1. Create the handler function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', 'User ' || substring(new.id::text from 1 for 8)),
    COALESCE(new.raw_user_meta_data->>'username', 'User ' || substring(new.id::text from 1 for 8))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
