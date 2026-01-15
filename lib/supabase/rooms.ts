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
 * Update room heartbeat (last_active timestamp)
 */
export async function updateRoomHeartbeat(roomCode: string): Promise<void> {
  await supabase
    .from('rooms')
    .update({ last_active: new Date().toISOString() })
    .eq('room_code', roomCode);
}

/**
 * Delete rooms that have been inactive for > 3 minutes
 * This implies "0 players" because active players send heartbeats.
 */
export async function cleanupOldRooms(): Promise<void> {
  // ISO string for 3 minutes ago
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  // We rely on 'last_active' column. 
  // If 'last_active' is null (legacy), we check 'created_at'.
  // Logic: Delete if (last_active IS NOT NULL AND last_active < 3m) OR (last_active IS NULL AND created_at < 3m)
  
  // Note: Supabase/PostgREST filters are a bit limited for complex ORs in delete.
  // We'll simplisticly delete based on last_active if possible, or created_at.
  // Ideally, we run a stored procedure, but here we do client-side trigger.
  
  // 1. Delete inactive rooms (active > 3 mins ago)
  // This effectively removes rooms where no players are sending heartbeats.
  const { error } = await supabase
    .from('rooms')
    .delete()
    .lt('last_active', threeMinutesAgo);

  if (error) console.error('Error cleaning up rooms:', error);
}

/**
 * Create a new game room
 * Supports both Authenticated Users and Guests
 */
export async function createRoom(
  roomCode: string,
  gameType: 'caro' | 'battleship' | 'chess' | 'memory' | 'uno',
  hostId?: string,
  hostNickname?: string,
  settings: Record<string, any> = {}
): Promise<Room | null> {
  
  // Lazy cleanup: Try to clean old rooms when creating a new one
  await cleanupOldRooms();

  const roomData: any = {
    room_code: roomCode.toUpperCase(),
    game_type: gameType,
    settings,
    status: 'waiting',
    last_active: new Date().toISOString(),
  };

  // Discriminate between Auth User vs Guest
  if (hostId && !hostId.startsWith('guest_')) {
      roomData.host_id = hostId;
  } else {
      roomData.host_guest_id = hostId; // Pass guest ID here
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

  if (userId && !userId.startsWith('guest_')) {
    participantData.user_id = userId;
  } else {
    participantData.guest_id = userId; // Store guest ID string
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
 * Save game history with robust guest support
 */
export async function saveGameHistory(
  gameType: 'caro' | 'battleship' | 'chess' | 'memory',
  player1: { id?: string; nickname?: string },
  player2: { id?: string; nickname?: string },
  winner: { id?: string; nickname?: string } | 'draw',
  movesCount: number,
  durationSeconds: number
): Promise<boolean> {
  
  const historyData: any = {
    game_type: gameType,
    moves_count: movesCount,
    duration_seconds: durationSeconds,
    player1_nickname: player1.nickname,
    player2_nickname: player2.nickname,
  };

  // Player 1
  if (player1.id && !player1.id.startsWith('guest_')) {
      historyData.player1_id = player1.id;
  } else {
      historyData.player1_guest_id = player1.id;
  }

  // Player 2
  if (player2.id && !player2.id.startsWith('guest_')) {
      historyData.player2_id = player2.id;
  } else {
      historyData.player2_guest_id = player2.id;
  }
  
  // Winner
  if (winner !== 'draw' && winner.id) {
      if (!winner.id.startsWith('guest_')) {
          historyData.winner_id = winner.id;
      } else {
          historyData.winner_guest_id = winner.id;
      }
      historyData.winner_nickname = winner.nickname;
  }

  const { error } = await supabase
    .from('game_history')
    .insert(historyData);

  if (error) {
    console.error('Error saving game history:', error);
    return false;
  }

  return true;
}
