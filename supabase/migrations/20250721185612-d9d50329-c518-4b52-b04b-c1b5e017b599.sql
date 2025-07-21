
-- Tabela para configuração de APIs externas
CREATE TABLE public.external_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  auth_type TEXT NOT NULL DEFAULT 'bearer', -- bearer, basic, api_key, none
  headers JSONB DEFAULT '{}',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para logs de sincronização de APIs
CREATE TABLE public.api_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_config_id UUID NOT NULL REFERENCES public.external_api_configs(id),
  sync_type TEXT NOT NULL, -- full, incremental, manual
  status TEXT NOT NULL, -- success, error, partial
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Tabela para dados de preços sincronizados
CREATE TABLE public.external_price_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_config_id UUID NOT NULL REFERENCES public.external_api_configs(id),
  product_identifier TEXT NOT NULL, -- código do produto na API externa
  product_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  reference_date DATE NOT NULL,
  source_location TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para workflows personalizados
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- basket_created, quote_received, deadline_approaching
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]', -- array de ações a serem executadas
  is_active BOOLEAN DEFAULT true,
  management_unit_id UUID REFERENCES public.management_units(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para histórico de execução de workflows
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id),
  entity_type TEXT NOT NULL, -- basket, quote, etc
  entity_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  trigger_data JSONB,
  execution_log JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Tabela para sugestões de IA
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- supplier_recommendation, price_alert, optimization
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  suggestion_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para cache de dados
CREATE TABLE public.cache_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para configuração de webhooks
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL, -- array de eventos que triggeram o webhook
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para logs de webhooks
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para configuração de integrações ERP
CREATE TABLE public.erp_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  erp_type TEXT NOT NULL, -- sap, protheus, totvs, custom
  connection_config JSONB NOT NULL,
  sync_mappings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_external_api_configs_active ON public.external_api_configs(is_active);
CREATE INDEX idx_api_sync_logs_api_config ON public.api_sync_logs(api_config_id);
CREATE INDEX idx_external_price_data_product ON public.external_price_data(product_identifier);
CREATE INDEX idx_external_price_data_date ON public.external_price_data(reference_date);
CREATE INDEX idx_workflows_trigger ON public.workflows(trigger_type);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_ai_suggestions_entity ON public.ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_suggestions_status ON public.ai_suggestions(status);
CREATE INDEX idx_cache_entries_key ON public.cache_entries(cache_key);
CREATE INDEX idx_cache_entries_expires ON public.cache_entries(expires_at);
CREATE INDEX idx_webhook_logs_webhook ON public.webhook_logs(webhook_id);

-- Triggers para updated_at
CREATE TRIGGER update_external_api_configs_updated_at
    BEFORE UPDATE ON public.external_api_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_price_data_updated_at
    BEFORE UPDATE ON public.external_price_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_integrations_updated_at
    BEFORE UPDATE ON public.erp_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.cache_entries
  WHERE expires_at < now();
END;
$$;

-- Função para obter sugestões de fornecedores baseadas em IA
CREATE OR REPLACE FUNCTION public.get_supplier_suggestions(
  product_id_param UUID,
  management_unit_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  supplier_id UUID,
  supplier_name TEXT,
  confidence_score NUMERIC,
  avg_price NUMERIC,
  response_rate NUMERIC,
  last_quote_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar permissões
  IF management_unit_id_param IS NOT NULL 
     AND management_unit_id_param != get_current_user_management_unit() 
     AND get_current_user_role() != 'admin'::user_role THEN
    RAISE EXCEPTION 'Acesso negado aos dados desta unidade';
  END IF;

  RETURN QUERY
  WITH supplier_stats AS (
    SELECT 
      s.id as supplier_id,
      s.company_name as supplier_name,
      COUNT(qi.id) as total_quotes,
      AVG(qi.unit_price) as avg_price,
      COUNT(qi.id) FILTER (WHERE sq.status = 'respondida') as responded_quotes,
      MAX(sq.responded_at)::DATE as last_quote_date
    FROM suppliers s
    LEFT JOIN supplier_quotes sq ON sq.supplier_id = s.id
    LEFT JOIN quote_items qi ON qi.quote_id = sq.id
    LEFT JOIN basket_items bi ON bi.id = qi.basket_item_id
    LEFT JOIN price_baskets pb ON pb.id = bi.basket_id
    WHERE s.is_active = true
      AND bi.product_id = product_id_param
      AND (
        management_unit_id_param IS NULL 
        OR pb.management_unit_id = management_unit_id_param
        OR pb.management_unit_id = get_current_user_management_unit()
      )
    GROUP BY s.id, s.company_name
  )
  SELECT 
    ss.supplier_id,
    ss.supplier_name,
    CASE 
      WHEN ss.total_quotes = 0 THEN 0.0
      ELSE ROUND(
        (ss.responded_quotes::NUMERIC / ss.total_quotes::NUMERIC) * 0.6 +
        (CASE WHEN ss.avg_price IS NULL THEN 0 ELSE 0.4 END), 2
      )
    END as confidence_score,
    ROUND(COALESCE(ss.avg_price, 0), 2) as avg_price,
    CASE 
      WHEN ss.total_quotes = 0 THEN 0.0
      ELSE ROUND((ss.responded_quotes::NUMERIC / ss.total_quotes::NUMERIC) * 100, 2)
    END as response_rate,
    ss.last_quote_date
  FROM supplier_stats ss
  ORDER BY confidence_score DESC, avg_price ASC;
END;
$$;

-- Função para processar workflows
CREATE OR REPLACE FUNCTION public.trigger_workflow(
  trigger_type_param TEXT,
  entity_type_param TEXT,
  entity_id_param UUID,
  trigger_data_param JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workflow_record RECORD;
  execution_id UUID;
BEGIN
  -- Buscar workflows ativos para o tipo de trigger
  FOR workflow_record IN 
    SELECT * FROM public.workflows 
    WHERE trigger_type = trigger_type_param 
      AND is_active = true
  LOOP
    -- Criar execução do workflow
    INSERT INTO public.workflow_executions (
      workflow_id, entity_type, entity_id, trigger_data, status
    ) VALUES (
      workflow_record.id, entity_type_param, entity_id_param, trigger_data_param, 'pending'
    ) RETURNING id INTO execution_id;
    
    -- Log da ativação
    PERFORM log_activity(
      'workflow_triggered',
      'workflow',
      workflow_record.id,
      'Workflow ativado: ' || workflow_record.name,
      jsonb_build_object('execution_id', execution_id, 'entity_type', entity_type_param, 'entity_id', entity_id_param)
    );
  END LOOP;
END;
$$;

-- Função para criar sugestões de IA
CREATE OR REPLACE FUNCTION public.create_ai_suggestion(
  type_param TEXT,
  entity_type_param TEXT,
  entity_id_param UUID,
  suggestion_data_param JSONB,
  confidence_score_param NUMERIC DEFAULT 0.5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suggestion_id UUID;
BEGIN
  INSERT INTO public.ai_suggestions (
    type, entity_type, entity_id, suggestion_data, confidence_score, expires_at
  ) VALUES (
    type_param, entity_type_param, entity_id_param, suggestion_data_param, 
    confidence_score_param, now() + interval '30 days'
  ) RETURNING id INTO suggestion_id;
  
  RETURN suggestion_id;
END;
$$;

-- RLS Policies
ALTER TABLE public.external_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_integrations ENABLE ROW LEVEL SECURITY;

-- Policies para external_api_configs
CREATE POLICY "Admins can manage API configs" ON public.external_api_configs
FOR ALL USING (get_current_user_role() = 'admin'::user_role);

-- Policies para api_sync_logs
CREATE POLICY "Admins can view sync logs" ON public.api_sync_logs
FOR SELECT USING (get_current_user_role() = 'admin'::user_role);

-- Policies para external_price_data
CREATE POLICY "Users can view external price data" ON public.external_price_data
FOR SELECT USING (get_current_user_role() = ANY(ARRAY['admin'::user_role, 'servidor'::user_role]));

-- Policies para workflows
CREATE POLICY "Users can manage workflows from their unit" ON public.workflows
FOR ALL USING (
  management_unit_id = get_current_user_management_unit() 
  OR get_current_user_role() = 'admin'::user_role
);

-- Policies para workflow_executions
CREATE POLICY "Users can view workflow executions from their unit" ON public.workflow_executions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workflows w 
    WHERE w.id = workflow_executions.workflow_id 
    AND (w.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin'::user_role)
  )
);

-- Policies para ai_suggestions
CREATE POLICY "Users can view AI suggestions for their unit" ON public.ai_suggestions
FOR SELECT USING (get_current_user_role() = ANY(ARRAY['admin'::user_role, 'servidor'::user_role]));

CREATE POLICY "Users can update AI suggestions status" ON public.ai_suggestions
FOR UPDATE USING (get_current_user_role() = ANY(ARRAY['admin'::user_role, 'servidor'::user_role]));

-- Policies para cache_entries
CREATE POLICY "System can manage cache" ON public.cache_entries
FOR ALL USING (true);

-- Policies para webhooks
CREATE POLICY "Admins can manage webhooks" ON public.webhooks
FOR ALL USING (get_current_user_role() = 'admin'::user_role);

-- Policies para webhook_logs
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
FOR SELECT USING (get_current_user_role() = 'admin'::user_role);

-- Policies para erp_integrations
CREATE POLICY "Admins can manage ERP integrations" ON public.erp_integrations
FOR ALL USING (get_current_user_role() = 'admin'::user_role);
