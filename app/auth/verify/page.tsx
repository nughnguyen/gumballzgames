'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

// Main content component that uses useSearchParams
function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to verify');
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
               <i className="fi fi-rr-envelope-open text-3xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Verify Email</h1>
            <p className="text-gray-300">Enter the verification code sent to your email.</p>
          </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
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

          {/* OTP Token */}
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <i className="fi fi-rr-key"></i>
             </div>
             <input
               type="text"
               value={token}
               onChange={(e) => setToken(e.target.value)}
               required
               className="w-full pl-11 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all font-medium tracking-widest text-lg"
               placeholder="Enter 6-digit Code"
             />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <i className="fi fi-rr-exclamation"></i>
               {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
                 <i className="fi fi-rr-spinner animate-spin"></i>
            ) : (
                 <i className="fi fi-rr-check-circle"></i>
            )}
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
      </div>
     </div>
    </div>
  );
}

// Loading fallback component
function VerifyLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1614726365723-49faaa5f2660?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center">
       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
       <div className="relative z-10">
          <i className="fi fi-rr-spinner animate-spin text-4xl text-white"></i>
       </div>
    </div>
  );
}

// Main page component wrapped in Suspense
export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyContent />
    </Suspense>
  );
}
