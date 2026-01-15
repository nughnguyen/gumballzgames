'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cell, 
  Grid, 
  SHIPS, 
  Ship, 
  createEmptyGrid, 
  canPlaceShip, 
  placeShip, 
  randomizeShips, 
} from '@/lib/games/battleship/logic';

type GamePhase = 'placement' | 'playing' | 'gameover';

export default function BattleshipGame() {
  // Game State
  const [phase, setPhase] = useState<GamePhase>('placement');
  const [myGrid, setMyGrid] = useState<Grid>(createEmptyGrid());
  const [enemyGrid, setEnemyGrid] = useState<Grid>(createEmptyGrid()); 
  const [myRadar, setMyRadar] = useState<Grid>(createEmptyGrid()); 
  
  // Placement State
  const [placedShips, setPlacedShips] = useState<string[]>([]); 
  const [selectedShip, setSelectedShip] = useState<Ship | null>(SHIPS[0]);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoveredCells, setHoveredCells] = useState<{r: number, c: number}[]>([]);

  // Turn State
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [logs, setLogs] = useState<string[]>(['Welcome to Battleship Commander. Initiate fleet deployment.']);

  // Initial Setup
  useEffect(() => {
    setMyGrid(createEmptyGrid());
    setEnemyGrid(randomizeShips());
    setMyRadar(createEmptyGrid());
    setPlacedShips([]);
    setSelectedShip(SHIPS[0]);
    setPhase('placement');
    setLogs(['Welcome Commander. Deploy your fleet to begin.']);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const checkWin = useCallback((gridToCheck: Grid) => {
    let hits = 0;
    for (const r of gridToCheck) {
      for (const c of r) {
        if (c.state === 'hit') hits++;
      }
    }
    // Total segments: 5+4+3+3+2 = 17
    return hits === 17;
  }, []);

  // --- Actions ---

  const handlePlacementClick = (row: number, col: number) => {
    if (phase !== 'placement' || !selectedShip) return;

    if (canPlaceShip(myGrid, selectedShip, row, col, orientation)) {
      const newGrid = placeShip(myGrid, selectedShip, row, col, orientation);
      setMyGrid(newGrid);
      setPlacedShips([...placedShips, selectedShip.id]);
      
      addLog(`Deployed ${selectedShip.name} at ${String.fromCharCode(65 + col)}${row + 1}`);

      const nextShip = SHIPS.find(s => !placedShips.includes(s.id) && s.id !== selectedShip.id);
      if (nextShip) {
        setSelectedShip(nextShip);
      } else {
        setSelectedShip(null);
        setHoveredCells([]);
      }
    } else {
      addLog("Cannot deploy there, Commander. Airspace invalid.");
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (phase !== 'placement' || !selectedShip) {
      if (hoveredCells.length > 0) setHoveredCells([]);
      return;
    }

    const cells: {r: number, c: number}[] = [];
    if (orientation === 'horizontal') {
      for (let i = 0; i < selectedShip.size; i++) {
        if (col + i < 10) cells.push({ r: row, c: col + i });
      }
    } else {
      for (let i = 0; i < selectedShip.size; i++) {
        if (row + i < 10) cells.push({ r: row + i, c: col });
      }
    }
    setHoveredCells(cells);
  };

  const resetPlacement = () => {
    setMyGrid(createEmptyGrid());
    setPlacedShips([]);
    setSelectedShip(SHIPS[0]);
    addLog("Fleet recalled. Redeployment initiated.");
  };

  const randomizeMyFleet = () => {
    setMyGrid(randomizeShips());
    setPlacedShips(SHIPS.map(s => s.id));
    setSelectedShip(null);
    setHoveredCells([]);
    addLog("Fleet auto-deployed in random formation.");
  };

  const startGame = () => {
    if (placedShips.length === SHIPS.length) {
      setPhase('playing');
      setIsMyTurn(true);
      addLog("BATTLE STATIONS! Hostile fleet detected on radar.");
    }
  };

  const fireAtEnemy = (row: number, col: number) => {
    if (phase !== 'playing' || !isMyTurn || myRadar[row][col].state !== 'empty') return;

    const targetCell = enemyGrid[row][col];
    const isHit = targetCell.state === 'ship'; 

    const newRadar = myRadar.map(r => r.map(c => ({ ...c })));
    newRadar[row][col].state = isHit ? 'hit' : 'miss';
    if (isHit) {
      newRadar[row][col].shipId = targetCell.shipId; 
    }
    setMyRadar(newRadar);

    if (isHit) {
      new Audio('/sfx/hit-sfx.mp3').play().catch(e => console.error("Audio play failed", e));
      addLog(`DIRECT HIT at ${String.fromCharCode(65 + col)}${row + 1}! Engage target again!`);
      if (checkWin(newRadar)) {
        setWinner('player');
        setPhase('gameover');
        addLog("MISSION ACCOMPLISHED. Enemy fleet neutralized.");
      }
      // Rule: Hit = Shoot Again. Do not switch turn.
    } else {
      addLog(`Shot missed at ${String.fromCharCode(65 + col)}${row + 1}. Switching to evasive maneuvers.`);
      setIsMyTurn(false);
    }
  };

  const botFire = useCallback(() => {
    if (phase !== 'playing' || isMyTurn) return;

    // Simple random AI
    let valid = false;
    let r = 0, c = 0;
    let attempts = 0;
    
    while (!valid && attempts < 200) {
      r = Math.floor(Math.random() * 10);
      c = Math.floor(Math.random() * 10);
      if (myGrid[r][c].state === 'ship' || myGrid[r][c].state === 'empty') {
         valid = true;
      }
      attempts++;
    }

    // If we can't find a valid move (board full?), stop
    if (!valid) return;

    const target = myGrid[r][c];
    const isHit = target.state === 'ship';

    const newGrid = myGrid.map(row => row.map(cell => ({ ...cell })));
    newGrid[r][c].state = isHit ? 'hit' : 'miss';
    setMyGrid(newGrid);

    if (isHit) {
       addLog(`WARNING: We've been hit at ${String.fromCharCode(65 + c)}${r + 1}! Enemy is firing again!`);
       if (checkWin(newGrid)) {
         setWinner('enemy');
         setPhase('gameover');
         addLog("CRITICAL FAILURE. Fleet destroyed.");
       }
       // Rule: Hit = Shoot Again. Bot keeps turn.
       // Effect will re-trigger due to grid change dependency.
    } else {
       addLog(`Enemy fired at ${String.fromCharCode(65 + c)}${r + 1} and missed.`);
       setIsMyTurn(true);
    }

    // setIsMyTurn(true); // OLD: Always switch
  }, [phase, isMyTurn, myGrid, checkWin]);

  // Bot Turn Effect
  useEffect(() => {
    if (phase === 'playing' && !isMyTurn) {
      const timer = setTimeout(() => {
        botFire();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, isMyTurn, botFire]);


  // --- Render ---
  const renderCell = (cell: Cell, isRadar: boolean) => {
    // Base styles
    // Friendly: Cyan/Blue base
    // Radar (Enemy): Red/Dark base
    let bgClass = isRadar 
      ? "bg-red-500/5 hover:bg-red-500/10" 
      : "bg-cyan-500/5 hover:bg-cyan-500/10";
    
    let borderClass = isRadar
      ? "border-red-500/20"
      : "border-cyan-500/20";
      
    let content = null;

    // Placement visual feedback
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
       // HIT
       if (isRadar) {
         // Enemy hit (We hit them) - Orange/Yellow explosion
         bgClass = "bg-orange-500/30 border-orange-500 shadow-[inset_0_0_15px_rgba(249,115,22,0.4)]";
         content = <i className="fi fi-rr-cross-circle text-orange-400 animate-pulse text-lg drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]"></i>;
       } else {
         // Friendly hit (We got hit) - Red Critical
         bgClass = "bg-red-600/30 border-red-500 shadow-[inset_0_0_15px_rgba(220,38,38,0.4)]";
         content = <i className="fi fi-rr-cross-circle text-red-500 animate-pulse text-lg drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"></i>;
       }
    } else if (cell.state === 'miss') {
       // MISS
       // Grayish splash
       bgClass = isRadar ? "bg-white/5" : "bg-white/5";
       content = <div className="w-1.5 h-1.5 rounded-full bg-white/30" />;
    }

    return (
      <div
        key={`${cell.row}-${cell.col}`}
        onClick={() => isRadar ? fireAtEnemy(cell.row, cell.col) : handlePlacementClick(cell.row, cell.col)}
        onMouseEnter={() => !isRadar && handleMouseEnter(cell.row, cell.col)}
        className={`
          w-7 h-7 sm:w-9 sm:h-9 border items-center justify-center flex cursor-pointer transition-all duration-200 relative
          ${borderClass} 
          ${bgClass}
          ${isRadar && phase === 'playing' ? 'hover:scale-105 active:scale-95 z-0 hover:z-10 hover:border-orange-400/50' : ''}
        `}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto gap-8 p-4 text-[#D6E5FF] font-mono">
      
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-end border-b border-[#D6E5FF]/10 pb-4 mb-4 gap-4 bg-[#0D111F]/50 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-[#19D153] drop-shadow-[0_0_15px_rgba(25,209,83,0.4)] flex items-center gap-3">
            <i className="fi fi-rr-ship-side"></i>
            BATTLESHIP
          </h1>
          <p className="text-sm opacity-50 tracking-wider font-mono pl-1">TACTICAL NAVAL COMBAT SIMULATION</p>
        </div>
        <div className="text-right flex flex-col items-end">
           <div className={`text-xl font-bold tracking-widest ${isMyTurn ? 'text-[#19D153] animate-pulse' : 'text-red-500'}`}>
              {phase === 'placement' ? 'DEPLOYMENT PHASE' : 
               phase === 'gameover' ? (winner === 'player' ? 'VICTORY' : 'DEFEAT') :
               isMyTurn ? 'AWAITING ORDERS' : 'INCOMING FIRE...'}
           </div>
           <div className="text-xs font-mono opacity-50 flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-500' : 'bg-red-500'}`}></span>
             SYS STATUS: {isMyTurn ? 'ACTIVE' : 'STANDBY'}
           </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col xl:flex-row gap-12 items-center xl:items-start w-full justify-center">
        
        {/* Left: My Fleet (Friendly) */}
        <div className="flex flex-col gap-4 group">
          <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-cyan-900/40 to-transparent rounded-lg border-l-4 border-cyan-500">
            <h2 className="text-lg font-bold flex items-center gap-3 text-cyan-300 tracking-wider">
              <i className="fi fi-rr-shield-check"></i>
              MY FLEET
            </h2>
            {phase === 'placement' && (
              <div className="flex gap-2">
                 <button onClick={randomizeMyFleet} className="text-[10px] px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded uppercase tracking-wider transition-all">Auto-Deploy</button>
                 <button onClick={resetPlacement} className="text-[10px] px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded uppercase tracking-wider transition-all">Clear</button>
              </div>
            )}
          </div>
          
          <div className="bg-[#0D111F]/80 p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)] relative backdrop-blur-md">
             {/* Grid Decorators */}
             <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-sm"></div>
             <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-sm"></div>
             <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-sm"></div>
             <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 rounded-br-sm"></div>

             <div className="grid grid-cols-10 border border-cyan-500/20 bg-cyan-900/10">
                {myGrid.map((row) => row.map((cell) => renderCell(cell, false)))}
             </div>
             
             {/* Coordinates */}
             <div className="absolute top-0 bottom-0 -left-6 flex flex-col justify-between py-2 text-[10px] opacity-60 font-mono text-cyan-400">
               {Array.from({length:10}, (_,i)=> <span key={i} className="flex-1 flex items-center justify-end pr-2">{i+1}</span>)}
             </div>
             <div className="absolute left-0 right-0 -bottom-6 flex justify-between px-2 text-[10px] opacity-60 font-mono text-cyan-400">
               {Array.from({length:10}, (_,i)=> <span key={i} className="flex-1 text-center pt-1">{String.fromCharCode(65+i)}</span>)}
             </div>
          </div>
        </div>

        {/* Center: Controls & Logs */}
        <div className="w-full max-w-md xl:w-80 flex flex-col gap-6 order-last xl:order-none h-full pt-10">
           
           {/* Logs */}
           <div className="bg-black/60 p-4 rounded-lg border border-[#D6E5FF]/10 h-40 xl:h-56 overflow-y-auto font-mono text-[11px] flex flex-col-reverse shadow-inner custom-scrollbar relative">
              <div className="absolute top-0 right-0 p-1 opacity-20"><i className="fi fi-rr-scroll"></i></div>
              {logs.map((log, i) => (
                <div key={i} className={`mb-1.5 py-0.5 pl-2 border-l-2 leading-tight ${log.includes('HIT') || log.includes('WARNING') || log.includes('FAILURE') ? 'text-red-400 border-red-500 bg-red-900/10' : 'text-cyan-100/70 border-cyan-500/30'}`}>
                  <span className="opacity-50 mr-1">[{new Date().toLocaleTimeString('en-US',{hour12:false, hour:'2-digit', minute:'2-digit'})}]</span>
                  {log}
                </div>
              ))}
           </div>

           {/* Controls */}
           {phase === 'placement' ? (
             <div className="bg-[#D6E5FF]/5 p-5 rounded-xl border border-[#D6E5FF]/10 space-y-4 backdrop-blur-sm">
                <div className="text-xs font-bold border-b border-[#D6E5FF]/10 pb-3 tracking-widest text-cyan-200 flex justify-between">
                   <span>FLEET REQUISITION</span>
                   <span className="opacity-50">5 UNITS</span>
                </div>
                <div className="flex flex-col gap-2">
                   {SHIPS.map(ship => (
                     <button 
                       key={ship.id}
                       onClick={() => { if(!placedShips.includes(ship.id)) setSelectedShip(ship) }}
                       className={`flex justify-between items-center p-3 rounded-lg text-xs transition-all border ${
                         placedShips.includes(ship.id) 
                           ? 'bg-green-500/10 border-green-500/20 text-green-500/50 cursor-default'
                           : selectedShip?.id === ship.id 
                             ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                             : 'bg-[#0D111F]/40 border-transparent hover:bg-[#D6E5FF]/10 text-[#D6E5FF]/70'
                       }`}
                     >
                       <span className="font-bold tracking-wider">{ship.name.toUpperCase()}</span>
                       <div className="flex gap-1">
                         {Array.from({length: ship.size}).map((_, i) => (
                           <div key={i} className={`w-2 h-2 rounded-sm ${
                             placedShips.includes(ship.id) ? 'bg-green-500/40' : 
                             selectedShip?.id === ship.id ? 'bg-cyan-400' : 'bg-[#D6E5FF]/30'
                           }`}></div>
                         ))}
                       </div>
                     </button>
                   ))}
                </div>
                
                <div className="pt-2">
                   <button 
                     onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
                     className="w-full py-2.5 bg-[#D6E5FF]/5 hover:bg-[#D6E5FF]/10 border border-[#D6E5FF]/10 rounded-lg text-xs font-semibold flex items-center justify-center gap-3 transition-colors text-cyan-200/80"
                   >
                     <i className={`fi fi-rr-refresh transition-transform duration-300 ${orientation === 'vertical' ? 'rotate-90' : ''}`}></i>
                     ROTATE AXIS: <span className="text-white">{orientation.toUpperCase()}</span>
                   </button>
                </div>
                
                <button 
                  onClick={startGame}
                  disabled={placedShips.length !== SHIPS.length}
                  className={`w-full py-3.5 rounded-lg text-sm font-bold transition-all shadow-lg tracking-[0.1em] flex items-center justify-center gap-2 ${
                     placedShips.length === SHIPS.length
                       ? 'bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)] transform hover:scale-[1.02]'
                       : 'bg-gray-800/80 text-gray-600 cursor-not-allowed border border-gray-700'
                  }`}
                >
                  <i className="fi fi-rr-play"></i>
                  INITIALIZE COMBAT
                </button>
             </div>
           ) : (
             <div className="bg-[#D6E5FF]/5 p-8 rounded-xl border border-[#D6E5FF]/10 text-center flex flex-col items-center justify-center h-full relative overflow-hidden">
               <div className={`absolute inset-0 bg-gradient-to-b ${isMyTurn ? 'from-green-500/5' : 'from-red-500/5'} to-transparent opacity-50`}></div>
               
               <div className={`mb-6 p-6 rounded-full border-2 transition-all duration-500 z-10 ${isMyTurn ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'border-red-500/50 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
                 <div className={`text-4xl transition-all duration-500 ${isMyTurn ? 'text-green-400 scale-110' : 'text-red-400 scale-100'}`}>
                   {isMyTurn ? <i className="fi fi-rr-crosshairs"></i> : <i className="fi fi-rr-shield-exclamation"></i>}
                 </div>
               </div>
               
               <div className="text-[10px] opacity-50 mb-2 tracking-[0.2em] z-10">TACTICAL STATUS</div>
               <div className={`text-2xl font-bold tracking-widest mb-6 z-10 ${isMyTurn ? 'text-[#19D153]' : 'text-red-500'}`}>
                 {isMyTurn ? 'ENGAGE TARGET' : 'EVASIVE MANEUVERS'}
               </div>
               
               {phase === 'gameover' && (
                 <button 
                   onClick={() => window.location.reload()}
                   className="w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 tracking-widest text-sm z-10 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                 >
                   SYSTEM REBOOT
                 </button>
               )}
             </div>
           )}
        </div>

        {/* Right: Radar (Enemy) */}
        <div className={`flex flex-col gap-4 group ${phase === 'placement' ? 'opacity-40 blur-[1px] pointer-events-none grayscale' : ''} transition-all duration-500`}>
          <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-l from-red-900/40 to-transparent rounded-lg border-r-4 border-red-500">
             <div className="flex-1"></div>
            <h2 className="text-lg font-bold flex items-center gap-3 text-red-400 tracking-wider">
               HOSTILE SECTOR
               <i className="fi fi-rr-skull"></i>
            </h2>
          </div>
          
          <div className="bg-[#0D111F]/90 p-4 rounded-xl border border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] relative backdrop-blur-md">
             {/* Grid Decorators */}
             <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-red-500/50 rounded-tl-sm"></div>
             <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-red-500/50 rounded-tr-sm"></div>
             <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-red-500/50 rounded-bl-sm"></div>
             <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-red-500/50 rounded-br-sm"></div>

             <div className="grid grid-cols-10 border border-red-500/20 bg-red-900/5">
                {myRadar.map((row) => row.map((cell) => renderCell(cell, true)))}
             </div>
             
             {/* Coordinates */}
             <div className="absolute top-0 bottom-0 -left-6 flex flex-col justify-between py-2 text-[10px] opacity-60 font-mono text-red-400">
               {Array.from({length:10}, (_,i)=> <span key={i} className="flex-1 flex items-center justify-end pr-2">{i+1}</span>)}
             </div>
             <div className="absolute left-0 right-0 -bottom-6 flex justify-between px-2 text-[10px] opacity-60 font-mono text-red-400">
               {Array.from({length:10}, (_,i)=> <span key={i} className="flex-1 text-center pt-1">{String.fromCharCode(65+i)}</span>)}
             </div>

             {/* Scanner line overlay for effect */}
             {phase === 'playing' && (
                <div className="absolute inset-4 overflow-hidden pointer-events-none z-0 opacity-20">
                   <div className="w-full h-[20%] bg-gradient-to-b from-red-500/20 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
