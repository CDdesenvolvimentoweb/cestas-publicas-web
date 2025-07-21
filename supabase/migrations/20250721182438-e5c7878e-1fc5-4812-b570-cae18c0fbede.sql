
-- Função para calcular estatísticas de uma cesta de preços
CREATE OR REPLACE FUNCTION public.calculate_basket_statistics(basket_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_items INTEGER;
  total_quantity NUMERIC;
  unique_categories INTEGER;
  unique_suppliers INTEGER;
BEGIN
  -- Verificar se o usuário pode acessar esta cesta
  IF NOT EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = basket_id_param 
    AND (
      pb.management_unit_id = get_current_user_management_unit() 
      OR get_current_user_role() = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado a esta cesta';
  END IF;

  -- Contar itens totais
  SELECT COUNT(*) INTO total_items
  FROM basket_items bi
  WHERE bi.basket_id = basket_id_param;

  -- Somar quantidades totais
  SELECT COALESCE(SUM(bi.quantity), 0) INTO total_quantity
  FROM basket_items bi
  WHERE bi.basket_id = basket_id_param;

  -- Contar categorias únicas
  SELECT COUNT(DISTINCT p.category_id) INTO unique_categories
  FROM basket_items bi
  JOIN products p ON p.id = bi.product_id
  WHERE bi.basket_id = basket_id_param;

  -- Contar fornecedores únicos (baseado em cotações)
  SELECT COUNT(DISTINCT sq.supplier_id) INTO unique_suppliers
  FROM supplier_quotes sq
  WHERE sq.basket_id = basket_id_param;

  result := json_build_object(
    'total_items', total_items,
    'total_quantity', total_quantity,
    'unique_categories', unique_categories,
    'unique_suppliers', unique_suppliers
  );

  RETURN result;
END;
$$;

-- Função para validar se uma cesta pode ser finalizada
CREATE OR REPLACE FUNCTION public.validate_basket_finalization(basket_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  is_valid BOOLEAN := true;
  errors TEXT[] := ARRAY[]::TEXT[];
  warnings TEXT[] := ARRAY[]::TEXT[];
  items_count INTEGER;
  quotes_count INTEGER;
BEGIN
  -- Verificar se o usuário pode acessar esta cesta
  IF NOT EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = basket_id_param 
    AND (
      pb.management_unit_id = get_current_user_management_unit() 
      OR get_current_user_role() = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado a esta cesta';
  END IF;

  -- Verificar se já está finalizada
  IF EXISTS (
    SELECT 1 FROM price_baskets 
    WHERE id = basket_id_param AND is_finalized = true
  ) THEN
    errors := array_append(errors, 'Cesta já está finalizada');
    is_valid := false;
  END IF;

  -- Verificar se tem itens
  SELECT COUNT(*) INTO items_count
  FROM basket_items WHERE basket_id = basket_id_param;
  
  IF items_count = 0 THEN
    errors := array_append(errors, 'Cesta deve ter pelo menos um item');
    is_valid := false;
  END IF;

  -- Verificar se tem cotações
  SELECT COUNT(*) INTO quotes_count
  FROM supplier_quotes WHERE basket_id = basket_id_param;
  
  IF quotes_count = 0 THEN
    warnings := array_append(warnings, 'Nenhuma cotação encontrada');
  END IF;

  result := json_build_object(
    'is_valid', is_valid,
    'errors', errors,
    'warnings', warnings,
    'items_count', items_count,
    'quotes_count', quotes_count
  );

  RETURN result;
END;
$$;

-- Função para obter produtos mais utilizados em cestas
CREATE OR REPLACE FUNCTION public.get_popular_basket_products(
  management_unit_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_code TEXT,
  category_name TEXT,
  usage_count BIGINT,
  avg_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permissões
  IF management_unit_id_param IS NOT NULL 
     AND management_unit_id_param != get_current_user_management_unit() 
     AND get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado aos dados desta unidade';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.code as product_code,
    pc.name as category_name,
    COUNT(bi.id) as usage_count,
    AVG(bi.quantity) as avg_quantity
  FROM basket_items bi
  JOIN products p ON p.id = bi.product_id
  JOIN product_categories pc ON pc.id = p.category_id
  JOIN price_baskets pb ON pb.id = bi.basket_id
  WHERE (
    management_unit_id_param IS NULL 
    OR pb.management_unit_id = management_unit_id_param
    OR (
      management_unit_id_param IS NULL 
      AND pb.management_unit_id = get_current_user_management_unit()
    )
  )
  AND p.is_active = true
  GROUP BY p.id, p.name, p.code, pc.name
  ORDER BY usage_count DESC, avg_quantity DESC
  LIMIT limit_param;
END;
$$;

-- Função para duplicar uma cesta (útil para criar templates)
CREATE OR REPLACE FUNCTION public.duplicate_basket(
  source_basket_id UUID,
  new_name TEXT,
  new_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_basket_id UUID;
  source_basket RECORD;
BEGIN
  -- Verificar se o usuário pode acessar a cesta origem
  SELECT * INTO source_basket
  FROM price_baskets pb 
  WHERE pb.id = source_basket_id 
  AND (
    pb.management_unit_id = get_current_user_management_unit() 
    OR get_current_user_role() = 'admin'
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cesta origem não encontrada ou acesso negado';
  END IF;

  -- Criar nova cesta
  INSERT INTO price_baskets (
    name,
    description,
    reference_date,
    calculation_type,
    management_unit_id,
    created_by,
    is_finalized
  ) VALUES (
    new_name,
    COALESCE(new_description, source_basket.description),
    CURRENT_DATE,
    source_basket.calculation_type,
    get_current_user_management_unit(),
    auth.uid(),
    false
  ) RETURNING id INTO new_basket_id;

  -- Copiar itens da cesta
  INSERT INTO basket_items (
    basket_id,
    product_id,
    quantity,
    lot_number,
    observations
  )
  SELECT 
    new_basket_id,
    product_id,
    quantity,
    lot_number,
    observations
  FROM basket_items
  WHERE basket_id = source_basket_id;

  RETURN new_basket_id;
END;
$$;
