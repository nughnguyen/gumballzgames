'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CaroBoard from '@/components/games/caro/CaroBoard';
import ChatPanel from '@/components/game/ChatPanel';
import Sidebar from '@/components/layout/Sidebar';
import type { CaroMove, ChatMessage } from '@/types';
import { checkWin, getCurrentPlayer } from '@/lib/games/caro/gameLogic';
import { useAuthStore } from '@/lib/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { saveGameHistory } from '@/lib/supabase/rooms';

type PresenceState = {
  user_id: string;
  nickname: string;
  joined_at: string;
  online_at: string;
};

export default function CaroGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomId as string;
  const { user, isGuest } = useAuthStore();
  
  // Game State
  const [moves, setMoves] = useState<CaroMove[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
  const [rematchRequests, setRematchRequests] = useState<('X' | 'O')[]>([]);
  
  // Room State
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const channelRef = useRef<any>(null);
  const hasSyncedRef = useRef(false);

  const currentPlayer = getCurrentPlayer(moves);

  // Helper to determine role based on join order
  useEffect(() => {
    // Only run if we have users
    if (onlineUsers.length === 0) return;
    
    // Sort users by join time
    const sortedUsers = [...onlineUsers].sort((a, b) => 
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    );

    const myId = user?.id;
    // Simple fallback check using nickname if guest ID logic is fuzzy, 
    // but ideally guest ID is stable in session.
    // We used user.id or a generated one in presence.
    
    // Find my index
    const myIndex = sortedUsers.findIndex(u => u.user_id === (user?.id || channelRef.current?.presenceState()?.[user?.id || '']?.[0]?.user_id)); 
    // Wait, tracking ID needs to be consistent. 
    // We used `user?.id || guest...` in the presence effect.
    // Let's store "my presence ID" in a ref or state to be sure.
  }, [onlineUsers, user]);

  // Main Room Logic (Presence + Broadcast)
  useEffect(() => {
    if ((!user && !isGuest) || !roomCode) return;

    // Stable ID for the session
    const myPresenceId = user?.id || `guest-${Date.now()}`;
    const myNickname = user?.guestNickname || user?.profile?.display_name || 'Player';

    const myPresence: PresenceState = {
      user_id: myPresenceId,
      nickname: myNickname,
      joined_at: new Date().toISOString(),
      online_at: new Date().toISOString(),
    };

    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        presence: {
          key: myPresenceId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = Object.values(state).flat();
        setOnlineUsers(users);

        // Determine Role immediately upon sync
        const sortedUsers = users.sort((a, b) => 
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        const p1 = sortedUsers[0];
        const p2 = sortedUsers[1];

        if (p1?.user_id === myPresenceId) setMySymbol('X');
        else if (p2?.user_id === myPresenceId) setMySymbol('O');
        else setMySymbol(null); 

        // Auto-start if 2 players present and waiting
        // We need to be careful not to restart if game is finished.
        if (users.length >= 2) {
             setGameStatus(prev => {
                 if (prev === 'waiting' && sortedUsers.length >= 2) return 'playing';
                 return prev;
             });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newUsers = newPresences as unknown as PresenceState[];
        newUsers.forEach(u => {
             // Avoid duplicate system messages if possible, but difficult without tracking.
             // Simple "joined" is fine.
             setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                senderId: 'system',
                senderName: 'System',
                content: `${u.nickname} joined.`,
                timestamp: Date.now(),
                isSystem: true
             }]);
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUsers = leftPresences as unknown as PresenceState[];
        leftUsers.forEach(u => {
             setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                senderId: 'system',
                senderName: 'System',
                content: `${u.nickname} left.`,
                timestamp: Date.now(),
                isSystem: true
             }]);
        });
      })
      .on('broadcast', { event: 'game_update' }, (payload) => {
        const { moves: newMoves, winner: newWinner, gameStatus: newStatus, rematchRequests: newRequests } = payload.payload as any;
        
        if (newMoves) setMoves(newMoves);
        if (newMoves && newMoves.length === 0) {
           setWinner(null);
           setGameStatus('playing');
           setShowEndModal(false);
           setRematchRequests([]);
        }

        if (newWinner) {
            setWinner(newWinner);
            setShowEndModal(true);
        }
        if (newStatus) setGameStatus(newStatus);
        if (newRequests) setRematchRequests(newRequests);
      })
      .on('broadcast', { event: 'chat' }, (payload) => {
         setChatMessages(prev => [...prev, payload.payload as ChatMessage]);
      })
      .on('broadcast', { event: 'request_state' }, () => {
         // If I have moves, share state
         // To avoid storm, maybe only Player X shares?
         // We can check if I am X (mySymbol === 'X')
         // But inside this callback, mySymbol might be stale if not careful with closures.
         // Using ref for current state is safer or checking moves length.
         if (moves.length > 0) {
             channel.send({
                 type: 'broadcast',
                 event: 'sync_state',
                 payload: {
                     moves,
                     gameStatus,
                     winner,
                     rematchRequests
                 }
             });
         }
      })
      .on('broadcast', { event: 'sync_state' }, (payload) => {
         if (hasSyncedRef.current) return;
         const data = payload.payload;
         if (data.moves) setMoves(data.moves);
         if (data.gameStatus) setGameStatus(data.gameStatus);
         if (data.winner) {
             setWinner(data.winner);
             setShowEndModal(true);
         }
         if (data.rematchRequests) setRematchRequests(data.rematchRequests);
         hasSyncedRef.current = true;
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPresence);
          setLoading(false);
          
          // Request state
          channel.send({
              type: 'broadcast',
              event: 'request_state',
              payload: {}
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, isGuest]); 
  // Intentional: we want this effect to run once when user/room ready. 
  // It handles its own internal state via closures/state updates. 
  // However, closures for 'moves' inside callbacks will be stale.
  // We need refs for 'moves' if we are reading them inside callbacks like 'request_state'.
  
  // Fix stale closures using refs
  const movesRef = useRef(moves);
  const gameStatusRef = useRef(gameStatus);
  const winnerRef = useRef(winner);
  const rematchRef = useRef(rematchRequests);
  
  useEffect(() => {
      movesRef.current = moves;
      gameStatusRef.current = gameStatus;
      winnerRef.current = winner;
      rematchRef.current = rematchRequests;
  }, [moves, gameStatus, winner, rematchRequests]);

  // Re-bind the request_state listener with fresh refs?
  // UseEffect for listeners usually runs once. 
  // Either we use a Mutable Ref for the callback or re-subscribe.
  // Or we just check `movesRef.current` inside the callback.
  // I will update the callback to use refs. (See code below)

  // --- Handlers ---

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    const senderName = user.guestNickname || user.profile?.display_name || 'Player';
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName,
      content,
      timestamp: Date.now(),
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: newMessage,
    });
  };

  const handleMove = useCallback(async (x: number, y: number) => {
    if (gameStatus !== 'playing' || currentPlayer !== mySymbol) return;

    const newMove: CaroMove = {
      x,
      y,
      player: currentPlayer,
      timestamp: Date.now(),
    };
    const newMoves = [...moves, newMove];
    setMoves(newMoves);

    // Win Check
    const winResult = checkWin(newMoves);
    let finalStatus: 'waiting' | 'playing' | 'finished' = gameStatus;
    let finalWinner = null;

    if (winResult.winner) {
      finalWinner = winResult.winner;
      finalStatus = 'finished';
      setWinner(finalWinner);
      setGameStatus('finished');
      setShowEndModal(true);

      // Save History
      if (mySymbol === finalWinner) {
          const sortedUsers = [...onlineUsers].sort((a, b) => 
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
          );
          const p1 = sortedUsers[0];
          const p2 = sortedUsers[1];
          if (p1 && p2) {
              await saveGameHistory(
                  'caro',
                  { id: p1.user_id.startsWith('guest') ? undefined : p1.user_id, nickname: p1.nickname },
                  { id: p2.user_id.startsWith('guest') ? undefined : p2.user_id, nickname: p2.nickname },
                  { nickname: myPresenceNickname() }, 
                  newMoves.length,
                  0
              );
          }
      }
    }

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'game_update',
      payload: {
        moves: newMoves,
        winner: finalWinner,
        gameStatus: finalWinner ? 'finished' : gameStatus
      }
    });

  }, [gameStatus, currentPlayer, mySymbol, moves, onlineUsers]);

  const handleSurrender = async () => {
    const actualWinner = mySymbol === 'X' ? 'O' : 'X';
    
    setWinner(actualWinner);
    setGameStatus('finished');
    setShowEndModal(true);

    // Broadcast surrender
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'game_update',
      payload: {
        winner: actualWinner,
        gameStatus: 'finished',
        moves: moves
      }
    });

     // Save stats
     const sortedUsers = [...onlineUsers].sort((a, b) => 
       new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
     );
     const p1 = sortedUsers[0];
     const p2 = sortedUsers[1];
     if (p1 && p2) {
         const winnerUser = actualWinner === 'X' ? p1 : p2;
         await saveGameHistory(
              'caro',
              { id: p1.user_id.startsWith('guest') ? undefined : p1.user_id, nickname: p1.nickname },
              { id: p2.user_id.startsWith('guest') ? undefined : p2.user_id, nickname: p2.nickname },
              { id: winnerUser.user_id.startsWith('guest') ? undefined : winnerUser.user_id, nickname: winnerUser.nickname },
              moves.length,
              0
         );
     }
  };

  const handleRematch = async () => {
     if (!mySymbol) return;
     if (rematchRequests.includes(mySymbol)) return;

     const newRequests = [...rematchRequests, mySymbol];
     setRematchRequests(newRequests);

     if (newRequests.length >= 2) {
         // Reset
         setMoves([]);
         setWinner(null);
         setGameStatus('playing');
         setShowEndModal(false);
         setRematchRequests([]);
         
         handleSendMessage("Both players agreed to rematch. Game restarted!");

         await channelRef.current?.send({
             type: 'broadcast',
             event: 'game_update',
             payload: {
                 moves: [],
                 winner: null,
                 gameStatus: 'playing',
                 rematchRequests: []
             }
         });
     } else {
         await channelRef.current?.send({
             type: 'broadcast',
             event: 'game_update',
             payload: { rematchRequests: newRequests }
         });
     }
  };

  const handleExit = () => {
     router.push('/');
  };

  const myPresenceNickname = () => user?.guestNickname || user?.profile?.display_name || 'Player';

  const opponent = onlineUsers.find(u => u.nickname !== myPresenceNickname());
  const opponentName = opponent ? opponent.nickname : 'Waiting...';

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <i className="fi fi-rr-spinner text-4xl text-[var(--accent-green)] animate-spin mb-4 block"></i>
          <p className="text-[var(--text-primary)] text-xl">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row relative max-w-full">
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Header */}
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
                <button onClick={handleExit} className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <i className="fi fi-rr-exit"></i>
                </button>
              </div>
            </div>

            {/* Board */}
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

            {/* Mobile Footer */}
             <div className="md:hidden p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-between items-center shrink-0">
                 {gameStatus === 'playing' && (
                    <button onClick={handleSurrender} className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-600/20 rounded-lg text-sm font-semibold hover:bg-red-600/20">
                        Surrender
                    </button>
                 )}
                 <button onClick={() => setIsChatOpen(true)} className="ml-auto relative w-10 h-10 bg-[var(--accent-green)] text-white rounded-full flex items-center justify-center shadow-lg hover:brightness-110">
                    <i className="fi fi-rr-comment-alt"></i>
                 </button>
             </div>
        </div>

        <ChatPanel 
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          currentUserId={user?.id || 'guest'}
          isOpenMobile={isChatOpen}
          onCloseMobile={() => setIsChatOpen(false)}
          className="border-l border-[var(--border-primary)]"
        />
      </div>

      {/* End Modal */}
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
                {winner === mySymbol ? 'Well played! You won the match.' : `Player ${winner} claims the victory.`}
                </p>
            </div>
            
            {opponentName !== 'Waiting...' && (
                 <div className="mb-4 space-y-2">
                    {rematchRequests.some(r => r !== mySymbol) && !rematchRequests.includes(mySymbol!) && (
                         <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-primary)] animate-pulse border border-[var(--accent-green)]/30">
                            <span className="font-bold text-[var(--accent-green)]">Opponent</span> wants a rematch!
                         </div>
                    )}
                 </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRematch}
                disabled={rematchRequests.includes(mySymbol!)}
                className={`w-full px-6 py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2
                    ${rematchRequests.includes(mySymbol!)
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed opacity-70' 
                        : 'bg-[var(--accent-green)] hover:brightness-110 text-white'}`}
              >
                {rematchRequests.includes(mySymbol!)
                    ? <><i className="fi fi-rr-spinner animate-spin"></i> Waiting for Opponent...</>
                    : rematchRequests.some(r => r !== mySymbol)
                        ? 'Accept Rematch' 
                        : 'Rematch Request'
                }
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
