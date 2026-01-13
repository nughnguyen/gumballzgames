'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CaroBoard from '@/components/games/caro/CaroBoard';
import ChatPanel from '@/components/game/ChatPanel';
import Sidebar from '@/components/layout/Sidebar';
import type { CaroMove, Room, RoomParticipant, ChatMessage } from '@/types';
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
  const { user, isGuest } = useAuthStore();
  const guestNickname = user?.guestNickname;

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [moves, setMoves] = useState<CaroMove[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
            !isGuest ? user?.id : undefined,
            isGuest ? guestNickname : undefined,
            {}
          );

          if (existingRoom) {
            // Join as player 1 (host)
            await joinRoom(
              existingRoom.id,
              1,
              !isGuest ? user?.id : undefined,
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
              !isGuest ? user?.id : undefined,
              isGuest ? guestNickname : undefined
            );
            setMySymbol('O');
            // Update room status to playing when second player joins
            await updateRoomStatus(existingRoom.id, 'playing');
          } else {
            // Room is full, determine which player we are
            const myParticipant = roomParticipants.find(p =>
              p.user_id === user?.id || (user?.isGuest && p.guest_nickname === guestNickname)
            );
            if (myParticipant) {
               setMySymbol(myParticipant.player_number === 1 ? 'X' : 'O');
            }
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
            // Notify chat
            setChatMessages(prev => [...prev, {
               id: Date.now().toString(),
               senderId: 'system',
               senderName: 'System',
               content: 'Opponent connected.',
               timestamp: Date.now(),
               isSystem: true
            }]);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'chat' },
        (payload) => {
          setChatMessages(prev => [...prev, payload.payload as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  const handleSendMessage = async (content: string) => {
    if (!room || !user) return;
    
    const senderName = user.guestNickname || user.profile?.display_name || 'Player';
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName,
      content,
      timestamp: Date.now(),
    };
    
    // Optimistic update
    setChatMessages(prev => [...prev, newMessage]);

    // Broadcast
    await supabase.channel(`room:${room.id}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: newMessage,
    });
  };

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
    handleSendMessage("I want a rematch! (Coming soon)");
  };

  const handleExit = async () => {
    if (room && user) {
      await leaveRoom(room.id, user.id);
    }
    router.push('/lobby');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <i className="fi fi-rr-spinner text-4xl text-[var(--accent-green)] animate-spin mb-4 block"></i>
          <p className="text-[var(--text-primary)] text-xl">Loading game...</p>
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
    'Waiting...';

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row relative max-w-full">
        {/* Game Area */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header / Info Bar */}
            <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex justify-between items-center shrink-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                   <h1 className="text-xl font-bold text-[var(--text-primary)]">Caro</h1>
                   <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono">{roomCode}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className={`flex items-center gap-1 ${currentPlayer === mySymbol ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                    {currentPlayer === mySymbol ? 'Your Turn' : "Opponent's Turn"}
                  </span>
                  <span className="text-[var(--border-primary)]">|</span>
                   <span className="text-[var(--text-tertiary)]">
                     Vs: {opponentName}
                   </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                    onClick={handleExit}
                    className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <i className="fi fi-rr-exit"></i>
                </button>
              </div>
            </div>

            {/* Board Container */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-[var(--bg-tertiary)]">
                <div className="bg-[var(--bg-secondary)] p-4 rounded-xl shadow-2xl border border-[var(--border-primary)]">
                    <CaroBoard
                        moves={moves}
                        onMove={handleMove}
                        currentPlayer={currentPlayer}
                        disabled={gameStatus !== 'playing' || currentPlayer !== mySymbol}
                    />
                </div>
            </div>

            {/* Mobile Controls / Status */}
             <div className="md:hidden p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-between items-center shrink-0">
                 {gameStatus === 'playing' && (
                    <button
                        onClick={handleSurrender}
                        className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-600/20 rounded-lg text-sm font-semibold hover:bg-red-600/20"
                    >
                        Surrender
                    </button>
                 )}
                 <button 
                   onClick={() => setIsChatOpen(true)}
                   className="ml-auto relative w-10 h-10 bg-[var(--accent-green)] text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110"
                 >
                    <i className="fi fi-rr-comment-alt"></i>
                    {/* Badge could go here */}
                 </button>
             </div>
        </div>

        {/* Chat Panel */}
        <ChatPanel 
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          currentUserId={user?.id || ''}
          isOpenMobile={isChatOpen}
          onCloseMobile={() => setIsChatOpen(false)}
          className="border-l border-[var(--border-primary)]"
        />
      </div>

      {/* Game End Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-[var(--border-primary)] animate-in zoom-in-95 duration-200">
            <div className="mb-6">
                 {winner === mySymbol ? (
                     <div className="w-20 h-20 bg-[var(--accent-green)] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-4xl shadow-lg shadow-green-500/30">
                         <i className="fi fi-rr-trophy"></i>
                     </div>
                 ) : (
                     <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-4xl shadow-lg shadow-red-500/30">
                         <i className="fi fi-rr-cross-circle"></i>
                     </div>
                 )}
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                {winner === mySymbol ? 'Victory!' : 'Defeat'}
                </h2>
                <p className="text-[var(--text-secondary)]">
                {winner === mySymbol 
                    ? 'Well played! You won the match.' 
                    : `Player ${winner} claims the victory.`}
                </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRematch}
                className="w-full px-6 py-3 bg-[var(--accent-green)] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                Rematch Request
              </button>
              <button
                onClick={handleExit}
                className="w-full px-6 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] text-[var(--text-secondary)] font-semibold rounded-xl transition-all border border-[var(--border-primary)]"
              >
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
