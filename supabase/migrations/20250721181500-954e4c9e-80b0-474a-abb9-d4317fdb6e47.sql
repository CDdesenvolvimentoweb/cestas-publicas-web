
-- Criar tabela para solicitações de novos produtos
CREATE TABLE public.product_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users NOT NULL,
  management_unit_id UUID REFERENCES public.management_units(id) NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  description TEXT,
  specification TEXT,
  anvisa_code TEXT,
  category_id UUID REFERENCES public.product_categories(id),
  measurement_unit_id UUID REFERENCES public.measurement_units(id),
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES auth.users,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar trigger para updated_at
CREATE TRIGGER update_product_requests_updated_at
    BEFORE UPDATE ON public.product_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS para product_requests
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias solicitações e de sua unidade
CREATE POLICY "Users can view requests from their unit" 
  ON public.product_requests 
  FOR SELECT 
  USING (
    management_unit_id = get_current_user_management_unit() 
    OR get_current_user_role() = 'admin'
  );

-- Usuários podem criar solicitações para sua unidade
CREATE POLICY "Users can create requests for their unit" 
  ON public.product_requests 
  FOR INSERT 
  WITH CHECK (
    management_unit_id = get_current_user_management_unit() 
    AND requester_id = auth.uid()
    AND get_current_user_role() IN ('admin', 'servidor')
  );

-- Usuários podem atualizar suas próprias solicitações se ainda pendentes
CREATE POLICY "Users can update own pending requests" 
  ON public.product_requests 
  FOR UPDATE 
  USING (
    requester_id = auth.uid() 
    AND status = 'pendente'
    AND get_current_user_role() IN ('admin', 'servidor')
  );

-- Admins podem atualizar qualquer solicitação
CREATE POLICY "Admins can update any request" 
  ON public.product_requests 
  FOR UPDATE 
  USING (get_current_user_role() = 'admin');

-- Criar índices únicos para evitar duplicações
CREATE UNIQUE INDEX idx_products_code_unique 
  ON public.products(code) 
  WHERE code IS NOT NULL AND is_active = true;

CREATE UNIQUE INDEX idx_products_anvisa_code_unique 
  ON public.products(anvisa_code) 
  WHERE anvisa_code IS NOT NULL AND is_active = true;

-- Função para verificar duplicação de produtos
CREATE OR REPLACE FUNCTION public.check_product_duplication(
  product_name_param TEXT,
  product_code_param TEXT DEFAULT NULL,
  anvisa_code_param TEXT DEFAULT NULL,
  exclude_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_products JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'id', id,
    'name', name,
    'code', code,
    'anvisa_code', anvisa_code,
    'match_type', CASE 
      WHEN LOWER(name) = LOWER(product_name_param) THEN 'name'
      WHEN code = product_code_param AND product_code_param IS NOT NULL THEN 'code'
      WHEN anvisa_code = anvisa_code_param AND anvisa_code_param IS NOT NULL THEN 'anvisa_code'
      ELSE 'partial'
    END
  )) INTO duplicate_products
  FROM public.products
  WHERE is_active = true
    AND (exclude_id IS NULL OR id != exclude_id)
    AND (
      LOWER(name) = LOWER(product_name_param)
      OR (code = product_code_param AND product_code_param IS NOT NULL)
      OR (anvisa_code = anvisa_code_param AND anvisa_code_param IS NOT NULL)
      OR (
        LOWER(name) ILIKE '%' || LOWER(product_name_param) || '%'
        OR LOWER(product_name_param) ILIKE '%' || LOWER(name) || '%'
      )
    );

  RETURN COALESCE(duplicate_products, '[]'::json);
END;
$$;

-- Função para aprovar solicitação de produto
CREATE OR REPLACE FUNCTION public.approve_product_request(
  request_id UUID,
  admin_response_param TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_data RECORD;
  new_product_id UUID;
BEGIN
  -- Verificar se o usuário é admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar solicitações';
  END IF;

  -- Buscar dados da solicitação
  SELECT * INTO request_data
  FROM public.product_requests
  WHERE id = request_id AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já processada';
  END IF;

  -- Verificar duplicações antes de criar
  IF EXISTS (
    SELECT 1 FROM public.products 
    WHERE is_active = true 
    AND (
      LOWER(name) = LOWER(request_data.product_name)
      OR (code = request_data.product_code AND request_data.product_code IS NOT NULL)
      OR (anvisa_code = request_data.anvisa_code AND request_data.anvisa_code IS NOT NULL)
    )
  ) THEN
    RAISE EXCEPTION 'Produto com nome, código ou código ANVISA já existe';
  END IF;

  -- Criar o produto
  INSERT INTO public.products (
    name, code, description, specification, anvisa_code,
    category_id, measurement_unit_id, is_active
  ) VALUES (
    request_data.product_name,
    request_data.product_code,
    request_data.description,
    request_data.specification,
    request_data.anvisa_code,
    request_data.category_id,
    request_data.measurement_unit_id,
    true
  ) RETURNING id INTO new_product_id;

  -- Atualizar status da solicitação
  UPDATE public.product_requests
  SET 
    status = 'aprovado',
    admin_response = admin_response_param,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id;

  RETURN new_product_id;
END;
$$;

-- Função para rejeitar solicitação de produto
CREATE OR REPLACE FUNCTION public.reject_product_request(
  request_id UUID,
  admin_response_param TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem rejeitar solicitações';
  END IF;

  -- Atualizar status da solicitação
  UPDATE public.product_requests
  SET 
    status = 'rejeitado',
    admin_response = admin_response_param,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou já processada';
  END IF;
END;
$$;

-- Adicionar função para buscar produtos similares
CREATE OR REPLACE FUNCTION public.search_similar_products(
  search_term TEXT,
  limit_param INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  anvisa_code TEXT,
  category_name TEXT,
  measurement_unit TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.code,
    p.anvisa_code,
    pc.name as category_name,
    mu.name as measurement_unit,
    CASE 
      WHEN LOWER(p.name) = LOWER(search_term) THEN 1.0
      WHEN LOWER(p.name) ILIKE LOWER(search_term) || '%' THEN 0.9
      WHEN LOWER(p.name) ILIKE '%' || LOWER(search_term) || '%' THEN 0.7
      WHEN LOWER(p.code) = LOWER(search_term) THEN 0.8
      WHEN LOWER(p.anvisa_code) = LOWER(search_term) THEN 0.8
      ELSE 0.5
    END as similarity_score
  FROM public.products p
  LEFT JOIN public.product_categories pc ON pc.id = p.category_id
  LEFT JOIN public.measurement_units mu ON mu.id = p.measurement_unit_id
  WHERE p.is_active = true
    AND (
      LOWER(p.name) ILIKE '%' || LOWER(search_term) || '%'
      OR LOWER(p.code) ILIKE '%' || LOWER(search_term) || '%'
      OR LOWER(p.anvisa_code) ILIKE '%' || LOWER(search_term) || '%'
      OR LOWER(p.description) ILIKE '%' || LOWER(search_term) || '%'
    )
  ORDER BY similarity_score DESC, p.name
  LIMIT limit_param;
END;
$$;
