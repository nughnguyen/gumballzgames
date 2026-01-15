'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isGuest } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { icon: 'fi fi-rr-gamepad', label: 'Play', href: '/' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] shadow-lg hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <i className="fi fi-rr-menu-burger text-xl"></i>
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] 
          flex flex-col h-[100dvh]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 flex items-center justify-center group-hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="GumballZ" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">GumballZ</h1>
              <p className="text-xs text-[var(--text-tertiary)]">Entertainment Platform</p>
            </div>
          </Link>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <i className="fi fi-rr-cross"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col overflow-y-auto">
          <div className="flex-1">
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
                        ? 'bg-[var(--accent-green)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
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
              <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase px-4 mb-2">Games</h3>
              <div className="space-y-1">
                {/* Caro - Available */}
                <Link
                  href="/games/caro"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === '/games/caro'
                      ? 'bg-[var(--board-dark)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <i className="fi fi-rr-chess-knight-alt text-2xl"></i>
                  <span className="font-semibold">Caro</span>
                </Link>
                
                {/* Battleship - New! */}
                <Link
                  href="/games/battleship"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === '/games/battleship'
                      ? 'bg-[var(--board-dark)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <i className="fi fi-rr-puzzle-alt text-2xl"></i>
                  <span className="font-semibold">Battleship</span>
                </Link>
                
                {/* Chess - Coming Soon */}
                <Link
                  href="/games/chess"
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === '/games/chess'
                      ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className="fi fi-rr-chess-knight-alt text-2xl"></i>
                    <span className="font-semibold">Chess</span>
                  </div>
                  <span className="text-xs bg-[var(--accent-orange)] px-2 py-0.5 rounded text-white">Soon</span>
                </Link>

                {/* Memory Game - New! */}
                <Link
                  href="/games/memory"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === '/games/memory'
                      ? 'bg-[var(--board-dark)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <i className="fi fi-rr-puzzle-alt text-2xl"></i>
                  <span className="font-semibold">Memory Game</span>
                </Link>

                {/* Uno - New! */}
                <Link
                  href="/games/uno"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === '/games/uno'
                      ? 'bg-[var(--board-dark)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <i className="fi fi-rr-playing-cards text-2xl"></i>
                  <span className="font-semibold">Uno</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Settings - Moved to bottom */}
          <div className="pt-4 border-t border-[var(--border-secondary)] mt-4 space-y-1">
            <Link
              href="/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive('/profile')
                  ? 'bg-[var(--accent-green)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fi fi-rr-user text-2xl"></i>
              <span className="font-semibold">Profile</span>
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive('/settings')
                  ? 'bg-[var(--accent-green)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fi fi-rr-settings text-2xl"></i>
              <span className="font-semibold">Settings</span>
            </Link>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          {user || isGuest ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)]">
                <div className="w-10 h-10 bg-[var(--accent-green)] rounded-full flex items-center justify-center text-white font-bold">
                  {(user?.profile?.display_name || user?.guestNickname || 'G')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href="/profile" className="text-[var(--text-primary)] font-semibold truncate text-sm hover:text-[var(--accent-green)] transition-colors">
                    {user?.profile?.display_name || user?.guestNickname}
                  </Link>
                  <p className="text-xs text-[var(--text-tertiary)]">{isGuest ? '👤 Guest' : '✓ Member'}</p>
                </div>
              </div>
              

              
              {isGuest && (
                <Link
                  href="/auth/login"
                  className="block w-full px-4 py-2 bg-[var(--accent-green)] hover:opacity-80 text-white text-center rounded-lg transition-all font-semibold"
                >
                  Sign Up / Login
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/auth/register"
                className="block w-full px-4 py-3 bg-[var(--accent-green)] hover:opacity-80 text-white text-center rounded-lg transition-all font-semibold"
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                className="block w-full px-4 py-3 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-center rounded-lg transition-all border border-[var(--border-primary)]"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
