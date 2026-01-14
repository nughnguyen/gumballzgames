-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ROOMS TABLE
CREATE TABLE public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('caro', 'battleship', 'chess')),
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable for guest hosts or if user deleted
  host_guest_id TEXT, -- For guest hosts who don't have a profile
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are viewable by everyone." ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create rooms." ON public.rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Host can update room." ON public.rooms
  FOR UPDATE USING (auth.uid() = host_id OR host_guest_id IS NOT NULL); -- Simplified for now

-- ROOM PARTICIPANTS TABLE
CREATE TABLE public.room_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id TEXT, -- For non-auth users
  guest_nickname TEXT,
  player_number INT CHECK (player_number IN (1, 2)),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, player_number)
);

-- Enable RLS for participants
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by everyone." ON public.room_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join." ON public.room_participants
  FOR INSERT WITH CHECK (true);

-- GAME STATES TABLE
-- Real-time game state storage
CREATE TABLE public.game_states (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE PRIMARY KEY,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for game states
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game states are viewable by everyone." ON public.game_states
  FOR SELECT USING (true);

CREATE POLICY "Participants can update game state." ON public.game_states
  FOR ALL USING (true); -- Simplified, logic usually handled in backend or via strict policies

-- GAME HISTORY TABLE
CREATE TABLE public.game_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moves_count INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for history
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History is viewable by everyone." ON public.game_history
  FOR SELECT USING (true);

-- FRIENDSHIPS TABLE
CREATE TABLE public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Enable RLS for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships." ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert friendships." ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships." ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- FUNCTION TO HANDLE NEW USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR NEW USER
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
