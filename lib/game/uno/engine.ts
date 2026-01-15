
import { GameState, MoveResult, Player, UnoCard, UnoColor } from './types';
export { getCardDetails, getCardColor } from './logic';
import { createUnoDeck, shuffleDeck, getCardDetails, getCardColor } from './logic';

export const INITIAL_HAND_SIZE = 7;

export function createInitialState(roomId: string, players: {id: string, name: string}[], hostId: string): GameState {
  const fullDeck = shuffleDeck(createUnoDeck());
  
  // Deal to players
  const gamePlayers: Player[] = players.map(p => ({
    id: p.id,
    name: p.name,
    hand: [],
    isReady: true,
    isHost: p.id === hostId
  }));

  // Deal 7 cards to each
  for(let i=0; i<INITIAL_HAND_SIZE; i++) {
    for(const p of gamePlayers) {
        if(fullDeck.length > 0) {
            p.hand.push(fullDeck.shift()!);
        }
    }
  }

  // Draw first card for discard pile
  // Loop until we don't get a Wild Draw 4 (standard rule, though simple Wild is allowed usually, but typically we want a number or simple action)
  // For simplicity, just take one. If it's Wild, Host picks color? Or default Red? 
  // Let's standard rule: If Wild Draw 4, reshuffle. If Wild, invalid? 
  // Simplified: Just take one.
  let topCard = fullDeck.shift()!;
  // Start with deck
  const discardPile = [topCard];
  
  // Determine start color
  let startColor = getCardDetails(topCard).color;
  if(startColor === 'black') {
      // If first card is wild, we can default to Red or random.
      startColor = 'red';
  }

  return {
    roomId,
    status: 'playing',
    players: gamePlayers,
    deck: fullDeck,
    discardPile,
    currentTurnIndex: 0,
    direction: 1,
    currentColor: startColor,
    winner: null,
    lastAction: 'Game Started'
  };
}

export function validateMove(state: GameState, playerId: string, cardId: number): boolean {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if(playerIndex !== state.currentTurnIndex) return false;
    if(state.status !== 'playing') return false;

    const card = getCardDetails(cardId);
    const topCardId = state.discardPile[state.discardPile.length - 1];
    const topCard = getCardDetails(topCardId);
    
    // 1. Check color match (current effective color)
    if (card.color === state.currentColor) return true;
    
    // 2. Check value/symbol match
    if (card.type === topCard.type && (card.type !== 'Number' || card.value === topCard.value)) return true;
    if (card.type === 'Number' && topCard.type === 'Number' && card.value === topCard.value) return true;

    // 3. Check Wild
    if (card.color === 'black') return true;

    // 4. Special case: If previous was Wild, we look at state.currentColor. 
    // Handled by #1.

    return false;
}

export function processTurn(state: GameState, playerId: string, cardId: number, chosenColor?: UnoColor): MoveResult {
    // Clone state to avoid mutation (Redux style safer)
    const newState: GameState = JSON.parse(JSON.stringify(state));
    const player = newState.players.find(p => p.id === playerId);
    
    if(!player) return { newState: state, valid: false, message: 'Player not found' };

    // Validate
    if(!validateMove(state, playerId, cardId)) {
        return { newState: state, valid: false, message: 'Invalid Move' };
    }

    // Remove card from hand
    player.hand = player.hand.filter(c => c !== cardId);
    
    // Add to discard
    newState.discardPile.push(cardId);
    
    const card = getCardDetails(cardId);
    let nextIndex = newState.currentTurnIndex;
    let skipTurn = false;
    
    // Update Color
    if (card.color === 'black') {
        if (!chosenColor) return { newState: state, valid: false, message: 'Must choose color for Wild' };
        newState.currentColor = chosenColor;
    } else {
        newState.currentColor = card.color;
    }

    // Handle Effects
    if (card.type === 'Reverse') {
        newState.direction *= -1;
        // If 2 players, Reverse acts like Skip
        if (newState.players.length === 2) {
             skipTurn = true;
        }
    } else if (card.type === 'Skip') {
        skipTurn = true;
    } else if (card.type === 'Draw2') {
        // Next player draws 2 and skips
        // Calculate next player ID to give cards
        // Note: Standard rules: Next player draws 2 and misses turn.
        // Stack rules? Not implementing stacking yet.
        const victimIndex = getNextPlayerIndex(newState.currentTurnIndex, newState.direction, newState.players.length);
        drawCards(newState, victimIndex, 2);
        skipTurn = true; // The victim misses turn
    } else if (card.type === 'Draw4') {
        const victimIndex = getNextPlayerIndex(newState.currentTurnIndex, newState.direction, newState.players.length);
        drawCards(newState, victimIndex, 4);
        skipTurn = true; 
    }

    // Check Win
    if (player.hand.length === 0) {
        newState.status = 'ended';
        newState.winner = player.id;
        newState.lastAction = `${player.name} wins!`;
        return { newState, valid: true };
    }

    // Advance Turn
    // If skipTurn is true, we advance ONCE to the skipped player, then ONCE more to the actual next player?
    // standard: "Next player loses their turn". 
    // Regular advance: curr -> next.
    // Skip: curr -> (next skipped) -> next_next.
    
    let step = 1;
    if (skipTurn) step = 2;
    
    for(let i=0; i<step; i++) {
        newState.currentTurnIndex = getNextPlayerIndex(newState.currentTurnIndex, newState.direction, newState.players.length);
    }
    
    newState.lastAction = `${player.name} played ${card.name}`;
    
    return { newState, valid: true };
}

export function drawFromDeck(state: GameState, playerId: string): MoveResult {
    const newState: GameState = JSON.parse(JSON.stringify(state));
    if(newState.players[newState.currentTurnIndex].id !== playerId) {
        return { newState: state, valid: false, message: 'Not your turn' };
    }
    
    drawCards(newState, newState.currentTurnIndex, 1);
    
    // Standard Uno: If playabe, you can play it? Or just pass?
    // Simple implementation: Draw -> Pass turn immediately.
    // Or: Draw -> If playable, can play. (Requires UI state "Played or Passed").
    // Let's go with: Draw 1, then pass turn automatically to keep speed? 
    // Or allow playing? 
    // User request: "Playable up to 4".
    // Let's simple: Draw -> Pass.
    
    // However, if we draw 1, we usually want to check if it's playable.
    // Making it simple: Draw 1 card.
    // Update turn.
    
    newState.currentTurnIndex = getNextPlayerIndex(newState.currentTurnIndex, newState.direction, newState.players.length);
    newState.lastAction = `${newState.players.find(p => p.id === playerId)?.name} drew a card`;

    return { newState, valid: true };
}

function getNextPlayerIndex(current: number, direction: number, total: number): number {
    let next = current + direction;
    if (next < 0) next = total - 1;
    if (next >= total) next = 0;
    return next;
}

function drawCards(state: GameState, playerIndex: number, count: number) {
    const player = state.players[playerIndex];
    for (let i = 0; i < count; i++) {
        if (state.deck.length === 0) {
            // Reshuffle discard (keeping top)
            if (state.discardPile.length > 1) {
                const top = state.discardPile.pop()!;
                const newDeck = shuffleDeck(state.discardPile);
                state.deck = newDeck;
                state.discardPile = [top];
            } else {
                break; // No cards left
            }
        }
        if (state.deck.length > 0) {
            player.hand.push(state.deck.shift()!);
        }
    }
}
