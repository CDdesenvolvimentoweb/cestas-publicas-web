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
    console.log('🔄 Inicializando useAuth...');
    
    // Listen for auth changes FIRST (to avoid missing events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.id);
        
        // Only synchronous state updates here
        setUser(session?.user ?? null);
        
        // Defer Supabase calls to prevent deadlocks
        if (session?.user) {
          setTimeout(() => {
            console.log('📝 Buscando perfil do usuário...');
            fetchProfile();
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Sessão inicial:', session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile();
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('📝 Iniciando busca do perfil...');
      const { profile, error } = await getUserProfile();
      
      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        // Continue with null profile instead of blocking
        setProfile(null);
      } else if (profile) {
        console.log('✅ Perfil carregado:', profile);
        setProfile(profile);
      } else {
        console.log('⚠️ Nenhum perfil encontrado');
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ Erro crítico ao buscar perfil:', error);
      setProfile(null);
    } finally {
      console.log('🏁 Finalizando carregamento...');
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