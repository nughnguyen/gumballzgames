'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getRoomByCode } from '@/lib/supabase/rooms';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isGuest, loginAsGuest, checkAuth, loading } = useAuthStore();
  const [guestNickname, setGuestNickname] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [modalView, setModalView] = useState<'initial' | 'guest-input'>('initial');
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const skipWelcome = searchParams.get('skip_welcome');
    if (!loading && !user && !isGuest && !skipWelcome) {
      setShowGuestModal(true);
    }
  }, [loading, user, isGuest, searchParams]);

  const handleGuestLogin = () => {
    if (guestNickname.trim().length >= 3) {
      loginAsGuest(guestNickname.trim());
      setShowGuestModal(false);
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
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <i className="fi fi-rr-gamepad text-9xl"></i>
            </div>

            {modalView === 'initial' ? (
              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-[var(--accent-green)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/20">
                    <i className="fi fi-rr-gamepad text-4xl text-white"></i>
                  </div>
                  <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome to WebGames</h2>
                  <p className="text-[var(--text-secondary)]">Join the community or play freely</p>
                </div>

                <div className="space-y-3">
                  <Link 
                    href="/auth/login"
                    className="flex items-center justify-center gap-3 w-full p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-green)] text-[var(--text-primary)] rounded-xl font-semibold transition-all group"
                  >
                    <i className="fi fi-rr-sign-in-alt text-xl group-hover:text-[var(--accent-green)] transition-colors"></i>
                    <span>Log In</span>
                  </Link>

                  <Link 
                    href="/auth/register"
                    className="flex items-center justify-center gap-3 w-full p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--accent-green)] text-[var(--text-primary)] rounded-xl font-semibold transition-all group"
                  >
                    <i className="fi fi-rr-user-add text-xl group-hover:text-[var(--accent-green)] transition-colors"></i>
                    <span>Create Account</span>
                  </Link>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border-secondary)]"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[var(--bg-secondary)] px-4 text-xs text-[var(--text-tertiary)] uppercase font-bold tracking-wider">or</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setModalView('guest-input')}
                    className="flex items-center justify-center gap-3 w-full p-4 bg-[var(--accent-green)] hover:bg-opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20 hover:scale-[1.02]"
                  >
                    <i className="fi fi-rr-user-secret text-xl"></i>
                    <span>Play as Guest</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 animate-in fade-in slide-in-from-right-8 duration-300">
                <button 
                  onClick={() => setModalView('initial')}
                  className="absolute -top-2 -left-2 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-all"
                >
                  <i className="fi fi-rr-arrow-small-left text-2xl"></i>
                </button>

                <div className="text-center mb-8 pt-4">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Guest Access</h2>
                  <p className="text-[var(--text-secondary)]">Choose a display name</p>
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
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] transition-all outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
                      autoFocus
                    />
                  </div>
                  
                  <button
                    onClick={handleGuestLogin}
                    disabled={guestNickname.trim().length < 3}
                    className="w-full py-4 bg-[var(--accent-green)] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.02]"
                  >
                    Start Playing <i className="fi fi-rr-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}
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
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="w-full max-w-md relative flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fi fi-rr-keyboard text-[var(--text-tertiary)]"></i>
                      </div>
                      <input 
                        type="text" 
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-Character Code" 
                        className="w-full pl-11 pr-24 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] uppercase font-mono"
                        maxLength={10}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && roomCode.trim()) {
                            try {
                                const rawCode = roomCode.trim().toUpperCase();
                                // Look up room in DB first
                                const room = await getRoomByCode(rawCode);
                                
                                if (room) {
                                    router.push(`/game/${room.game_type}/${room.room_code}`);
                                } else {
                                    // Legacy / Fallback: If not in DB, try to guess from prefix if present
                                    if (rawCode.startsWith('BS-')) router.push(`/game/battleship/${rawCode}`);
                                    else if (rawCode.startsWith('CR-')) router.push(`/game/caro/${rawCode}`);
                                    else if (rawCode.startsWith('UN-') || rawCode.startsWith('UO-')) router.push(`/game/uno/${rawCode}`);
                                    else if (rawCode.startsWith('MM-')) router.push(`/game/memory/${rawCode}`);
                                    else {
                                        alert('Room not found! Please check the code.');
                                    }
                                }
                            } catch (error) {
                                console.error("Error joining room:", error);
                                alert('Error joining room. Please try again.');
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={async () => {
                          if (!roomCode.trim()) return;
                          
                          try {
                                const rawCode = roomCode.trim().toUpperCase();
                                // Look up room in DB first
                                const room = await getRoomByCode(rawCode);
                                
                                if (room) {
                                    router.push(`/game/${room.game_type}/${room.room_code}`);
                                } else {
                                    // Fallback: If not in DB, try to guess from prefix
                                    if (rawCode.startsWith('BS-')) router.push(`/game/battleship/${rawCode}`);
                                    else if (rawCode.startsWith('CR-')) router.push(`/game/caro/${rawCode}`);
                                    else if (rawCode.startsWith('UN-') || rawCode.startsWith('UO-')) router.push(`/game/uno/${rawCode}`);
                                    else if (rawCode.startsWith('MM-')) router.push(`/game/memory/${rawCode}`);
                                    else {
                                        alert('Room not found! Please check the code.');
                                    }
                                }
                          } catch (error) {
                              console.error("Error joining room:", error);
                              alert('Error joining room. Please try again.');
                          }
                        }}
                        disabled={!roomCode.trim()}
                        className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Background Icon */}
              <div className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none">
                <i className="fi fi-rr-gamepad text-[400px]"></i>
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

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
            <div className="flex justify-center mb-4">
                <i className="fi fi-rr-spinner text-4xl text-[var(--accent-green)] animate-spin"></i>
            </div>
            <div className="text-[var(--text-primary)] text-xl font-semibold">Loading...</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
