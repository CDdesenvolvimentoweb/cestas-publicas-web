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

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getUserProfile = async () => {
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
    .single();
  
  return { profile, error };
};