'use client';

import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isGuest, updateProfile, renameGuest, loading } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.profile?.display_name || user.guestNickname || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      if (isGuest) {
        renameGuest(displayName.trim());
        setMessage({ type: 'success', text: 'Guest nickname updated successfully!' });
      } else {
        await updateProfile({ display_name: displayName.trim() });
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error) {
        console.error("Failed to update profile", error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
            <div className="text-[var(--text-primary)]">Loading...</div>
        </div>
     );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Email Verification Warning */}
          {!isGuest && user && !user.emailConfirmedAt && (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
              <i className="fi fi-rr-exclamation text-yellow-500 mt-1"></i>
              <div>
                <h3 className="font-bold text-yellow-500">Please Verify Your Email</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  We've sent a verification link to <strong>{user.email}</strong>. 
                  Please check your inbox to complete your registration.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--accent-green)] border border-[var(--border-primary)]">
                <i className="fi fi-rr-user text-2xl"></i>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Your Profile</h1>
                <p className="text-[var(--text-secondary)]">Manage your personal information</p>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-8 shadow-sm">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center text-4xl font-bold text-[var(--text-primary)] border-2 border-[var(--border-primary)] mb-4">
                {(displayName || user?.email || 'G')[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {displayName || 'Guest User'}
                </h2>
                <p className="text-[var(--text-secondary)] lowercase">
                   {isGuest ? 'Guest Account' : user?.profile?.username ? `@${user.profile.username}` : user?.email}
                </p>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Display Name
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fi fi-rr-id-badge text-[var(--text-tertiary)]"></i>
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] transition-all"
                      placeholder="Enter your display name"
                      minLength={3}
                      maxLength={20}
                    />
                </div>
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    This is how other players will see you.
                </p>
              </div>

               {/* Email Field - Read Only if logged in */}
               {!isGuest && (
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Email Address
                    </label>
                    <div className="relative opacity-70">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i className="fi fi-rr-envelope text-[var(--text-tertiary)]"></i>
                        </div>
                        <input
                        type="text"
                        value={user?.email || ''}
                        readOnly
                        className="w-full pl-11 pr-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] cursor-not-allowed"
                        />
                    </div>
                     <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        Email cannot be changed.
                    </p>
                </div>
               )}

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  message.type === 'success' 
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  <i className={`fi ${message.type === 'success' ? 'fi-rr-check-circle' : 'fi-rr-cross-circle'}`}></i>
                  <span>{message.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex gap-4">
                 <button
                  type="submit"
                  disabled={isSaving || !displayName.trim() || displayName === (user?.profile?.display_name || user?.guestNickname)}
                  className="flex-1 py-3 bg-[var(--accent-green)] hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? <i className="fi fi-rr-spinner animate-spin"></i> : <i className="fi fi-rr-disk"></i>}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
            
          {/* Guest Upsell */}
          {isGuest && (
             <div className="mt-8 bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-2xl p-8 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Create an Account</h3>
                        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                            Sign up to save your stats, keep your display name, and play on multiple devices.
                        </p>
                        <Link 
                            href="/auth/register"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold rounded-xl hover:opacity-90 transition-all"
                        >
                            Sign Up Now
                        </Link>
                    </div>
                    <div className="hidden md:block text-[var(--accent-green)] opacity-20">
                         <i className="fi fi-rr-shield-check text-9xl"></i>
                    </div>
                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
}
