// Database Types
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  gender?: 'male' | 'female' | 'other';
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_code: string;
  game_type: 'caro' | 'battleship' | 'chess';
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  settings: Record<string, any>;
  created_at: string;
  expires_at: string;
}

export interface RoomParticipant {
  room_id: string;
  user_id?: string;
  guest_nickname?: string;
  player_number: 1 | 2;
  joined_at: string;
}

export interface GameState {
  room_id: string;
  game_data: Record<string, any>;
  updated_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface GameHistory {
  id: string;
  room_id: string;
  game_type: 'caro' | 'battleship' | 'chess';
  player1_id: string;
  player2_id: string;
  winner_id?: string;
  moves_count: number;
  duration_seconds: number;
  finished_at: string;
}

// Game-specific types
export interface CaroMove {
  x: number;
  y: number;
  player: 'X' | 'O';
  timestamp: number;
}

export interface CaroGameData {
  board: Map<string, 'X' | 'O'>;
  moves: CaroMove[];
  currentTurn: 'X' | 'O';
  winner?: 'X' | 'O';
}

export interface BattleshipShip {
  id: string;
  length: number;
  positions: { x: number; y: number }[];
  hits: boolean[];
}

export interface BattleshipGameData {
  player1Ships: BattleshipShip[];
  player2Ships: BattleshipShip[];
  player1Attacks: { x: number; y: number; hit: boolean }[];
  player2Attacks: { x: number; y: number; hit: boolean }[];
  currentTurn: 1 | 2;
  phase: 'placement' | 'battle';
  winner?: 1 | 2;
}

export interface ChessGameData {
  fen: string; // Chess position in FEN notation
  moves: string[]; // Moves in algebraic notation
  currentTurn: 'white' | 'black';
  winner?: 'white' | 'black' | 'draw';
}

// Auth types
export interface User {
  id: string;
  email?: string;
  profile?: Profile;
  isGuest: boolean;
  guestNickname?: string;
}

// Realtime types
export interface RealtimeMessage {
  type: 'move' | 'join' | 'leave' | 'chat' | 'rematch_request' | 'rematch_accept';
  payload: any;
  sender_id: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}
