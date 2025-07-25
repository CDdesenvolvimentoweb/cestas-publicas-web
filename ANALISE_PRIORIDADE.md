# Análise de Prioridade para Implementações

Este documento classifica as tarefas de implementação por prioridade, considerando o impacto na segurança, performance e facilidade de implementação.

## Prioridades de Segurança

### Crítica (Implementar Imediatamente)
1. **Correção de Search Path em Funções de Sistema Críticas**
   - `send_quotation_batch` (envolve transações financeiras)
   - `validate_digital_signature` (validação de segurança)
   - `create_quote_token` e `generate_quote_token` (acesso de fornecedores)

2. **Configurações de Autenticação**
   - Redução do tempo de expiração de OTP para 1 hora
   - Ativação da proteção contra senhas vazadas

### Alta (Implementar na Próxima Semana)
1. **Correção de Search Path em Funções de Negócio**
   - `approve_product_request`
   - `reject_product_request`
   - `calculate_basket_statistics`
   - `duplicate_basket`

2. **Otimização de Políticas RLS Críticas**
   - Políticas em `profiles` (gerencia acesso a dados de usuário)
   - Políticas em `suppliers` (acesso de fornecedores)

### Média (Implementar no Próximo Mês)
1. **Correção de Search Path em Funções de Suporte**
   - `log_activity`
   - `create_notification`
   - `mark_notification_read`

## Prioridades de Performance

### Crítica (Implementar Imediatamente)
1. **Índices para Foreign Keys em Tabelas Frequentemente Acessadas**
   - `basket_items_product_id_fkey` (usado em consultas de cotação)
   - `price_records_product_id_fkey` (usado em análises de preço)
   - `suppliers_user_id_fkey` (usado em autenticação)

2. **Otimização de Políticas RLS com Alta Frequência de Acesso**
   - `Users can view price history` em `price_history`
   - `Users can view analytics` em `price_analytics`

### Alta (Implementar na Próxima Semana)
1. **Índices para Foreign Keys em Tabelas de Tamanho Médio**
   - `price_analysis_basket_id_fkey`
   - `price_baskets_management_unit_id_fkey`
   - `product_requests_management_unit_id_fkey`

2. **Consolidação de Políticas Permissivas Sobrepostas**
   - Políticas em `supplier_quotes` (múltiplas políticas afetando performance)
   - Políticas em `product_categories` (tabela consultada frequentemente)

### Média (Implementar no Próximo Mês)
1. **Revisão de Índices Não Utilizados**
   - `idx_external_prices_product_id`
   - `idx_external_prices_date`
   - `idx_price_history_source`

2. **Índices para Foreign Keys Restantes**
   - Implementar índices para as foreign keys restantes

## Facilidade de Implementação vs. Impacto

### Implementação Rápida, Alto Impacto
1. **Configurações de Autenticação** (15 minutos, alto impacto na segurança)
2. **Índices para Foreign Keys Críticas** (30 minutos, alto impacto na performance)
3. **Correção de Search Path em Funções Críticas** (1-2 horas, alto impacto na segurança)

### Implementação Moderada, Alto Impacto
1. **Consolidação de Políticas RLS Críticas** (2-3 horas, alto impacto na performance)
2. **Correção de Search Path em Todas as Funções** (3-4 horas, alto impacto na segurança)

### Implementação Complexa, Alto Impacto
1. **Refatoração Completa de Políticas RLS** (1-2 dias, alto impacto na performance e manutenção)
2. **Implementação de Monitoramento Abrangente** (2-3 dias, alto impacto na operação contínua)

## Plano de Implementação Resumido

### Fase 1 (Dia 1-2)
- Configurar autenticação (OTP e proteção contra senhas vazadas)
- Corrigir search_path em funções críticas
- Criar índices para foreign keys críticas

### Fase 2 (Dia 3-5)
- Corrigir search_path em todas as funções restantes
- Consolidar políticas RLS de alta prioridade
- Criar índices para foreign keys de prioridade alta

### Fase 3 (Semana 2)
- Revisar e otimizar índices não utilizados
- Implementar monitoramento básico
- Completar a criação de índices para foreign keys restantes

### Fase 4 (Semana 3-4)
- Implementar monitoramento abrangente
- Refatorar código frontend relacionado à autenticação
- Finalizar documentação técnica
