import { UnoColor, UnoType, UnoCard } from './types';

export const DECK_SIZE = 112;
export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 360;

// Indices to remove to match standard Uno deck (1 zero per color)
// Logic from server.js: splice 56, 69, 82, 95 (adjusted for array shifts)
// Original indices were 56, 70, 84, 98.
const REMOVED_INDICES = [56, 70, 84, 98]; 

export function createUnoDeck(): number[] {
  // Create array 0..111
  let deck = Array.from({ length: DECK_SIZE }, (_, i) => i);
  
  // Remove specific cards (Standard Uno has only one '0' per color)
  // We must filter them out.
  // The 'splice' logic in reference code was sequential, so we can just filter by explicit value if we know them.
  // 56 = Starts 2nd Red suite (Index 56). Red 0 is index 0 and 56. We keep 0, remove 56.
  // 70 = Starts 2nd Yellow suite. Yellow 0 is 14 and 70. We keep 14, remove 70.
  // 84 = Starts 2nd Green suite. Green 0 is 28 and 84. Keep 28, remove 84.
  // 98 = Starts 2nd Blue suite. Blue 0 is 42 and 98. Keep 42, remove 98.
  
  return deck.filter(id => !REMOVED_INDICES.includes(id));
}

export function getCardColor(id: number): UnoColor {
  if (id % 14 === 13) {
    return 'black';
  }
  const row = Math.floor(id / 14);
  switch (row) {
    case 0:
    case 4:
      return 'red';
    case 1:
    case 5:
      return 'yellow';
    case 2:
    case 6:
      return 'green';
    case 3:
    case 7:
      return 'blue';
    default:
      return 'black';
  }
}

export function getCardType(id: number): UnoType {
  const mod = id % 14;
  switch (mod) {
    case 10: return 'Skip';
    case 11: return 'Reverse';
    case 12: return 'Draw2';
    case 13: 
      // Row 4+ are Draw4, Rows 0-3 are Wild
      // Note: This logic assumes 8 rows.
      if (Math.floor(id / 14) >= 4) {
        return 'Draw4';
      } else {
        return 'Wild';
      }
    default:
      return 'Number';
  }
}

export function getCardValue(id: number): number {
  const mod = id % 14;
  if (mod < 10) return mod; // 0-9
  if (mod < 13) return 20; // Skip, Reverse, Draw2
  return 50; // Wild, Draw4
}

export function getCardName(id: number): string {
  const color = getCardColor(id);
  const type = getCardType(id);
  if (type === 'Number') {
    return `${color} ${id % 14}`;
  }
  return `${color} ${type}`;
}

export function getCardDetails(id: number): UnoCard {
  return {
    id,
    color: getCardColor(id),
    type: getCardType(id),
    value: getCardValue(id),
    name: getCardName(id)
  };
}

export function shuffleDeck(deck: number[]): number[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}
