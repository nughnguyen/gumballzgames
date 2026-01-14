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

  /**
   * Login with Email and Password
   */
  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Clear any guest data
        if (typeof window !== 'undefined') localStorage.removeItem('guest_data');

        // Fetch profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        // Resilience: If profile is missing (rare trigger failure), create it on the fly
        if (!profile) {
            console.warn("Profile missing for user, attempting recreation...");
            const newProfile = {
                id: data.user.id,
                username: `user_${data.user.id.slice(0, 8)}`,
                display_name: `User ${data.user.id.slice(0, 8)}`,
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
          loading: false,
        });
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  /**
   * Register Logic
   */
  register: async (email: string, password: string, username: string) => {
    set({ loading: true });
    try {
      // 1. Pre-check username availability
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      // 2. Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username, // Map username to full_name for trigger
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Wait briefly for DB trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Fallback profile creation
        if (!profile && data.session) {
            const newProfile = {
                id: data.user.id,
                username: username || `user_${data.user.id.slice(0, 8)}`,
                display_name: username,
            };
            await supabase.from('profiles').upsert(newProfile);
            profile = newProfile as Profile;
        }

        set({
          user: {
            id: data.user.id,
            email: data.user.email,
            profile: profile || undefined,
            isGuest: false,
          },
          isGuest: false,
          loading: false,
        });
      }
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  /**
   * Logout Logic
   */
  logout: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') localStorage.removeItem('guest_data');
    set({ user: null, isGuest: false, loading: false });
  },

  /**
   * Guest Mode Logic
   */
  loginAsGuest: (nickname: string) => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const guestUser = {
      id: guestId,
      isGuest: true,
      guestNickname: nickname,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_data', JSON.stringify(guestUser));
    }

    set({
      user: guestUser,
      isGuest: true,
      loading: false
    });
  },

  /**
   * Rename Guest
   */
  renameGuest: (newNickname: string) => {
    const { user } = get();
    if (!user || !user.isGuest) return;

    const updatedUser = {
      ...user,
      guestNickname: newNickname,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_data', JSON.stringify(updatedUser));
    }

    set({
      user: updatedUser,
      isGuest: true,
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
                  display_name: username,
              };
              await supabase.from('profiles').upsert(newProfile);
              profile = newProfile as Profile;
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
    
    // 1. Check Supabase Session
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
      return;
    } 
    
    // 2. Check Guest Session
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
        return;
      } catch (e) {
        console.error("Failed to parse guest data", e);
        if (typeof window !== 'undefined') localStorage.removeItem('guest_data');
      }
    }

    // 3. No User
    set({ user: null, isGuest: false, loading: false });
  },
}));
