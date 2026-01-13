import type { CaroMove } from '@/types';

const BOARD_SIZE = 100;
const WIN_LENGTH = 5;

export interface CheckWinResult {
  winner: 'X' | 'O' | null;
  winningCells?: { x: number; y: number }[];
}

/**
 * Check if there's a winner on the board
 */
export function checkWin(moves: CaroMove[]): CheckWinResult {
  if (moves.length < WIN_LENGTH * 2 - 1) {
    return { winner: null };
  }

  // Create a map of the board
  const board = new Map<string, 'X' | 'O'>();
  moves.forEach(move => {
    board.set(`${move.x},${move.y}`, move.player);
  });

  // Check the last move
  const lastMove = moves[moves.length - 1];
  const player = lastMove.player;
  const { x, y } = lastMove;

  // Directions: horizontal, vertical, diagonal-right, diagonal-left
  const directions = [
    { dx: 1, dy: 0 },   // horizontal
    { dx: 0, dy: 1 },   // vertical
    { dx: 1, dy: 1 },   // diagonal \
    { dx: 1, dy: -1 },  // diagonal /
  ];

  for (const { dx, dy } of directions) {
    const line: { x: number; y: number }[] = [{ x, y }];

    // Check forward direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (board.get(`${nx},${ny}`) === player) {
        line.push({ x: nx, y: ny });
      } else {
        break;
      }
    }

    // Check backward direction
    for (let i = 1; i < WIN_LENGTH; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (board.get(`${nx},${ny}`) === player) {
        line.unshift({ x: nx, y: ny });
      } else {
        break;
      }
    }

    if (line.length >= WIN_LENGTH) {
      return {
        winner: player,
        winningCells: line.slice(0, WIN_LENGTH),
      };
    }
  }

  return { winner: null };
}

/**
 * Validate if a move is legal
 */
export function isValidMove(
  x: number,
  y: number,
  moves: CaroMove[]
): boolean {
  // Check bounds
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return false;
  }

  // Check if cell is already occupied
  return !moves.some(move => move.x === x && move.y === y);
}

/**
 * Get the current player's turn
 */
export function getCurrentPlayer(moves: CaroMove[]): 'X' | 'O' {
  return moves.length % 2 === 0 ? 'X' : 'O';
}

/**
 * Convert moves array to board map for efficient lookup
 */
export function movesToBoard(moves: CaroMove[]): Map<string, 'X' | 'O'> {
  const board = new Map<string, 'X' | 'O'>();
  moves.forEach(move => {
    board.set(`${move.x},${move.y}`, move.player);
  });
  return board;
}
