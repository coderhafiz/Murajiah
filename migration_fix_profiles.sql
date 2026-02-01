-- 1. Enable RLS on profiles (if not already)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow reading profiles (public)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

-- 3. Allow inserting OWN profile (Essential for UPSERT)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Allow updating OWN profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
