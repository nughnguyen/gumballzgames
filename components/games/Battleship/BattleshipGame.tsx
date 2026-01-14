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
  CellState 
} from '@/lib/games/battleship/logic';

const BATTLESHIP_THEME = {
  bg: '#0D111F',
  gridLine: 'rgba(214, 229, 255, 0.1)',
  water: 'rgba(214, 229, 255, 0.05)',
  ship: '#19D153',
  hit: '#F21313',
  miss: '#FFFFFF',
  text: '#ffffff',
  font: 'monospace', 
};

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
    let bgClass = "bg-[#D6E5FF]/5"; 
    let content = null;
    let borderClass = "border-[#D6E5FF]/10";

    if (!isRadar && phase === 'placement') {
      const isHovered = hoveredCells.some(h => h.r === cell.row && h.c === cell.col);
      if (isHovered) {
        if (canPlaceShip(myGrid, selectedShip!, hoveredCells[0].r, hoveredCells[0].c, orientation)) {
           bgClass = "bg-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.4)]";
        } else {
           bgClass = "bg-red-500/30";
        }
      }
    }

    if (cell.state === 'ship') {
       if (!isRadar) { 
         bgClass = "bg-[#19D153]/40 border-[#19D153]/60 shadow-[0_0_8px_rgba(25,209,83,0.3)]";
         content = <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#19D153] opacity-50" />;
       }
    } else if (cell.state === 'hit') {
       bgClass = "bg-[#F21313]/40 border-[#F21313] shadow-[0_0_15px_rgba(242,19,19,0.5)]";
       content = <div className="text-xs sm:text-base font-bold text-[#F21313] animate-pulse">✖</div>;
    } else if (cell.state === 'miss') {
       bgClass = "bg-white/10";
       content = <div className="w-1 h-1 rounded-full bg-white/50" />;
    }

    return (
      <div
        key={`${cell.row}-${cell.col}`}
        onClick={() => isRadar ? fireAtEnemy(cell.row, cell.col) : handlePlacementClick(cell.row, cell.col)}
        onMouseEnter={() => !isRadar && handleMouseEnter(cell.row, cell.col)}
        className={`w-7 h-7 sm:w-9 sm:h-9 border ${borderClass} flex items-center justify-center cursor-pointer transition-all duration-150 relative ${bgClass} ${isRadar && phase === 'playing' ? 'hover:bg-[#D6E5FF]/20' : ''}`}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto gap-8 p-4 text-[#D6E5FF] font-mono">
      
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-end border-b border-[#D6E5FF]/20 pb-4 mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-[#19D153] drop-shadow-[0_0_10px_rgba(25,209,83,0.6)]">BATTLESHIP</h1>
          <p className="text-sm opacity-70 tracking-wider">TACTICAL NAVAL COMBAT SIMULATION</p>
        </div>
        <div className="text-right flex flex-col items-end">
           <div className={`text-xl font-bold ${isMyTurn ? 'text-[#19D153] animate-pulse' : 'text-red-500'}`}>
              {phase === 'placement' ? 'DEPLOYMENT PHASE' : 
               phase === 'gameover' ? (winner === 'player' ? 'VICTORY' : 'DEFEAT') :
               isMyTurn ? 'AWAITING ORDERS' : 'INCOMING FIRE...'}
           </div>
           <div className="text-xs font-mono opacity-50">SYS AC: ONLINE</div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-start w-full justify-center">
        
        {/* Left: My Fleet */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              MY FLEET SECTOR
            </h2>
            {phase === 'placement' && (
              <div className="flex gap-2">
                 <button onClick={randomizeMyFleet} className="text-[10px] px-2 py-1 bg-[#D6E5FF]/10 hover:bg-[#D6E5FF]/20 border border-[#D6E5FF]/30 rounded uppercase tracking-wider">Auto-Deploy</button>
                 <button onClick={resetPlacement} className="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded uppercase tracking-wider">Clear</button>
              </div>
            )}
          </div>
          
          <div className="bg-[#0D111F] p-3 rounded-xl border border-[#D6E5FF]/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
             <div className="grid grid-cols-10 gap-px bg-[#D6E5FF]/5 border border-[#D6E5FF]/20 p-1">
                {myGrid.map((row) => row.map((cell) => renderCell(cell, false)))}
             </div>
             <div className="absolute top-0 bottom-0 -left-6 flex flex-col justify-between py-4 text-[10px] opacity-50 font-mono">
               {Array.from({length:10}, (_,i)=> <span key={i} className="h-7 sm:h-9 flex items-center">{i+1}</span>)}
             </div>
             <div className="absolute left-0 right-0 -bottom-6 flex justify-between px-4 text-[10px] opacity-50 font-mono">
               {Array.from({length:10}, (_,i)=> <span key={i} className="w-7 sm:w-9 text-center">{String.fromCharCode(65+i)}</span>)}
             </div>
          </div>
        </div>

        {/* Center: Controls & Logs */}
        <div className="w-full max-w-md xl:w-72 flex flex-col gap-6 order-last xl:order-none h-full">
           
           {/* Logs */}
           <div className="bg-black/40 p-3 rounded-lg border border-[#D6E5FF]/10 h-32 xl:h-48 overflow-y-auto font-mono text-[10px] sm:text-xs flex flex-col-reverse shadow-inner custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 border-l-2 pl-2 ${log.includes('HIT') || log.includes('WARNING') || log.includes('FAILURE') ? 'text-red-400 border-red-500' : 'text-[#D6E5FF]/70 border-transparent'}`}>
                  {`> ${log}`}
                </div>
              ))}
           </div>

           {/* Controls */}
           {phase === 'placement' ? (
             <div className="bg-[#D6E5FF]/5 p-4 rounded-lg border border-[#D6E5FF]/10 space-y-4">
                <div className="text-xs font-bold border-b border-[#D6E5FF]/10 pb-2 tracking-widest opacity-70">FLEET REQUISITION</div>
                <div className="flex flex-col gap-2">
                   {SHIPS.map(ship => (
                     <button 
                       key={ship.id}
                       onClick={() => { if(!placedShips.includes(ship.id)) setSelectedShip(ship) }}
                       className={`flex justify-between items-center p-2 rounded text-xs transition-all ${
                         placedShips.includes(ship.id) 
                           ? 'bg-green-500/5 text-green-500/50 cursor-default'
                           : selectedShip?.id === ship.id 
                             ? 'bg-[#D6E5FF]/20 border-l-2 border-[#19D153] text-white' 
                             : 'hover:bg-[#D6E5FF]/10 text-[#D6E5FF]/70'
                       }`}
                     >
                       <span>{ship.name.toUpperCase()}</span>
                       <div className="flex gap-px">
                         {Array.from({length: ship.size}).map((_, i) => (
                           <div key={i} className={`w-1.5 h-1.5 ${placedShips.includes(ship.id) ? 'bg-green-500/50' : 'bg-[#D6E5FF]/50'}`}></div>
                         ))}
                       </div>
                     </button>
                   ))}
                </div>
                
                <div className="pt-2 border-t border-[#D6E5FF]/10">
                   <button 
                     onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
                     className="w-full py-2 bg-[#D6E5FF]/10 hover:bg-[#D6E5FF]/20 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                   >
                     <i className="fi fi-rr-refresh"></i>
                     AXIS: {orientation.toUpperCase()}
                   </button>
                </div>
                
                <button 
                  onClick={startGame}
                  disabled={placedShips.length !== SHIPS.length}
                  className={`w-full py-3 rounded text-sm font-bold transition-all shadow-lg tracking-wider ${
                     placedShips.length === SHIPS.length
                       ? 'bg-[#19D153] hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                       : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                  }`}
                >
                  INITIALIZE COMBAT
                </button>
             </div>
           ) : (
             <div className="bg-[#D6E5FF]/5 p-6 rounded-lg border border-[#D6E5FF]/10 text-center flex flex-col items-center justify-center h-full">
               <div className={`mb-4 text-5xl transition-all duration-500 ${isMyTurn ? 'scale-110 drop-shadow-[0_0_15px_rgba(25,209,83,0.4)]' : 'scale-100 opacity-50 grayscale'}`}>
                 {isMyTurn ? '⌖' : '⚠️'}
               </div>
               <div className="text-xs opacity-50 mb-1 tracking-widest">TACTICAL STATUS</div>
               <div className={`text-2xl font-bold tracking-widest mb-6 ${isMyTurn ? 'text-[#19D153]' : 'text-red-500'}`}>
                 {isMyTurn ? 'ENGAGE' : 'EVADE'}
               </div>
               
               {phase === 'gameover' && (
                 <button 
                   onClick={() => window.location.reload()}
                   className="w-full py-3 bg-[#D6E5FF] text-black font-bold rounded hover:opacity-90 tracking-widest text-sm"
                 >
                   SYSTEM REBOOT
                 </button>
               )}
             </div>
           )}
        </div>

        {/* Right: Radar (Enemy) */}
        <div className={`flex flex-col gap-4 ${phase === 'placement' ? 'opacity-30 blur-[2px] pointer-events-none' : ''} transition-all duration-500`}>
          <div className="flex justify-between items-center px-2">
            <h2 className="text-lg font-bold flex items-center gap-2 text-red-400">
               <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
               HOSTILE SECTOR
            </h2>
          </div>
          
          <div className="bg-[#0D111F] p-3 rounded-xl border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.2)] relative">
             <div className="grid grid-cols-10 gap-px bg-red-900/5 border border-red-500/10 p-1">
                {myRadar.map((row) => row.map((cell) => renderCell(cell, true)))}
             </div>
             <div className="absolute top-0 bottom-0 -left-6 flex flex-col justify-between py-4 text-[10px] opacity-50 font-mono text-red-300">
               {Array.from({length:10}, (_,i)=> <span key={i} className="h-7 sm:h-9 flex items-center">{i+1}</span>)}
             </div>
             <div className="absolute left-0 right-0 -bottom-6 flex justify-between px-4 text-[10px] opacity-50 font-mono text-red-300">
               {Array.from({length:10}, (_,i)=> <span key={i} className="w-7 sm:w-9 text-center">{String.fromCharCode(65+i)}</span>)}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
