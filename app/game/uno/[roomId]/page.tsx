
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { GameState, Player, UnoColor } from '@/lib/game/uno/types';
import { updateRoomHeartbeat } from '@/lib/supabase/rooms';
import { createInitialState, processTurn, drawFromDeck, validateMove } from '@/lib/game/uno/engine';
import { getCardDetails } from '@/lib/game/uno/logic';
import { ScalableUnoCard } from '@/components/game/uno/UnoCard';
import Sidebar from '@/components/layout/Sidebar';
import ChatPanel from '@/components/game/ChatPanel';
import { ChatMessage } from '@/types';

// Helper to get relative position for UI (Bottom (Me), Left, Top, Right)
function getRelativeHeader(myIndex: number, targetIndex: number, totalPlayers: number) {
    if (totalPlayers === 2) {
        return targetIndex === myIndex ? 'You' : 'Opponent';
    }
    // For 3 or 4 players
    // Calculate "steps" clockwise
    let diff = (targetIndex - myIndex + totalPlayers) % totalPlayers;
    if (diff === 0) return 'You';
    if (diff === 1) return 'Left';
    if (diff === 2) return 'Top'; // Or 'Across' if 4 players?
    if (diff === 3) return 'Right';
    return `Player ${targetIndex}`;
}

export default function UnoRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = (params.roomId as string)?.toUpperCase();
    const { user, isGuest, checkAuth, loading: authLoading } = useAuthStore();
    
    // ----- State -----
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [localPlayers, setLocalPlayers] = useState<{id: string, name: string, isReady: boolean}[]>([]);
    const [mySessionId] = useState(() => `sess-${Math.random().toString(36).substring(2, 9)}`);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [showColorPicker, setShowColorPicker] = useState<number | null>(null); // If playing wild, store card ID here
    
    const channelRef = useRef<any>(null);
    
    const myName = user?.guestNickname || user?.profile?.display_name || 'Player';
    const myId = user?.id || `guest-${mySessionId}`; // Use stable ID if logged in, else transient

    const [joinedAt] = useState(() => Date.now());

    // Redirect or Auth Check
    useEffect(() => {
        if (!authLoading && !user && !isGuest) {
            // Optional: Auto login guest?
        }
    }, [authLoading, user, isGuest]);

    useEffect(() => {
        if (!roomId) return;
        const interval = setInterval(() => updateRoomHeartbeat(roomId), 60000);
        updateRoomHeartbeat(roomId);
        return () => clearInterval(interval);
    }, [roomId]);

    // --- Supabase Connection ---
    useEffect(() => {
        if (!roomId) return;
        
        // Clean up any existing channel with same name just in case (though supabase client handles duplicate topics usually)
        // const existing = supabase.getChannels().find(c => c.topic === `room:uno:${roomId}`);
        // if (existing) supabase.removeChannel(existing);

        const channel = supabase.channel(`room:uno:${roomId}`, {
            config: { presence: { key: mySessionId } }
        });
        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<{id: string, name: string, sessionId: string, isReady: boolean, joinedAt: number}>();
                const users = Object.values(state).flat().sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
                
                console.log('Presence Sync:', users);
                if (users.length > 0) {
                     setLocalPlayers(users.map(u => ({ id: u.sessionId, name: u.name, isReady: !!u.isReady })));
                }
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('Join:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('Leave:', key, leftPresences);
            })
            .on('broadcast', { event: 'gameState' }, ({ payload }) => {
                setGameState(payload);
            })
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                setChatMessages(p => [...p, payload]);
            })
             .on('broadcast', { event: 'gameAction' }, ({ payload }) => {
                 // Trigger handleAction safely? 
                 // We handle this in another effect usually, but for reliability we can log here
                 console.log('Action received:', payload);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        sessionId: mySessionId,
                        id: myId, 
                        name: myName, // Ensure name is stable
                        isReady: false,
                        joinedAt
                    });
                }
            });

        return () => {
            console.log('Unsubscribing from', roomId);
            supabase.removeChannel(channel);
        };
    }, [roomId, mySessionId, myId, myName, joinedAt]);


    // --- Host Logic ---
    // If I am the host (first in localPlayers list? OR explicitly set in GameState)
    // Actually, presence order can shift if people leave. 
    // Better: GameState has fixed player order.
    // Before Game Start: The first player in 'localPlayers' is de-facto host for "Start Game" button.
    
    const isLobbyHost = localPlayers.length > 0 && localPlayers[0].id === mySessionId;
    const isGameHost = gameState ? gameState.players[0].id === mySessionId : isLobbyHost;

    // Listen for Actions (Only if I am Host)
    useEffect(() => {
        if (!channelRef.current || !isGameHost) return;

        const ch = channelRef.current;
        // We can't dynamically add listeners easily without cleanup issues in React useEffect.
        // But supabase-js handles multiple listeners.
        
        const handleAction = (payload: any) => {
             if (!gameState) return;
             // Process Action
             const { type, playerId, cardId, color } = payload;
             
             let result;
             if (type === 'play') {
                 result = processTurn(gameState, playerId, cardId, color);
             } else if (type === 'draw') {
                 result = drawFromDeck(gameState, playerId);
             } else if (type === 'restart') {
                  const newState = createInitialState(roomId, localPlayers, localPlayers[0].id);
                  result = { newState, valid: true };
             }

             if (result && result.valid) {
                 setGameState(result.newState);
                 ch.send({ type: 'broadcast', event: 'gameState', payload: result.newState });
             }
        };

        const ref = ch.on('broadcast', { event: 'gameAction' }, ({ payload }: any) => handleAction(payload));
        
        return () => {
            ref.unsubscribe();
        };
    }, [gameState, isGameHost, roomId, localPlayers]);


    // --- Actions ---

    const handleStartGame = async () => {
        if (localPlayers.length < 2) {
            alert("Need at least 2 players!");
            return;
        }
        // Create State
        const newState = createInitialState(roomId, localPlayers, mySessionId);
        setGameState(newState);
        // Broadcast
        await channelRef.current.send({ type: 'broadcast', event: 'gameState', payload: newState });
    };

    const handlePlayCard = async (cardId: number, color?: UnoColor) => {
        if (!gameState) return;
        
        // If wildcard and no color chosen, show picker
        const card = getCardDetails(cardId);
        if (card.color === 'black' && !color) {
            setShowColorPicker(cardId);
            return;
        }

        // Send Action
        await channelRef.current.send({
            type: 'broadcast',
            event: 'gameAction',
            payload: { type: 'play', playerId: mySessionId, cardId, color }
        });
        setShowColorPicker(null);
    };

    const handleDrawCard = async () => {
         await channelRef.current.send({
            type: 'broadcast',
            event: 'gameAction',
            payload: { type: 'draw', playerId: mySessionId }
        });
    };

    const handleSendMessage = async (content: string) => {
         const msg = {
             id: Date.now().toString(),
             senderId: mySessionId,
             senderName: myName,
             content,
             timestamp: Date.now()
         };
         await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
         setChatMessages(prev => [...prev, msg]);
    };
    
    // --- Render Helpers ---
    


    // ... (existing helper function)

    if (!gameState) {
        // LOBBY VIEW
        return (
            <div className="flex bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] font-sans">
                <div className="hidden md:block">
                     <Sidebar />
                </div>
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--bg-secondary)] to-[var(--bg-primary)]">
                    
                    {/* Header */}
                    <div className="p-4 flex justify-between items-center z-10">
                         <button onClick={() => router.push('/game/uno')} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors">
                             <i className="fi fi-rr-arrow-left"></i>
                             <span>Back to Menu</span>
                         </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-8 z-10">
                        {/* Title Card */}
                        <div className="text-center animate-fade-in">
                            <h1 className="text-6xl font-bold mb-2 flex items-center justify-center gap-4">
                                <span className="text-red-500">U</span>
                                <span className="text-yellow-500">N</span>
                                <span className="text-green-500">O</span>
                            </h1>
                            <p className="text-[var(--text-secondary)] text-lg">Waiting for players...</p>
                        </div>

                        {/* Room Card */}
                        <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-md p-8 rounded-2xl border border-[var(--border-primary)] shadow-2xl w-full max-w-lg">
                            {/* Room ID Section */}
                            <div className="bg-[var(--bg-primary)] rounded-xl p-4 mb-8 border border-[var(--border-primary)] flex flex-col items-center gap-3">
                                <span className="text-[var(--text-tertiary)] text-xs uppercase font-bold tracking-wider">Room Code</span>
                                <div className="text-3xl font-mono font-bold tracking-widest text-[var(--accent-green)] select-all">
                                    {roomId}
                                </div>
                                <div className="flex gap-2 w-full mt-2">
                                     <button 
                                        onClick={() => {navigator.clipboard.writeText(roomId); alert('ID Copied!')}}
                                        className="flex-1 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                     >
                                         <i className="fi fi-rr-copy"></i> Copy ID
                                     </button>
                                     <button 
                                        onClick={() => {navigator.clipboard.writeText(window.location.href); alert('Link Copied!')}}
                                        className="flex-1 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                     >
                                         <i className="fi fi-rr-link"></i> Copy Link
                                     </button>
                                </div>
                            </div>

                            {/* Player List */}
                            <div className="space-y-3 mb-8">
                                <div className="flex justify-between items-end mb-2 px-2">
                                    <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase">Players ({localPlayers.length}/4)</h3>
                                </div>
                                
                                {localPlayers.length === 0 ? (
                                     <div className="text-center py-8 text-[var(--text-tertiary)] animate-pulse">
                                         Connecting to server...
                                     </div>
                                ) : (
                                    localPlayers.map((p, i) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)]/50 rounded-lg border border-[var(--border-primary)] transform transition-all hover:scale-[1.02]">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                                                    i === 0 ? 'bg-yellow-500' : 'bg-[var(--accent-blue)]'
                                                }`}>
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white">
                                                        {p.name} {p.id === mySessionId && <span className="text-[var(--text-tertiary)] font-normal text-xs">(You)</span>}
                                                    </span>
                                                    {i === 0 && <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Host</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                            </div>
                                        </div>
                                    ))
                                )}
                                
                                {/* Padding slots for visual balance */}
                                {[...Array(Math.max(0, 4 - localPlayers.length))].map((_, i) => (
                                     <div key={`empty-${i}`} className="p-3 bg-white/5 rounded-lg border border-white/5 border-dashed flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                                         Waiting...
                                     </div>
                                ))}
                            </div>
                            
                            {/* Action Button */}
                            {isLobbyHost ? (
                                <button 
                                    onClick={handleStartGame}
                                    disabled={localPlayers.length < 2}
                                    className="w-full py-4 bg-gradient-to-r from-[var(--accent-green)] to-green-600 hover:from-green-400 hover:to-[var(--accent-green)] text-white font-bold text-lg rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-1 active:scale-95"
                                >
                                    Start Game
                                </button>
                            ) : (
                                <div className="text-center p-4 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)]">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)] animate-bounce" style={{animationDelay: '0s'}}></span>
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)] animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                            <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)] animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--accent-yellow)]">
                                            Waiting for host to start...
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // GAME VIEW
    const myPlayerIndex = gameState.players.findIndex(p => p.id === mySessionId);
    const me = gameState.players[myPlayerIndex];
    const isMyTurn = gameState.currentTurnIndex === myPlayerIndex;
    
    // Calculate layout rotation
    // We want Me at Bottom (Order 0 visual).
    // Others rotated clockwise.
    const orderedPlayers = [];
    if (myPlayerIndex !== -1) {
        for(let i=0; i<gameState.players.length; i++) {
            orderedPlayers.push(gameState.players[(myPlayerIndex + i) % gameState.players.length]);
        }
    } else {
        // Spectator view? Just show as is
        orderedPlayers.push(...gameState.players);
    }

    const topCardId = gameState.discardPile[gameState.discardPile.length - 1];
    const topCardColor = gameState.currentColor; // Visual cue for Wild

    return (
        <div className="flex h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans">
             {/* Color Picker Modal */}
             {showColorPicker !== null && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                     <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-primary)] shadow-2xl animate-scale-in">
                         <h3 className="text-center text-xl mb-4 font-bold">Choose Color</h3>
                         <div className="grid grid-cols-2 gap-4">
                             {['red', 'blue', 'green', 'yellow'].map(c => (
                                 <button
                                    key={c}
                                    onClick={() => handlePlayCard(showColorPicker, c as UnoColor)}
                                    className={`w-24 h-24 rounded-lg bg-${c}-500 hover:brightness-110 transition-transform hover:scale-105`}
                                    style={{backgroundColor: c === 'yellow' ? '#EAB308' : c === 'red' ? '#EF4444' : c === 'blue' ? '#3B82F6' : '#22C55E'}}
                                 />
                             ))}
                         </div>
                     </div>
                 </div>
             )}
             
             {/* Win Screen */}
             {gameState.status === 'ended' && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                      <div className="text-center">
                          <h1 className="text-6xl font-bold mb-4 text-[var(--accent-yellow)]">
                              {gameState.winner === mySessionId ? 'YOU WON!' : `${gameState.players.find(p => p.id === gameState.winner)?.name} WINS!`}
                          </h1>
                          {isGameHost && (
                              <button 
                                onClick={handleStartGame} // Restart using same lobby logic effectively
                                className="px-8 py-4 bg-[var(--accent-green)] text-white font-bold rounded-xl hover:scale-105 transition-all"
                              >
                                  Play Again
                              </button>
                          )}
                      </div>
                 </div>
             )}

            <div className="hidden md:block h-full">
                <Sidebar />
            </div>
            
            <div className="flex-1 flex flex-col relative h-full max-w-full">
                {/* STANDARD HEADER */}
                <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex justify-between items-center shrink-0 z-20 shadow-md">
                    <div>
                        <div className="flex items-center gap-2">
                             <h1 className="text-xl font-bold">Uno</h1>
                             
                             <button 
                                onClick={() => {
                                    const url = `${window.location.origin}/game/uno/${roomId}`;
                                    navigator.clipboard.writeText(url);
                                    alert("Full room link copied!");
                                }} 
                                title="Copy Join Link"
                                className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-1 transition-all"
                             >
                                <span>Copy Link</span>
                                <i className="fi fi-rr-link-alt"></i>
                             </button>
        
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(roomId);
                                    alert("Room ID copied!");
                                }}
                                title="Copy Room ID"
                                className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-2 transition-all"
                             >
                                <span>ID: {roomId}</span>
                                <i className="fi fi-rr-copy"></i>
                             </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                             <span 
                                className={`flex items-center gap-1 ${isMyTurn ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--text-secondary)]'}`}
                             >
                               <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
                               {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                             </span>
                             <span className="text-[var(--border-primary)]">|</span>
                             <span className="text-[var(--text-tertiary)]">Action: {gameState.lastAction || 'Game Started'}</span>
                        </div>
                   </div>
                   
                   <div className="flex items-center gap-2">
                     <button onClick={() => router.push('/game/uno')} className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                         <i className="fi fi-rr-exit"></i>
                     </button>
                   </div>
                </div>

                {/* GAME BOARD AREA */}
                <div className="flex-1 relative bg-[var(--bg-tertiary)] flex overflow-hidden">
                    {/* Game Canvas */}
                    <div className="flex-1 relative bg-[url('/uno/table_bg.png')] bg-cover bg-center flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[#0f172a] opacity-90"></div>
                        
                        {/* CENTER: Deck & Discard */}
                        <div className="relative z-0 flex items-center gap-8 p-8 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-2xl">
                            {/* Deck */}
                            <div 
                                onClick={() => isMyTurn && handleDrawCard()}
                                className={`relative transition-transform ${isMyTurn ? 'cursor-pointer hover:scale-105 hover:brightness-110' : 'opacity-80'}`}
                            >
                                <ScalableUnoCard cardId={null} width={100} />
                                <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs border border-white">
                                    {gameState.deck.length}
                                </div>
                            </div>
                            
                            {/* Discard */}
                            <div className="relative">
                                <ScalableUnoCard cardId={topCardId} width={100} />
                                <div 
                                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg"
                                    style={{
                                        backgroundColor: 
                                            gameState.currentColor === 'red' ? '#EF4444' :
                                            gameState.currentColor === 'blue' ? '#3B82F6' :
                                            gameState.currentColor === 'green' ? '#22C55E' : '#EAB308'
                                    }}
                                    title={`Current Color: ${gameState.currentColor}`}
                                />
                            </div>
                            
                            {/* Turn Indicator */}
                            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 text-white font-bold px-4 py-1 rounded-full ${isMyTurn ? 'bg-[var(--accent-green)] animate-bounce' : 'bg-black/50'}`}>
                                 {isMyTurn ? "YOUR TURN" : `${gameState.players[gameState.currentTurnIndex]?.name}'s Turn`}
                            </div>
                            
                            {/* Direction Indicator */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono">
                                {gameState.direction === 1 ? 'Clockwise ↻' : 'Counter-Clockwise ↺'}
                            </div>
                        </div>
    
                        {/* PLAYERS */}
                        
                        {/* BOTTOM: ME */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                             <div className="pointer-events-auto max-w-[90%] overflow-visible">
                                <div className={`flex -space-x-12 hover:space-x-1 transition-all duration-300 p-4 min-h-[160px] items-end justify-center`}>
                                    {(me?.hand || []).map((cId) => {
                                        const isValid = isMyTurn && validateMove(gameState, mySessionId, cId);
                                        return (
                                            <div 
                                                key={cId} 
                                                className={`
                                                    relative transition-all duration-200 
                                                    hover:-translate-y-8 hover:z-20
                                                    ${isValid ? 'cursor-pointer' : 'cursor-not-allowed opacity-80 hover:opacity-100'}
                                                `}
                                            >
                                                <ScalableUnoCard 
                                                    cardId={cId} 
                                                    width={110} 
                                                    onClick={() => {
                                                        console.log('Clicked card:', cId, 'Turn:', isMyTurn, 'Valid:', isValid);
                                                        if (isValid) {
                                                            handlePlayCard(cId);
                                                        } else {
                                                            // Optional: Shake animation or feedback
                                                            console.warn('Invalid move attempted');
                                                        }
                                                    }}
                                                    className={`
                                                        ${isValid ? 'ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'brightness-75'}
                                                    `}
                                                />
                                                {/* Visual helper to show why it is disabled if needed */}
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>
                        </div>
    
                        {/* TOP: Opponent 2 (Across) */}
                        {orderedPlayers.length > 2 && (
                             <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                                 <div className="flex bg-black/40 px-3 py-1 rounded-lg backdrop-blur text-white items-center gap-2">
                                    <i className="fi fi-rr-user"></i>
                                    {orderedPlayers[2]?.name} ({orderedPlayers[2]?.hand.length})
                                    {gameState.currentTurnIndex === (myPlayerIndex + 2) % gameState.players.length && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>}
                                 </div>
                                 <div className="flex -space-x-8 scale-75 opacity-80">
                                     {Array.from({length: Math.min(orderedPlayers[2]?.hand.length || 0, 10)}).map((_,i) => (
                                         <ScalableUnoCard key={i} cardId={null} width={80} />
                                     ))}
                                 </div>
                             </div>
                        )}
                        
                        {/* LEFT: Opponent 1 */}
                        {orderedPlayers.length > 1 && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 -rotate-90 origin-left ml-16">
                                 <div className="flex bg-black/40 px-3 py-1 rounded-lg backdrop-blur text-white items-center gap-2">
                                    <i className="fi fi-rr-user"></i>
                                    {orderedPlayers[1]?.name} ({orderedPlayers[1]?.hand.length})
                                    {gameState.currentTurnIndex === (myPlayerIndex + 1) % gameState.players.length && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>}
                                 </div>
                                 <div className="flex -space-x-8 scale-75 opacity-80">
                                     {Array.from({length: Math.min(orderedPlayers[1]?.hand.length || 0, 10)}).map((_,i) => (
                                         <ScalableUnoCard key={i} cardId={null} width={80} />
                                     ))}
                                 </div>
                            </div>
                        )}
    
                         {/* RIGHT: Opponent 3 */}
                        {orderedPlayers.length > 3 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rotate-90 origin-right mr-16">
                                 <div className="flex bg-black/40 px-3 py-1 rounded-lg backdrop-blur text-white items-center gap-2">
                                    <i className="fi fi-rr-user"></i>
                                    {orderedPlayers[3]?.name} ({orderedPlayers[3]?.hand.length})
                                    {gameState.currentTurnIndex === (myPlayerIndex + 3) % gameState.players.length && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>}
                                 </div>
                                 <div className="flex -space-x-8 scale-75 opacity-80">
                                     {Array.from({length: Math.min(orderedPlayers[3]?.hand.length || 0, 10)}).map((_,i) => (
                                         <ScalableUnoCard key={i} cardId={null} width={80} />
                                     ))}
                                 </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Panel - Integrated on Desktop */}
                    <div className="hidden md:block w-80 border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex-shrink-0">
                         <ChatPanel 
                              messages={chatMessages}
                              onSendMessage={handleSendMessage}
                              currentUserId={mySessionId}
                              isOpenMobile={false}
                              onCloseMobile={() => {}}
                         />
                    </div>
                </div>
            </div>
            
            {/* Mobile Chat Toggle */}
            <div className="fixed bottom-4 right-4 z-50 md:hidden">
                 <button onClick={() => {}} className="bg-[var(--accent-green)] p-3 rounded-full shadow-lg text-white">
                     <i className="fi fi-rr-comment-alt"></i>
                 </button>
            </div>
        </div>
    );
}
