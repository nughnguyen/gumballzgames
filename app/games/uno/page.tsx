'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { generateRoomCode } from '@/lib/utils/roomCode';
import { createRoom } from '@/lib/supabase/rooms';
import { useAuthStore } from '@/lib/stores/authStore';

export default function UnoPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');

  const handleCreateRoom = async () => {
    const roomCode = generateRoomCode();
    const myId = user?.id || `guest-${Date.now()}`;
    const myName = user?.guestNickname || user?.profile?.display_name || 'Host';

    await createRoom(roomCode, 'uno', myId, myName);
    router.push(`/game/uno/${roomCode}`);
  };

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary to-primary">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-text-primary mb-3 flex items-center gap-4">
              <i className="fi fi-rr-playing-cards text-6xl"></i>
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
              <i className="fi fi-rr-gamepad mr-2"></i> Play
            </button>
            <button
              onClick={() => setActiveTab('howto')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'howto'
                  ? 'text-accent-green border-b-2 border-accent-green'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <i className="fi fi-rr-book-alt mr-2"></i> How to Play
            </button>
          </div>

          {/* Play Tab */}
          {/* PLAY TAB */}
          {activeTab === 'play' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Play with Friends */}
              <div className="col-span-1 md:col-span-2 bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-accent-green transition-all shadow-lg backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                         <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <i className="fi fi-rr-users-alt text-2xl"></i>
                            Play with Friends
                         </h3>
                         <div className="text-accent-green text-xs font-bold bg-accent-green/10 px-2 py-1 rounded md:hidden">
                            Online
                         </div>
                    </div>
                    <p className="text-text-secondary text-sm mb-4">
                      Create a room and invite up to 3 friends for a chaotic card battle.
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
                                placeholder="Enter Room ID" 
                                id="roomCodeInput" 
                                className="flex-1 bg-primary border border-border-primary rounded-lg px-3 py-2.5 text-text-primary uppercase text-sm placeholder:text-text-tertiary outline-none focus:border-accent-green" 
                             />
                             <button 
                                onClick={() => {
                                    const input = document.getElementById('roomCodeInput') as HTMLInputElement;
                                      let code = input.value.trim().toUpperCase();
                                    if(code) {
                                      if(!code.startsWith('UO-')) code = 'UO-' + code;
                                      router.push(`/game/uno/${code}`);
                                    }
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

              {/* Quick Match - ADDED */}
              <div className="bg-secondary/80 border border-border-primary rounded-lg p-5 hover:border-accent-orange transition-all shadow-lg backdrop-blur-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                      <i className="fi fi-rr-bolt text-2xl text-[var(--accent-orange)]"></i>
                      Quick Match
                    </h3>
                    <p className="text-text-secondary text-sm mb-3">
                      Find a random game immediately.
                    </p>
                </div>
                <button
                    disabled
                    className="w-full py-2.5 bg-accent-orange/50 cursor-not-allowed text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 text-sm"
                >
                    <i className="fi fi-rr-clock"></i>
                    Coming Soon
                </button>
              </div>

            </div>
          )}

          {/* How to Play Tab */}
          {activeTab === 'howto' && (
            <div className="space-y-6 text-text-primary">
              <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-accent-green mb-4 flex items-center gap-2"><i className="fi fi-rr-bullseye"></i> Objective</h3>
                <p className="text-text-secondary text-lg">
                  Be the first player to get rid of all your cards.
                </p>
              </div>

              <div className="bg-white/5 border border-border-primary rounded-lg p-6">
                <h3 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2"><i className="fi fi-rr-list-check"></i> Rules</h3>
                <ul className="space-y-3 text-text-secondary list-disc pl-5">
                  <li>Match the top card on the discard pile by <strong>color</strong> or <strong>number</strong>.</li>
                  <li>Use <strong>Action Cards</strong> (Skip, Reverse, Draw 2) to hinder opponents.</li>
                  <li>Use <strong>Wild Cards</strong> to change the color or force the next player to draw 4.</li>
                  <li>If you can't play, you must <strong>draw</strong> a card.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
