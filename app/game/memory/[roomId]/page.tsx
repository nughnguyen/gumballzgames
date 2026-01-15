'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { updateRoomHeartbeat } from '@/lib/supabase/rooms';
import Sidebar from '@/components/layout/Sidebar';
import ChatPanel from '@/components/game/ChatPanel';
import { ChatMessage } from '@/types';

// --- TYPES ---

type GridSize = { cols: number; rows: number; label: string };
const GRID_OPTIONS: GridSize[] = [
  { cols: 4, rows: 3, label: '4x3 (12 Cards)' },
  { cols: 5, rows: 4, label: '5x4 (20 Cards)' },
  { cols: 6, rows: 5, label: '6x5 (30 Cards)' },
  { cols: 6, rows: 7, label: '7x6 (42 Cards)' }, // 7 cols, 6 rows to fit better on screen
];

type Card = {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy: string | null; // userId
};

type GameState = {
  phase: 'setup' | 'playing' | 'finished';
  grid: GridSize;
  cards: Card[];
  turn: string; // userId
  scores: Record<string, number>;
  flippedIndices: number[]; // indices of cards currently flipped for checking
  winner: string | null;
};

type PresenceState = {
  sessionId: string;
  user_id: string;
  nickname: string;
  joined_at: string;
  isHost: boolean;
};

// --- ASSETS ---
const EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
  '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷', '🐢', '🐍', '🦎',
  '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳'
];

export default function MemoryGameRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.roomId as string)?.toUpperCase();

  const { user, isGuest, checkAuth, loading: authLoading } = useAuthStore();
  
  // Local User Info
  const [joinTime] = useState(new Date().toISOString());
  const [sessionId] = useState(() => `sess-${Math.random().toString(36).substring(2, 9)}`);
  const myUserId = user?.id || `guest-${joinTime}`;
  const myNickname = user?.guestNickname || user?.profile?.display_name || 'Player';

  // Game State
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
    grid: GRID_OPTIONS[0],
    cards: [],
    turn: '',
    scores: {},
    flippedIndices: [],
    winner: null,
  });
  
  // UI State
  const [logs, setLogs] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedGridIdx, setSelectedGridIdx] = useState(0);

  const channelRef = useRef<any>(null);
  const stateRef = useRef(gameState);

  // Sync ref
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  // Auth Check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Join Logic
  useEffect(() => {
    if (authLoading) return;
    if (!roomId) return;

    // cleanup previous channel if any (react strict mode safeguard)
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: sessionId } } 
    });
    channelRef.current = channel;

    const myPresence = {
      sessionId,
      user_id: myUserId,
      nickname: myNickname,
      joined_at: joinTime,
      isHost: false // Will be determined by order
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = Object.values(state).flat();
        
        // Deduplicate by sessionId just in case
        const uniqueUsers = Array.from(new Map(users.map(u => [u.sessionId, u])).values());

        const sortedUsers = uniqueUsers.sort((a, b) => 
           new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        
        // Fix Host status based on order (first joiner is host)
        const updatedUsers = sortedUsers.map((u, idx) => ({ ...u, isHost: idx === 0 }));
        
        console.log("Users synced:", updatedUsers); 
        setOnlineUsers(updatedUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('leave', key, leftPresences);
      })
      .on('broadcast', { event: 'game_update' }, ({ payload }) => {
        setGameState(payload);
      })
      .on('broadcast', { event: 'log' }, ({ payload }) => {
        addLog(payload.message);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChatMessages(p => [...p, payload]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          const res = await channel.track(myPresence);
          
          if (res !== 'ok') {
              console.error("Track failed", res);
              addLog("Connection unstable. Retrying...");
          } else {
              addLog("Connected to Memory Room.");
              
              // Immediate local update to avoid "0 connected" flash
              // We know WE are connected.
              setOnlineUsers(prev => {
                  const exists = prev.some(u => u.sessionId === sessionId);
                  if (exists) return prev;
                  return [...prev, { ...myPresence, isHost: prev.length === 0 }];
              });
          }
        }
      });

      supabase.removeChannel(channel);
      channelRef.current = null;
      setOnlineUsers([]); // Clear users on cleanup
    };
  }, [roomId, authLoading, sessionId, myUserId, myNickname, joinTime]);

  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(() => updateRoomHeartbeat(roomId), 60000);
    updateRoomHeartbeat(roomId);
    return () => clearInterval(interval);
  }, [roomId]);

  const addLog = (msg: string) => {
    setLogs(p => [msg, ...p].slice(0, 5));
  };

  const broadcastState = async (newState: GameState) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'game_update',
      payload: newState
    });
    setGameState(newState);
  };

  const broadcastLog = async (message: string) => {
    addLog(message);
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'log',
      payload: { message }
    });
  };

  // --- HOST LOGIC ---
  const isHost = onlineUsers.find(u => u.sessionId === sessionId)?.isHost ?? false;

  const startGame = async () => {
    if (!isHost) return;
    if (onlineUsers.length < 2) {
        alert("Wait for an opponent!");
        return;
    }

    const grid = GRID_OPTIONS[selectedGridIdx];
    const pairCount = (grid.rows * grid.cols) / 2;
    // Select emojis
    const selectedEmojis = EMOJIS.sort(() => 0.5 - Math.random()).slice(0, pairCount);
    // Create pairs
    const deck = [...selectedEmojis, ...selectedEmojis]
        .sort(() => 0.5 - Math.random())
        .map((emoji, idx) => ({
            id: idx,
            icon: emoji,
            isFlipped: false,
            isMatched: false,
            matchedBy: null
        }));

    const scores: Record<string, number> = {};
    onlineUsers.forEach(u => scores[u.user_id] = 0);

    const newState: GameState = {
        phase: 'playing',
        grid,
        cards: deck,
        turn: onlineUsers[0].user_id, // Host starts
        scores,
        flippedIndices: [],
        winner: null,
    };

    await broadcastState(newState);
    broadcastLog("Game Started! Host's turn.");
  };

  const handleCardClick = async (index: number) => {
    // Basic validation
    if (gameState.phase !== 'playing') return;
    if (gameState.turn !== myUserId) return; // Not my turn
    if (gameState.cards[index].isFlipped || gameState.cards[index].isMatched) return;
    if (gameState.flippedIndices.length >= 2) return; // Already flip 2, waiting

    // If I am host, I process. If I am guest, I request host to process?
    // Actually, simpler: whoever's turn it is processes the flip, then broadcasts.
    // We trust the clients for this casual game.
    
    // 1. Flip the card
    const newCards = [...gameState.cards];
    newCards[index].isFlipped = true;
    
    const newFlippedIndices = [...gameState.flippedIndices, index];
    
    let newState = {
        ...gameState,
        cards: newCards,
        flippedIndices: newFlippedIndices
    };

    setGameState(newState); // Optimistic local
    channelRef.current?.send({ type: 'broadcast', event: 'game_update', payload: newState });

    // 2. Check logic if 2 cards flipped
    if (newFlippedIndices.length === 2) {
        const idx1 = newFlippedIndices[0];
        const idx2 = newFlippedIndices[1];
        const card1 = newCards[idx1];
        const card2 = newCards[idx2];

        if (card1.icon === card2.icon) {
            // MATCH!
            setTimeout(async () => {
                const matchedCards = [...newCards];
                matchedCards[idx1].isMatched = true;
                matchedCards[idx1].matchedBy = myUserId;
                matchedCards[idx2].isMatched = true;
                matchedCards[idx2].matchedBy = myUserId;

                const newScores = { ...gameState.scores };
                newScores[myUserId] = (newScores[myUserId] || 0) + 1;

                // Check Win
                const allMatched = matchedCards.every(c => c.isMatched);
                let winner = null;
                let phase = gameState.phase;

                if (allMatched) {
                    phase = 'finished';
                    // Determine winner
                    const opponentId = Object.keys(newScores).find(id => id !== myUserId);
                    if (opponentId && newScores[myUserId] > newScores[opponentId]) winner = myUserId;
                    else if (opponentId && newScores[opponentId] > newScores[myUserId]) winner = opponentId;
                    else winner = 'draw';
                }

                const matchState: GameState = {
                    ...gameState,
                    cards: matchedCards,
                    scores: newScores,
                    flippedIndices: [],
                    phase,
                    winner
                };
                
                await broadcastState(matchState);
                if (allMatched) broadcastLog("Game Over!");
                else broadcastLog("Match! Go again.");

            }, 600);
        } else {
            // MISS
            setTimeout(async () => {
                const validUsers = onlineUsers.map(u => u.user_id);
                const currentIdx = validUsers.indexOf(myUserId);
                const nextIdx = (currentIdx + 1) % validUsers.length;
                const nextUser = validUsers[nextIdx];

                const resetCards = [...newCards];
                resetCards[idx1].isFlipped = false;
                resetCards[idx2].isFlipped = false;

                const missState: GameState = {
                    ...gameState,
                    cards: resetCards,
                    flippedIndices: [],
                    turn: nextUser
                };

                await broadcastState(missState);
                broadcastLog("Miss! Next turn.");
            }, 1000);
        }
    }
  };

  const handleSendMessage = async (content: string) => {
     if (!user && !isGuest) return;
     const newMessage: ChatMessage = {
         id: Date.now().toString(),
         senderId: myUserId,
         senderName: myNickname,
         content,
         timestamp: Date.now()
     };
     setChatMessages(p => [...p, newMessage]);
     await channelRef.current.send({
         type: 'broadcast',
         event: 'chat',
         payload: newMessage
     });
  };

  // --- RENDER HELPERS ---
  const getGridClass = () => {
      // Return tailwind grid cols class
      const cols = gameState.grid.cols;
      if (cols === 4) return 'grid-cols-4';
      if (cols === 5) return 'grid-cols-5';
      if (cols === 6) return 'grid-cols-6';
      if (cols === 7) return 'grid-cols-7';
      return 'grid-cols-4';
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden font-sans text-[var(--text-primary)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative">
         <div className="flex-1 flex flex-col h-full overflow-hidden">
             
             {/* Header */}
             <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex justify-between items-center shrink-0 z-10">
               <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">🎴</span>
                    Memory Game
                  </h1>
                  <div className="flex items-center gap-4 text-sm mt-1">
                     <span className="text-[var(--text-secondary)] font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-primary)]">
                         {roomId}
                     </span>
                     
                     {/* Scoreboard */}
                     {gameState.phase !== 'setup' && onlineUsers.map(u => (
                         <div key={u.user_id} className={`flex items-center gap-1 ${gameState.turn === u.user_id ? 'font-bold text-[var(--accent-green)]' : 'text-[var(--text-secondary)]'}`}>
                             <span>{u.nickname}:</span>
                             <span>{gameState.scores[u.user_id] || 0}</span>
                         </div>
                     ))}
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <button onClick={() => {
                        const url = `${window.location.origin}/game/memory/${roomId}`;
                        navigator.clipboard.writeText(url);
                        addLog("Link copied!");
                    }} 
                    className="p-2 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--border-primary)] transition-colors"
                 >
                     <i className="fi fi-rr-share"></i>
                 </button>
                 <button onClick={() => router.push('/games/memory')} className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                     <i className="fi fi-rr-exit"></i>
                 </button>
               </div>
             </div>

             {/* Game Area */}
             <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-tertiary)] flex items-center justify-center">
                 
                 {/* Setup Phase */}
                 {gameState.phase === 'setup' && (
                     <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl border border-[var(--border-primary)] shadow-2xl max-w-md w-full text-center">
                         <div className="mb-6">
                            <i className="fi fi-rr-playing-cards text-6xl text-[var(--accent-green)] mb-4 inline-block"></i>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Game Setup</h2>
                            <p className="text-[var(--text-secondary)] mt-2">
                                {onlineUsers.length < 2 ? `Waiting for players... (${onlineUsers.length} connected)` : "Ready to start!"}
                            </p>
                            <div className="flex justify-center flex-wrap gap-2 mt-4">
                                {onlineUsers.map(u => (
                                    <span key={u.sessionId} className="px-3 py-1 bg-[var(--bg-tertiary)] rounded-full text-sm border border-[var(--border-primary)] flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        {u.nickname} {u.isHost ? '(Host)' : ''}
                                    </span>
                                ))}
                            </div>
                         </div>

                         {isHost ? (
                             <div className="space-y-6">
                                 <div>
                                     <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">Grid Size</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         {GRID_OPTIONS.map((opt, idx) => (
                                             <button
                                                key={idx}
                                                onClick={() => setSelectedGridIdx(idx)}
                                                className={`p-3 rounded-lg border transition-all ${
                                                    selectedGridIdx === idx 
                                                        ? 'bg-[var(--accent-green)] text-white border-[var(--accent-green)]' 
                                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--accent-green)]'
                                                }`}
                                             >
                                                 {opt.label}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                                 
                                 <button
                                     onClick={startGame}
                                     disabled={onlineUsers.length === 0}
                                     className="w-full py-4 bg-[var(--accent-green)] text-white font-bold rounded-xl shadow-lg shadow-green-900/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     {onlineUsers.length < 2 ? "Start Game (Solo/Test)" : "Start Game"}
                                 </button>
                             </div>
                         ) : (
                             <div className="animate-pulse text-[var(--text-tertiary)]">
                                 Waiting for host to configure game...
                             </div>
                         )}
                     </div>
                 )}

                 {/* Playing Phase */}
                 {gameState.phase !== 'setup' && (
                     <div className="flex flex-col items-center gap-6">
                         
                         {gameState.phase === 'finished' && (
                             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                 <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl border border-[var(--accent-green)] shadow-2xl text-center transform animate-bounce-in">
                                     <div className="text-6xl mb-4">🏆</div>
                                     <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Game Over!</h2>
                                     <p className="text-xl text-[var(--text-secondary)] mb-6">
                                         {gameState.winner === 'draw' ? "It's a Draw!" : (
                                             onlineUsers.find(u => u.user_id === gameState.winner)?.nickname + " Wins!"
                                         )}
                                     </p>
                                     {isHost && (
                                         <button 
                                            onClick={() => {
                                                setGameState(prev => ({...prev, phase: 'setup', winner: null, flippedIndices: [], scores: {}, cards: []}));
                                                broadcastState({...gameState, phase: 'setup', winner: null, flippedIndices: [], scores: {}, cards: []});
                                            }}
                                            className="px-8 py-3 bg-[var(--accent-green)] text-white font-bold rounded-xl hover:scale-105 transition-transform"
                                         >
                                             Play Again
                                         </button>
                                     )}
                                 </div>
                             </div>
                         )}

                         {/* Turn Indicator */}
                         <div className={`px-6 py-2 rounded-full border ${
                             gameState.turn === myUserId 
                                ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)] text-[var(--accent-green)]' 
                                : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
                         } font-bold transition-all`}>
                             {gameState.turn === myUserId ? "YOUR TURN" : `${onlineUsers.find(u => u.user_id === gameState.turn)?.nickname || 'Opponent'}'s Turn`}
                         </div>

                         {/* Grid */}
                         <div className={`grid gap-3 ${getGridClass()}`}>
                             {gameState.cards.map((card, idx) => (
                                 <button
                                    key={card.id}
                                    onClick={() => handleCardClick(idx)}
                                    // Make sure disabled if not playing or waiting for animation
                                    disabled={card.isFlipped || card.isMatched || gameState.turn !== myUserId || gameState.flippedIndices.length >= 2}
                                    style={{
                                        perspective: '1000px'
                                    }}
                                    className={`
                                        w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-32 
                                        relative group cursor-pointer transition-transform duration-300
                                        ${(card.isFlipped || card.isMatched) ? '[transform:rotateY(180deg)]' : 'hover:scale-105'}
                                    `}
                                 >
                                     <div className={`
                                        absolute inset-0 w-full h-full 
                                        transition-all duration-500 [transform-style:preserve-3d]
                                        ${(card.isFlipped || card.isMatched) ? '[transform:rotateY(180deg)]' : ''}
                                     `}>
                                         {/* FRONT (Hidden) */}
                                         <div className="absolute inset-0 w-full h-full bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-xl flex items-center justify-center [backface-visibility:hidden]">
                                             <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 rounded-xl"></div>
                                             <span className="text-3xl opacity-50">?</span>
                                         </div>

                                         {/* BACK (Revealed) */}
                                         <div className={`
                                            absolute inset-0 w-full h-full rounded-xl flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]
                                            bg-[var(--bg-secondary)] border-2
                                            ${card.isMatched 
                                                ? (card.matchedBy === myUserId ? 'border-[var(--accent-green)] shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]')
                                                : 'border-[var(--text-primary)]'}
                                         `}>
                                             <span className="text-4xl">{card.icon}</span>
                                         </div>
                                     </div>
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
             
             {/* Mobile Chat Toggle */}
             <div className="md:hidden p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-end">
                 <button onClick={() => setIsChatOpen(true)} className="w-10 h-10 bg-[var(--accent-green)] text-white rounded-full flex items-center justify-center shadow-lg">
                    <i className="fi fi-rr-comment-alt"></i>
                 </button>
             </div>
         </div>
         
         {/* Chat Panel */}
         <ChatPanel 
           messages={chatMessages}
           onSendMessage={handleSendMessage}
           currentUserId={myUserId}
           isOpenMobile={isChatOpen}
           onCloseMobile={() => setIsChatOpen(false)}
           className="border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]"
         />
      </div>
    </div>
  );
}
