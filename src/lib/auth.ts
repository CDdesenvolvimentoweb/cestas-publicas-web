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
    console.log('🔍 Buscando perfil do usuário...');
    
    // Primeiro, obter o usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Erro ao obter usuário:', userError);
      return { profile: null, error: userError };
    }
    
    if (!user) {
      console.log('⚠️ Usuário não encontrado');
      return { profile: null, error: null };
    }
    
    console.log('👤 Usuário encontrado:', user.id, user.email);
    
    // Buscar perfil com query simples primeiro
    console.log('🔍 Fazendo consulta do perfil...');
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        cpf,
        phone,
        role,
        management_unit_id,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single(); // Usar single() em vez de maybeSingle()
    
    if (error) {
      console.error('❌ Erro na query do perfil:', error);
      // Se erro for "PGRST116" (não encontrado), retorna null sem erro
      if (error.code === 'PGRST116') {
        console.log('⚠️ Perfil não encontrado (PGRST116) para o usuário:', user.id);
        return { profile: null, error: null };
      }
      return { profile: null, error };
    }
    
    if (profile) {
      console.log('✅ Perfil encontrado:', profile.full_name, 'Role:', profile.role);
      
      // Se tem management_unit_id, buscar os dados da unidade
      if (profile.management_unit_id) {
        console.log('🏢 Buscando dados da unidade de gestão...');
        const { data: managementUnit } = await supabase
          .from('management_units')
          .select(`
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
          `)
          .eq('id', profile.management_unit_id)
          .single();
        
        if (managementUnit) {
          console.log('🏢 Unidade encontrada:', managementUnit.name);
          return { 
            profile: { 
              ...profile, 
              management_units: managementUnit 
            }, 
            error: null 
          };
        }
      }
      
      return { profile, error: null };
    } else {
      console.log('⚠️ Perfil não encontrado para o usuário:', user.id);
      return { profile: null, error: null };
    }
    
  } catch (error) {
    console.error('❌ Erro crítico na query getUserProfile:', error);
    return { profile: null, error };
  }
};