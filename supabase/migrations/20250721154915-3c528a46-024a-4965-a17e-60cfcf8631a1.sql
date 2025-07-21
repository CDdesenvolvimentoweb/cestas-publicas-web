
-- Criar tipos enumerados
CREATE TYPE user_role AS ENUM ('admin', 'servidor', 'fornecedor');
CREATE TYPE basket_calculation_type AS ENUM ('media', 'mediana', 'menor_preco');
CREATE TYPE quote_status AS ENUM ('pendente', 'respondida', 'vencida');
CREATE TYPE price_source_type AS ENUM ('fornecedor', 'portal_governo', 'api_externa');

-- Tabela de perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf VARCHAR(14),
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'servidor',
  management_unit_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estados
CREATE TABLE states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de municípios
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES states(id),
  ibge_code VARCHAR(10) UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de regiões
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de unidades gestoras/secretarias
CREATE TABLE management_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id),
  name TEXT NOT NULL,
  cnpj VARCHAR(18),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key para management_unit_id em profiles
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_management_unit 
  FOREIGN KEY (management_unit_id) REFERENCES management_units(id);

-- Tabela de fornecedores
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  municipal_registration VARCHAR(50),
  state_registration VARCHAR(50),
  address TEXT,
  city_id UUID REFERENCES cities(id),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  website TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias de produtos
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  code VARCHAR(20),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de unidades de medida
CREATE TABLE measurement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de produtos/serviços
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id),
  code VARCHAR(50) UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  specification TEXT,
  measurement_unit_id UUID NOT NULL REFERENCES measurement_units(id),
  anvisa_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cestas de preços
CREATE TABLE price_baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_unit_id UUID NOT NULL REFERENCES management_units(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  reference_date DATE NOT NULL,
  calculation_type basket_calculation_type NOT NULL DEFAULT 'media',
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens da cesta
CREATE TABLE basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES price_baskets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  lot_number INTEGER,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fontes de preços
CREATE TABLE price_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type price_source_type NOT NULL,
  url TEXT,
  api_endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de registros de preços
CREATE TABLE price_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  source_id UUID NOT NULL REFERENCES price_sources(id),
  supplier_id UUID REFERENCES suppliers(id),
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  reference_date DATE NOT NULL,
  city_id UUID REFERENCES cities(id),
  brand TEXT,
  observations TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cotações
CREATE TABLE supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES price_baskets(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status quote_status DEFAULT 'pendente',
  sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  access_token VARCHAR(255) UNIQUE,
  digital_signature TEXT,
  signature_certificate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens das cotações
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
  basket_item_id UUID NOT NULL REFERENCES basket_items(id),
  unit_price DECIMAL(12,2),
  total_price DECIMAL(12,2),
  brand TEXT,
  anvisa_registration VARCHAR(50),
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de índices monetários
CREATE TABLE monetary_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de valores dos índices
CREATE TABLE index_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id UUID NOT NULL REFERENCES monetary_indexes(id),
  reference_date DATE NOT NULL,
  value DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_id, reference_date)
);

-- Tabela de correções monetárias aplicadas
CREATE TABLE price_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES price_baskets(id),
  index_id UUID NOT NULL REFERENCES monetary_indexes(id),
  base_date DATE NOT NULL,
  target_date DATE NOT NULL,
  correction_factor DECIMAL(10,6) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela de APIs externas
CREATE TABLE external_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_required BOOLEAN DEFAULT false,
  rate_limit_per_minute INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de sincronização
CREATE TABLE api_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id UUID NOT NULL REFERENCES external_apis(id),
  sync_type TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_corrections ENABLE ROW LEVEL SECURITY;

-- Função para obter o papel do usuário atual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função para obter a unidade gestora do usuário atual
CREATE OR REPLACE FUNCTION get_current_user_management_unit()
RETURNS UUID AS $$
  SELECT management_unit_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (get_current_user_role() = 'admin');

-- Políticas RLS para management_units
CREATE POLICY "Users can view own management unit" ON management_units
  FOR SELECT USING (
    id = get_current_user_management_unit() OR 
    get_current_user_role() = 'admin'
  );

-- Políticas RLS para price_baskets
CREATE POLICY "Users can view baskets from their unit" ON price_baskets
  FOR SELECT USING (
    management_unit_id = get_current_user_management_unit() OR
    get_current_user_role() = 'admin'
  );

CREATE POLICY "Users can create baskets in their unit" ON price_baskets
  FOR INSERT WITH CHECK (
    management_unit_id = get_current_user_management_unit() AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can update baskets from their unit" ON price_baskets
  FOR UPDATE USING (
    management_unit_id = get_current_user_management_unit() OR
    get_current_user_role() = 'admin'
  );

-- Políticas RLS para basket_items
CREATE POLICY "Users can view basket items from their unit" ON basket_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = basket_items.basket_id 
      AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
    )
  );

CREATE POLICY "Users can manage basket items from their unit" ON basket_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = basket_items.basket_id 
      AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
    )
  );

-- Políticas RLS para suppliers
CREATE POLICY "Suppliers can view own data" ON suppliers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and servers can view suppliers" ON suppliers
  FOR SELECT USING (get_current_user_role() IN ('admin', 'servidor'));

-- Políticas RLS para supplier_quotes
CREATE POLICY "Suppliers can view own quotes" ON supplier_quotes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM suppliers s WHERE s.id = supplier_quotes.supplier_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Users can view quotes from their unit baskets" ON supplier_quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM price_baskets pb 
      WHERE pb.id = supplier_quotes.basket_id 
      AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_management_units_updated_at BEFORE UPDATE ON management_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_baskets_updated_at BEFORE UPDATE ON price_baskets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_quotes_updated_at BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO states (code, name) VALUES 
  ('AC', 'Acre'), ('AL', 'Alagoas'), ('AP', 'Amapá'), ('AM', 'Amazonas'),
  ('BA', 'Bahia'), ('CE', 'Ceará'), ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'),
  ('GO', 'Goiás'), ('MA', 'Maranhão'), ('MT', 'Mato Grosso'), ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'), ('PA', 'Pará'), ('PB', 'Paraíba'), ('PR', 'Paraná'),
  ('PE', 'Pernambuco'), ('PI', 'Piauí'), ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'), ('RO', 'Rondônia'), ('RR', 'Roraima'), ('SC', 'Santa Catarina'),
  ('SP', 'São Paulo'), ('SE', 'Sergipe'), ('TO', 'Tocantins');

INSERT INTO monetary_indexes (name, description, source_url) VALUES
  ('IPCA', 'Índice Nacional de Preços ao Consumidor Amplo', 'https://www.ibge.gov.br'),
  ('IGPM', 'Índice Geral de Preços do Mercado', 'https://www.fgv.br');

INSERT INTO measurement_units (name, abbreviation) VALUES
  ('Unidade', 'UN'), ('Metro', 'M'), ('Metro Quadrado', 'M²'), ('Metro Cúbico', 'M³'),
  ('Quilograma', 'KG'), ('Litro', 'L'), ('Tonelada', 'T'), ('Pacote', 'PCT'),
  ('Caixa', 'CX'), ('Frasco', 'FR'), ('Galão', 'GL'), ('Saco', 'SC');

INSERT INTO product_categories (name, code, description) VALUES
  ('Medicamentos', 'MED', 'Produtos farmacêuticos e medicamentos'),
  ('Material de Escritório', 'ESC', 'Materiais para escritório e papelaria'),
  ('Material de Limpeza', 'LMP', 'Produtos de limpeza e higiene'),
  ('Alimentos', 'ALI', 'Gêneros alimentícios'),
  ('Combustíveis', 'COM', 'Combustíveis e lubrificantes'),
  ('Serviços', 'SRV', 'Prestação de serviços diversos');

INSERT INTO price_sources (name, type, url) VALUES
  ('Painel de Preços do Governo Federal', 'portal_governo', 'https://paineldeprecos.planejamento.gov.br'),
  ('PNCP', 'portal_governo', 'https://pncp.gov.br'),
  ('Banco de Preços em Saúde', 'portal_governo', 'https://bps.saude.gov.br'),
  ('CMED - ANVISA', 'api_externa', 'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed'),
  ('CEASA', 'api_externa', 'https://www.ceasa.gov.br'),
  ('SINAPI', 'api_externa', 'https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/18190-sistema-nacional-de-pesquisa-de-custos-e-indices-da-construcao-civil.html');

-- Inserir alguns produtos de exemplo
INSERT INTO products (category_id, code, name, description, measurement_unit_id) 
SELECT 
  (SELECT id FROM product_categories WHERE code = 'MED' LIMIT 1),
  'MED001',
  'Paracetamol 500mg',
  'Comprimido de paracetamol 500mg',
  (SELECT id FROM measurement_units WHERE abbreviation = 'UN' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM product_categories WHERE code = 'MED')
  AND EXISTS (SELECT 1 FROM measurement_units WHERE abbreviation = 'UN');

INSERT INTO products (category_id, code, name, description, measurement_unit_id)
SELECT 
  (SELECT id FROM product_categories WHERE code = 'ESC' LIMIT 1),
  'ESC001',
  'Papel A4 75g',
  'Resma de papel A4 75g com 500 folhas',
  (SELECT id FROM measurement_units WHERE abbreviation = 'PCT' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM product_categories WHERE code = 'ESC')
  AND EXISTS (SELECT 1 FROM measurement_units WHERE abbreviation = 'PCT');
