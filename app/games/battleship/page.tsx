'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BattleshipGame from '@/components/games/Battleship/BattleshipGame';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';

export default function BattleshipPage() {
  const router = useRouter();
  const { user, isGuest } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');
  const [mode, setMode] = useState<'menu' | 'local'>('menu');
  const [isSearching, setIsSearching] = useState(false);

  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game/battleship/${roomId}`);
  };

  const handleQuickMatch = async () => {
     if (!user && !isGuest) {
         alert("Please login first or set a guest nickname.");
         return;
     }
     
     if (isSearching) return; // Prevent double click
     setIsSearching(true);
     
     const myId = user?.id || `guest-${Date.now()}`;
     const myNickname = user?.guestNickname || user?.profile?.display_name || 'Commander';
     
     const channel = supabase.channel('matchmaking:battleship', {
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
                 const opponent = others[0] as any;
                 
                 // Deterministic tie-breaker
                 if (myId > opponent.user_id) {
                     const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                     
                     // Broadcast to opponent
                     channel.send({
                         type: 'broadcast',
                         event: 'match_found',
                         payload: { target_id: opponent.user_id, roomId }
                     });
                     
                     // Go myself
                     router.push(`/game/battleship/${roomId}`);
                 }
             }
        })
        .on('broadcast', { event: 'match_found' }, ({ payload }) => {
             if (payload.target_id === myId) {
                  router.push(`/game/battleship/${payload.roomId}`);
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
  };

  if (mode === 'local') {
      return (
        <div className="flex min-h-screen bg-primary">
           <Sidebar />
           <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary to-primary">
             <div className="p-4">
               <button 
                  onClick={() => setMode('menu')} 
                  className="mb-4 text-text-secondary hover:text-text-primary flex items-center gap-2 text-sm"
                >
                  ← Back to Menu
                </button>
                <BattleshipGame />
             </div>
           </main>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary to-primary">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-text-primary mb-3 flex items-center gap-4">
              <span className="text-6xl">⚓</span>
              Battleship
            </h1>
            <p className="text-text-secondary text-lg">
              Deployment Phase initiated. Command your fleet to victory!
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
          {/* Play Tab */}
          {activeTab === 'play' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Play with Friends */}
              <div className="col-span-1 md:col-span-2 bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-accent-green transition-all shadow-lg backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                         <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <span className="text-2xl">👥</span>
                            Play with Friends
                         </h3>
                         <div className="text-accent-green text-xs font-bold bg-accent-green/10 px-2 py-1 rounded md:hidden">
                            Online
                         </div>
                    </div>
                    <p className="text-text-secondary text-sm mb-4">
                      Create a secure channel and share code to enter naval combat.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleCreateRoom}
                          className="px-6 py-2.5 bg-accent-green hover:opacity-90 text-primary font-bold rounded-lg transition-all shadow-lg shadow-green-500/20 text-sm whitespace-nowrap"
                        >
                          Create Room
                        </button>
                        <div className="flex gap-2 flex-1 max-w-sm">
                             <input 
                                type="text" 
                                placeholder="Enter Code" 
                                id="roomCodeInput" 
                                className="flex-1 bg-primary border border-border-primary rounded-lg px-3 py-2.5 text-text-primary uppercase text-sm placeholder:text-text-tertiary outline-none focus:border-accent-green" 
                             />
                             <button 
                                onClick={() => {
                                    const code = (document.getElementById('roomCodeInput') as HTMLInputElement).value;
                                    if(code) router.push(`/game/battleship/${code.toUpperCase()}`);
                                }}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-text-primary font-semibold rounded-lg border border-border-primary text-sm"
                             >
                                Join
                             </button>
                        </div>
                    </div>
                  </div>
                  <div className="hidden md:block text-accent-green text-xs font-bold bg-accent-green/10 px-2 py-1 rounded self-start">
                    Online
                  </div>
                </div>
              </div>

              {/* Play with Bot */}
              <div className="bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-white/20 transition-all backdrop-blur-sm flex flex-col justify-between">
                 <div>
                    <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                      <span className="text-2xl">🤖</span>
                      Play with Bot
                    </h3>
                    <p className="text-text-secondary text-sm mb-3">
                      Training Simulation. Practice targeting against AI.
                    </p>
                 </div>
                 <button
                      onClick={() => setMode('local')}
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-text-primary font-semibold rounded-lg border border-border-primary text-sm"
                 >
                      Start Simulation
                 </button>
              </div>

              {/* Quick Match */}
              <div className="bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-accent-orange transition-all shadow-lg backdrop-blur-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      Quick Match
                    </h3>
                    <p className="text-text-secondary text-sm mb-3">
                      Get matched with random commanders worldwide.
                    </p>
                </div>
                <button
                    onClick={handleQuickMatch}
                    disabled={isSearching}
                    className="w-full py-2.5 bg-accent-orange hover:opacity-90 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 text-sm"
                >
                    {isSearching ? <i className="fi fi-rr-spinner animate-spin"></i> : <i className="fi fi-rr-zap"></i>}
                    {isSearching ? 'Scanning...' : 'Find Match'}
                </button>
                {isSearching && (
                    <p className="text-xs text-text-tertiary mt-2 animate-pulse text-center">
                        Looking for opponent...
                    </p>
                )}
              </div>
            </div>
          )}

          {/* How to Play Tab */}
          {activeTab === 'howto' && (
            <div className="space-y-6 text-text-primary">
              {/* Objective */}
              <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-accent-green mb-4">🎯 Objective</h3>
                <p className="text-text-secondary text-lg">
                  Sink all 5 ships in your opponent's fleet before they sink yours.
                </p>
              </div>

              {/* How to Play */}
              <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4">🕹️ How to Play</h3>
                <ol className="space-y-3 text-text-secondary">
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">1.</span>
                    <span><strong>Deploy your Fleet:</strong> Place your 5 ships (Carrier, Battleship, Cruiser, Submarine, Destroyer) on the grid.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">2.</span>
                    <span><strong>Rotate:</strong> Use the rotate button to fit ships strategically.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">3.</span>
                    <span><strong>Fire:</strong> Click on the enemy grid (Radar) to fire shots.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent-green font-bold">4.</span>
                    <span><strong>Hit & Miss:</strong> Red 'X' means a HIT. White dot means a MISS. Hits grant an extra turn!</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
