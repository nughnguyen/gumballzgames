-- =====================================================
-- FIX RLS POLICIES FOR GUEST USERS
-- =====================================================
-- Run this script in Supabase SQL Editor to fix RLS policies
-- This allows guest users to interact with rooms and game states

-- =====================================================
-- 1. UPDATE ROOMS POLICIES
-- =====================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Host can update their room" ON rooms;
DROP POLICY IF EXISTS "Host can delete their room" ON rooms;

-- Create new guest-friendly policies
CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their rooms"
  ON rooms FOR UPDATE
  USING (
    (auth.uid() = host_id) OR
    (host_id IS NULL AND host_nickname IS NOT NULL)
  );

CREATE POLICY "Anyone can delete their rooms"
  ON rooms FOR DELETE
  USING (
    (auth.uid() = host_id) OR
    (host_id IS NULL AND host_nickname IS NOT NULL)
  );

-- =====================================================
-- 2. UPDATE ROOM_PARTICIPANTS POLICIES
-- =====================================================

-- These are already correct but let's verify
DROP POLICY IF EXISTS "Room participants are viewable by everyone" ON room_participants;
DROP POLICY IF EXISTS "Anyone can join a room" ON room_participants;
DROP POLICY IF EXISTS "Participants can leave their room" ON room_participants;

CREATE POLICY "Anyone can view room participants"
  ON room_participants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join rooms"
  ON room_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can leave rooms"
  ON room_participants FOR DELETE
  USING (
    (auth.uid() = user_id) OR
    (user_id IS NULL AND guest_nickname IS NOT NULL)
  );

-- =====================================================
-- 3. UPDATE GAME_STATES POLICIES
-- =====================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Game states are viewable by room participants" ON game_states;
DROP POLICY IF EXISTS "Room participants can update game state" ON game_states;
DROP POLICY IF EXISTS "Room participants can modify game state" ON game_states;

-- Create new simplified policies (anyone in room can access)
CREATE POLICY "Anyone can view game states"
  ON game_states FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game states"
  ON game_states FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game states"
  ON game_states FOR UPDATE
  USING (true);

-- =====================================================
-- DONE! Guest users can now fully interact with the game
-- =====================================================
