'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function BattleshipPage() {
  const [activeTab, setActiveTab] = useState<'play' | 'howto'>('play');

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-text-primary mb-3 flex items-center gap-4">
              <span className="text-6xl">⚓</span>
              Battleship
            </h1>
            <p className="text-text-secondary text-lg">
              Sink all enemy ships before they sink yours!
            </p>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-accent-orange/10 border border-accent-orange rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-3xl font-bold text-accent-orange mb-3">Coming Soon!</h2>
            <p className="text-text-secondary text-lg">
              Battleship is currently under development. Check back soon for naval combat action!
            </p>
          </div>

          {/* Tabs (Disabled) */}
          <div className="flex gap-2 mt-8 mb-6 border-b border-border-primary opacity-50">
            <button
              disabled
              className="px-6 py-3 font-semibold text-text-tertiary cursor-not-allowed"
            >
              🎮 Play
            </button>
            <button
              disabled
              className="px-6 py-3 font-semibold text-text-tertiary cursor-not-allowed"
            >
              📖 How to Play
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
