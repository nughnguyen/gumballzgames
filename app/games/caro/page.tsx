'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { generateRoomCode } from '@/lib/utils/roomCode';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';

export default function CaroPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');
  const [isSearching, setIsSearching] = useState(false);
  const { user, isGuest } = useAuthStore();

  const handleCreateRoom = () => {
    const roomCode = generateRoomCode();
    router.push(`/game/caro/${roomCode}`);
  };

  const handleQuickMatch = async () => {
     if (!user && !isGuest) {
         alert("Please login first or set a guest nickname on the home page.");
         return;
     }
     
     if (isSearching) return; // Prevent double click
     setIsSearching(true);
     
     const myId = user?.id || `guest-${Date.now()}`;
     const myNickname = user?.guestNickname || user?.profile?.display_name || 'Player';
     
     const channel = supabase.channel('matchmaking:caro', {
        config: {
            presence: {
                key: myId,
            }
        }
     });

     channel
        .on('presence', { event: 'sync' }, () => {
             const state = channel.presenceState();
             const others = Object.values(state).flat().filter((u:any) => u.user_id !== myId);
             
             if (others.length > 0) {
                 // Sort potential opponents to be deterministic (optional but good)
                 // or just pick the first one.
                 const opponent = others[0] as any;
                 
                 // Deterministic tie-breaker to avoid race conditions
                 // If my ID > opponent ID, I initiate the match.
                 // Otherwise I wait for them.
                 if (myId > opponent.user_id) {
                     const roomCode = generateRoomCode();
                     
                     // Broadcast to opponent
                     channel.send({
                         type: 'broadcast',
                         event: 'match_found',
                         payload: { target_id: opponent.user_id, roomCode }
                     });
                     
                     // Go myself
                     router.push(`/game/caro/${roomCode}`);
                 }
                 // Else: logic falls through, I wait for the 'match_found' event from them.
             }
        })
        .on('broadcast', { event: 'match_found' }, ({ payload }) => {
             if (payload.target_id === myId) {
                  router.push(`/game/caro/${payload.roomCode}`);
             }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: myId,
                    nickname: myNickname,
                    joined_at: new Date().toISOString()
                });
            }
        });
        
    // Clean up channel? 
    // Usually handled by router leaving the page, which unmounts component.
    // However, if we stay on page (failed match), we are still subbed.
    // Ideally we save 'channel' in a ref or state to unsubscribe on unmount.
    // For this simple implementation, navigation handles the "unsubscribe" 
    // because the component unmounts upon router.push.
  };

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-text-primary mb-3 flex items-center gap-4">
              <span className="text-6xl">🎯</span>
              Caro (Gomoku)
            </h1>
            <p className="text-text-secondary text-lg">
              Get 5 in a row on an infinite notebook-style grid!
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border-primary">
            <button
              onClick={() => setActiveTab('play')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'play'
                  ? 'text-accent-green border-b-2 border-accent-green'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              🎮 Play
            </button>
            <button
              onClick={() => setActiveTab('howto')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'howto'
                  ? 'text-accent-green border-b-2 border-accent-green'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              📖 How to Play
            </button>
          </div>

          {/* Play Tab */}
          {activeTab === 'play' && (
            <div className="space-y-4">
              {/* Play with Friends */}
              <div className="bg-secondary border border-border-primary rounded-lg p-6 hover:border-accent-green transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
                      <span className="text-3xl">👥</span>
                      Play with Friends
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Create a room and share the code with your friends to play together
                    </p>
                    <button
                      onClick={handleCreateRoom}
                      className="px-8 py-3 bg-accent-green hover:opacity-80 text-white font-semibold rounded-lg transition-all"
                    >
                      Create Room
                    </button>
                  </div>
                  <div className="text-accent-green text-sm font-bold bg-accent-green/10 px-3 py-1 rounded">
                    Popular
                  </div>
                </div>
              </div>

              {/* Play with Bot */}
              <div className="bg-secondary border border-border-secondary rounded-lg p-6 opacity-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-text-tertiary mb-2 flex items-center gap-3">
                      <span className="text-3xl">🤖</span>
                      Play with Bot
                    </h3>
                    <p className="text-text-tertiary mb-4">
                      Practice against AI with adjustable difficulty levels
                    </p>
                    <div className="px-6 py-2 bg-accent-orange/20 text-accent-orange font-semibold rounded-lg inline-block">
                      Coming Soon
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Match */}
              <div className="bg-secondary border border-border-secondary rounded-lg p-6 hover:border-accent-orange transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
                      <span className="text-3xl">⚡</span>
                      Quick Match
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Get matched with random players around the world
                    </p>
                    <button
                        onClick={handleQuickMatch}
                        disabled={isSearching}
                        className="px-8 py-3 bg-accent-orange hover:opacity-80 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      {isSearching ? <i className="fi fi-rr-spinner animate-spin"></i> : <i className="fi fi-rr-zap"></i>}
                      {isSearching ? 'Searching...' : 'Find Match'}
                    </button>
                    {isSearching && (
                        <p className="text-sm text-text-tertiary mt-2 animate-pulse">
                            Looking for an opponent...
                        </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How to Play Tab */}
          {activeTab === 'howto' && (
            <div className="space-y-6">
              {/* Objective */}
              <div className="bg-secondary border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4">🎯 Objective</h3>
                <p className="text-text-secondary text-lg">
                  Be the first player to get <strong className="text-accent-green">5 in a row</strong> (horizontally, vertically, or diagonally) on the infinite grid.
                </p>
              </div>

              {/* How to Play */}
              <div className="bg-secondary border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4">🕹️ How to Play</h3>
                <ol className="space-y-3 text-text-secondary">
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">1.</span>
                    <span><strong>Click anywhere</strong> on the grid to place your mark (X or O)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">2.</span>
                    <span><strong>Drag the board</strong> to move around the infinite grid</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">3.</span>
                    <span><strong>Take turns</strong> placing marks with your opponent</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">4.</span>
                    <span><strong>Win by getting 5 in a row</strong> before your opponent does</span>
                  </li>
                </ol>
              </div>

              {/* Rules */}
              <div className="bg-secondary border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4">📋 Rules</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li className="flex gap-3">
                    <span className="text-accent-green">•</span>
                    <span>The board is <strong>100x100 cells</strong> (infinite feel)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green">•</span>
                    <span>Players alternate turns placing one mark per turn</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green">•</span>
                    <span>First to get <strong>exactly 5 in a row</strong> wins</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green">•</span>
                    <span>You can <strong>surrender</strong> at any time using the flag button</span>
                  </li>
                </ul>
              </div>

              {/* Tips */}
              <div className="bg-board-dark/20 border border-board-dark rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4">💡 Tips</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li className="flex gap-3">
                    <span className="text-board-dark">•</span>
                    <span>Create <strong>multiple threats</strong> to force your opponent into a losing position</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-board-dark">•</span>
                    <span>Always <strong>block your opponent</strong> when they have 3 or 4 in a row</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-board-dark">•</span>
                    <span>Use the <strong>entire board</strong> - don't limit yourself to one area</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-board-dark">•</span>
                    <span><strong>Plan ahead</strong> and think about your next 2-3 moves</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
