
-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('quote_request', 'quote_response', 'quote_reminder', 'system', 'report_ready')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela de histórico de ações
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de configurações de notificação
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  quote_reminders BOOLEAN DEFAULT TRUE,
  quote_responses BOOLEAN DEFAULT TRUE,
  system_updates BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de relatórios gerados
CREATE TABLE public.generated_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_by UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  parameters JSONB,
  file_url TEXT,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Políticas RLS para activity_logs
CREATE POLICY "Users can view own activity" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON public.activity_logs
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "System can create activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (true);

-- Políticas RLS para notification_preferences
CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Políticas RLS para generated_reports
CREATE POLICY "Users can view own reports" ON public.generated_reports
  FOR SELECT USING (generated_by = auth.uid());

CREATE POLICY "Users can create reports" ON public.generated_reports
  FOR INSERT WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Users can update own reports" ON public.generated_reports
  FOR UPDATE USING (generated_by = auth.uid());

-- Função para criar notificação
CREATE OR REPLACE FUNCTION public.create_notification(
  user_id_param UUID,
  type_param TEXT,
  title_param TEXT,
  message_param TEXT,
  data_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (user_id_param, type_param, title_param, message_param, data_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = TRUE, read_at = now()
  WHERE id = notification_id_param AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Função para registrar atividade
CREATE OR REPLACE FUNCTION public.log_activity(
  action_type_param TEXT,
  entity_type_param TEXT,
  entity_id_param UUID,
  description_param TEXT,
  metadata_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, description, metadata
  )
  VALUES (
    auth.uid(), action_type_param, entity_type_param, 
    entity_id_param, description_param, metadata_param
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Função para análise de tendências de preços
CREATE OR REPLACE FUNCTION public.analyze_price_trends(
  product_id_param UUID DEFAULT NULL,
  management_unit_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category_name TEXT,
  avg_price NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  price_variance NUMERIC,
  trend_direction TEXT,
  quote_count INTEGER
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
  WITH price_data AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      pc.name as category_name,
      qi.unit_price,
      qi.created_at,
      COUNT(*) OVER (PARTITION BY p.id) as quote_count
    FROM products p
    JOIN product_categories pc ON pc.id = p.category_id
    JOIN basket_items bi ON bi.product_id = p.id
    JOIN quote_items qi ON qi.basket_item_id = bi.id
    JOIN supplier_quotes sq ON sq.id = qi.quote_id
    JOIN price_baskets pb ON pb.id = sq.basket_id
    WHERE qi.unit_price IS NOT NULL
      AND qi.created_at >= (CURRENT_DATE - days_back)
      AND (product_id_param IS NULL OR p.id = product_id_param)
      AND (
        management_unit_id_param IS NULL 
        OR pb.management_unit_id = management_unit_id_param
        OR (
          management_unit_id_param IS NULL 
          AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
        )
      )
  ),
  price_stats AS (
    SELECT 
      pd.product_id,
      pd.product_name,
      pd.category_name,
      AVG(pd.unit_price) as avg_price,
      MIN(pd.unit_price) as min_price,
      MAX(pd.unit_price) as max_price,
      STDDEV(pd.unit_price) as price_variance,
      pd.quote_count,
      -- Calcular tendência simples (últimos 30 dias vs 30-60 dias atrás)
      AVG(CASE WHEN pd.created_at >= (CURRENT_DATE - 30) THEN pd.unit_price END) as recent_avg,
      AVG(CASE WHEN pd.created_at < (CURRENT_DATE - 30) AND pd.created_at >= (CURRENT_DATE - 60) THEN pd.unit_price END) as older_avg
    FROM price_data pd
    GROUP BY pd.product_id, pd.product_name, pd.category_name, pd.quote_count
  )
  SELECT 
    ps.product_id,
    ps.product_name,
    ps.category_name,
    ROUND(ps.avg_price, 2) as avg_price,
    ROUND(ps.min_price, 2) as min_price,
    ROUND(ps.max_price, 2) as max_price,
    ROUND(COALESCE(ps.price_variance, 0), 2) as price_variance,
    CASE 
      WHEN ps.recent_avg IS NULL OR ps.older_avg IS NULL THEN 'insufficient_data'
      WHEN ps.recent_avg > ps.older_avg * 1.05 THEN 'increasing'
      WHEN ps.recent_avg < ps.older_avg * 0.95 THEN 'decreasing'
      ELSE 'stable'
    END as trend_direction,
    ps.quote_count::INTEGER
  FROM price_stats ps
  WHERE ps.quote_count >= 3 -- Mínimo de 3 cotações para análise
  ORDER BY ps.avg_price DESC;
END;
$$;

-- Função para estatísticas do dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_statistics(
  management_unit_id_param UUID DEFAULT NULL,
  days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_baskets INTEGER;
  total_quotes INTEGER;
  avg_response_rate NUMERIC;
  total_savings NUMERIC;
  active_suppliers INTEGER;
BEGIN
  -- Verificar permissões
  IF management_unit_id_param IS NOT NULL 
     AND management_unit_id_param != get_current_user_management_unit() 
     AND get_current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Acesso negado aos dados desta unidade';
  END IF;

  -- Total de cestas no período
  SELECT COUNT(*) INTO total_baskets
  FROM price_baskets pb
  WHERE pb.created_at >= (CURRENT_DATE - days_back)
    AND (
      management_unit_id_param IS NULL 
      OR pb.management_unit_id = management_unit_id_param
      OR (
        management_unit_id_param IS NULL 
        AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
      )
    );

  -- Total de cotações no período
  SELECT COUNT(*) INTO total_quotes
  FROM supplier_quotes sq
  JOIN price_baskets pb ON pb.id = sq.basket_id
  WHERE sq.created_at >= (CURRENT_DATE - days_back)
    AND (
      management_unit_id_param IS NULL 
      OR pb.management_unit_id = management_unit_id_param
      OR (
        management_unit_id_param IS NULL 
        AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
      )
    );

  -- Taxa média de resposta
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE sq.status = 'respondida')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0 
    END INTO avg_response_rate
  FROM supplier_quotes sq
  JOIN price_baskets pb ON pb.id = sq.basket_id
  WHERE sq.created_at >= (CURRENT_DATE - days_back)
    AND (
      management_unit_id_param IS NULL 
      OR pb.management_unit_id = management_unit_id_param
      OR (
        management_unit_id_param IS NULL 
        AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
      )
    );

  -- Fornecedores ativos (que responderam pelo menos uma cotação)
  SELECT COUNT(DISTINCT sq.supplier_id) INTO active_suppliers
  FROM supplier_quotes sq
  JOIN price_baskets pb ON pb.id = sq.basket_id
  WHERE sq.status = 'respondida'
    AND sq.created_at >= (CURRENT_DATE - days_back)
    AND (
      management_unit_id_param IS NULL 
      OR pb.management_unit_id = management_unit_id_param
      OR (
        management_unit_id_param IS NULL 
        AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
      )
    );

  -- Placeholder para economias (implementar quando houver preços de referência)
  total_savings := 0;

  result := json_build_object(
    'total_baskets', total_baskets,
    'total_quotes', total_quotes,
    'avg_response_rate', avg_response_rate,
    'total_savings', total_savings,
    'active_suppliers', active_suppliers,
    'period_days', days_back,
    'generated_at', now()
  );

  RETURN result;
END;
$$;

-- Trigger para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION public.trigger_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log para criação de cotações
  IF TG_TABLE_NAME = 'supplier_quotes' AND TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create_quote',
      'supplier_quote',
      NEW.id,
      'Nova cotação criada',
      json_build_object('supplier_id', NEW.supplier_id, 'basket_id', NEW.basket_id)
    );
  END IF;

  -- Log para resposta de cotações
  IF TG_TABLE_NAME = 'supplier_quotes' AND TG_OP = 'UPDATE' AND 
     OLD.status != 'respondida' AND NEW.status = 'respondida' THEN
    PERFORM log_activity(
      'respond_quote',
      'supplier_quote',
      NEW.id,
      'Cotação respondida',
      json_build_object('supplier_id', NEW.supplier_id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar triggers
CREATE TRIGGER supplier_quotes_activity_log
  AFTER INSERT OR UPDATE ON supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION trigger_log_activity();

-- Atualizar trigger de updated_at para as novas tabelas
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
