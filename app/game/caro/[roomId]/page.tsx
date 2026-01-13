'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CaroBoard from '@/components/games/caro/CaroBoard';
import GameChat from '@/components/games/GameChat';
import Sidebar from '@/components/layout/Sidebar';
import type { CaroMove } from '@/types';
import { checkWin, getCurrentPlayer } from '@/lib/games/caro/gameLogic';
import { useAuthStore } from '@/lib/stores/authStore';

export default function CaroGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const user = useAuthStore((state) => state.user);

  const [moves, setMoves] = useState<CaroMove[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'finished'>('playing');
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);

  const currentPlayer = getCurrentPlayer(moves);
  const mySymbol: 'X' | 'O' = 'X'; // TODO: Get from room data

  const handleMove = (x: number, y: number) => {
    if (gameStatus !== 'playing') return;

    const newMove: CaroMove = {
      x,
      y,
      player: currentPlayer,
      timestamp: Date.now(),
    };

    const newMoves = [...moves, newMove];
    setMoves(newMoves);

    // Check for win
    const winResult = checkWin(newMoves);
    if (winResult.winner) {
      setWinner(winResult.winner);
      setGameStatus('finished');
      setShowEndModal(true);
    }

    // TODO: Broadcast move via Supabase Realtime
  };

  const handleSurrender = () => {
    setWinner(currentPlayer === 'X' ? 'O' : 'X');
    setGameStatus('finished');
    setShowEndModal(true);
  };

  const handleRematch = () => {
    // TODO: Send rematch request
    console.log('Rematch requested');
  };

  const handleExit = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      
      {/* Main Game Area */}
      <div className="flex-1 flex">
        {/* Game Board Section */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white">Caro Game</h1>
                <p className="text-gray-400">Room: {roomId}</p>
              </div>
              <button
                onClick={handleExit}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
              >
                Exit Room
              </button>
            </div>

            {/* Game Board */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <CaroBoard
                moves={moves}
                onMove={handleMove}
                currentPlayer={currentPlayer}
                disabled={gameStatus !== 'playing' || currentPlayer !== mySymbol}
              />

              {/* Surrender Button */}
              {gameStatus === 'playing' && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleSurrender}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Surrender
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 p-4 border-l border-gray-800">
          <div className="h-full">
            <GameChat roomId={roomId} opponentName="Opponent" />
          </div>
        </div>
      </div>

      {/* Game End Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border border-gray-700">
            <h2 className="text-4xl font-bold text-white mb-4">
              {winner === mySymbol ? '🎉 Victory!' : '😢 Defeat'}
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              {winner === mySymbol 
                ? 'Congratulations! You won the game!' 
                : `Player ${winner} won the game!`}
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={handleRematch}
                className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
              >
                Rematch
              </button>
              <button
                onClick={handleExit}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Exit Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
