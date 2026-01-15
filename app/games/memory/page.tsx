'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { generateRoomCode } from '@/lib/utils/roomCode';
import { createRoom } from '@/lib/supabase/rooms';
import { useAuthStore } from '@/lib/stores/authStore';

export default function MemoryGamePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');
  const { user, isGuest } = useAuthStore();

  const handleCreateRoom = async () => {
    if (!user && !isGuest) {
        alert("Please login first or set a guest nickname on the home page.");
        return;
    }
    const roomCode = generateRoomCode();
    const myId = user?.id || `guest-${Date.now()}`;
    const myName = user?.guestNickname || user?.profile?.display_name || 'Host';

    try {
        await createRoom(roomCode, 'memory', myId, myName);
        router.push(`/game/memory/${roomCode}`);
    } catch (e) {
        console.error(e);
        alert('Failed to create room');
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-3 flex items-center gap-4">
              <i className="fi fi-rr-puzzle-alt text-6xl"></i>
              Memory Game
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">
              Test your memory by matching pairs of cards!
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[var(--border-primary)]">
            <button
              onClick={() => setActiveTab('play')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'play'
                  ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              🎮 Play
            </button>
            <button
              onClick={() => setActiveTab('howto')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'howto'
                  ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              📖 How to Play
            </button>
          </div>

          {/* Play Tab */}
          {activeTab === 'play' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Play with Friends */}
              <div className="col-span-1 md:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-5 hover:border-[var(--accent-green)] transition-all shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <span className="text-2xl">👥</span>
                            Play with Friends
                        </h3>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mb-4">
                      Create a room and share the code with friends to duel in memory matching.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleCreateRoom}
                          className="px-6 py-2.5 bg-[var(--accent-green)] hover:opacity-90 text-white font-bold rounded-lg transition-all shadow-lg shadow-green-500/20 text-sm whitespace-nowrap"
                        >
                          Create Room
                        </button>
                        <button
                          onClick={handleCreateRoom}
                          className="px-6 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--accent-green)] text-[var(--accent-green)] font-bold rounded-lg transition-all shadow-lg text-sm whitespace-nowrap"
                        >
                          Play Solo
                        </button>
                        <div className="flex gap-2 flex-1 max-w-sm">
                             <input 
                                type="text" 
                                placeholder="Enter Code" 
                                id="memoryRoomCodeInput" 
                                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-[var(--text-primary)] uppercase text-sm placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent-green)]" 
                             />
                             <button 
                                onClick={() => {
                                    let code = (document.getElementById('memoryRoomCodeInput') as HTMLInputElement).value.trim().toUpperCase();
                                    if(code) {
                                        if (!code.startsWith('MM-')) {
                                            code = 'MM-' + code;
                                        }
                                        router.push(`/game/memory/${code}`);
                                    }
                                }}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[var(--text-primary)] font-semibold rounded-lg border border-[var(--border-primary)] text-sm"
                              >
                                Join
                              </button>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How to Play Tab */}
          {activeTab === 'howto' && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Target</h3>
                <p className="text-[var(--text-secondary)] text-lg">
                  Find all matching pairs of cards. The player with the most pairs wins!
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
