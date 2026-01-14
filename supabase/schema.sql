-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
-- Handles authenticated users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Private insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Private update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ROOMS TABLE
-- Supports both Auth Users and Guests
CREATE TABLE public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('caro', 'battleship', 'chess')),
  
  -- Host Identification (Either ID or Guest ID/Nickname)
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_guest_id TEXT, -- e.g. "guest_123456789"
  host_nickname TEXT, -- Snapshot of name at creation
  
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view room" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Public create room" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Host update room" ON public.rooms FOR UPDATE USING (
  (auth.uid() = host_id) OR (host_guest_id IS NOT NULL) -- Simplified for guests (client-side validation for now or use session ID if available)
);

-- ROOM PARTICIPANTS TABLE
-- Mapping users to rooms
CREATE TABLE public.room_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  
  -- Participant Identification
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id TEXT,
  guest_nickname TEXT,
  
  player_number INT CHECK (player_number IN (1, 2)),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(room_id, player_number)
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view participants" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Public join room" ON public.room_participants FOR INSERT WITH CHECK (true);

-- GAME STATES TABLE
-- Real-time storage
CREATE TABLE public.game_states (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE PRIMARY KEY,
  game_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view game state" ON public.game_states FOR SELECT USING (true);
CREATE POLICY "Public update game state" ON public.game_states FOR ALL USING (true);

-- GAME HISTORY TABLE
-- Persistent record of finished games
CREATE TABLE public.game_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  
  -- Player 1 (User or Guest)
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player1_guest_id TEXT,
  player1_nickname TEXT,
  
  -- Player 2 (User or Guest)
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_guest_id TEXT,
  player2_nickname TEXT,
  
  -- Winner (User or Guest)
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_guest_id TEXT,
  winner_nickname TEXT,
  
  moves_count INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view history" ON public.game_history FOR SELECT USING (true);
CREATE POLICY "Public insert history" ON public.game_history FOR INSERT WITH CHECK (true);

-- FRIENDSHIPS TABLE
CREATE TABLE public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User view friends" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "User add friend" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User update friend" ON public.friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- USER TRIGGER
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
