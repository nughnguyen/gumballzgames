
export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface Ship {
  id: ShipType;
  name: string;
  size: number;
}

export const SHIPS: Ship[] = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface Cell {
  row: number;
  col: number;
  state: CellState;
  shipId?: ShipType;
}

export type Grid = Cell[][];

export const GRID_SIZE = 10;

export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => ({
      row,
      col,
      state: 'empty',
    }))
  );
}

export function canPlaceShip(
  grid: Grid,
  ship: Ship,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): boolean {
  if (direction === 'horizontal') {
    if (col + ship.size > GRID_SIZE) return false;
    for (let i = 0; i < ship.size; i++) {
      if (grid[row][col + i].state !== 'empty') return false; // Collision
    }
  } else {
    if (row + ship.size > GRID_SIZE) return false;
    for (let i = 0; i < ship.size; i++) {
      if (grid[row + i][col].state !== 'empty') return false;
    }
  }
  return true;
}

export function placeShip(
  grid: Grid,
  ship: Ship,
  row: number,
  col: number,
  direction: 'horizontal' | 'vertical'
): Grid {
  const newGrid = grid.map((r) => r.map((c) => ({ ...c }))); // Deep copy
  
  if (direction === 'horizontal') {
    for (let i = 0; i < ship.size; i++) {
      newGrid[row][col + i].state = 'ship';
      newGrid[row][col + i].shipId = ship.id;
    }
  } else {
    for (let i = 0; i < ship.size; i++) {
      newGrid[row + i][col].state = 'ship';
      newGrid[row + i][col].shipId = ship.id;
    }
  }
  return newGrid;
}

export function randomizeShips(): Grid {
  let grid = createEmptyGrid();
  // Sort large to small to reduce placement failure
  const ships = [...SHIPS].sort((a, b) => b.size - a.size);

  for (const ship of ships) {
    let placed = false;
    while (!placed) {
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);

      if (canPlaceShip(grid, ship, row, col, direction)) {
        grid = placeShip(grid, ship, row, col, direction);
        placed = true;
      }
    }
  }
  return grid;
}
