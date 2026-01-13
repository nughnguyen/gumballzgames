'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { generateRoomCode } from '@/lib/utils/roomCode';
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

  const handleCreateRoom = (gameType: 'caro' | 'battleship' | 'chess') => {
    const roomCode = generateRoomCode();
    
    if (gameType === 'caro') {
      router.push(`/game/caro/${roomCode}`);
    } else if (gameType === 'battleship') {
      router.push(`/game/battleship/${roomCode}`);
    } else if (gameType === 'chess') {
      router.push(`/game/chess/${roomCode}`);
    }
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/room/${roomCode}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Guest Login Modal - Chess.com Style */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-secondary border border-border-primary rounded-lg p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent-green rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">♟</span>
              </div>
              <h2 className="text-3xl font-bold text-primary mb-2">Welcome!</h2>
              <p className="text-secondary">Enter your nickname to start playing</p>
            </div>
            
            <input
              type="text"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              placeholder="Your nickname (min 3 characters)"
              className="w-full px-4 py-3 rounded-lg mb-6 focus:ring-2 focus:ring-accent-green"
              onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
              autoFocus
            />
            
            <button
              onClick={handleGuestLogin}
              disabled={guestNickname.trim().length < 3}
              className="w-full py-3 bg-accent-green hover:bg-[#6ea33d] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* Main Layout - Chess.com Style */}
      <div className="flex min-h-screen bg-primary">
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-primary mb-3">
                Ready to Play?
              </h1>
              <p className="text-secondary text-lg">Choose your game and start your adventure</p>
            </div>

            {/* Join Room Card */}
            <div className="bg-secondary border border-border-primary rounded-lg p-6">
              <h2 className="text-xl font-bold text-text-primary mb-4">🔗 Join a Friend's Room</h2>
              <p className="text-text-secondary mb-4">
                Enter a room code to join your friend's game
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="flex-1 px-4 py-3 rounded-lg font-mono text-lg tracking-wider focus:ring-2 focus:ring-accent-green"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  className="px-8 py-3 bg-accent-green hover:opacity-80 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">{/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">⚡</div>
                <h4 className="text-text-primary font-semibold mb-2">Instant Play</h4>
                <p className="text-text-secondary text-sm">No registration required!</p>
              </div>
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">💬</div>
                <h4 className="text-text-primary font-semibold mb-2">Real-Time Chat</h4>
                <p className="text-text-secondary text-sm">Talk with opponents</p>
              </div>
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">🏆</div>
                <h4 className="text-text-primary font-semibold mb-2">Track Progress</h4>
                <p className="text-text-secondary text-sm">Stats & achievements</p>
              </div>
            </div>
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">⚡</div>
                <h4 className="text-primary font-semibold mb-2">Instant Play</h4>
                <p className="text-secondary text-sm">No registration required!</p>
              </div>
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">💬</div>
                <h4 className="text-primary font-semibold mb-2">Real-Time Chat</h4>
                <p className="text-secondary text-sm">Talk with opponents</p>
              </div>
              <div className="bg-secondary border border-border-secondary p-5 rounded-lg hover:bg-primary-light transition-all">
                <div className="text-4xl mb-3">🏆</div>
                <h4 className="text-primary font-semibold mb-2">Track Progress</h4>
                <p className="text-secondary text-sm">Stats & achievements</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
