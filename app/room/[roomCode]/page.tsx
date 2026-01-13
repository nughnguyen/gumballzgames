'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRoomByCode } from '@/lib/supabase/rooms';

export default function RoomRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function redirectToGame() {
      if (!roomCode) {
        setError('Invalid room code');
        setLoading(false);
        return;
      }

      try {
        const room = await getRoomByCode(roomCode);

        if (!room) {
          setError('Room not found. Please check the room code and try again.');
          setLoading(false);
          return;
        }

        if (room.status === 'finished') {
          setError('This game has already finished.');
          setLoading(false);
          return;
        }

        // Redirect to the appropriate game page
        router.replace(`/game/${room.game_type}/${roomCode}`);
      } catch (err) {
        console.error('Error looking up room:', err);
        setError('An error occurred. Please try again.');
        setLoading(false);
      }
    }

    redirectToGame();
  }, [roomCode, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-purple-900 to-secondary-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Looking for room {roomCode}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-purple-900 to-secondary-900 p-8">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Room Not Found</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
