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
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

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
      // Profile is created automatically by database trigger (handle_new_user)
      
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the created profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

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
    if (!user || !user.isGuest) return;

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
