
export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'black';
export type Value = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'skip'|'reverse'|'draw2'|'wild'|'wild_draw4';

export interface Card {
  id: string;
  color: Color;
  value: Value;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isReady: boolean;
}

export interface GameState {
  deck: Card[];
  discardPile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: Color; // The active color to match
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  lastAction: string | null; // Log message
}

export const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
export const VALUES_NUM: Value[] = ['0','1','2','3','4','5','6','7','8','9'];
export const VALUES_ACTION: Value[] = ['skip', 'reverse', 'draw2'];
export const VALUES_WILD: Value[] = ['wild', 'wild_draw4'];

export function createDeck(): Card[] {
  let deck: Card[] = [];
  let idCounter = 0;

  // Colors
  COLORS.forEach(color => {
    // 0 once
    deck.push({ id: `c-${idCounter++}`, color, value: '0' });
    
    // 1-9 twice
    for(let i=1; i<=9; i++) {
       deck.push({ id: `c-${idCounter++}`, color, value: String(i) as Value });
       deck.push({ id: `c-${idCounter++}`, color, value: String(i) as Value });
    }
    
    // Actions twice
    VALUES_ACTION.forEach(val => {
       deck.push({ id: `c-${idCounter++}`, color, value: val });
       deck.push({ id: `c-${idCounter++}`, color, value: val });
    });
  });

  // Wilds
  for(let i=0; i<4; i++) {
     deck.push({ id: `c-${idCounter++}`, color: 'black', value: 'wild' });
     deck.push({ id: `c-${idCounter++}`, color: 'black', value: 'wild_draw4' });
  }

  return shuffle(deck);
}

export function shuffle(deck: Card[]): Card[] {
  return deck.sort(() => Math.random() - 0.5);
}

export function isValidMove(card: Card, topCard: Card, currentColor: Color): boolean {
  if (card.color === 'black') return true; // Wilds always valid
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function getNextPlayerIndex(currentIndex: number, direction: 1 | -1, playerCount: number): number {
    let next = (currentIndex + direction) % playerCount;
    if (next < 0) next += playerCount;
    return next;
}
