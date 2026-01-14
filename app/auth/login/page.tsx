// Login Page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';

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
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1614726365723-49faaa5f2660?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-green-400 to-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
               <i className="fi fi-rr-user text-3xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300">Enter your credentials to continue</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
               {/* Email Input */}
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fi fi-rr-envelope"></i>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all font-medium"
                    placeholder="Email Address"
                  />
               </div>

               {/* Password Input */}
               <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <i className="fi fi-rr-lock"></i>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all font-medium"
                    placeholder="Password"
                  />
               </div>
            </div>

            {error && (
              <div className="flex flex-col gap-2">
                <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                  <i className="fi fi-rr-exclamation"></i>
                  {error}
                </div>
                {error.includes('Email not confirmed') && (
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => router.push(`/auth/verify?email=${encodeURIComponent(email)}`)}
                            className="text-sm text-blue-300 hover:text-blue-200 underline text-center font-semibold"
                        >
                            Enter Verification Code
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    await useAuthStore.getState().resendVerification(email);
                                    alert("Verification email sent! Please check your inbox.");
                                } catch (e: any) {
                                    alert(e.message);
                                }
                            }}
                            className="text-xs text-green-400 hover:text-green-300 underline text-center"
                        >
                            Resend Verification Email
                        </button>
                    </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                  <i className="fi fi-rr-spinner animate-spin"></i>
              ) : (
                  <i className="fi fi-rr-sign-in-alt"></i>
              )}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4 text-center">
             <Link href="/auth/register" className="text-white/80 hover:text-white transition-colors text-sm">
                Don't have an account? <span className="font-bold text-green-400 hover:underline">Create one</span>
             </Link>
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                   <span className="px-2 bg-transparent text-gray-400 bg-[#1a1f3c]/0 backdrop-blur-3xl rounded">or</span>
                </div>
             </div>
             <Link href="/" className="text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors flex items-center justify-center gap-2 group">
                Continue as Guest <i className="fi fi-rr-arrow-right group-hover:translate-x-1 transition-transform"></i>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
