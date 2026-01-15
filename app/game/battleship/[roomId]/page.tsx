'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { getRoomByCode } from '@/lib/supabase/rooms';
import Sidebar from '@/components/layout/Sidebar';
import ChatPanel from '@/components/game/ChatPanel';
import { 
  Cell, Grid, SHIPS, Ship, createEmptyGrid, canPlaceShip, placeShip, randomizeShips, CellState 
} from '@/lib/games/battleship/logic';
import { updateRoomHeartbeat } from '@/lib/supabase/rooms';
import { ChatMessage } from '@/types';

type GamePhase = 'waiting' | 'placement' | 'ready' | 'playing' | 'gameover';
type PlayerRole = 'host' | 'guest' | null;

interface PresenceState {
  sessionId: string;
  user_id: string;
  nickname: string;
  joined_at: string;
  isReady?: boolean;
}

export default function BattleshipMultiplayerPage() {
  const params = useParams();
  const router = useRouter();
  const rawRoomId = params.roomId as string;
  const roomId = rawRoomId ? rawRoomId.toUpperCase() : '';

  const { user, isGuest, checkAuth, loading: authLoading } = useAuthStore();
  
  // -- Game State --
  const [phase, setPhase] = useState<GamePhase>('placement');
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
  const [logs, setLogs] = useState<string[]>(['Initializing secure connection...']);
  
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Refs
  const channelRef = useRef<any>(null);
  const myGridRef = useRef(myGrid);
  
  // Stable Identity
  const [joinTime] = useState(new Date().toISOString());
  const [sessionId] = useState(() => `sess-${Math.random().toString(36).substring(2, 9)}`);
  
  const myUserId = user?.id || `guest-${joinTime}`; 
  const myNickname = user?.guestNickname || user?.profile?.display_name || 'Commander';

  useEffect(() => {
    myGridRef.current = myGrid;
  }, [myGrid]);

  // Validate Room
  const [isValidRoom, setIsValidRoom] = useState<boolean | null>(null);

  useEffect(() => {
      async function validate() {
        if (!roomId) return;
        
        // Optimistic Validation Timeout
        const valTimeout = setTimeout(() => {
             if (isValidRoom === null) setIsValidRoom(true); 
        }, 5000);

        try {
            // Check formatted properly
            if (!roomId.startsWith('BS-')) {
                 router.replace(`/game/battleship/BS-${roomId}`);
                 return;
            }
            // Trust it for now, or check DB
            // const room = await getRoomByCode(roomId);
            // if (!room) ...
            setIsValidRoom(true);
        } catch (e) {
             console.error(e);
        } finally {
             clearTimeout(valTimeout);
        }
      }
      validate();
  }, [roomId, router]);

  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.push('/');
    }
  }, [authLoading, user, isGuest, router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };
  
  // State to track my own readiness so it persists in presence updates
  const [imReady, setImReady] = useState(false);

  useEffect(() => {
    if (authLoading || !isValidRoom || !roomId) return;

    // Heartbeat
    const hbInterval = setInterval(() => updateRoomHeartbeat(roomId), 60000);
    updateRoomHeartbeat(roomId);
    
    // Only reset if empty (prevent reset on re-renders)
    if (myGrid[0][0].state === 'empty' && placedShips.length === 0) {
        setMyGrid(createEmptyGrid());
        setMyRadar(createEmptyGrid());
    }
    
    // Cleanup existing channel if re-running
    if(channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: sessionId } }
    });
    channelRef.current = channel;

    const myPresence: PresenceState = {
      sessionId: sessionId,
      user_id: myUserId,
      nickname: myNickname,
      joined_at: joinTime,
      isReady: imReady // Use state here
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const rawUsers = Object.values(state).flat();
        
        // De-duplicate by sessionId
        const uniqueUsersMap = new Map();
        rawUsers.forEach(u => uniqueUsersMap.set(u.sessionId, u));
        const uniqueUsers = Array.from(uniqueUsersMap.values());
        
        const users = uniqueUsers.sort((a, b) => 
           new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
        
        setOnlineUsers(users as PresenceState[]);

        // Determine Role
        if (users[0]?.sessionId === sessionId) setMyRole('host');
        else if (users[1]?.sessionId === sessionId) setMyRole('guest');
        else setMyRole(null);
        
        // Check Opponent Status
        const opponent = users.find(u => u.sessionId !== sessionId);
        if (opponent) {
           setOpponentReady(!!opponent.isReady);
        } else {
           setOpponentReady(false);
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
          const joined = newPresences as unknown as PresenceState[];
          joined.forEach(u => {
              if (u.sessionId !== sessionId) addLog(`${u.nickname} connected.`);
          });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const left = leftPresences as unknown as PresenceState[];
          left.forEach(u => {
              if (u.sessionId !== sessionId) {
                  addLog(`${u.nickname} disconnected.`);
                  if (phase === 'playing') {
                       setPhase('gameover');
                       setWinner('me');
           setImReady(false);
                       setImReady(false);
                       addLog("Opponent lost connection. You win!");
                       setIsMyTurn(false);
                  } else if (phase === 'ready') {
                       setOpponentReady(false);
                       addLog("Opponent disconnected.");
                  }
              }
          });
      })
      // ... fire events ...
      .on('broadcast', { event: 'fire' }, ({ payload }) => handleIncomingFire(payload.x, payload.y))
      .on('broadcast', { event: 'fire_result' }, ({ payload }) => handleFireResult(payload))
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
          setChatMessages(p => [...p, payload]);
          if (payload.senderId !== (user?.id || 'guest')) { // Simple check, might need better logic if guest IDs overlap
             // Play sound if not my message
             new Audio('/sfx/new-message.webm').play().catch(e => console.error("Audio play failed", e));
          }
      })
      .on('broadcast', { event: 'restart' }, () => resetGame())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myPresence);
          addLog("Secure channel established.");
        }
      });

    return () => {
      clearInterval(hbInterval);
      supabase.removeChannel(channel);
    };
  }, [roomId, isValidRoom, user, isGuest, authLoading, joinTime, myUserId, myNickname, sessionId]); // removed imReady dependency

  // Separate effect to track readiness without reconnecting
  useEffect(() => {
    if (channelRef.current) {
        channelRef.current.track({
            sessionId: sessionId,
            user_id: myUserId,
            nickname: myNickname,
            joined_at: joinTime,
            isReady: imReady
        }).catch((err: any) => console.error("Failed to track presence:", err));
    }
  }, [imReady, sessionId, myUserId, myNickname, joinTime]);

  // Place Ships...

  // Lock In
  const lockInFleet = async () => {
     if (placedShips.length !== SHIPS.length) return;
     
     setPhase('ready');
     setImReady(true);
     addLog("Fleet locked. Uplinking status...");
  }; 

  const resetGame = () => {
    setPhase('placement');
    setMyGrid(createEmptyGrid());
    setMyRadar(createEmptyGrid());
    setPlacedShips([]);
    setSelectedShip(SHIPS[0]);
    setOrientation('horizontal');
    setHoveredCells([]);
    setImReady(false);
    setWinner(null);
    setLogs(['System reset. Awaiting fleet deployment.']);
    setIsMyTurn(false);
    setOpponentReady(false); // Reset opponent ready view until they sync
  }; 

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

  // Lock Fleet handled by presence effect via imReady state
  // But we need a local trigger to setImReady
  
  // Placement helpers
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

  useEffect(() => {
     // Start game when both are ready.
     // Relaxing the "onlineUsers.length >= 2" constraint slightly because presence sync might flicker.
     // If imReady (phase === ready) AND opponentReady, we should go.
     if (phase === 'ready' && opponentReady) {
         setPhase('playing');
         setIsMyTurn(myRole === 'host');
         addLog(myRole === 'host' ? "ALL STATIONS REPORT READY. YOUR TURN." : "ENEMY FLEET DETECTED. STANDBY FOR FIRE.");
     }
  }, [phase, opponentReady, myRole]);

  const fireAtEnemy = async (row: number, col: number) => {
    if (phase !== 'playing' || !isMyTurn || myRadar[row][col].state !== 'empty') return;
    
    // Optimistic update
    const newRadar = myRadar.map(r => r.map(c => ({...c})));
    newRadar[row][col].state = 'miss'; // Temporary until confirmed
    setMyRadar(newRadar);

    setIsMyTurn(false);
    await channelRef.current.send({
        type: 'broadcast',
        event: 'fire',
        payload: { x: col, y: row }
    });
    addLog(`Firing salvo at ${String.fromCharCode(65+col)}${row+1}...`);
  };

  const handleIncomingFire = async (x: number, y: number) => {
     const row = y;
     const col = x;
     const currentGrid = myGridRef.current;
     
     const targetCell = currentGrid[row][col];
     const isHit = targetCell.state === 'ship' || targetCell.state === 'hit';
     
     const newGrid = currentGrid.map(r => r.map(c => ({...c})));
     // If it was empty or ship, it becomes miss or hit. If already handled, stay same.
     if (targetCell.state === 'empty') newGrid[row][col].state = 'miss';
     if (targetCell.state === 'ship') newGrid[row][col].state = 'hit';
     
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
          setImReady(false);
          addLog("HULL BREACH CRITICAL. ABANDON SHIP!");
     } else {
        if (!isHit) {
            setIsMyTurn(true);
            addLog(`Enemy shells missed at ${String.fromCharCode(65+col)}${row+1}. Returning fire!`);
        } else {
            addLog(`WARNING: IMPACT AT ${String.fromCharCode(65+col)}${row+1}!`);
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
      
      setMyRadar(prev => {
          const n = prev.map(r => r.map(c => ({...c})));
          n[y][x].state = isHit ? 'hit' : 'miss';
          return n;
      });

      if (gameOver) {
          setPhase('gameover');
          setWinner('me');
          setImReady(false);
          addLog("TARGET DESTROYED. VICTORY CONFIRMED.");
          setIsMyTurn(false);
      } else {
          if (isHit) {
             new Audio('/sfx/hit-sfx.webm').play().catch(e => console.error("Audio play failed", e));
             addLog(`DIRECT HIT at ${String.fromCharCode(65+x)}${y+1}! Main batteries reloading...`);
             setIsMyTurn(true); // Hit = Shoot again rule
          } else {
             addLog(`Splash at ${String.fromCharCode(65+x)}${y+1}. No effect.`);
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

  const handleExit = () => router.push('/games/battleship');

  // --- RENDER ---
  if (!isValidRoom && !authLoading && roomId) {
      return (
          <div className="flex min-h-screen bg-[#0D111F] items-center justify-center text-cyan-500">
              <div className="animate-pulse flex flex-col items-center gap-4">
                  <i className="fi fi-rr-lock text-4xl"></i>
                  <span>VALIDATING SECURITY CLEARANCE...</span>
              </div>
          </div>
      );
  }

  const renderCell = (cell: Cell, isRadar: boolean) => {
     // Base styles
     let bgClass = isRadar 
       ? "bg-red-950/20 hover:bg-red-500/20" 
       : "bg-cyan-950/20 hover:bg-cyan-500/20";
     
     let borderClass = isRadar
       ? "border-red-500/30"
       : "border-cyan-500/30";
       
     let content = null;

     // Placement Visuals
     if (!isRadar && phase === 'placement' && selectedShip) {
       const isHovered = hoveredCells.some(h => h.r === cell.row && h.c === cell.col);
       if (isHovered) {
         if (canPlaceShip(myGrid, selectedShip, hoveredCells[0].r, hoveredCells[0].c, orientation)) {
            bgClass = "bg-green-500/40 shadow-[inset_0_0_10px_rgba(34,197,94,0.6)] border-green-400";
         } else {
            bgClass = "bg-red-500/40 shadow-[inset_0_0_10px_rgba(239,68,68,0.6)] border-red-400";
         }
       }
     } 

     // Cell States
     if (cell.state === 'ship') {
        if (!isRadar) { 
           // Friendly Ship
           bgClass = "bg-cyan-500/30 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]";
           content = <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-sm bg-cyan-300 shadow-[0_0_5px_rgba(6,182,212,0.8)]" />;
        }
     } else if (cell.state === 'hit') {
        if (isRadar) {
          bgClass = "bg-orange-500/30 border-orange-500 shadow-[inset_0_0_15px_rgba(249,115,22,0.4)]";
          content = <i className="fi fi-rr-cross-circle text-orange-400 animate-pulse text-lg drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]"></i>;
        } else {
          bgClass = "bg-red-600/30 border-red-500 shadow-[inset_0_0_15px_rgba(220,38,38,0.4)]";
          content = <i className="fi fi-rr-cross-circle text-red-500 animate-pulse text-lg drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"></i>;
        }
     } else if (cell.state === 'miss') {
        bgClass = "bg-white/5";
        content = <div className="w-1.5 h-1.5 rounded-full bg-white/30" />;
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
         className={`
           aspect-square border flex items-center justify-center cursor-pointer transition-all duration-200 relative
           ${borderClass} 
           ${bgClass}
           ${isRadar && phase === 'playing' ? 'hover:scale-[1.02] active:scale-95 z-0 hover:z-10 hover:border-orange-400/50' : ''}
         `}
       >
         {content}
       </div>
     );
  };

  const opponent = onlineUsers.find(u => u.sessionId !== sessionId);

  return (
    <div className="flex h-screen w-screen bg-[#0D111F] overflow-hidden font-mono text-cyan-50">
      <div className="hidden md:block">
        <SidebarBaseOverride /> 
      </div>

      <div className="flex-1 flex flex-col relative max-w-full">
         
         {/* Top Bar */}
         <div className="p-4 bg-[#0D111F]/90 border-b border-cyan-500/20 flex justify-between items-center shrink-0 z-20 backdrop-blur-md">
           <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                 <h1 className="text-xl font-bold flex items-center gap-2 text-cyan-400 tracking-widest drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                   <i className="fi fi-rr-ship-side"></i>
                   BATTLESHIP OPS
                 </h1>
                 <span className="bg-cyan-900/40 text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-500/30 font-mono tracking-widest">
                    SESSION: {sessionId.substring(5).toUpperCase()}
                 </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-mono opacity-80">
                 <span className={`flex items-center gap-2 ${phase === 'playing' ? (isMyTurn ? 'text-green-400' : 'text-red-400') : 'text-cyan-200/50'}`}>
                    <span className={`w-2 h-2 rounded-full ${phase === 'playing' ? 'animate-pulse' : ''} ${isMyTurn ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    STATUS: {onlineUsers.length < 2 
                       ? "SCANNING..." 
                       : (phase === 'playing' ? (isMyTurn ? 'ORDERS REQUIRED' : 'INCOMING FIRE') : 'PRE-COMBAT')}
                 </span>
                 <span className="text-cyan-700">|</span>
                 <span className="text-cyan-300">TARGET: {opponent ? opponent.nickname : 'SEARCHING...'}</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="flex items-center bg-cyan-900/20 rounded-lg p-1 border border-cyan-500/20">
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        addLog("ID copied to clipboard.");
                    }}
                    className="px-3 py-1.5 hover:bg-cyan-500/10 rounded text-xs font-mono text-cyan-400 flex items-center gap-2 transition-all"
                >
                    <span>ID: {roomId}</span>
                    <i className="fi fi-rr-copy"></i>
                </button>
             </div>
             
             <button onClick={handleExit} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
                 <i className="fi fi-rr-power"></i>
             </button>
           </div>
         </div>

         {/* Game Area */}
         <div className="flex-1 overflow-auto p-4 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a233a] to-[#0D111F]">
             
             {/* Left: My Fleet (Cyan) */}
             <div className="flex-1 w-full max-w-xl flex flex-col gap-2 flex-grow">
                 <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-cyan-900/40 to-transparent rounded-lg border-l-4 border-cyan-500">
                    <h2 className="text-lg font-bold flex items-center gap-3 text-cyan-300 tracking-wider">
                      <i className="fi fi-rr-shield-check"></i>
                      MY FLEET
                    </h2>
                    {phase === 'placement' && (
                        <div className="flex gap-2">
                             <button onClick={randomizeMyFleet} className="text-[10px] px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded uppercase tracking-wider transition-all">Auto</button>
                             <button onClick={resetPlacement} className="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded uppercase tracking-wider transition-all">Clr</button>
                        </div>
                    )}
                 </div>
                 
                 <div className="bg-[#0D111F]/80 p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)] relative backdrop-blur-md w-full">
                     <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-sm"></div>
                     <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-sm"></div>
                     <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-sm"></div>
                     <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-sm"></div>

                     <div className="grid grid-cols-10 border-2 border-cyan-500/50 bg-cyan-950/30 aspect-square shadow-inner w-full">
                        {myGrid.map(row => row.map(cell => renderCell(cell, false)))}
                     </div>
                 </div>
             </div>

             {/* Center Controls - Compact */}
             <div className="w-full lg:w-48 xl:w-64 flex flex-col gap-4 shrink-0">
                 {/* Logs */}
                 <div className="h-32 bg-black/60 border border-cyan-500/20 rounded-lg p-2 text-[10px] overflow-y-auto flex flex-col-reverse custom-scrollbar font-mono shadow-inner relative">
                    {logs.map((L, i) => (
                        <div key={i} className={`mb-1 py-0.5 border-l-2 pl-2 leading-tight ${L.includes('HIT') || L.includes('BREACH') ? 'text-red-400 border-red-500 bg-red-900/10' : 'text-cyan-100/70 border-cyan-500/30'}`}>
                           {L}
                        </div>
                    ))}
                 </div>

                 {phase === 'placement' && (
                     <div className="bg-cyan-900/10 p-3 rounded-xl border border-cyan-500/20 flex flex-col gap-2 backdrop-blur-sm">
                         <div className="text-[10px] text-cyan-300 font-bold tracking-widest border-b border-cyan-500/20 pb-1">DEPLOYMENT</div>
                         <button onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')} className="bg-cyan-500/10 text-[10px] py-2 rounded font-semibold hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/20 flex items-center justify-center gap-2">
                            <i className={`fi fi-rr-refresh transition-transform ${orientation === 'vertical' ? 'rotate-90' : ''}`}></i>
                            {orientation.toUpperCase()}
                         </button>
                         <button 
                            onClick={lockInFleet}
                            disabled={placedShips.length !== SHIPS.length}
                            className={`py-2 font-bold text-[10px] rounded transition-all tracking-wider shadow-lg ${
                                placedShips.length === SHIPS.length 
                                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/30' 
                                    : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                            }`}
                         >
                            CONFIRM
                         </button>
                     </div>
                 )}

                 {phase === 'waiting' && (
                     <div className="p-4 text-center bg-cyan-900/10 border border-cyan-500/20 rounded-xl">
                         <i className="fi fi-rr-satellite-dish animate-pulse text-2xl text-cyan-400 mb-2 inline-block"></i>
                         <p className="text-[10px] text-cyan-200 tracking-wider">SEARCHING FOR TARGET...</p>
                     </div>
                 )}

                 {phase === 'ready' && !opponentReady && (
                     <div className="p-4 text-center bg-green-900/10 border border-green-500/20 rounded-xl">
                         <div className="text-green-400 text-2xl mb-1"><i className="fi fi-rr-check-circle"></i></div>
                         <p className="text-[10px] font-bold text-green-400 tracking-widest">READY</p>
                         <p className="text-[9px] text-cyan-200/50 mt-1 uppercase">Waiting for enemy...</p>
                     </div>
                 )}

                 {phase === 'gameover' && (
                     <div className={`p-4 text-center rounded-xl border ${winner === 'me' ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                         <div className={`text-3xl mb-2 ${winner === 'me' ? 'text-green-400' : 'text-red-500'}`}>
                             {winner === 'me' ? <i className="fi fi-rr-trophy"></i> : <i className="fi fi-rr-skull-crossbones"></i>}
                         </div>
                         <p className={`text-sm font-bold tracking-widest ${winner === 'me' ? 'text-green-300' : 'text-red-400'}`}>
                             {winner === 'me' ? 'VICTORY' : 'DEFEATED'}
                         </p>
                         <button onClick={resetGame} className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] uppercase tracking-wider">Re-Initialize</button>
                     </div>
                 )}
             </div>

             {/* Right: Radar (Red) */}
             <div className={`flex-1 w-full max-w-xl flex flex-col gap-2 ${phase !== 'playing' && phase !== 'gameover' ? 'opacity-40 grayscale blur-[1px]' : ''} transition-all duration-500`}>
                 <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-l from-red-900/40 to-transparent rounded-lg border-r-4 border-red-500">
                    <div className="flex-1"></div>
                    <h2 className="text-lg font-bold flex items-center gap-3 text-red-400 tracking-wider">
                       HOSTILE SECTOR
                       <i className="fi fi-rr-location-crosshairs"></i>
                    </h2>
                 </div>
                 
                 <div className="bg-[#0D111F]/90 p-4 rounded-xl border border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] relative backdrop-blur-md w-full">
                     <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-500/50 rounded-tl-sm"></div>
                     <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-500/50 rounded-tr-sm"></div>
                     <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-red-500/50 rounded-bl-sm"></div>
                     <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-500/50 rounded-br-sm"></div>

                     <div className={`grid grid-cols-10 border-2 border-red-500/50 bg-red-950/30 aspect-square shadow-inner w-full ${isMyTurn ? 'cursor-crosshair' : 'cursor-not-allowed'}`}>
                        {myRadar.map(row => row.map(cell => renderCell(cell, true)))}
                     </div>

                     {phase === 'playing' && (
                        <div className="absolute inset-4 overflow-hidden pointer-events-none z-0 opacity-10">
                           <div className="w-full h-[20%] bg-gradient-to-b from-red-500/20 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
                        </div>
                     )}
                 </div>
             </div>

         </div>

         {/* Mobile Footer */}
         <div className="md:hidden p-4 bg-[#0D111F]/90 border-t border-cyan-500/20 flex justify-end items-center shrink-0">
             <button onClick={() => setIsChatOpen(true)} className="ml-auto relative w-10 h-10 bg-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <i className="fi fi-rr-comment-alt"></i>
                {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#0D111F]"></span>}
             </button>
         </div>
      </div>
      
      {/* Chat Panel - Pass custom styles/theme logic if needed */}
      <ChatPanel 
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentUserId={user?.id || 'guest'}
        isOpenMobile={isChatOpen}
        onCloseMobile={() => setIsChatOpen(false)}
        className="border-l border-cyan-500/20 bg-[#0D111F]/95 backdrop-blur text-cyan-100"
      />
    </div>
  );
}

const SidebarBaseOverride = () => {
    return <Sidebar />;
};
