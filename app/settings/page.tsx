'use client';

import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, isGuest } = useAuthStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--text-secondary)]">
                <i className="fi fi-rr-settings text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Settings</h1>
          </div>

          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <i className="fi fi-rr-user text-[var(--accent-green)]"></i> Profile
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-2xl font-bold text-[var(--text-primary)] border border-[var(--border-primary)]">
                  {(user?.profile?.display_name || user?.guestNickname || 'G')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {user?.profile?.display_name || user?.guestNickname || 'Guest'}
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    {isGuest ? 'Playing as Guest' : user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Game Settings */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <i className="fi fi-rr-gamepad text-[var(--accent-green)]"></i> Game Preferences
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <i className="fi fi-rr-volume text-[var(--text-secondary)]"></i>
                    <div>
                        <div className="font-semibold text-[var(--text-primary)]">Sound Effects</div>
                        <div className="text-sm text-[var(--text-tertiary)]">Enable game sounds</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-tertiary)]'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${soundEnabled ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <i className="fi fi-rr-bell text-[var(--text-secondary)]"></i>
                    <div>
                        <div className="font-semibold text-[var(--text-primary)]">Notifications</div>
                        <div className="text-sm text-[var(--text-tertiary)]">Turn notifications on/off</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotifications(!notifications)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-tertiary)]'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notifications ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
