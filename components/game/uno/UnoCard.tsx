'use client';

import React from 'react';
import { CARD_WIDTH, CARD_HEIGHT, getCardDetails } from '@/lib/game/uno/logic';

interface UnoCardProps {
  cardId: number | null; // The logic ID (0-111). Null means Back of card.
  width?: number; // Desired display width
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function ScalableUnoCard({ cardId, width = 120, className = '', onClick, selected }: UnoCardProps) {
  // Determine if showing back
  const isBack = cardId === null;

  // Calculate Scale Scale
  const scale = width / CARD_WIDTH;
  const height = CARD_HEIGHT * scale;

  // Sprite Calculation
  // Grid Assumption: 14 columns, 8 rows (approx).
  // 0-13: Row 0
  // 14-27: Row 1
  // ...
  const col = isBack ? 0 : cardId! % 14;
  const row = isBack ? 0 : Math.floor(cardId! / 14);

  // Exact position (removed 1px offset assumption)
  const bgX = -(col * CARD_WIDTH);
  const bgY = -(row * CARD_HEIGHT);

  return (
    <div
      onClick={onClick}
      className={`
        relative shrink-0 select-none transition-all duration-200 
        ${onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''} 
        ${selected ? 'ring-4 ring-[var(--accent-yellow)] -translate-y-4 shadow-xl z-10' : 'shadow-md'} 
        ${className}
      `}
      style={{ width, height }}
    >
      {isBack ? (
        // Card Back
        <div className="w-full h-full rounded-xl overflow-hidden border border-white/20 bg-black shadow-inner flex items-center justify-center relative">
             <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-900" />
             <div className="flex flex-col items-center justify-center z-10 transform -rotate-12">
                 <span className="font-black text-white text-3xl drop-shadow-md" style={{fontSize: width/3}}>UNO</span>
             </div>
             {/* Decorative rings */}
             <div className="absolute inset-2 border-2 border-yellow-400 rounded-sm opacity-50"></div>
        </div>
      ) : (
        // Card Face
        <div className="w-full h-full overflow-hidden rounded-xl bg-white shadow-inner relative">
          {/* Inner Scaled Sprite */}
          <div
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              backgroundImage: `url('/uno/UNO_cards_deck.svg')`,
              backgroundPosition: `${bgX}px ${bgY}px`,
              backgroundRepeat: 'no-repeat',
              // Transform to scale down to the wrapper size
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Default export if needed for lazy imports, though named is preferred
export default ScalableUnoCard;
