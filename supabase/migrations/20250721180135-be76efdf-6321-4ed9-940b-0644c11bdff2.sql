
-- Corrigir políticas RLS para permitir que admins tenham acesso completo
-- Atualizar política de management_units para permitir que admins façam CRUD
DROP POLICY IF EXISTS "Users can view own management unit" ON management_units;

CREATE POLICY "Users can view management units" ON management_units
  FOR SELECT 
  USING (
    id = get_current_user_management_unit() OR 
    get_current_user_role() = 'admin'
  );

CREATE POLICY "Admins can manage management units" ON management_units
  FOR ALL 
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Permitir que admins criem e gerenciem perfis de usuários
CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT 
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE 
  USING (get_current_user_role() = 'admin');

-- Permitir que admins criem fornecedores
CREATE POLICY "Admins can manage suppliers" ON suppliers
  FOR ALL 
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Função para criar usuário completo (perfil + auth)
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_cpf TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'servidor',
  p_management_unit_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Verificar se o usuário atual é admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;

  -- Criar o usuário no auth.users (isso precisa ser feito via função administrativa)
  -- Por enquanto, vamos apenas criar o perfil e retornar instruções
  
  -- Gerar um UUID para o novo usuário
  new_user_id := gen_random_uuid();
  
  -- Criar o perfil
  INSERT INTO profiles (
    id,
    full_name,
    cpf,
    phone,
    role,
    management_unit_id,
    is_active
  ) VALUES (
    new_user_id,
    p_full_name,
    p_cpf,
    p_phone,
    p_role,
    p_management_unit_id,
    true
  );
  
  -- Retornar informações para criação manual do usuário
  result := json_build_object(
    'user_id', new_user_id,
    'email', p_email,
    'message', 'Perfil criado. Usuário deve ser criado manualmente no Supabase Auth.'
  );
  
  RETURN result;
END;
$$;

-- Atualizar perfil do usuário admin atual para ter uma unidade gestora padrão
-- Primeiro, vamos criar uma unidade gestora para administração
INSERT INTO management_units (
  id,
  name,
  cnpj,
  address,
  phone,
  email,
  is_active,
  city_id
) VALUES (
  gen_random_uuid(),
  'Administração Central',
  '27.167.444/0001-72',
  'Rua Darly Nerty Vervloet, 446 – Centro',
  '(27) 3259-3900',
  'admin@santateresa.es.gov.br',
  true,
  (SELECT id FROM cities WHERE name ILIKE '%Santa Teresa%' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Atualizar perfil admin para ter a unidade gestora de administração
UPDATE profiles 
SET management_unit_id = (
  SELECT id FROM management_units 
  WHERE name = 'Administração Central' 
  LIMIT 1
)
WHERE role = 'admin' AND management_unit_id IS NULL;
