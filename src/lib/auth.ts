import { supabase } from "@/integrations/supabase/client";

export const signUp = async (email: string, password: string, userData: {
  full_name: string;
  cpf?: string;
  phone?: string;
  role: 'admin' | 'servidor' | 'fornecedor';
  management_unit_id?: string;
}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Função para limpar estado de auth
export const cleanupAuthState = () => {
  console.log('🧹 Limpando estado de autenticação...');
  
  // Remove todas as chaves do Supabase do localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove do sessionStorage também
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const signOut = async () => {
  try {
    console.log('🚪 Iniciando logout...');
    
    // Limpar estado primeiro
    cleanupAuthState();
    
    // Tentar logout global
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('❌ Erro no logout:', error);
    }
    
    return { error };
  } catch (error) {
    console.error('❌ Erro crítico no logout:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getUserProfile = async () => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        management_units (
          id,
          name,
          cities (
            id,
            name,
            states (
              id,
              name,
              code
            )
          )
        )
      `)
      .maybeSingle(); // Use maybeSingle to avoid errors when no profile found
    
    return { profile, error };
  } catch (error) {
    console.error('Erro na query getUserProfile:', error);
    return { profile: null, error };
  }
};