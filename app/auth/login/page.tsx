'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Check if email is confirmed
      const user = useAuthStore.getState().user;
      if (user && !user.emailConfirmedAt) {
        router.push('/profile');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#3d3a36] via-[#312e2b] to-[#262522] opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "circOut" }}
        className="w-full max-w-md relative z-10 p-4"
      >
        <div className="bg-secondary shadow-2xl rounded-xl border border-border-primary overflow-hidden relative">
          {/* Close Button */}
          <Link href="/?skip_welcome=true" className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors p-1 z-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center bg-secondary-dark/50 border-b border-border-secondary">
            <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-text-tertiary text-sm">Log in to play your moves</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">
                  Email Address
                </label>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-tertiary group-focus-within:text-accent-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border border-border-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between items-center ml-1">
                  <label htmlFor="password" className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-xs text-accent-green hover:underline">Forgot?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-tertiary group-focus-within:text-accent-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border border-border-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-game-lose/10 border border-game-lose text-game-lose px-4 py-3 rounded-lg text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent-green hover:brightness-110 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-green-900/20 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
              >
                {loading ? (
                   <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Log In'}
              </button>
            </form>
          </div>

          <div className="bg-secondary-dark/50 px-8 py-4 border-t border-border-primary text-center">
            <p className="text-text-secondary text-sm">
              New here?{' '}
              <Link href="/auth/register" className="text-text-primary hover:text-accent-green font-semibold transition-colors">
                Create an account
              </Link>
            </p>
             <div className="mt-3 pt-3 border-t border-border-secondary">
               <p className="text-text-secondary text-sm mb-3">
                  Just want to play?{' '}
                  <Link href="/?guest_mode=true" className="text-accent-green font-semibold hover:underline">
                      Play as Guest
                  </Link>
               </p>
               <Link href="/" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                  ← Back to Home
               </Link>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
