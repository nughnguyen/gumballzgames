'use client';

import { useEffect, useState } from 'react';
import { GameState, MoveResult, Player, UnoCard, UnoColor } from '@/lib/game/uno/types';
import { createInitialState, processTurn, drawFromDeck } from '@/lib/game/uno/engine';
import { UnoCardComponent } from './UnoCard';
import GameChat from '@/components/games/GameChat';

// Mock IDs for local testing
const MY_ID = 'player-1';
const OPPONENT_ID = 'player-2';

export default function UnoGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedColor, setSelectedColor] = useState<UnoColor | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingCard, setPendingCard] = useState<number | null>(null);

  // Initialize Game
  useEffect(() => {
    // In a real app, this comes from server/supabase
    const initial = createInitialState('room-1', [
      { id: MY_ID, name: 'You' },
      { id: OPPONENT_ID, name: 'Bot' },
      { id: 'player-3', name: 'Bot 2' },
      { id: 'player-4', name: 'Bot 3' }
    ], MY_ID);
    setGameState(initial);
  }, []);

  if (!gameState) return <div className="text-white">Loading UNO...</div>;

  const myPlayer = gameState.players.find(p => p.id === MY_ID);
  const isMyTurn = gameState.players[gameState.currentTurnIndex].id === MY_ID;

  const handleCardClick = (cardId: number) => {
    if (!isMyTurn) return;
    
    // Check if card is Wild
    const card = gameState.players.find(p => p.id === MY_ID)?.hand.find(id => id === cardId); // In efficient way, we'd lookup details
    if (!card) return; // Should not happen

    // We need card details implementation lookup provided by engine via ID
    // But engine.ts helper 'getCardDetails' is not exported or available here directly easily unless we import it.
    // Let's assume we can get it or we just trigger the move.
    
    // For Wild, we need to pick color.
    // We'll optimistically try to play. If it requires color, UI should prompt.
    // Actually, in `processTurn`, if color is needed and not provided, it fails.
    
    // Quick Hack: Check if it's wild by ID range? 
    // Or just try to play, if invalid message says "Must choose color", then show picker.
    
    const result = processTurn(gameState, MY_ID, cardId, selectedColor || undefined);
    if (!result.valid && result.message === 'Must choose color for Wild') {
        setPendingCard(cardId);
        setShowColorPicker(true);
        return;
    }

    if (result.valid) {
        setGameState(result.newState);
        setSelectedColor(null);
        // Simulate Bots
        setTimeout(() => runBots(result.newState), 1000);
    } else {
        alert(result.message);
    }
  };

  const handleDraw = () => {
      if (!isMyTurn) return;
      const result = drawFromDeck(gameState, MY_ID);
      if (result.valid) {
          setGameState(result.newState);
          setTimeout(() => runBots(result.newState), 1000);
      }
  };

  const handleColorSelect = (color: UnoColor) => {
      if (pendingCard !== null) {
          const result = processTurn(gameState, MY_ID, pendingCard, color);
          if (result.valid) {
              setGameState(result.newState);
              setShowColorPicker(false);
              setPendingCard(null);
              setSelectedColor(null);
              setTimeout(() => runBots(result.newState), 1000);
          }
      }
  };

  // Simple Bot Logic
  const runBots = (currentState: GameState) => {
      // Find current player
      const currentPlayer = currentState.players[currentState.currentTurnIndex];
      if (currentPlayer.id === MY_ID) return; // My turn now

      // Bot Turn
      // Logic: Find first valid card
      // We need `getCardDetails` validation.
      // Since we don't have direct access to logic helpers here (need to export them), 
      // I'll update logic exports in next step. For now assume random play delay
      
      // ... For this scratchpad, I'll stop here and update `engine.ts` to export helpers first.
      console.log(`Bot ${currentPlayer.name} is thinking...`);
  };

  // Get current top card
  // We need to fetch details for rendering.
  // I will assume `getCardDetails` is available or I will copy it / export it.
  
  return (
    <div className="flex h-screen bg-green-800 overflow-hidden font-sans">
      {/* Sidebar / Chat */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-yellow-400">UNO</h1>
          <p className="text-gray-400 text-sm">Room: {gameState.roomId}</p>
        </div>
        <div className="p-4 flex-1">
          <div className="space-y-4">
            <h2 className="text-white font-semibold">Players</h2>
            {gameState.players.map((p, i) => (
               <div key={p.id} className={`flex items-center justify-between p-2 rounded ${gameState.currentTurnIndex === i ? 'bg-yellow-500/20 border border-yellow-500' : ''}`}>
                   <span className="text-white">{p.name}</span>
                   <span className="text-gray-300 text-sm">{p.hand.length} 🎴</span>
               </div>
            ))}
          </div>
        </div>
        <div className="h-1/3">
             <GameChat roomId={gameState.roomId} />
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Opponents (Top / Sides - Simplified to Top for now) */}
        <div className="absolute top-4 flex gap-4">
             {gameState.players.filter(p => p.id !== MY_ID).map(p => (
                 <div key={p.id} className="flex flex-col items-center">
                     <div className="w-16 h-24 bg-red-600 rounded-lg border-2 border-white shadow-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">UNO</span>
                     </div>
                     <span className="text-white mt-1 bg-black/50 px-2 rounded">{p.name} ({p.hand.length})</span>
                 </div>
             ))}
        </div>

        {/* Center Field */}
        <div className="flex items-center gap-8 my-8">
            {/* Draw Pile */}
            <div onClick={handleDraw} className="cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <div className="w-32 h-48 bg-gradient-to-br from-red-600 to-red-800 rounded-xl border-4 border-white shadow-2xl flex items-center justify-center">
                    <span className="text-white font-extrabold text-4xl italic transform -rotate-12">UNO</span>
                </div>
            </div>

            {/* Discard Pile */}
            <div className="relative">
                {/* We need to render the top card. 
                    I'll need to import `getCardDetails` to render it properly.
                    Placeholder for now.
                */}
                 <div className="w-32 h-48 bg-white rounded-xl shadow-xl flex items-center justify-center text-black">
                    Top Card: {gameState.discardPile[gameState.discardPile.length-1]}
                 </div>
                 {/* Color Indicator */}
                 <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full border-4 border-white shadow-lg bg-${gameState.currentColor === 'black' ? 'gray-800' : gameState.currentColor + '-500'}`} />
            </div>
        </div>

        {/* Player Hand */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-end px-8 pb-4">
            <div className="flex -space-x-8 hover:space-x-1 transition-all duration-300">
                {myPlayer?.hand.map((cardId) => (
                    // Need to map ID to card details
                     <div key={cardId} className="relative transition-transform hover:-translate-y-8 z-10 hover:z-20">
                         {/* Using Component logic which needs details */}
                         <div className="w-24 h-36 bg-white rounded border flex items-center justify-center cursor-pointer" onClick={() => handleCardClick(cardId)}>
                            {cardId}
                         </div>
                     </div>
                ))}
            </div>
        </div>
        
        {/* Color Picker Modal */}
        {showColorPicker && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 text-center">Choose Color</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {['red', 'yellow', 'green', 'blue'].map(c => (
                            <button key={c} onClick={() => handleColorSelect(c as UnoColor)} className={`w-24 h-24 rounded-lg bg-${c}-500 hover:opacity-80 transition-opacity`} />
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
