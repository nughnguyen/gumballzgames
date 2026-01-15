
export type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'black';
export type UnoType = 'Number' | 'Skip' | 'Reverse' | 'Draw2' | 'Wild' | 'Draw4';

export interface UnoCard {
  id: number; // 0-111
  color: UnoColor;
  type: UnoType;
  value: number; // 0-9, 20 (action), 50 (wild)
  name: string;
}

export interface Player {
  id: string; // Session ID or User ID
  name: string; 
  hand: number[]; // Array of Card IDs
  isReady: boolean;
  isHost: boolean;
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'playing' | 'ended';
  players: Player[];
  deck: number[];
  discardPile: number[];
  currentTurnIndex: number; // 0 to players.length - 1
  direction: 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise
  currentColor: UnoColor; // The effective color (important for Wilds)
  winner: string | null;
  lastAction: string | null; // "Player X played Red 5"
}

export interface MoveResult {
  newState: GameState;
  valid: boolean;
  message?: string;
}
