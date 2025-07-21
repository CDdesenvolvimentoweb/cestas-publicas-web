
-- Habilitar RLS nas tabelas que estão sem proteção
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetary_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas para tabelas de dados básicos (acesso geral para usuários autenticados)
CREATE POLICY "Authenticated users can view states" ON states
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view cities" ON cities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view regions" ON regions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view product categories" ON product_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view measurement units" ON measurement_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view price sources" ON price_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view monetary indexes" ON monetary_indexes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view index values" ON index_values
  FOR SELECT TO authenticated USING (true);

-- Políticas para produtos (usuários podem ver todos, apenas admins podem modificar)
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated 
  USING (get_current_user_role() = 'admin');

-- Políticas para APIs externas (apenas admins)
CREATE POLICY "Admins can manage external apis" ON external_apis
  FOR ALL TO authenticated 
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can view api sync logs" ON api_sync_logs
  FOR SELECT TO authenticated 
  USING (get_current_user_role() = 'admin');

-- Criar políticas para tabelas que têm RLS mas sem políticas
CREATE POLICY "Authenticated users can view price records" ON price_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create price records for their unit" ON price_records
  FOR INSERT TO authenticated 
  WITH CHECK (
    get_current_user_role() IN ('admin', 'servidor')
  );

-- Corrigir search_path nas funções existentes
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_management_unit()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT management_unit_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.generate_quote_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token TEXT;
BEGIN
    token := encode(gen_random_bytes(32), 'base64');
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quote_token(quote_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_token TEXT;
BEGIN
    new_token := generate_quote_token();
    
    INSERT INTO supplier_quote_tokens (quote_id, token, expires_at)
    VALUES (quote_uuid, new_token, now() + interval '30 days');
    
    RETURN new_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Políticas adicionais para gerenciamento de categorias e unidades (admins podem modificar)
CREATE POLICY "Admins can manage product categories" ON product_categories
  FOR INSERT, UPDATE, DELETE TO authenticated 
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage measurement units" ON measurement_units
  FOR INSERT, UPDATE, DELETE TO authenticated 
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage price sources" ON price_sources
  FOR INSERT, UPDATE, DELETE TO authenticated 
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage monetary indexes" ON monetary_indexes
  FOR INSERT, UPDATE, DELETE TO authenticated 
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage index values" ON index_values
  FOR INSERT, UPDATE, DELETE TO authenticated 
  USING (get_current_user_role() = 'admin');
