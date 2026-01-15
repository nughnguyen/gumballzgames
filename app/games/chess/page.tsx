'use client';

import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';

export default function ChessPage() {
  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 bg-[var(--bg-tertiary)] rounded-3xl flex items-center justify-center mx-auto mb-6 text-[var(--accent-blue)] border border-[var(--border-primary)] shadow-2xl">
            <i className="fi fi-rr-chess-knight-alt text-5xl"></i>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Chess</h1>
          <p className="text-[var(--text-secondary)] text-lg mb-8">
            The game of kings. Master strategy and outwit your opponent in real-time.
            Development in progress.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/"
              className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] font-semibold rounded-xl hover:bg-[var(--border-primary)] transition-all border border-[var(--border-primary)]"
            >
              Back to Home
            </Link>
            <button disabled className="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] font-semibold rounded-xl cursor-not-allowed border border-[var(--border-primary)]">
              Coming Soon
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
