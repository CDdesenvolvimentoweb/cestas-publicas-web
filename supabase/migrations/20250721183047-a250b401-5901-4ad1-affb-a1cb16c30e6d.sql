
-- Melhorar a função de envio de cotações com mais validações
CREATE OR REPLACE FUNCTION public.send_quotation_batch(
  basket_id_param UUID,
  supplier_ids UUID[],
  due_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  supplier_id UUID;
  quote_id UUID;
  errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar se o usuário pode enviar cotações para esta cesta
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

  -- Verificar se a cesta está finalizada
  IF NOT EXISTS (
    SELECT 1 FROM price_baskets 
    WHERE id = basket_id_param AND is_finalized = true
  ) THEN
    RAISE EXCEPTION 'Apenas cestas finalizadas podem receber cotações';
  END IF;

  -- Processar cada fornecedor
  FOREACH supplier_id IN ARRAY supplier_ids LOOP
    BEGIN
      -- Verificar se já existe cotação para este fornecedor
      IF EXISTS (
        SELECT 1 FROM supplier_quotes 
        WHERE basket_id = basket_id_param AND supplier_id = supplier_id
      ) THEN
        errors := array_append(errors, 'Cotação já existe para fornecedor: ' || supplier_id);
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Criar nova cotação
      INSERT INTO supplier_quotes (
        basket_id,
        supplier_id,
        due_date,
        status
      ) VALUES (
        basket_id_param,
        supplier_id,
        due_date_param,
        'pendente'
      ) RETURNING id INTO quote_id;

      -- Criar itens da cotação baseados na cesta
      INSERT INTO quote_items (
        quote_id,
        basket_item_id
      )
      SELECT 
        quote_id,
        bi.id
      FROM basket_items bi
      WHERE bi.basket_id = basket_id_param;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      errors := array_append(errors, 'Erro ao processar fornecedor ' || supplier_id || ': ' || SQLERRM);
      error_count := error_count + 1;
    END;
  END LOOP;

  result := json_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors,
    'total_processed', array_length(supplier_ids, 1)
  );

  RETURN result;
END;
$$;

-- Função para calcular ranking de fornecedores
CREATE OR REPLACE FUNCTION public.calculate_supplier_ranking(
  management_unit_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  total_quotes INTEGER,
  responded_quotes INTEGER,
  response_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  total_value NUMERIC,
  avg_discount_percentage NUMERIC,
  ranking_score NUMERIC
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
  WITH supplier_stats AS (
    SELECT 
      s.id as supplier_id,
      s.company_name as supplier_name,
      COUNT(sq.id) as total_quotes,
      COUNT(sq.id) FILTER (WHERE sq.status = 'respondida') as responded_quotes,
      CASE 
        WHEN COUNT(sq.id) > 0 THEN 
          ROUND((COUNT(sq.id) FILTER (WHERE sq.status = 'respondida')::NUMERIC / COUNT(sq.id)::NUMERIC) * 100, 2)
        ELSE 0 
      END as response_rate,
      CASE 
        WHEN COUNT(sq.responded_at) > 0 THEN
          ROUND(AVG(EXTRACT(EPOCH FROM (sq.responded_at - sq.sent_at)) / 3600), 2)
        ELSE NULL
      END as avg_response_time_hours,
      COALESCE(SUM(
        (SELECT SUM(qi.total_price) FROM quote_items qi WHERE qi.quote_id = sq.id)
      ), 0) as total_value
    FROM suppliers s
    LEFT JOIN supplier_quotes sq ON sq.supplier_id = s.id
    LEFT JOIN price_baskets pb ON pb.id = sq.basket_id
    WHERE s.is_active = true
      AND (
        management_unit_id_param IS NULL 
        OR pb.management_unit_id = management_unit_id_param
        OR (
          management_unit_id_param IS NULL 
          AND pb.management_unit_id = get_current_user_management_unit()
        )
      )
      AND (sq.created_at IS NULL OR sq.created_at >= (CURRENT_DATE - days_back))
    GROUP BY s.id, s.company_name
  )
  SELECT 
    ss.supplier_id,
    ss.supplier_name,
    ss.total_quotes,
    ss.responded_quotes,
    ss.response_rate,
    ss.avg_response_time_hours,
    ss.total_value,
    0::NUMERIC as avg_discount_percentage, -- Placeholder para futura implementação
    -- Cálculo do score de ranking (pode ser ajustado)
    CASE 
      WHEN ss.total_quotes = 0 THEN 0
      ELSE ROUND(
        (ss.response_rate * 0.4) + 
        (CASE WHEN ss.avg_response_time_hours IS NULL THEN 0 
              WHEN ss.avg_response_time_hours <= 24 THEN 30
              WHEN ss.avg_response_time_hours <= 48 THEN 20
              WHEN ss.avg_response_time_hours <= 72 THEN 10
              ELSE 5 END * 0.3) +
        (LEAST(ss.total_quotes, 20) * 1.5), -- Máximo 30 pontos por volume
      2)
    END as ranking_score
  FROM supplier_stats ss
  ORDER BY ranking_score DESC, response_rate DESC;
END;
$$;

-- Função para gerar relatório de cotações
CREATE OR REPLACE FUNCTION public.generate_quotation_report(
  basket_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  basket_info RECORD;
  quotes_summary JSON;
  items_analysis JSON;
  best_prices JSON;
BEGIN
  -- Verificar acesso à cesta
  SELECT * INTO basket_info
  FROM price_baskets pb 
  WHERE pb.id = basket_id_param 
  AND (
    pb.management_unit_id = get_current_user_management_unit() 
    OR get_current_user_role() = 'admin'
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso negado a esta cesta';
  END IF;

  -- Resumo das cotações
  SELECT json_build_object(
    'total_sent', COUNT(*),
    'responded', COUNT(*) FILTER (WHERE status = 'respondida'),
    'pending', COUNT(*) FILTER (WHERE status = 'pendente'),
    'expired', COUNT(*) FILTER (WHERE status = 'vencida'),
    'response_rate', CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'respondida')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0 
    END
  ) INTO quotes_summary
  FROM supplier_quotes sq
  WHERE sq.basket_id = basket_id_param;

  -- Análise dos itens
  SELECT json_agg(json_build_object(
    'product_name', p.name,
    'total_quantity', bi.quantity,
    'quotes_received', COALESCE(qi_count.count, 0),
    'min_price', COALESCE(qi_prices.min_price, 0),
    'max_price', COALESCE(qi_prices.max_price, 0),
    'avg_price', COALESCE(qi_prices.avg_price, 0)
  )) INTO items_analysis
  FROM basket_items bi
  JOIN products p ON p.id = bi.product_id
  LEFT JOIN (
    SELECT 
      qi.basket_item_id,
      COUNT(*) as count
    FROM quote_items qi
    JOIN supplier_quotes sq ON sq.id = qi.quote_id
    WHERE sq.basket_id = basket_id_param AND qi.unit_price IS NOT NULL
    GROUP BY qi.basket_item_id
  ) qi_count ON qi_count.basket_item_id = bi.id
  LEFT JOIN (
    SELECT 
      qi.basket_item_id,
      MIN(qi.unit_price) as min_price,
      MAX(qi.unit_price) as max_price,
      AVG(qi.unit_price) as avg_price
    FROM quote_items qi
    JOIN supplier_quotes sq ON sq.id = qi.quote_id
    WHERE sq.basket_id = basket_id_param AND qi.unit_price IS NOT NULL
    GROUP BY qi.basket_item_id
  ) qi_prices ON qi_prices.basket_item_id = bi.id
  WHERE bi.basket_id = basket_id_param;

  -- Melhores preços por fornecedor
  SELECT json_agg(json_build_object(
    'supplier_name', s.company_name,
    'total_quoted', COALESCE(quote_totals.total, 0),
    'items_quoted', COALESCE(quote_totals.items_count, 0),
    'avg_unit_price', COALESCE(quote_totals.avg_price, 0)
  )) INTO best_prices
  FROM suppliers s
  JOIN supplier_quotes sq ON sq.supplier_id = s.id
  LEFT JOIN (
    SELECT 
      sq.id as quote_id,
      SUM(qi.total_price) as total,
      COUNT(qi.id) as items_count,
      AVG(qi.unit_price) as avg_price
    FROM supplier_quotes sq
    JOIN quote_items qi ON qi.quote_id = sq.id
    WHERE sq.basket_id = basket_id_param AND qi.unit_price IS NOT NULL
    GROUP BY sq.id
  ) quote_totals ON quote_totals.quote_id = sq.id
  WHERE sq.basket_id = basket_id_param;

  result := json_build_object(
    'basket_info', json_build_object(
      'id', basket_info.id,
      'name', basket_info.name,
      'reference_date', basket_info.reference_date,
      'calculation_type', basket_info.calculation_type
    ),
    'quotes_summary', quotes_summary,
    'items_analysis', items_analysis,
    'suppliers_performance', best_prices,
    'generated_at', now()
  );

  RETURN result;
END;
$$;

-- Atualizar trigger para notificações automáticas
CREATE OR REPLACE FUNCTION public.handle_quotation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Quando uma cotação é respondida, atualizar timestamp
  IF OLD.status != 'respondida' AND NEW.status = 'respondida' THEN
    NEW.responded_at = now();
  END IF;

  -- Quando uma cotação expira, marcar como vencida se ainda pendente
  IF OLD.status = 'pendente' AND NEW.due_date < now() THEN
    NEW.status = 'vencida';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS quotation_status_trigger ON supplier_quotes;
CREATE TRIGGER quotation_status_trigger
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_quotation_status_change();

-- Função para validar assinatura digital (placeholder)
CREATE OR REPLACE FUNCTION public.validate_digital_signature(
  quote_id_param UUID,
  signature_data TEXT,
  certificate_data TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Placeholder para validação de assinatura digital
  -- Em produção, implementar validação real com certificados digitais
  
  -- Verificar se a cotação existe e pertence ao fornecedor correto
  IF NOT EXISTS (
    SELECT 1 FROM supplier_quotes sq
    JOIN suppliers s ON s.id = sq.supplier_id
    WHERE sq.id = quote_id_param AND s.user_id = auth.uid()
  ) THEN
    RETURN FALSE;
  END IF;

  -- Atualizar cotação com dados da assinatura
  UPDATE supplier_quotes 
  SET 
    digital_signature = signature_data,
    signature_certificate = certificate_data,
    status = 'respondida',
    responded_at = now()
  WHERE id = quote_id_param;

  RETURN TRUE;
END;
$$;
