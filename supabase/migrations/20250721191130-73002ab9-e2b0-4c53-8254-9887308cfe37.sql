
-- Criar tabela para cidades da região ES
CREATE TABLE public.regional_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state_code VARCHAR(2) NOT NULL DEFAULT 'ES',
  ibge_code VARCHAR(20),
  is_regional BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para dados da CMED
CREATE TABLE public.cmed_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_anvisa VARCHAR(50) NOT NULL,
  principio_ativo TEXT NOT NULL,
  produto_descricao TEXT NOT NULL,
  apresentacao_descricao TEXT NOT NULL,
  preco_maximo_consumidor NUMERIC(10,2),
  preco_maximo_governo NUMERIC(10,2),
  data_atualizacao DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_cmed_registro ON public.cmed_products(registro_anvisa);
CREATE INDEX idx_cmed_principio ON public.cmed_products USING gin(to_tsvector('portuguese', principio_ativo));
CREATE INDEX idx_cmed_produto ON public.cmed_products USING gin(to_tsvector('portuguese', produto_descricao));

-- Criar tabela para fontes de preços externas
CREATE TABLE public.external_price_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('painel_precos', 'pncp', 'tce_pr', 'bps', 'sinapi', 'conab', 'ceasa', 'radar_mt')),
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Popular com fontes obrigatórias do edital
INSERT INTO public.external_price_sources (name, source_type, base_url) VALUES
('Painel de Preços do Governo Federal', 'painel_precos', 'https://paineldeprecos.planejamento.gov.br'),
('Portal Nacional de Compras Públicas', 'pncp', 'https://pncp.gov.br'),
('Tribunal de Contas do Paraná', 'tce_pr', 'https://servicos.tce.pr.gov.br'),
('Banco de Preços em Saúde', 'bps', 'https://bps.saude.gov.br'),
('SINAPI', 'sinapi', 'https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/18291-sistema-nacional-de-pesquisa-de-custos-e-indices-da-construcao-civil.html'),
('CONAB', 'conab', 'https://www.conab.gov.br'),
('CEASA-ES', 'ceasa', 'https://ceasa.es.gov.br'),
('RADAR/MT', 'radar_mt', 'https://www.comprasnet.mt.gov.br');

-- Criar tabela para histórico de licitações do município
CREATE TABLE public.municipal_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_number VARCHAR(50) NOT NULL,
  bid_year INTEGER NOT NULL,
  object_description TEXT NOT NULL,
  modality TEXT NOT NULL,
  homologation_date DATE,
  total_value NUMERIC(15,2),
  management_unit_id UUID REFERENCES public.management_units(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para itens das licitações municipais
CREATE TABLE public.municipal_bid_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID REFERENCES public.municipal_bids(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  product_description TEXT NOT NULL,
  unit_measure TEXT NOT NULL,
  quantity NUMERIC(15,3),
  unit_price NUMERIC(15,2),
  total_price NUMERIC(15,2),
  supplier_name TEXT,
  supplier_cnpj VARCHAR(18),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para análise crítica de preços
CREATE TABLE public.price_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  basket_id UUID REFERENCES public.price_baskets(id) ON DELETE CASCADE,
  basket_item_id UUID REFERENCES public.basket_items(id) ON DELETE CASCADE,
  price_source TEXT NOT NULL,
  original_price NUMERIC(15,2) NOT NULL,
  price_deviation_percentage NUMERIC(5,2),
  is_excluded_from_average BOOLEAN DEFAULT false,
  exclusion_reason TEXT,
  analyzed_by UUID REFERENCES auth.users(id),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para documentos comprobatórios
CREATE TABLE public.price_supporting_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_analysis_id UUID REFERENCES public.price_analysis(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT,
  document_content BYTEA,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para alertas de divergência
CREATE TABLE public.price_deviation_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  basket_id UUID REFERENCES public.price_baskets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_deviation', 'source_discrepancy', 'outlier_detected')),
  item_description TEXT NOT NULL,
  deviation_percentage NUMERIC(5,2),
  threshold_percentage NUMERIC(5,2),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar função para busca automática de preços para objetos comuns
CREATE OR REPLACE FUNCTION public.auto_search_common_object_prices(product_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  product_info RECORD;
BEGIN
  -- Buscar informações do produto
  SELECT p.name, p.code, pc.name as category_name 
  INTO product_info
  FROM products p
  JOIN product_categories pc ON pc.id = p.category_id
  WHERE p.id = product_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Produto não encontrado');
  END IF;

  -- Simular busca automática (será implementada via Edge Functions)
  result := json_build_object(
    'product_id', product_id_param,
    'product_name', product_info.name,
    'category', product_info.category_name,
    'auto_search_enabled', true,
    'sources_found', json_build_array(
      json_build_object('source', 'painel_precos', 'count', 5),
      json_build_object('source', 'pncp', 'count', 3),
      json_build_object('source', 'bps', 'count', 2)
    )
  );

  RETURN result;
END;
$$;

-- Criar função para calcular média ponderada BPS
CREATE OR REPLACE FUNCTION public.calculate_bps_weighted_average(codigo_br_param VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Esta função será conectada com a API do BPS via Edge Function
  result := json_build_object(
    'codigo_br', codigo_br_param,
    'media_ponderada', 0.00,
    'quantidade_contratos', 0,
    'data_atualizacao', now(),
    'fonte', 'BPS - Banco de Preços em Saúde'
  );

  RETURN result;
END;
$$;

-- Criar função para aplicar correção monetária
CREATE OR REPLACE FUNCTION public.apply_monetary_correction(
  original_value NUMERIC, 
  base_date DATE, 
  target_date DATE, 
  index_type TEXT DEFAULT 'IPCA'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  correction_factor NUMERIC := 1.0;
  corrected_value NUMERIC;
BEGIN
  -- Buscar fator de correção baseado no índice
  SELECT COALESCE(
    (SELECT correction_factor FROM price_corrections 
     WHERE base_date = base_date AND target_date = target_date 
     LIMIT 1), 
    1.0
  ) INTO correction_factor;

  corrected_value := original_value * correction_factor;
  
  RETURN ROUND(corrected_value, 2);
END;
$$;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.regional_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_price_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_bid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_supporting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_deviation_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para visualização pública de dados de referência
CREATE POLICY "Anyone can view regional cities" ON public.regional_cities FOR SELECT USING (true);
CREATE POLICY "Anyone can view CMED data" ON public.cmed_products FOR SELECT USING (true);
CREATE POLICY "Anyone can view external sources" ON public.external_price_sources FOR SELECT USING (true);

-- Políticas RLS para dados do município
CREATE POLICY "Users can view municipal bids from their unit" ON public.municipal_bids 
FOR SELECT USING (
  management_unit_id = get_current_user_management_unit() OR 
  get_current_user_role() = 'admin'
);

CREATE POLICY "Users can view municipal bid items" ON public.municipal_bid_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM municipal_bids mb 
    WHERE mb.id = municipal_bid_items.bid_id 
    AND (mb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
  )
);

-- Políticas RLS para análise de preços
CREATE POLICY "Users can manage price analysis from their unit" ON public.price_analysis 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = price_analysis.basket_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
  )
);

CREATE POLICY "Users can manage supporting documents" ON public.price_supporting_documents 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM price_analysis pa
    JOIN price_baskets pb ON pb.id = pa.basket_id
    WHERE pa.id = price_supporting_documents.price_analysis_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
  )
);

CREATE POLICY "Users can view deviation alerts from their unit" ON public.price_deviation_alerts 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = price_deviation_alerts.basket_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
  )
);

-- Popular algumas cidades da região ES
INSERT INTO public.regional_cities (name, state_code, ibge_code, is_regional) VALUES
('Santa Teresa', 'ES', '3204500', true),
('São Roque do Canaã', 'ES', '3204807', true),
('Fundão', 'ES', '3202256', true),
('Ibiraçu', 'ES', '3202405', true),
('João Neiva', 'ES', '3203205', true),
('Colatina', 'ES', '3201506', true),
('Vitória', 'ES', '3205309', true),
('Vila Velha', 'ES', '3205200', true),
('Serra', 'ES', '3205002', true),
('Cariacica', 'ES', '3201308', true);
