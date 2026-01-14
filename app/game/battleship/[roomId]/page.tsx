'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import Sidebar from '@/components/layout/Sidebar';
import ChatPanel from '@/components/game/ChatPanel';
import { 
  Cell, Grid, SHIPS, Ship, createEmptyGrid, canPlaceShip, placeShip, randomizeShips, CellState 
} from '@/lib/games/battleship/logic';
import { ChatMessage } from '@/types';

type GamePhase = 'waiting' | 'placement' | 'ready' | 'playing' | 'gameover';
type PlayerRole = 'host' | 'guest' | null;

interface PresenceState {
  user_id: string;
  nickname: string;
  joined_at: string;
  isReady?: boolean;
}

export default function BattleshipMultiplayerPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, isGuest, checkAuth, loading: authLoading } = useAuthStore();
  
  // -- Game State --
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [myGrid, setMyGrid] = useState<Grid>(createEmptyGrid());
  const [myRadar, setMyRadar] = useState<Grid>(createEmptyGrid());
  
  // Placement
  const [placedShips, setPlacedShips] = useState<string[]>([]);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(SHIPS[0]);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoveredCells, setHoveredCells] = useState<{r: number, c: number}[]>([]);
  
  // Multiplayer State
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const [myRole, setMyRole] = useState<PlayerRole>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [logs, setLogs] = useState<string[]>(['Connecting to satellite uplink...']);
  
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Refs
  const channelRef = useRef<any>(null);
  const myGridRef = useRef(myGrid);
  const myRoleRef = useRef(myRole);

  useEffect(() => {
    myGridRef.current = myGrid;
    myRoleRef.current = myRole;
  }, [myGrid, myRole]);

  // Auth Init
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };
  
  const myNickname = user?.guestNickname || user?.profile?.display_name || 'Commander';

  // --- SUPABASE CONNECTION ---
  useEffect(() => {
    if (authLoading) return;
    if ((!user && !isGuest) || !roomId) return;

    const myPresenceId = user?.id || `guest-${Date.now()}`;
    setMyGrid(createEmptyGrid());
    setMyRadar(createEmptyGrid());
    
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myPresenceId } }
    });
    channelRef.current = channel;

    const myPresence: PresenceState = {
      user_id: myPresenceId,
      nickname: myNickname,
      joined_at: new Date().toISOString(),
      isReady: false
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = Object.values(state).flat().sort((a, b) => 
           new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        setOnlineUsers(users);

        if (users[0]?.user_id === myPresenceId) {
            setMyRole('host');
        } else if (users[1]?.user_id === myPresenceId) {
            setMyRole('guest');
        } else {
            setMyRole(null);
        }
        
        const opponent = users.find(u => u.user_id !== myPresenceId);
        if (opponent) {
           setOpponentReady(!!opponent.isReady);
        }
        
        setPhase(prev => {
           if (prev === 'waiting' && users.length >= 2) return 'placement';
           if (prev === 'placement' && users.length < 2) return 'waiting'; 
           return prev;
        });
      })
      .on('broadcast', { event: 'fire' }, ({ payload }) => {
         handleIncomingFire(payload.x, payload.y);
      })
      .on('broadcast', { event: 'fire_result' }, ({ payload }) => {
         handleFireResult(payload);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
         setChatMessages(p => [...p, payload]);
      })
      .on('broadcast', { event: 'restart' }, () => {
         window.location.reload();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPresence);
          addLog("Comms established. Waiting for opponent.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user, isGuest, authLoading]);

  // --- GAME ACTIONS ---

  const handlePlacementClick = (row: number, col: number) => {
    if (phase !== 'placement' || !selectedShip) return;

    if (canPlaceShip(myGrid, selectedShip, row, col, orientation)) {
      const newGrid = placeShip(myGrid, selectedShip, row, col, orientation);
      setMyGrid(newGrid);
      setPlacedShips([...placedShips, selectedShip.id]);
      
      const nextShip = SHIPS.find(s => !placedShips.includes(s.id) && s.id !== selectedShip.id);
      setSelectedShip(nextShip || null);
    }
  };

  const resetPlacement = () => {
    setMyGrid(createEmptyGrid());
    setPlacedShips([]);
    setSelectedShip(SHIPS[0]);
  };
  
  const randomizeMyFleet = () => {
      setMyGrid(randomizeShips());
      setPlacedShips(SHIPS.map(s => s.id));
      setSelectedShip(null);
  };

  const lockInFleet = async () => {
     if (placedShips.length !== SHIPS.length) return;
     
     setPhase('ready');
     addLog("Fleet locked. Waiting for opponent...");
     
     const myPresenceId = user?.id || onlineUsers.find(u => u.nickname === myNickname)?.user_id;
     if (myPresenceId) {
          const me = onlineUsers.find(u => u.user_id === myPresenceId);
          if (me) {
              await channelRef.current.track({ ...me, isReady: true });
          }
     }
  };

  useEffect(() => {
     if (phase === 'ready' && opponentReady) {
         setPhase('playing');
         setIsMyTurn(myRole === 'host');
         addLog(myRole === 'host' ? "Battle Started! Your Turn." : "Battle Started! Enemy Turn.");
     }
  }, [phase, opponentReady, myRole]);

  const fireAtEnemy = async (row: number, col: number) => {
    if (phase !== 'playing' || !isMyTurn || myRadar[row][col].state !== 'empty') return;
    
    setIsMyTurn(false);
    await channelRef.current.send({
        type: 'broadcast',
        event: 'fire',
        payload: { x: col, y: row }
    });
    addLog(`Firing at ${String.fromCharCode(65+col)}${row+1}...`);
  };

  const handleIncomingFire = async (x: number, y: number) => {
     const row = y;
     const col = x;
     const currentGrid = myGridRef.current;
     
     const targetCell = currentGrid[row][col];
     const isHit = targetCell.state === 'ship' || targetCell.state === 'hit';
     
     const newGrid = currentGrid.map(r => r.map(c => ({...c})));
     newGrid[row][col].state = isHit ? 'hit' : 'miss';
     if (targetCell.state === 'empty') newGrid[row][col].state = 'miss';
     
     setMyGrid(newGrid);

     const amIDead = checkLoss(newGrid);
     
     await channelRef.current.send({
        type: 'broadcast',
        event: 'fire_result',
        payload: { x, y, result: isHit ? 'hit' : 'miss', gameOver: amIDead }
     });

     if (amIDead) {
          setPhase('gameover');
          setWinner('opponent');
          addLog("You have been defeated!");
     } else {
        if (!isHit) {
            setIsMyTurn(true);
            addLog(`Enemy missed at ${String.fromCharCode(65+col)}${row+1}. Your turn!`);
        } else {
            addLog(`HIT DETECTED at ${String.fromCharCode(65+col)}${row+1}! Brace!`);
        }
     }
  };

  const checkLoss = (grid: Grid) => {
     let remainingShips = 0;
     grid.forEach(r => r.forEach(c => {
         if (c.state === 'ship') remainingShips++;
     }));
     return remainingShips === 0;
  };

  const handleFireResult = (payload: any) => {
      const { x, y, result, gameOver } = payload;
      const isHit = result === 'hit';
      
      const newRadar = setMyRadar(prev => {
          const n = prev.map(r => r.map(c => ({...c})));
          n[y][x].state = isHit ? 'hit' : 'miss';
          return n;
      });

      if (gameOver) {
          setPhase('gameover');
          setWinner('me');
          addLog("VICTORY! Enemy fleet eliminated.");
          setIsMyTurn(false);
      } else {
          if (isHit) {
             addLog(`You HIT at ${String.fromCharCode(65+x)}${y+1}! Shoot again!`);
             setIsMyTurn(true);
          } else {
             addLog(`You missed at ${String.fromCharCode(65+x)}${y+1}.`);
             setIsMyTurn(false);
          }
      }
  };

  const handleSendMessage = async (content: string) => {
     if (!user && !isGuest) return;
     const newMessage: ChatMessage = {
         id: Date.now().toString(),
         senderId: user?.id || 'guest',
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

  const handleExit = () => {
     router.push('/games/battleship');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    addLog("Code copied!");
  };

  // --- RENDER ---
  
  const renderCell = (cell: Cell, isRadar: boolean) => {
    let bgClass = "bg-[var(--bg-tertiary)]"; 
    let content = null;
    let borderClass = "border-[var(--border-primary)]";

    // Placement Hover
    if (!isRadar && phase === 'placement' && selectedShip) {
       const isHovered = hoveredCells.some(h => h.r === cell.row && h.c === cell.col);
       if (isHovered) {
           const isValid = canPlaceShip(myGrid, selectedShip, hoveredCells[0].r, hoveredCells[0].c, orientation);
           bgClass = isValid ? "bg-green-500/50" : "bg-red-500/50";
       }
    } 
    // Radar Hover
    else if (isRadar && phase === 'playing' && isMyTurn) {
       bgClass = "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]";
    }

    if (cell.state === 'ship' && !isRadar) {
         bgClass = "bg-[#19D153]/60 border-[#19D153]"; // Keeping green for consistency with other assets, or could use board-dark
    } else if (cell.state === 'hit') {
         bgClass = "bg-red-500/60 border-red-500";
         content = <span className="text-white font-bold text-xs">X</span>;
    } else if (cell.state === 'miss') {
         content = <div className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />;
    }

    return (
      <div
        key={`${cell.row}-${cell.col}`}
        onClick={() => isRadar ? fireAtEnemy(cell.row, cell.col) : handlePlacementClick(cell.row, cell.col)}
        onMouseEnter={() => {
            if (!isRadar && phase === 'placement' && selectedShip) {
                const cells: {r: number, c: number}[] = [];
                if (orientation === 'horizontal') {
                    for (let i = 0; i < selectedShip.size; i++) if (cell.col+i < 10) cells.push({r: cell.row, c: cell.col+i});
                } else {
                    for (let i = 0; i < selectedShip.size; i++) if (cell.row+i < 10) cells.push({r: cell.row+i, c: cell.col});
                }
                setHoveredCells(cells);
            }
        }}
        className={`w-6 h-6 sm:w-8 sm:h-8 border ${borderClass} flex items-center justify-center cursor-pointer relative ${bgClass} transition-colors`}
      >
        {content}
      </div>
    );
  };

  const opponent = onlineUsers.find(u => u.user_id !== (user?.id || 'guest'));
  const opponentName = opponent ? opponent.nickname : 'Waiting...';

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-primary)] overflow-hidden font-sans text-[var(--text-primary)]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative max-w-full">
         <div className="flex-1 flex flex-col h-full relative overflow-hidden">
             
             {/* Header */}
             <div className="p-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex justify-between items-center shrink-0 z-10">
               <div>
                  <div className="flex items-center gap-2">
                     <h1 className="text-xl font-bold">Battleship</h1>
                     
                     {/* Copy Link Button */}
                     <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            addLog("Room link copied!");
                        }} 
                        title="Copy Room Link"
                        className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-1 transition-all"
                     >
                        <i className="fi fi-rr-link-alt"></i>
                     </button>

                     {/* Copy ID Button */}
                     <button 
                        onClick={handleCopyCode} 
                        title="Copy Room ID"
                        className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono hover:text-[var(--accent-green)] hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center gap-2 transition-all"
                     >
                        <span>ID: {roomId}</span>
                        <i className="fi fi-rr-copy"></i>
                     </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className={`flex items-center gap-1 ${isMyTurn ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                      {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                    </span>
                    <span className="text-[var(--border-primary)]">|</span>
                    <span className="text-[var(--text-tertiary)]">Vs: {opponentName}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 <button onClick={handleExit} className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                     <i className="fi fi-rr-exit"></i>
                 </button>
               </div>
             </div>

             {/* Game Area */}
             <div className="flex-1 overflow-auto p-4 flex flex-col xl:flex-row items-center justify-center gap-8 bg-[var(--bg-tertiary)]">
                 
                 {/* Left: My Fleet */}
                 <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)]">
                        <span>MY FLEET</span>
                        {phase === 'placement' && (
                             <div className="flex gap-2">
                                 <button onClick={randomizeMyFleet} className="hover:text-[var(--accent-green)]">AUTO</button>
                                 <button onClick={resetPlacement} className="hover:text-[var(--game-lose)]">RESET</button>
                             </div>
                        )}
                     </div>
                     <div className="bg-[var(--bg-secondary)] p-2 rounded-xl shadow-lg border border-[var(--border-primary)]">
                         <div className="grid grid-cols-10 gap-0">
                            {myGrid.map(row => row.map(cell => renderCell(cell, false)))}
                         </div>
                     </div>
                 </div>

                 {/* Center Controls */}
                 <div className="w-full max-w-[200px] flex flex-col gap-4">
                     {/* Logs */}
                     <div className="h-32 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[10px] overflow-y-auto flex flex-col-reverse custom-scrollbar">
                        {logs.map((L, i) => <div key={i} className="mb-1 text-[var(--text-secondary)]">{`> ${L}`}</div>)}
                     </div>

                     {phase === 'placement' && (
                         <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-primary)] flex flex-col gap-2">
                             <button onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-[var(--bg-tertiary)] text-xs py-2 rounded font-semibold hover:bg-[var(--border-primary)]">
                                Rotate: {orientation.toUpperCase()}
                             </button>
                             <button 
                                onClick={lockInFleet}
                                disabled={placedShips.length !== SHIPS.length}
                                className={`py-2 font-bold text-xs rounded transition-all ${placedShips.length === SHIPS.length ? 'bg-[var(--accent-green)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}
                             >
                                READY
                             </button>
                         </div>
                     )}

                     {phase === 'waiting' && (
                         <div className="p-4 text-center">
                             <i className="fi fi-rr-spinner animate-spin text-2xl text-[var(--accent-green)] mb-2 inline-block"></i>
                             <p className="text-xs text-[var(--text-secondary)]">Waiting for P2...</p>
                         </div>
                     )}

                     {phase === 'ready' && !opponentReady && (
                         <div className="p-4 text-center bg-[var(--bg-secondary)] rounded-lg">
                             <p className="text-xs font-bold text-[var(--accent-green)]">YOU ARE READY</p>
                             <p className="text-[10px] text-[var(--text-secondary)] mt-1">Waiting for opponent...</p>
                         </div>
                     )}
                 </div>

                 {/* Right: Radar */}
                 <div className="flex flex-col gap-2">
                     <div className="text-xs font-bold text-[var(--text-secondary)] flex justify-between">
                        <span>TARGET GRID</span>
                        {isMyTurn && <span className="text-[var(--accent-green)] animate-pulse">FIRE WHEN READY</span>}
                     </div>
                     <div className={`bg-[var(--bg-secondary)] p-2 rounded-xl shadow-lg border border-[var(--border-primary)] ${phase !== 'playing' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                         <div className="grid grid-cols-10 gap-0">
                            {myRadar.map(row => row.map(cell => renderCell(cell, true)))}
                         </div>
                     </div>
                 </div>

             </div>

             {/* Mobile Footer */}
             <div className="md:hidden p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-end items-center shrink-0">
                 <button onClick={() => setIsChatOpen(true)} className="ml-auto relative w-10 h-10 bg-[var(--accent-green)] text-white rounded-full flex items-center justify-center shadow-lg">
                    <i className="fi fi-rr-comment-alt"></i>
                 </button>
             </div>
         </div>
         
         {/* Chat Panel */}
         <ChatPanel 
           messages={chatMessages}
           onSendMessage={handleSendMessage}
           currentUserId={user?.id || 'guest'}
           isOpenMobile={isChatOpen}
           onCloseMobile={() => setIsChatOpen(false)}
           className="border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]"
         />
      </div>
    </div>
  );
}
