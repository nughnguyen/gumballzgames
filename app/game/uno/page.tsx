
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';

export default function UnoMenuPage() {
  const router = useRouter();
  const { user, isGuest } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId] = useState(() => `sess-${Math.random().toString(36).substring(2, 9)}`);

  // --- Matchmaking Logic (Simple) ---
  useEffect(() => {
    let channel: any = null;

    if (isSearching) {
      const myId = user?.id || `guest-${Date.now()}`;
      const myNickname = user?.guestNickname || user?.profile?.display_name || 'Uno Player';

      channel = supabase.channel('matchmaking:uno', {
        config: { presence: { key: sessionId } }
      });

      channel
        .on('presence', { event: 'sync' }, async () => {
          const state = channel.presenceState();
          // Filter out myself based on sessionId
          const others = Object.values(state).flat().filter((u:any) => u.sessionId !== sessionId);
          
          if (others.length > 0) {
            // Found opponent! Match with the first one.
            const opponent = others[0] as any;
            
            // Deterministic tie-breaker: Lower SessionID creates the room
            if (sessionId > opponent.sessionId) {
              const roomId = 'UO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
              
              // Broadcast
              await channel.send({
                type: 'broadcast',
                event: 'match_found',
                payload: { targetSessionId: opponent.sessionId, roomId }
              });
              
              router.push(`/game/uno/${roomId}`);
            }
          }
        })
        .on('broadcast', { event: 'match_found' }, ({ payload }: { payload: { targetSessionId: string; roomId: string } }) => {
          if (payload.targetSessionId === sessionId) {
            router.push(`/game/uno/${payload.roomId}`);
          }
        })
        .subscribe(async (status: string) => {
           if (status === 'SUBSCRIBED') {
             await channel.track({ sessionId, user_id: myId, nickname: myNickname });
           }
        });
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isSearching, user, isGuest, router, sessionId]);


  // --- Actions ---
  const handleCreateRoom = () => {
    const roomId = 'UO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game/uno/${roomId}`);
  };

  const handleQuickMatch = () => {
    if (!user && !isGuest) {
      alert("Please login first or set a guest nickname.");
      return;
    }
    setIsSearching(true);
  };

  const handleJoinByCode = () => {
      const input = document.getElementById('roomCodeInput') as HTMLInputElement;
      let code = input.value.trim().toUpperCase();
      if(code) {
        if(!code.startsWith('UO-')) {
           code = 'UO-' + code;
        }
        router.push(`/game/uno/${code}`);
      }
  };


  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary to-primary">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-text-primary mb-3 flex items-center gap-4">
              <span className="text-6xl">🃏</span>
              Uno
            </h1>
            <p className="text-text-secondary text-lg">
              The classic card game of matching colors and numbers.
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

          {/* PLAY TAB */}
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
                      Create a private room to play with up to 4 friends.
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
                                onClick={handleJoinByCode}
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

              {/* Quick Match */}
              <div className="bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-accent-orange transition-all shadow-lg backdrop-blur-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      Quick Match
                    </h3>
                    <p className="text-text-secondary text-sm mb-3">
                      Find a random game immediately.
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
                        Looking for match...
                    </p>
                )}
              </div>
            </div>
          )}

          {/* HOW TO PLAY TAB */}
          {activeTab === 'howto' && (
             <div className="space-y-6 text-text-primary">
                {/* Objective */}
                <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-accent-green mb-4">🎯 Objective</h3>
                    <p className="text-text-secondary text-lg">
                    Be the first player to get rid of all your cards.
                    </p>
                </div>

                {/* Rules */}
                <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-text-primary mb-4">📜 Rules</h3>
                    <ul className="space-y-3 text-text-secondary list-disc pl-5">
                      <li>Match the top card on the discard pile by <strong>Color</strong>, <strong>Number</strong>, or <strong>Symbol</strong>.</li>
                      <li>If you have no matching card, you must draw from the deck.</li>
                      <li><strong>Wild</strong>: Change the current color.</li>
                      <li><strong>Wild Draw 4</strong>: Change color + next player draws 4 and skips turn.</li>
                      <li><strong>Draw 2</strong>: Next player draws 2 and skips turn.</li>
                      <li><strong>Skip</strong>: Next player is skipped.</li>
                      <li><strong>Reverse</strong>: Reverses the direction of play.</li>
                    </ul>
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
}
