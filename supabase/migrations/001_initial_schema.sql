-- =====================================================
-- WebGames Database Schema
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Paste → Run

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('caro', 'battleship', 'chess')),
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  host_nickname TEXT, -- For guest hosts
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '4 hours'
);

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policies for rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id OR host_nickname IS NOT NULL);

CREATE POLICY "Host can update their room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id OR host_nickname IS NOT NULL);

CREATE POLICY "Host can delete their room"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

-- =====================================================
-- 3. ROOM_PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_nickname TEXT,
  player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_number),
  CHECK ((user_id IS NOT NULL AND guest_nickname IS NULL) OR (user_id IS NULL AND guest_nickname IS NOT NULL))
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- Enable RLS
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Policies for room_participants
CREATE POLICY "Room participants are viewable by everyone"
  ON room_participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join a room"
  ON room_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can leave their room"
  ON room_participants FOR DELETE
  USING (auth.uid() = user_id OR guest_nickname IS NOT NULL);

-- =====================================================
-- 4. GAME_STATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS game_states (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE PRIMARY KEY,
  game_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Policies for game_states
CREATE POLICY "Game states are viewable by room participants"
  ON game_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = game_states.room_id
      AND (room_participants.user_id = auth.uid() OR room_participants.guest_nickname IS NOT NULL)
    )
  );

CREATE POLICY "Room participants can update game state"
  ON game_states FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = game_states.room_id
      AND (room_participants.user_id = auth.uid() OR room_participants.guest_nickname IS NOT NULL)
    )
  );

CREATE POLICY "Room participants can modify game state"
  ON game_states FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = game_states.room_id
      AND (room_participants.user_id = auth.uid() OR room_participants.guest_nickname IS NOT NULL)
    )
  );

-- =====================================================
-- 5. FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policies for friendships
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendship requests"
  ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- 6. GAME_HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('caro', 'battleship', 'chess')),
  player1_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player1_nickname TEXT,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player2_nickname TEXT,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_nickname TEXT,
  moves_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  finished_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_game_history_player1_id ON game_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player2_id ON game_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);

-- Enable RLS
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- Policies for game_history
CREATE POLICY "Game history is viewable by everyone"
  ON game_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert game history"
  ON game_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for game_states
DROP TRIGGER IF EXISTS update_game_states_updated_at ON game_states;
CREATE TRIGGER update_game_states_updated_at
  BEFORE UPDATE ON game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM rooms WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. REALTIME PUBLICATIONS
-- =====================================================

-- Enable realtime for tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- You can now use these tables in your application
-- Remember to set your NEXT_PUBLIC_SUPABASE_URL and 
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file
