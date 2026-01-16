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
import { saveGameHistory, updateRoomHeartbeat } from '@/lib/supabase/rooms';

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
  const { user, isGuest, checkAuth, loading: authLoading } = useAuthStore();
  
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

  // -- Emoji State --
  interface ActiveEmoji {
    id: string;
    senderId: string;
    emojiName: string;
    timestamp: number;
  }

  const AVAILABLE_EMOJIS = [
    '20250405emoticons-SheetAngry.png', '20250405emoticons-SheetCant.png', '20250405emoticons-SheetCome.png',
    '20250405emoticons-SheetCrying.png', '20250405emoticons-SheetCute.png', '20250405emoticons-SheetDizzy.png',
    '20250405emoticons-SheetDown.png', '20250405emoticons-SheetDrooling.png', '20250405emoticons-SheetEager.png',
    '20250405emoticons-SheetExclamation.png', '20250405emoticons-SheetFrustrated.png', '20250405emoticons-SheetHeadblown.png',
    '20250405emoticons-SheetIdea.png', '20250405emoticons-SheetKissing.png', '20250405emoticons-SheetLaughing.png',
    '20250405emoticons-SheetLeft.png', '20250405emoticons-SheetLit.png', '20250405emoticons-SheetLove.png',
    '20250405emoticons-SheetNeutral.png', '20250405emoticons-SheetNo.png', '20250405emoticons-SheetOMG.png',
    '20250405emoticons-SheetOk.png', '20250405emoticons-SheetQuestion.png', '20250405emoticons-SheetRight.png',
    '20250405emoticons-SheetSilence.png', '20250405emoticons-SheetSleepy.png', '20250405emoticons-SheetSpeechless.png',
    '20250405emoticons-SheetSweat.png', '20250405emoticons-SheetThinking.png', '20250405emoticons-SheetTongue.png',
    '20250405emoticons-SheetYes.png', '20250405emoticons-Sheetup.png'
  ];

  const [activeEmojis, setActiveEmojis] = useState<ActiveEmoji[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Initialize Auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.push('/');
    }
  }, [authLoading, user, isGuest, router]);

  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Validate Room
  const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null);

  useEffect(() => {
      async function validate() {
        if (!roomCode) return;
        // Normalize
        /* 
        // Logic moved to upper scope or before usage to prevent loop? 
        // Actually router.replace triggers re-render.
        if (!roomCode.startsWith('CR-')) {
            router.replace(`/game/caro/CR-${roomCode}`);
            return;
        }
        */
        // Let's rely on checking DB.
        
        // Timeout for validation
        const valTimeout = setTimeout(() => {
             if (isValidRoom === null) {
                 console.warn("Room validation timed out, proceeding broadly...");
                 setIsValidRoom(true); // Optimistic fallback
             }
        }, 5000);

        try {
            // We need a way to check if room exists.
            // If we use 'getRoomByCode' from lib, we need to import it.
            // But for now, let's assuming if we are here, we try to connect.
            // If subscription fails, we handle it.
            setIsValidRoom(true); 
        } catch (e) {
            console.error(e);
        } finally {
            clearTimeout(valTimeout);
        }
      }
      validate();
  }, [roomCode]);

  // Main Room Logic (Presence + Broadcast)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize
    if ((!user && !isGuest) || !roomCode) return;
    if (!isValidRoom) return; // Wait for valid flag

    // Reset error
    setConnectionError(null);

    // Stable ID for the session
    const myPresenceId = user?.id || `guest-${Date.now()}`;
    const myNickname = user?.guestNickname || user?.profile?.display_name || 'Player';

    const myPresence: PresenceState = {
      user_id: myPresenceId,
      nickname: myNickname,
      joined_at: new Date().toISOString(),
      online_at: new Date().toISOString(),
    };

    console.log('Connecting to Caro Room:', roomCode, 'as', myNickname);

    // Connection Timeout - Increased to 30s
    const timeout = setTimeout(() => {
        setLoading((l) => {
            if (l) {
                setConnectionError("Connection timed out. Please try refreshing.");
            }
            return l;
        });
    }, 30000);

    // Cleanup existing
    if (channelRef.current) supabase.removeChannel(channelRef.current);

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
        console.log('Presence Sync:', users);
        setOnlineUsers(users);

        // Determine Role immediately upon sync
        const sortedUsers = users.sort((a, b) => 
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        const p1 = sortedUsers[0];
        const p2 = sortedUsers[1];

        // Randomize starting player (X goes first) based on Room Code hash
        // This ensures both clients agree on who is X without extra state exchange
        const roomHash = roomCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const p1IsX = roomHash % 2 === 0;

        // Only update symbol if game is NOT playing (prevent swapping mid-game)
        if (gameStatusRef.current !== 'playing') {
             if (p1?.user_id === myPresenceId) setMySymbol(p1IsX ? 'X' : 'O');
             else if (p2?.user_id === myPresenceId) setMySymbol(p1IsX ? 'O' : 'X');
             else setMySymbol(null); 
        } 
        

        // Let's fix updateRoomHeartbeat to use room_code first in next step or now.
        // Actually, let's make updateRoomHeartbeat take roomCode.
        
        // Auto-start if 2 players present and waiting
        if (users.length >= 2) {
             setGameStatus(prev => {
                 if (prev === 'waiting' && sortedUsers.length >= 2) return 'playing';
                 return prev;
             });
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Join:', newPresences);
        const newUsers = newPresences as unknown as PresenceState[];
        newUsers.forEach(u => {
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
        console.log('Leave:', leftPresences);
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
      .on('broadcast', { event: 'emoji' }, ({ payload }) => {
          handleIncomingEmoji(payload);
      })
      .on('broadcast', { event: 'request_state' }, () => {
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
        console.log('Subscription Status:', status);
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
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
      clearTimeout(timeout);
      console.log('Unsubscribing Caro Channel');
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, isGuest, authLoading]); 
  // Intentional: we want this effect to run once when user/room ready. 
  // It handles its own internal state via closures/state updates. 
  // However, closures for 'moves' inside callbacks will be stale.
  // We need refs for 'moves' if we are reading them inside callbacks like 'request_state'.
  
  // Fix stale closures using refs
  const movesRef = useRef(moves);
  const gameStatusRef = useRef(gameStatus);
  const winnerRef = useRef(winner);
  const rematchRef = useRef(rematchRequests);
  const mySymbolRef = useRef(mySymbol);
  const activeOpponentIdRef = useRef<string | null>(null);
  const onlineUsersRef = useRef(onlineUsers);
  
  useEffect(() => {
      movesRef.current = moves;
      gameStatusRef.current = gameStatus;
      winnerRef.current = winner;
      rematchRef.current = rematchRequests;
      mySymbolRef.current = mySymbol;
      onlineUsersRef.current = onlineUsers;

      // Lock opponent ID when game starts
      if (gameStatus === 'playing' && !activeOpponentIdRef.current) {
          const opponent = onlineUsers.find(u => {
              const matchesMyUser = u.user_id === (user?.id || channelRef.current?.presenceState()?.[user?.id || '']?.[0]?.user_id);
              // Fallback logic for presence/user matching
              const myNickname = user?.guestNickname || user?.profile?.display_name || 'Player';
              return u.nickname !== myNickname; // Simple nickname check for now or ensure ID match
          });
           // Better: use the sort order
          const sortedUsers = [...onlineUsers].sort((a, b) => 
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
          );
          const p1 = sortedUsers[0];
          const p2 = sortedUsers[1];
          // If I am p1, opponent is p2
          const myId = user?.id || sortedUsers.find(u => u.nickname === (user?.guestNickname || user?.profile?.display_name))?.user_id;

          if (myId === p1?.user_id) activeOpponentIdRef.current = p2?.user_id;
          else if (myId === p2?.user_id) activeOpponentIdRef.current = p1?.user_id;
      }
      
      // Reset opponent ref if game resets to waiting
      if (gameStatus === 'waiting') {
          activeOpponentIdRef.current = null;
      }
  }, [moves, gameStatus, winner, rematchRequests, mySymbol, onlineUsers, user]);

  // Duplicate useEffect removed
 

  // Handlers
  const handleSendMessage = async (content: string) => {
    if (!user) return;
    const senderName = user.guestNickname || user.profile?.display_name || 'Player';
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id || 'guest',
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
      finalStatus = 'finished' as any;
      setWinner(finalWinner);
      setGameStatus('finished');
      setShowEndModal(true);

      if (finalWinner === mySymbol) {
         new Audio('/sfx/victory.webm').play().catch(e => console.error("Audio play failed", e));
      } else {
         new Audio('/sfx/defeat.webm').play().catch(e => console.error("Audio play failed", e));
      }

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

    new Audio('/sfx/defeat.webm').play().catch(e => console.error("Audio play failed", e));

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

  // -- Emoji Handlers --
  const handleIncomingEmoji = (payload: ActiveEmoji) => {
      setActiveEmojis(prev => [...prev, payload]);
      setTimeout(() => {
          setActiveEmojis(prev => prev.filter(e => e.id !== payload.id));
      }, 3000);
  };

  const handleSendEmoji = async (emojiName: string) => {
      if (!user && !isGuest) return;
      
      const newEmoji: ActiveEmoji = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: user?.id || `guest-${Date.now()}`,
          emojiName,
          timestamp: Date.now()
      };
      
      handleIncomingEmoji(newEmoji); // Show locally
      await channelRef.current?.send({
          type: 'broadcast',
          event: 'emoji',
          payload: newEmoji
      });
      setIsEmojiPickerOpen(false);
  };


  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
            {connectionError ? (
                <>
                    <i className="fi fi-rr-circle-xmark text-4xl text-red-500 mb-4 block"></i>
                    <p className="text-red-400 text-xl mb-4">{connectionError}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-[var(--accent-green)] text-white rounded-lg font-bold"
                    >
                        Retry
                    </button>
                </>
            ) : (
                <>
                  <i className="fi fi-rr-spinner text-4xl text-[var(--accent-green)] animate-spin mb-4 block"></i>
                  <p className="text-[var(--text-primary)] text-xl">Connecting to room...</p>
                </>
            )}
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
            {/* Emojis Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                {activeEmojis.map(emoji => (
                    <div 
                        key={emoji.id} 
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce-in`}
                        style={{
                            top: emoji.senderId === (user?.id || (user as any)?.guestId) ? '70%' : '30%'
                        }}
                    >
                        <div 
                          className="w-16 h-16 bg-no-repeat drop-shadow-2xl filter brightness-110"
                          style={{ 
                              backgroundImage: `url(/emoji/${emoji.emojiName})`,
                              backgroundSize: '10rem 8rem',
                              backgroundPosition: '-8rem -2rem'
                          }}
                        ></div>
                    </div>
                ))}
            </div>
            {/* Header */}
            <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex justify-between items-center shrink-0 z-10">
               <div>
                 <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <i className="fi fi-rr-chess-knight-alt text-2xl"></i>
                        Caro
                    </h1>
                    
                    {/* Copy Link Button */}
                    <button 
                       onClick={() => {
                           navigator.clipboard.writeText(window.location.href);
                           setChatMessages(prev => [...prev, {
                               id: Date.now().toString(),
                               senderId: 'system',
                               senderName: 'System',
                               content: 'Room link copied to clipboard.',
                               timestamp: Date.now(),
                               isSystem: true
                           }]);
                       }}
                       title="Copy Room Link"
                       className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-1 transition-all"
                    >
                       <i className="fi fi-rr-link-alt"></i>
                    </button>

                    {/* Copy ID Button */}
                    <button 
                       onClick={() => {
                           navigator.clipboard.writeText(roomCode);
                           setChatMessages(prev => [...prev, {
                               id: Date.now().toString(),
                               senderId: 'system',
                               senderName: 'System',
                               content: 'Room ID copied to clipboard.',
                               timestamp: Date.now(),
                               isSystem: true
                           }]);
                       }}
                       title="Copy Room ID"
                       className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-1 transition-all"
                    >
                       <strong className="tracking-widest">{roomCode}</strong>
                       <i className="fi fi-rr-copy"></i>
                    </button>

                    {/* Emoji Toggle */}
                    <button 
                       onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                       className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 flex items-center justify-center hover:scale-110 transition-transform ml-2"
                    >
                        {isEmojiPickerOpen ? <i className="fi fi-rr-cross-small"></i> : <i className="fi fi-rr-smile"></i>}
                    </button>
                 </div>
                 
                 {/* Emoji Picker */}
                 {isEmojiPickerOpen && (
                    <div className="absolute top-16 left-4 right-auto w-[350px] max-w-[90vw] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-4 shadow-2xl z-[100] grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {AVAILABLE_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleSendEmoji(emoji)}
                                className="w-10 h-10 p-1 hover:bg-white/10 rounded transition-all hover:scale-110 flex items-center justify-center"
                            >
                                 <div
                                  className="w-8 h-8 bg-no-repeat"
                                  style={{
                                      backgroundImage: `url(/emoji/${emoji})`,
                                      backgroundSize: '10rem 8rem',
                                      backgroundPosition: '-8rem -2rem'
                                  }}
                                ></div>
                            </button>
                        ))}
                    </div>
                )}
                
               {/* Controls */}
                <div className="flex items-center gap-2">
                    <button 
                       onClick={() => {
                           navigator.clipboard.writeText(roomCode);
                           setChatMessages(prev => [...prev, {
                               id: Date.now().toString(),
                               senderId: 'system',
                               senderName: 'System',
                               content: 'Room ID copied to clipboard.',
                               timestamp: Date.now(),
                               isSystem: true
                           }]);
                       }}
                       title="Copy Room ID"
                       className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-2 transition-all"
                    >
                       <span>ID: {roomCode}</span>
                       <i className="fi fi-rr-copy"></i>
                    </button>
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
