'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CaroBoard from '@/components/games/caro/CaroBoard';
import GameChat from '@/components/games/GameChat';
import Sidebar from '@/components/layout/Sidebar';
import type { CaroMove, Room, RoomParticipant } from '@/types';
import { checkWin, getCurrentPlayer } from '@/lib/games/caro/gameLogic';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import {
  getRoomByCode,
  createRoom,
  joinRoom,
  getRoomParticipants,
  updateRoomStatus,
  updateGameState,
  getGameState,
  leaveRoom
} from '@/lib/supabase/rooms';

export default function CaroGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomId as string;
  const { user, isGuest, guestNickname } = useAuthStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [moves, setMoves] = useState<CaroMove[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);

  const currentPlayer = getCurrentPlayer(moves);

  // Initialize room
  useEffect(() => {
    async function initializeRoom() {
      try {
        // Try to get existing room
        let existingRoom = await getRoomByCode(roomCode);

        if (!existingRoom) {
          // Create new room if it doesn't exist
          existingRoom = await createRoom(
            roomCode,
            'caro',
            user?.id,
            isGuest ? guestNickname : undefined,
            {}
          );

          if (existingRoom) {
            // Join as player 1 (host)
            await joinRoom(
              existingRoom.id,
              1,
              user?.id,
              isGuest ? guestNickname : undefined
            );
            setMySymbol('X');
          }
        } else {
          // Join existing room as player 2
          const roomParticipants = await getRoomParticipants(existingRoom.id);
          
          if (roomParticipants.length < 2) {
            await joinRoom(
              existingRoom.id,
              2,
              user?.id,
              isGuest ? guestNickname : undefined
            );
            setMySymbol('O');
            // Update room status to playing when second player joins
            await updateRoomStatus(existingRoom.id, 'playing');
          } else {
            // Room is full, determine which player we are
            const myParticipant = roomParticipants.find(p =>
              p.user_id === user?.id || p.guest_nickname === guestNickname
            );
            setMySymbol(myParticipant?.player_number === 1 ? 'X' : 'O');
          }
        }

        setRoom(existingRoom);
        
        // Load game state
        if (existingRoom) {
          const gameData = await getGameState(existingRoom.id);
          if (gameData?.moves) {
            setMoves(gameData.moves);
          }
          if (gameData?.winner) {
            setWinner(gameData.winner);
            setGameStatus('finished');
          } else if (gameData?.gameStatus) {
            setGameStatus(gameData.gameStatus);
          }
          
          const roomParticipants = await getRoomParticipants(existingRoom.id);
          setParticipants(roomParticipants);
          
          if (roomParticipants.length === 2) {
            setGameStatus('playing');
          }
        }
      } catch (error) {
        console.error('Error initializing room:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user || isGuest) {
      initializeRoom();
    }
  }, [roomCode, user, isGuest, guestNickname]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const gameData = payload.new.game_data as any;
          if (gameData.moves) {
            setMoves(gameData.moves);
          }
          if (gameData.winner) {
            setWinner(gameData.winner);
            setGameStatus('finished');
            setShowEndModal(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const roomParticipants = await getRoomParticipants(room.id);
          setParticipants(roomParticipants);
          if (roomParticipants.length === 2) {
            setGameStatus('playing');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  const handleMove = useCallback(async (x: number, y: number) => {
    if (gameStatus !== 'playing' || !room || currentPlayer !== mySymbol) return;

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
    const gameData: any = {
      moves: newMoves,
      gameStatus: gameStatus,
    };

    if (winResult.winner) {
      setWinner(winResult.winner);
      setGameStatus('finished');
      setShowEndModal(true);
      gameData.winner = winResult.winner;
      gameData.gameStatus = 'finished';
      await updateRoomStatus(room.id, 'finished');
    }

    // Update game state in database
    await updateGameState(room.id, gameData);
  }, [gameStatus, room, currentPlayer, mySymbol, moves]);

  const handleSurrender = async () => {
    if (!room) return;
    
    const surrenderWinner = currentPlayer === 'X' ? 'O' : 'X';
    setWinner(surrenderWinner);
    setGameStatus('finished');
    setShowEndModal(true);

    await updateGameState(room.id, {
      moves,
      winner: surrenderWinner,
      gameStatus: 'finished',
    });
    await updateRoomStatus(room.id, 'finished');
  };

  const handleRematch = () => {
    // TODO: Implement rematch logic
    console.log('Rematch requested');
  };

  const handleExit = async () => {
    if (room && user) {
      await leaveRoom(room.id, user.id);
    }
    router.push('/lobby');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  const opponentName =
    participants.find((p) =>
      p.user_id !== user?.id && p.guest_nickname !== guestNickname
    )?.guest_nickname ||
    participants.find((p) =>
      p.user_id !== user?.id
    )?.user_id ||
    'Waiting for opponent...';

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
                <p className="text-gray-400">Room: {roomCode}</p>
                {gameStatus === 'waiting' && (
                  <p className="text-yellow-400 mt-2">Waiting for opponent to join...</p>
                )}
                {gameStatus === 'playing' && (
                  <p className="text-green-400 mt-2">
                    {currentPlayer === mySymbol ? "Your turn!" : "Opponent's turn..."}
                  </p>
                )}
              </div>
              <button
                onClick={handleExit}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
              >
                Exit Room
              </button>
            </div>

            {/* Player Info */}
            <div className="flex justify-between mb-4">
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                <span className="text-white">You: {mySymbol || '?'}</span>
              </div>
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                <span className="text-white">Opponent: {opponentName}</span>
              </div>
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
            <GameChat roomId={roomCode} opponentName={opponentName.toString()} />
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
