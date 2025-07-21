-- Corrigir a função calculate_supplier_ranking para lidar com admins sem unidade
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
  -- Para admins, permitir acesso a dados de todas as unidades se não especificar uma unidade
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
        -- Se for admin sem unidade específica, mostrar todos os dados
        (get_current_user_role() = 'admin' AND management_unit_id_param IS NULL)
        -- Se especificar uma unidade, filtrar por ela
        OR (management_unit_id_param IS NOT NULL AND pb.management_unit_id = management_unit_id_param)
        -- Se não for admin, mostrar apenas sua unidade
        OR (get_current_user_role() != 'admin' AND pb.management_unit_id = get_current_user_management_unit())
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