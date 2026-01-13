'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CaroMove } from '@/types';
import { checkWin, isValidMove, getCurrentPlayer, movesToBoard } from '@/lib/games/caro/gameLogic';

const CELL_SIZE = 30; // pixels
const BOARD_SIZE = 100;
const VIEWPORT_CELLS = 20; // Number of cells visible in viewport

interface CaroBoardProps {
  moves: CaroMove[];
  onMove: (x: number, y: number) => void;
  currentPlayer: 'X' | 'O';
  disabled?: boolean;
}

export default function CaroBoard({ moves, onMove, currentPlayer, disabled }: CaroBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportOffset, setViewportOffset] = useState({ x: 40, y: 40 }); // Start near center
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewCell, setPreviewCell] = useState<{ x: number; y: number } | null>(null);
  const [clickedOnce, setClickedOnce] = useState<{ x: number; y: number } | null>(null);

  const board = movesToBoard(moves);
  const winResult = checkWin(moves);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move for dragging and preview
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const dx = Math.floor((e.clientX - dragStart.x) / CELL_SIZE);
      const dy = Math.floor((e.clientY - dragStart.y) / CELL_SIZE);
      
      if (dx !== 0 || dy !== 0) {
        setViewportOffset(prev => ({
          x: Math.max(0, Math.min(BOARD_SIZE - VIEWPORT_CELLS, prev.x - dx)),
          y: Math.max(0, Math.min(BOARD_SIZE - VIEWPORT_CELLS, prev.y - dy)),
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    } else if (!disabled) {
      // Show preview
      const rect = e.currentTarget.getBoundingClientRect();
      const cellX = Math.floor((e.clientX - rect.left) / CELL_SIZE) + viewportOffset.x;
      const cellY = Math.floor((e.clientY - rect.top) / CELL_SIZE) + viewportOffset.y;
      
      if (cellX >= 0 && cellX < BOARD_SIZE && cellY >= 0 && cellY < BOARD_SIZE) {
        if (!board.has(`${cellX},${cellY}`)) {
          setPreviewCell({ x: cellX, y: cellY });
        } else {
          setPreviewCell(null);
        }
      }
    }
  }, [isDragging, dragStart, viewportOffset, disabled, board]);

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle cell click
  const handleCellClick = (cellX: number, cellY: number) => {
    if (disabled || !isValidMove(cellX, cellY, moves)) return;

    if (clickedOnce && clickedOnce.x === cellX && clickedOnce.y === cellY) {
      // Second click - place the move
      onMove(cellX, cellY);
      setClickedOnce(null);
      setPreviewCell(null);
    } else {
      // First click - show preview
      setClickedOnce({ x: cellX, y: cellY });
    }
  };

  // Mouse leave handler
  const handleMouseLeave = () => {
    setPreviewCell(null);
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Render visible cells
  const renderCells = () => {
    const cells = [];
    
    for (let y = viewportOffset.y; y < Math.min(viewportOffset.y + VIEWPORT_CELLS, BOARD_SIZE); y++) {
      for (let x = viewportOffset.x; x < Math.min(viewportOffset.x + VIEWPORT_CELLS, BOARD_SIZE); x++) {
        const key = `${x},${y}`;
        const cellValue = board.get(key);
        const isPreview = previewCell?.x === x && previewCell?.y === y;
        const isClickedOnce = clickedOnce?.x === x && clickedOnce?.y === y;
        const isWinningCell = winResult.winningCells?.some(cell => cell.x === x && cell.y === y);

        cells.push(
          <div
            key={key}
            className={`notebook-grid-cell ${isPreview || isClickedOnce ? 'preview' : ''} ${isWinningCell ? 'bg-yellow-200' : ''}`}
            style={{
              gridColumn: x - viewportOffset.x + 1,
              gridRow: y - viewportOffset.y + 1,
            }}
            onClick={() => handleCellClick(x, y)}
          >
            {cellValue && (
              <span
                className={`text-2xl font-bold animate-appear ${
                  cellValue === 'X' ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {cellValue}
              </span>
            )}
            {(isPreview || isClickedOnce) && !cellValue && (
              <span
                className={`text-2xl font-bold opacity-50 ${
                  currentPlayer === 'X' ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {currentPlayer}
              </span>
            )}
          </div>
        );
      }
    }
    
    return cells;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Board Info */}
      <div className="text-white text-center">
        <p className="text-lg">
          Current Turn: <span className={`font-bold ${currentPlayer === 'X' ? 'text-blue-400' : 'text-red-400'}`}>
            {currentPlayer}
          </span>
        </p>
        <p className="text-sm text-gray-300">
          Viewport: ({viewportOffset.x}, {viewportOffset.y}) | Total Moves: {moves.length}
        </p>
        {clickedOnce && (
          <p className="text-sm text-yellow-300 animate-pulse">
            Click again to confirm placement at ({clickedOnce.x}, {clickedOnce.y})
          </p>
        )}
      </div>

      {/* Game Board */}
      <div
        ref={containerRef}
        className={`notebook-grid relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          width: VIEWPORT_CELLS * CELL_SIZE,
          height: VIEWPORT_CELLS * CELL_SIZE,
          display: 'grid',
          gridTemplateColumns: `repeat(${VIEWPORT_CELLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${VIEWPORT_CELLS}, ${CELL_SIZE}px)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {renderCells()}
      </div>
    </div>
  );
}
