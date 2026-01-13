'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { generateRoomCode } from '@/lib/utils/roomCode';

export default function LobbyPage() {
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
    // Generate a room code
    const roomCode = generateRoomCode();
    
    // Navigate to the game page
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-purple-900 to-secondary-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Guest Login Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Enter Your Nickname</h2>
            <p className="text-gray-300 mb-6">Choose a nickname to play as a guest</p>
            
            <input
              type="text"
              value={guestNickname}
              onChange={(e) => setGuestNickname(e.target.value)}
              placeholder="Your nickname"
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
            />
            
            <div className="flex gap-3">
              <button
                onClick={handleGuestLogin}
                disabled={guestNickname.trim().length < 3}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Login Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Lobby */}
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-purple-900 to-secondary-900 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
              <p className="text-gray-300 mt-2">
                Welcome, {user?.profile?.display_name || user?.guestNickname || 'Player'}!
              </p>
            </div>
            {!isGuest && user && (
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Join Room Section */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Join a Room</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>

          {/* Create Room Section */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create a Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Caro */}
              <button
                onClick={() => handleCreateRoom('caro')}
                className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 p-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-2">Caro</h3>
                <p className="text-blue-100">100x100 grid • Get 5 in a row!</p>
              </button>

              {/* Battleship */}
              <button
                onClick={() => handleCreateRoom('battleship')}
                className="bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 p-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-6xl mb-4">⚓</div>
                <h3 className="text-2xl font-bold text-white mb-2">Battleship</h3>
                <p className="text-red-100">Naval combat • Sink all ships!</p>
              </button>

              {/* Chess */}
              <button
                onClick={() => handleCreateRoom('chess')}
                className="bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 p-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="text-6xl mb-4">♟️</div>
                <h3 className="text-2xl font-bold text-white mb-2">Chess</h3>
                <p className="text-purple-100">Strategic battle • Checkmate!</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
