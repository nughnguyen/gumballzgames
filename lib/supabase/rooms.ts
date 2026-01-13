import { supabase } from './client';
import type { Room, RoomParticipant } from '@/types';

/**
 * Get room details by room code
 */
export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) {
    console.error('Error fetching room:', error);
    return null;
  }

  return data;
}

/**
 * Create a new game room
 */
export async function createRoom(
  roomCode: string,
  gameType: 'caro' | 'battleship' | 'chess',
  hostId?: string,
  hostNickname?: string,
  settings: Record<string, any> = {}
): Promise<Room | null> {
  const roomData: any = {
    room_code: roomCode.toUpperCase(),
    game_type: gameType,
    settings,
    status: 'waiting',
  };

  if (hostId) {
    roomData.host_id = hostId;
  } else if (hostNickname) {
    roomData.host_nickname = hostNickname;
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert(roomData)
    .select()
    .single();

  if (error) {
    console.error('Error creating room:', error);
    return null;
  }

  return data;
}

/**
 * Join a room as a participant
 */
export async function joinRoom(
  roomId: string,
  playerNumber: 1 | 2,
  userId?: string,
  guestNickname?: string
): Promise<RoomParticipant | null> {
  const participantData: any = {
    room_id: roomId,
    player_number: playerNumber,
  };

  if (userId) {
    participantData.user_id = userId;
  } else if (guestNickname) {
    participantData.guest_nickname = guestNickname;
  }

  const { data, error } = await supabase
    .from('room_participants')
    .insert(participantData)
    .select()
    .single();

  if (error) {
    console.error('Error joining room:', error);
    return null;
  }

  return data;
}

/**
 * Get participants in a room
 */
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  const { data, error } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', roomId)
    .order('player_number', { ascending: true });

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  return data || [];
}

/**
 * Update room status
 */
export async function updateRoomStatus(
  roomId: string,
  status: 'waiting' | 'playing' | 'finished'
): Promise<boolean> {
  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room status:', error);
    return false;
  }

  return true;
}

/**
 * Update game state
 */
export async function updateGameState(
  roomId: string,
  gameData: Record<string, any>
): Promise<boolean> {
  const { error } = await supabase
    .from('game_states')
    .upsert({
      room_id: roomId,
      game_data: gameData,
    });

  if (error) {
    console.error('Error updating game state:', error);
    return false;
  }

  return true;
}

/**
 * Get game state
 */
export async function getGameState(roomId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('game_states')
    .select('game_data')
    .eq('room_id', roomId)
    .single();

  if (error) {
    console.error('Error fetching game state:', error);
    return null;
  }

  return data?.game_data || null;
}

/**
 * Delete expired rooms (called periodically)
 */
export async function deleteExpiredRooms(): Promise<void> {
  const { error } = await supabase.rpc('cleanup_expired_rooms');

  if (error) {
    console.error('Error deleting expired rooms:', error);
  }
}

/**
 * Leave a room
 */
export async function leaveRoom(roomId: string, userId?: string): Promise<boolean> {
  const query = supabase
    .from('room_participants')
    .delete()
    .eq('room_id', roomId);

  if (userId) {
    query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error leaving room:', error);
    return false;
  }

  return true;
}
