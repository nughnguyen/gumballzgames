'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';

export default function HomePage() {
  const router = useRouter();
  const { user, isGuest, loginAsGuest, checkAuth, loading } = useAuthStore();
  const [guestNickname, setGuestNickname] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      setShowGuestModal(true);
    }
  }, [loading, user, isGuest]);

  const handleGuestLogin = () => {
    if (guestNickname.trim().length >= 3) {
      loginAsGuest(guestNickname.trim());
      setShowGuestModal(false);
    }
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <i className="fi fi-rr-spinner text-4xl text-[var(--accent-green)] animate-spin"></i>
          </div>
          <div className="text-[var(--text-primary)] text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Guest Login Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--border-primary)]">
                <i className="fi fi-rr-gamepad text-5xl text-[var(--accent-green)]"></i>
              </div>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">Welcome Player</h2>
              <p className="text-[var(--text-secondary)]">Enter a nickname to join the action</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="fi fi-rr-user text-[var(--text-tertiary)]"></i>
                </div>
                <input
                  type="text"
                  value={guestNickname}
                  onChange={(e) => setGuestNickname(e.target.value)}
                  placeholder="Nickname (min 3 chars)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleGuestLogin}
                disabled={guestNickname.trim().length < 3}
                className="w-full py-4 bg-[var(--accent-green)] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Playing <i className="fi fi-rr-arrow-right"></i>
              </button>

              <div className="text-center pt-4 border-t border-[var(--border-secondary)]">
                <Link href="/auth/login" className="text-[var(--accent-green)] hover:underline font-medium text-sm flex items-center justify-center gap-2">
                  <i className="fi fi-rr-sign-in-alt"></i> or Login with Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <Sidebar />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Hero Section */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 md:p-12 border border-[var(--border-primary)] relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--accent-green)] text-sm font-medium mb-6">
                  <i className="fi fi-rr-sparkles"></i> New: Caro Mode Added
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                  Play Classic Games <br />
                  <span className="text-[var(--accent-green)]">With Friends</span>
                </h1>
                <p className="text-[var(--text-secondary)] text-xl mb-10 leading-relaxed">
                  Experience real-time multiplayer gaming directly in your browser. No downloads, no registration required for guests.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => {
                      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                      router.push(`/game/caro/${randomCode}`);
                    }}
                    className="px-8 py-4 bg-[var(--accent-green)] text-white font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-900/20"
                  >
                    <i className="fi fi-rr-play"></i> Play Now
                  </button>
                  <div className="flex-1 max-w-md relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fi fi-rr-keyboard text-[var(--text-tertiary)]"></i>
                    </div>
                    <input 
                      type="text" 
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter Room Code" 
                      className="w-full pl-11 pr-24 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] uppercase font-mono"
                      maxLength={6}
                    />
                    <button 
                      onClick={handleJoinRoom}
                      disabled={!roomCode.trim()}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Decorative Background Icon */}
              <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none">
                <i className="fi fi-rr-gamepad text-[400px]"></i>
              </div>
            </div>

            {/* Games Grid */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                  <i className="fi fi-rr-apps text-[var(--accent-green)]"></i> Available Games
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Caro Card */}
                <Link href="/games/caro" className="group block">
                  <div className="h-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 hover:border-[var(--accent-green)] transition-all hover:translate-y-[-4px] relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                      POPULAR
                    </div>
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6 text-[var(--accent-green)] group-hover:bg-[var(--accent-green)] group-hover:text-white transition-colors">
                      <i className="fi fi-rr-cross-circle text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-green)] transition-colors">Caro (Gomoku)</h3>
                    <p className="text-[var(--text-secondary)] mb-6">Strategy board game. Get 5 in a row to win against your opponent.</p>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1"><i className="fi fi-rr-users"></i> 2 Players</span>
                      <span className="flex items-center gap-1"><i className="fi fi-rr-time-fast"></i> ~10m</span>
                    </div>
                  </div>
                </Link>

                {/* Battleship Card */}
                <div className="group block opacity-75 cursor-not-allowed">
                  <div className="h-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--border-primary)]">
                      SOON
                    </div>
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6 text-[var(--accent-orange)]">
                      <i className="fi fi-rr-ship text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Battleship</h3>
                    <p className="text-[var(--text-secondary)] mb-6">Naval strategy game. Guess coordinates to sink the enemy fleet.</p>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1"><i className="fi fi-rr-users"></i> 2 Players</span>
                      <span className="flex items-center gap-1"><i className="fi fi-rr-time-fast"></i> ~15m</span>
                    </div>
                  </div>
                </div>

                {/* Chess Card */}
                <div className="group block opacity-75 cursor-not-allowed">
                  <div className="h-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] px-3 py-1 rounded-full text-xs font-bold border border-[var(--border-primary)]">
                      SOON
                    </div>
                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6 text-[var(--accent-blue)]">
                      <i className="fi fi-rr-chess-piece text-3xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Chess</h3>
                    <p className="text-[var(--text-secondary)] mb-6">Classic strategy. Checkmate the opponent's king to win.</p>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1"><i className="fi fi-rr-users"></i> 2 Players</span>
                      <span className="flex items-center gap-1"><i className="fi fi-rr-time-fast"></i> ~20m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-[var(--border-secondary)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-[var(--accent-green)] shrink-0">
                  <i className="fi fi-rr-rocket-lunch"></i>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] mb-1">Instant Access</h4>
                  <p className="text-sm text-[var(--text-secondary)]">No downloads needed. Play directly in browser.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-[var(--accent-green)] shrink-0">
                  <i className="fi fi-rr-comment-alt"></i>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] mb-1">Live Chat</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Chat with friends while you play.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-[var(--accent-green)] shrink-0">
                  <i className="fi fi-rr-trophy"></i>
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)] mb-1">Competitions</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Host tournaments with custom room codes.</p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
