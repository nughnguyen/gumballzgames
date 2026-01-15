import React from 'react';
import { UnoCard as UnoCardType, UnoColor, UnoType } from '@/lib/game/uno/types';

interface UnoCardProps {
  card: UnoCardType;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

// Layout Assumptions for UNO_cards_deck.svg
// Grid: 14 Columns x 8 Rows (based on inspection)
// Row 0: Red
// Row 1: Yellow
// Row 2: Green
// Row 3: Blue
// (Rows 4-7 likely duplicates or wild variations, but we'll stick to 0-3 for basics)
// Columns: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, Skip, Reverse, Draw2, Wild
// Note: Wilds might be in specific spots.
// Standard Indexing:
// 0-9: Indices 0-9
// Skip: 10
// Reverse: 11
// Draw2: 12
// Wild: 13 (In Row 0?)
// Wild Draw 4: 13 (In Row 1?)

const COLOR_MAP: Record<UnoColor, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  blue: 3,
  black: 4, // Special handling
};

const TYPE_MAP: Record<UnoType | string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'Skip': 10,
  'Reverse': 11,
  'Draw2': 12,
  'Wild': 13,
  'Draw4': 13, // Maybe same column, different row?
};

export const UnoCardComponent: React.FC<UnoCardProps> = ({ card, onClick, className = '', selected }) => {
  let col = 0;
  let row = 0;

  if (card.color === 'black') {
    // Wild Cards
    col = 13;
    if (card.type === 'Wild') {
      row = 0; // Assume Wild is at End of Row 0
    } else if (card.type === 'Draw4') {
      row = 4; // Assume Wild Draw 4 is at End of Row 4 (or similar)
      // Actually, often Wild is Row 0 Col 13, Wild Draw 4 is Row 1 Col 13?
      // Let's guess: 
      // Row 0 (Red) -> Col 13 = Wild?
      // Row 1 (Yellow) -> Col 13 = Wild Draw 4?
      // We'll try this.
      row = 1;
    }
  } else {
    row = COLOR_MAP[card.color] || 0;
    if (card.type === 'Number') {
      col = card.value;
    } else {
      col = TYPE_MAP[card.type] || 0;
    }
  }

  // Calculate percentages
  // 14 columns -> 100% / 13 (intervals) ? No.
  // background-size: 1400% 800%
  // x pos = col * 100 / 13 %
  // y pos = row * 100 / 7 %
  
  const xPos = (col * 100) / 13;
  const yPos = (row * 100) / 7;

  return (
    <div
      onClick={onClick}
      className={`
        relative w-24 h-36 rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105
        ${selected ? 'ring-4 ring-yellow-400 -translate-y-4' : ''}
        ${className}
      `}
      style={{
        backgroundImage: 'url(/uno/UNO_cards_deck.svg)',
        backgroundPosition: `${xPos}% ${yPos}%`,
        backgroundSize: '1400% 800%',
        backgroundColor: 'white' // Fallback
      }}
      title={card.name}
    >
      {/* Overlay for debug or accessibility if image fails */}
      {/* <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 text-white text-xs text-center font-bold">
        {card.name}
      </div> */}
    </div>
  );
};
