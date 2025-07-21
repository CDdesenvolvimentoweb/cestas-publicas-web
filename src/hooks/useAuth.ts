import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getUserProfile } from '@/lib/auth';

export interface UserProfile {
  id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  role: 'admin' | 'servidor' | 'fornecedor';
  management_unit_id?: string;
  is_active: boolean;
  management_units?: {
    id: string;
    name: string;
    cities: {
      id: string;
      name: string;
      states: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile();
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const { profile, error } = await getUserProfile();
      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isServidor: profile?.role === 'servidor',
    isFornecedor: profile?.role === 'fornecedor',
  };
};