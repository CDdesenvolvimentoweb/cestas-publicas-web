-- Melhorar políticas RLS para garantir isolamento de dados por unidade gestora

-- Atualizar política de price_baskets para garantir isolamento completo
DROP POLICY IF EXISTS "Users can create baskets in their unit" ON price_baskets;
DROP POLICY IF EXISTS "Users can update baskets from their unit" ON price_baskets;
DROP POLICY IF EXISTS "Users can view baskets from their unit" ON price_baskets;

-- Recriar políticas mais robustas para price_baskets
CREATE POLICY "Users can view baskets from their unit" ON price_baskets
  FOR SELECT 
  USING (
    management_unit_id = get_current_user_management_unit() OR 
    get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can create baskets in their unit" ON price_baskets
  FOR INSERT 
  WITH CHECK (
    management_unit_id = get_current_user_management_unit() AND 
    created_by = auth.uid() AND
    get_current_user_role() IN ('admin', 'servidor')
  );

CREATE POLICY "Users can update baskets from their unit" ON price_baskets
  FOR UPDATE 
  USING (
    (management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
    get_current_user_role() = 'admin'
  )
  WITH CHECK (
    (management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
    get_current_user_role() = 'admin'
  );

-- Política para deletion (apenas admins)
CREATE POLICY "Admins can delete baskets" ON price_baskets
  FOR DELETE 
  USING (get_current_user_role() = 'admin');

-- Atualizar políticas de basket_items para melhor isolamento
DROP POLICY IF EXISTS "Users can manage basket items from their unit" ON basket_items;
DROP POLICY IF EXISTS "Users can view basket items from their unit" ON basket_items;

CREATE POLICY "Users can view basket items from their unit" ON basket_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = basket_items.basket_id 
      AND (
        pb.management_unit_id = get_current_user_management_unit() OR 
        get_current_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Users can manage basket items from their unit" ON basket_items
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = basket_items.basket_id 
      AND (
        (pb.management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
        get_current_user_role() = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = basket_items.basket_id 
      AND (
        (pb.management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
        get_current_user_role() = 'admin'
      )
    )
  );

-- Melhorar políticas de supplier_quotes para isolamento
DROP POLICY IF EXISTS "Users can view quotes from their unit baskets" ON supplier_quotes;
DROP POLICY IF EXISTS "Users can create quotes for their unit baskets" ON supplier_quotes;
DROP POLICY IF EXISTS "Users can update quotes from their unit" ON supplier_quotes;

CREATE POLICY "Users can view quotes from their unit baskets" ON supplier_quotes
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = supplier_quotes.basket_id 
      AND (
        pb.management_unit_id = get_current_user_management_unit() OR 
        get_current_user_role() = 'admin'
      )
    ) OR
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_quotes.supplier_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quotes for their unit baskets" ON supplier_quotes
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = supplier_quotes.basket_id 
      AND (
        (pb.management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
        get_current_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Users can update quotes from their unit" ON supplier_quotes
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = supplier_quotes.basket_id 
      AND (
        (pb.management_unit_id = get_current_user_management_unit() AND get_current_user_role() IN ('admin', 'servidor')) OR 
        get_current_user_role() = 'admin'
      )
    ) OR
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_quotes.supplier_id 
      AND s.user_id = auth.uid()
    )
  );

-- Função para verificar se uma unidade gestora é válida e ativa
CREATE OR REPLACE FUNCTION public.is_valid_management_unit(unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM management_units 
    WHERE id = unit_id AND is_active = true
  );
$$;

-- Função para obter estatísticas de uma unidade gestora
CREATE OR REPLACE FUNCTION public.get_management_unit_stats(unit_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  active_users INTEGER;
  total_baskets INTEGER;
  active_baskets INTEGER;
BEGIN
  -- Verificar se o usuário pode acessar essas informações
  IF get_current_user_role() != 'admin' AND get_current_user_management_unit() != unit_id THEN
    RAISE EXCEPTION 'Acesso negado às estatísticas desta unidade';
  END IF;

  -- Contar usuários ativos
  SELECT COUNT(*) INTO active_users
  FROM profiles 
  WHERE management_unit_id = unit_id AND is_active = true;

  -- Contar cestas totais
  SELECT COUNT(*) INTO total_baskets
  FROM price_baskets 
  WHERE management_unit_id = unit_id;

  -- Contar cestas ativas (não finalizadas)
  SELECT COUNT(*) INTO active_baskets
  FROM price_baskets 
  WHERE management_unit_id = unit_id AND is_finalized = false;

  result := json_build_object(
    'active_users', active_users,
    'total_baskets', total_baskets,
    'active_baskets', active_baskets
  );

  RETURN result;
END;
$$;