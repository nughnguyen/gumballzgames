import { create } from 'zustand';
import { supabase } from '../supabase/client';
import type { User, Profile } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsGuest: (nickname: string) => void;
  renameGuest: (newNickname: string) => void;
  resendVerification: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isGuest: false,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Fetch profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      // Fallback: If profile missing (trigger failed previously)
      if (!profile) {
          const newProfile = {
              id: data.user.id,
              username: `user_${data.user.id.slice(0, 8)}`,
              display_name: `User ${data.user.id.slice(0, 8)}`,
          };
          const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
          if (insertError) console.error("AuthStore Login Fallback Error:", insertError);
          if (!insertError) profile = newProfile as Profile;
      }

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          profile: profile || undefined,
          isGuest: false,
        },
        isGuest: false,
      });
    }
  },

  register: async (email: string, password: string, username: string) => {
    // 1. Check if username exists (to avoid DB trigger crash on unique constraint)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Username is already taken');
    }

    // 2. Register with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Profile generation strategy:
      // 1. Try to fetch existing profile (created by DB trigger)
      // 2. If missing and we have a session, create it manually (fallback)
      
      // Wait a moment for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Fallback: Create profile if missing and we have a session (Email Sync off or similar)
      if (!profile && data.session) {
          const newProfile = {
              id: data.user.id,
              username: username || `user_${data.user.id.slice(0, 8)}`,
              display_name: username || `User ${data.user.id.slice(0, 8)}`,
          };
          
          const { error: insertError } = await supabase
              .from('profiles')
              .upsert(newProfile);

          if (insertError) console.error("AuthStore Register Fallback Error:", insertError);
              
          if (!insertError) {
              profile = newProfile as Profile;
          }
      }

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          profile: profile || undefined,
          isGuest: false,
        },
        isGuest: false,
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') localStorage.removeItem('guest_data');
    set({ user: null, isGuest: false });
  },

  loginAsGuest: (nickname: string) => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save to local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_data', JSON.stringify({
        id: guestId,
        guestNickname: nickname
      }));
    }

    set({
      user: {
        id: guestId,
        isGuest: true,
        guestNickname: nickname,
      },
      isGuest: true,
    });
  },

  renameGuest: (newNickname: string) => {
    const { user } = get();
    if (!user || user.isGuest === false) return; // Should allow if user IS guest (isGuest: true)

    // Update local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_data', JSON.stringify({
        id: user.id,
        guestNickname: newNickname
      }));
    }

    set({
      user: {
        ...user,
        guestNickname: newNickname,
      }
    });
  },

  resendVerification: async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) throw error;
  },

  verifyOtp: async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) throw error;

    if (data.user) {
         // Same profile logic as login/register to be safe
         let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
         
         if (!profile) {
              const username = data.user.user_metadata?.username;
              const newProfile = {
                  id: data.user.id,
                  username: username || `user_${data.user.id.slice(0, 8)}`,
                  display_name: username || `User ${data.user.id.slice(0, 8)}`,
              };
              const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
              if (!insertError) profile = newProfile as Profile;
         }

         set({
            user: {
                id: data.user.id,
                email: data.user.email,
                profile: profile || undefined,
                isGuest: false,
            },
            isGuest: false,
         });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user || user.isGuest) throw new Error('Must be logged in to update profile');

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // Fetch updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    set({
      user: {
        ...user,
        profile: profile || undefined,
      },
    });
  },

  checkAuth: async () => {
    set({ loading: true });
    
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      set({
        user: {
          id: session.user.id,
          email: session.user.email,
          profile: profile || undefined,
          isGuest: false,
        },
        isGuest: false,
        loading: false,
      });
    } else {
      // Check for guest data in local storage
      const guestDataStr = typeof window !== 'undefined' ? localStorage.getItem('guest_data') : null;
      if (guestDataStr) {
        try {
          const guestData = JSON.parse(guestDataStr);
          set({
            user: {
              id: guestData.id,
              isGuest: true,
              guestNickname: guestData.guestNickname,
            },
            isGuest: true,
            loading: false,
          });
        } catch (e) {
          if (typeof window !== 'undefined') localStorage.removeItem('guest_data');
          set({ user: null, isGuest: false, loading: false });
        }
      } else {
        set({ user: null, isGuest: false, loading: false });
      }
    }
  },
}));
