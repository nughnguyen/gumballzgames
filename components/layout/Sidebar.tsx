'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isGuest, logout } = useAuthStore();

  const navItems = [
    { icon: 'fi fi-rr-gamepad', label: 'Play', href: '/' },
    { icon: 'fi fi-rr-settings', label: 'Settings', href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-72 bg-secondary border-r border-border-primary min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border-primary">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-accent-green rounded-lg flex items-center justify-center group-hover:opacity-80 transition-opacity">
            <span className="text-2xl">♟</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">WebGames</h1>
            <p className="text-xs text-text-tertiary">Play & Win</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {/* Main Nav */}
        <div className="space-y-1 mb-6">
          {navItems.map((item) => {
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? 'bg-accent-green text-white'
                    : 'text-text-secondary hover:bg-primary-light hover:text-text-primary'
                }`}
              >
                <i className={`${item.icon} text-2xl`}></i>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Games List */}
        <div>
          <h3 className="text-xs font-bold text-text-tertiary uppercase px-4 mb-2">Games</h3>
          <div className="space-y-1">
            {/* Caro - Available */}
            <Link
              href="/games/caro"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                pathname === '/games/caro'
                  ? 'bg-board-dark text-white'
                  : 'text-text-secondary hover:bg-primary-light hover:text-text-primary'
              }`}
            >
              <span className="text-2xl">🎯</span>
              <span className="font-semibold">Caro</span>
            </Link>
            
            {/* Battleship - Coming Soon */}
            <Link
              href="/games/battleship"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                pathname === '/games/battleship'
                  ? 'bg-primary-light text-text-primary'
                  : 'text-text-secondary hover:bg-primary-light hover:text-text-primary opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚓</span>
                <span className="font-semibold">Battleship</span>
              </div>
              <span className="text-xs bg-accent-orange px-2 py-0.5 rounded text-white">Soon</span>
            </Link>
            
            {/* Chess - Coming Soon */}
            <Link
              href="/games/chess"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                pathname === '/games/chess'
                  ? 'bg-primary-light text-text-primary'
                  : 'text-text-secondary hover:bg-primary-light hover:text-text-primary opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">♟️</span>
                <span className="font-semibold">Chess</span>
              </div>
              <span className="text-xs bg-accent-orange px-2 py-0.5 rounded text-white">Soon</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border-primary">
        {user || isGuest ? (
          <div className="space-y-3">
            <div className="bg-primary rounded-lg border border-border-primary p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-accent-green rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  {(user?.profile?.display_name || user?.guestNickname || 'G')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                   <UserInfo user={user} isGuest={isGuest} />
                </div>
              </div>
              <div className="text-xs text-text-tertiary flex items-center gap-2">
                 <span>{isGuest ? '👤 Guest' : '✓ Member'}</span>
              </div>
            </div>
            
            {!isGuest && user && (
              <button
                onClick={() => logout()}
                className="w-full px-4 py-2 bg-game-lose hover:opacity-80 text-white rounded-lg transition-all font-semibold text-sm"
              >
                Logout
              </button>
            )}
            
            {isGuest && (
              <Link
                href="/auth/login"
                className="block w-full px-4 py-2 bg-accent-green hover:opacity-80 text-white text-center rounded-lg transition-all font-semibold text-sm"
              >
                Sign Up / Login
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/auth/register"
              className="block w-full px-4 py-3 bg-accent-green hover:opacity-80 text-white text-center rounded-lg transition-all font-semibold"
            >
              Sign Up
            </Link>
            <Link
              href="/auth/login"
              className="block w-full px-4 py-3 bg-primary hover:bg-primary-light text-text-primary text-center rounded-lg transition-all border border-border-primary"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

import { useState } from 'react';

function UserInfo({ user, isGuest }: { user: any, isGuest: boolean }) {
    const { renameGuest } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user?.guestNickname || '');

    if (!isGuest && user?.profile) {
        return (
            <p className="text-text-primary font-semibold truncate text-sm">
                {user.profile.display_name}
            </p>
        );
    }

    const handleSave = () => {
        if (newName.trim().length >= 3) {
            renameGuest(newName.trim());
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input 
                    className="w-full bg-secondary border border-border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none focus:border-accent-green"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave} className="text-accent-green hover:text-green-400">
                    <i className="fi fi-rr-check"></i>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group">
            <p className="text-text-primary font-semibold truncate text-sm max-w-[100px]">
                {user?.guestNickname || 'Guest'}
            </p>
            <button 
                onClick={() => {
                    setNewName(user?.guestNickname || '');
                    setIsEditing(true);
                }}
                className="text-[10px] text-accent-green hover:underline opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            >
                Change
            </button>
        </div>
    );
}
