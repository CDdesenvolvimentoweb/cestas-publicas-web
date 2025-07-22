# 📚 Documentação Técnica - Sistema de Cestas de Preços Públicas

## 🏗️ Arquitetura do Sistema

### **Stack Tecnológica**

#### **Frontend**
- **React 18.3.1** - Biblioteca principal
- **TypeScript** - Tipagem estática
- **Vite 5.4.1** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **React Query (TanStack Query)** - Gerenciamento de estado servidor
- **React Hook Form + Zod** - Formulários e validação
- **React Router DOM v7** - Roteamento
- **Recharts** - Gráficos e visualizações

#### **Backend**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL 17.4.1** - Banco de dados
- **Edge Functions (Deno)** - Lógica serverless
- **Row Level Security (RLS)** - Segurança de dados
- **Supabase Auth** - Autenticação e autorização

### **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── forms/          # Componentes de formulário
│   ├── layout/         # Componentes de layout
│   └── charts/         # Componentes de gráficos
├── pages/              # Páginas da aplicação
├── hooks/              # Custom hooks
├── services/           # Serviços e integrações
├── utils/              # Utilitários
├── types/              # Definições de tipos
└── integrations/       # Configurações de integração

supabase/
├── functions/          # Edge Functions
├── migrations/         # Migrações do banco
└── config.toml        # Configuração do Supabase
```

## 🗄️ Estrutura do Banco de Dados

### **Tabelas Principais**

#### **Gestão de Usuários**
- `profiles` - Perfis de usuários
- `management_units` - Unidades gestoras
- `states` - Estados brasileiros
- `cities` - Cidades

#### **Catálogo de Produtos**
- `product_categories` - Categorias de produtos
- `catalog_products` - Produtos do catálogo
- `measurement_units` - Unidades de medida
- `products` - Produtos (legado)

#### **Fornecedores**
- `suppliers` - Fornecedores cadastrados

#### **Cestas de Preços**
- `price_baskets` - Cestas de preços
- `basket_items` - Itens das cestas

#### **Sistema de Cotações**
- `supplier_quotations` - Cotações enviadas
- `supplier_quotation_responses` - Respostas dos fornecedores
- `supplier_quotation_items` - Itens cotados

#### **Integrações Externas**
- `external_price_integrations` - Configurações de integração
- `external_price_records` - Registros de preços externos
- `integration_sync_logs` - Logs de sincronização

#### **Análises e Relatórios**
- `price_history` - Histórico de preços
- `price_analytics` - Análises estatísticas
- `price_analysis` - Análises de preços
- `price_deviation_alerts` - Alertas de desvio

#### **Correção Monetária**
- `monetary_indexes` - Índices monetários
- `index_values` - Valores dos índices
- `price_corrections` - Correções aplicadas

#### **CMED/ANVISA**
- `cmed_products` - Produtos CMED

#### **Sistema de Notificações**
- `notifications` - Notificações
- `notification_preferences` - Preferências de notificação

#### **Auditoria e Logs**
- `activity_logs` - Logs de atividade
- `generated_reports` - Relatórios gerados

### **Relacionamentos Principais**

```sql
-- Usuários e Unidades Gestoras
profiles.management_unit_id → management_units.id

-- Localização
management_units.city_id → cities.id
cities.state_id → states.id
suppliers.city_id → cities.id

-- Catálogo
catalog_products.category_id → product_categories.id
catalog_products.measurement_unit_id → measurement_units.id

-- Cestas de Preços
price_baskets.management_unit_id → management_units.id
basket_items.basket_id → price_baskets.id
basket_items.product_id → products.id

-- Cotações
supplier_quotations.basket_id → price_baskets.id
supplier_quotation_responses.quotation_id → supplier_quotations.id
supplier_quotation_responses.supplier_id → suppliers.id
```

## 🔐 Segurança e RLS

### **Políticas de Segurança Implementadas**

#### **Perfis de Usuário**
- `admin` - Acesso total ao sistema
- `servidor` - Acesso às funcionalidades da unidade gestora
- `fornecedor` - Acesso limitado ao portal de cotações

#### **Row Level Security (RLS)**

```sql
-- Exemplo: Política para price_baskets
CREATE POLICY "Users can view baskets from their management unit" 
ON price_baskets FOR SELECT 
USING (
  management_unit_id = get_current_user_management_unit()
  OR get_current_user_role() = 'admin'
);

-- Exemplo: Política para suppliers
CREATE POLICY "Authenticated users can view active suppliers" 
ON suppliers FOR SELECT 
USING (is_active = true AND auth.role() = 'authenticated');
```

### **Funções de Segurança**

```sql
-- Obter perfil do usuário atual
CREATE FUNCTION get_current_user_role() RETURNS text;

-- Obter unidade gestora do usuário atual
CREATE FUNCTION get_current_user_management_unit() RETURNS uuid;

-- Validar unidade gestora
CREATE FUNCTION is_valid_management_unit(unit_id uuid) RETURNS boolean;
```

## 🔗 Edge Functions

### **Funções Implementadas**

#### **1. price-sync-v2**
**Propósito**: Sincronização com APIs externas
**Endpoint**: `/functions/v1/price-sync-v2`
**Método**: POST

```typescript
// Exemplo de uso
const { data, error } = await supabase.functions.invoke('price-sync-v2', {
  body: { integration_id: 'uuid-here' }
});
```

#### **2. quotation-system**
**Propósito**: Gerenciamento de cotações
**Endpoint**: `/functions/v1/quotation-system`
**Método**: POST

#### **3. send-quotation**
**Propósito**: Envio de convites de cotação
**Endpoint**: `/functions/v1/send-quotation`
**Método**: POST

#### **4. price-alerts**
**Propósito**: Sistema de alertas de preços
**Endpoint**: `/functions/v1/price-alerts`
**Método**: POST

#### **5. report-generator-v2**
**Propósito**: Geração de relatórios
**Endpoint**: `/functions/v1/report-generator-v2`
**Método**: POST

### **Configuração de Edge Functions**

```toml
# supabase/config.toml
[functions.price-sync-v2]
verify_jwt = false

[functions.quotation-system]
verify_jwt = true

[functions.send-quotation]
verify_jwt = true
```

## 🔌 Integrações Externas

### **APIs Implementadas**

#### **1. PNCP (Portal Nacional de Compras Públicas)**
- **URL Base**: `https://pncp.gov.br/api/consulta/v1`
- **Autenticação**: Não requerida
- **Rate Limit**: 100 req/hora
- **Dados**: Contratos e licitações públicas

#### **2. BPS (Banco de Preços em Saúde)**
- **URL Base**: `https://bps.saude.gov.br/api`
- **Autenticação**: API Key
- **Dados**: Preços de medicamentos e insumos de saúde

#### **3. SINAPI (Sistema Nacional de Pesquisa de Custos)**
- **URL Base**: IBGE API
- **Autenticação**: Não requerida
- **Dados**: Custos de construção civil

#### **4. Painel de Preços do Governo Federal**
- **URL Base**: Scraping/API não oficial
- **Dados**: Preços de compras governamentais

### **Configuração de Integrações**

```typescript
// Exemplo de configuração
const integrationConfig = {
  source_name: 'PNCP',
  source_url: 'https://pncp.gov.br/api/consulta/v1',
  is_active: true,
  sync_frequency_hours: 24,
  rate_limit_per_hour: 100
};
```

## 📊 Sistema de Cache e Performance

### **Estratégias de Cache**

#### **Configurações por Tipo de Dados**

```typescript
const CACHE_CONFIGS = {
  static: {
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    cacheTime: 48 * 60 * 60 * 1000  // 48 horas
  },
  reference: {
    staleTime: 60 * 60 * 1000,      // 1 hora
    cacheTime: 2 * 60 * 60 * 1000   // 2 horas
  },
  dynamic: {
    staleTime: 5 * 60 * 1000,       // 5 minutos
    cacheTime: 10 * 60 * 1000       // 10 minutos
  }
};
```

### **Otimizações Implementadas**

1. **Query Optimization**: Uso de React Query para cache inteligente
2. **Lazy Loading**: Carregamento sob demanda de componentes
3. **Pagination**: Paginação para grandes datasets
4. **Indexação**: Índices otimizados no PostgreSQL
5. **Prefetching**: Pré-carregamento de dados críticos

## 🚨 Sistema de Alertas

### **Tipos de Alertas**

1. **price_deviation** - Desvios de preço
2. **outlier** - Outliers estatísticos
3. **trend_change** - Mudanças de tendência
4. **source_discrepancy** - Discrepâncias entre fontes

### **Configuração de Alertas**

```typescript
interface AlertRule {
  name: string;
  product_pattern: string;
  alert_type: 'price_deviation' | 'outlier' | 'trend_change';
  threshold_percentage: number;
  notification_emails: string[];
}
```

## 📈 Sistema de Relatórios

### **Tipos de Relatórios**

1. **executive_summary** - Relatório executivo
2. **price_analysis** - Análise de preços
3. **supplier_ranking** - Ranking de fornecedores
4. **compliance_report** - Relatório de conformidade
5. **trend_analysis** - Análise de tendências

### **Formatos Suportados**
- JSON (para APIs)
- PDF (para impressão)
- Excel (para análise)

## 🔧 Configuração e Deploy

### **Variáveis de Ambiente**

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

# APIs Externas
PNCP_API_KEY=optional
BPS_API_KEY=required_for_bps
```

### **Deploy no Supabase**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy functions
supabase functions deploy

# Deploy migrations
supabase db push
```

### **Deploy do Frontend**

```bash
# Build
npm run build

# Deploy (exemplo com Vercel)
vercel --prod
```

## 🧪 Testes

### **Estrutura de Testes**

```
tests/
├── unit/               # Testes unitários
├── integration/        # Testes de integração
├── e2e/               # Testes end-to-end
└── fixtures/          # Dados de teste
```

### **Comandos de Teste**

```bash
# Testes unitários
npm run test

# Testes de integração
npm run test:integration

# Testes E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🐛 Debugging e Logs

### **Logs do Sistema**

1. **Application Logs**: Console do navegador
2. **API Logs**: Supabase Dashboard
3. **Function Logs**: Edge Functions logs
4. **Database Logs**: PostgreSQL logs

### **Ferramentas de Debug**

- **React DevTools** - Debug de componentes
- **React Query DevTools** - Debug de queries
- **Supabase Dashboard** - Monitoramento de API
- **Browser DevTools** - Debug geral

## 📚 Guias de Desenvolvimento

### **Adicionando Nova Integração**

1. Criar serviço em `src/services/integrations/`
2. Adicionar configuração em `external_price_integrations`
3. Implementar parser na Edge Function `price-sync-v2`
4. Adicionar testes
5. Documentar API

### **Criando Novo Relatório**

1. Definir tipo em `report-generator-v2`
2. Implementar lógica de geração
3. Adicionar interface no frontend
4. Configurar permissões
5. Testar geração

### **Adicionando Nova Página**

1. Criar componente em `src/pages/`
2. Adicionar rota em `App.tsx`
3. Implementar hooks necessários
4. Configurar permissões
5. Adicionar testes

## 🔄 Manutenção

### **Tarefas Regulares**

1. **Backup do Banco**: Automático via Supabase
2. **Limpeza de Cache**: Configurado automaticamente
3. **Atualização de Dependências**: Mensal
4. **Monitoramento de Performance**: Contínuo
5. **Revisão de Logs**: Semanal

### **Monitoramento**

- **Uptime**: Supabase Dashboard
- **Performance**: React Query DevTools
- **Errors**: Console logs e Sentry (se configurado)
- **Usage**: Supabase Analytics

---

## 📞 Suporte Técnico

Para questões técnicas:
1. Consultar esta documentação
2. Verificar logs do sistema
3. Consultar documentação do Supabase
4. Contatar equipe de desenvolvimento

**Última atualização**: Janeiro 2025  
**Versão do Sistema**: 2.0  
**Versão da Documentação**: 1.0