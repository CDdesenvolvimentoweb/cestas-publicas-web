# Plano de Implementação de Melhorias

Este documento lista as tarefas necessárias para implementar as recomendações identificadas na análise do projeto Cestas Públicas. À medida que cada tarefa for concluída, marque a caixa de seleção correspondente.

## Correções de Segurança

### Search Path Mutável em Funções

- [x] Revisar e corrigir a função `send_quotation_batch`
- [x] Revisar e corrigir a função `trigger_log_activity`
- [x] Revisar e corrigir a função `update_email_queue_updated_at`
- [x] Revisar e corrigir a função `generate_quote_token`
- [x] Revisar e corrigir a função `create_quote_token`
- [x] Revisar e corrigir a função `get_management_unit_stats`
- [x] Revisar e corrigir a função `check_product_duplication`
- [x] Revisar e corrigir a função `approve_product_request`
- [x] Revisar e corrigir a função `reject_product_request`
- [x] Revisar e corrigir a função `search_similar_products`
- [x] Revisar e corrigir a função `calculate_basket_statistics`
- [x] Revisar e corrigir a função `validate_basket_finalization`
- [x] Revisar e corrigir a função `get_popular_basket_products`
- [x] Revisar e corrigir a função `duplicate_basket`
- [x] Revisar e corrigir a função `calculate_supplier_ranking`
- [x] Revisar e corrigir a função `generate_quotation_report`
- [x] Revisar e corrigir a função `handle_quotation_status_change`
- [x] Revisar e corrigir a função `validate_digital_signature`
- [ ] Revisar e corrigir a função `create_notification`
- [ ] Revisar e corrigir a função `mark_notification_read`
- [ ] Revisar e corrigir a função `log_activity`
- [ ] Revisar e corrigir a função `analyze_price_trends`
- [ ] Revisar e corrigir a função `get_dashboard_statistics`
- [ ] Revisar e corrigir a função `auto_search_common_object_prices`
- [ ] Revisar e corrigir a função `calculate_bps_weighted_average`
- [ ] Revisar e corrigir a função `apply_monetary_correction`

Para cada função, adicionar a configuração de search_path fixa:

```sql
SET search_path TO public, extensions;
```

### Configuração de Autenticação

- [ ] Reduzir tempo de expiração de OTP para menos de uma hora
- [ ] Ativar proteção contra senhas vazadas

## Otimizações de Performance

### Índices para Foreign Keys

- [ ] Criar índice para `activity_logs_user_id_fkey`
- [ ] Criar índice para `api_sync_logs_api_id_fkey`
- [ ] Criar índice para `basket_items_basket_id_fkey`
- [ ] Criar índice para `basket_items_product_id_fkey`
- [ ] Criar índice para `catalog_products_measurement_unit_id_fkey`
- [ ] Criar índice para `cities_state_id_fkey`
- [ ] Criar índice para `generated_reports_generated_by_fkey`
- [ ] Criar índice para `integration_sync_logs_integration_source_id_fkey`
- [ ] Criar índice para `management_units_city_id_fkey`
- [ ] Criar índice para `municipal_bid_items_bid_id_fkey`
- [ ] Criar índice para `municipal_bids_management_unit_id_fkey`
- [ ] Criar índice para `notifications_user_id_fkey`
- [ ] Criar índice para `price_analysis_analyzed_by_fkey`
- [ ] Criar índice para `price_analysis_basket_id_fkey`
- [ ] Criar índice para `price_analysis_basket_item_id_fkey`
- [ ] Criar índice para `price_baskets_created_by_fkey`
- [ ] Criar índice para `price_baskets_management_unit_id_fkey`
- [ ] Criar índice para `price_corrections_applied_by_fkey`
- [ ] Criar índice para `price_corrections_basket_id_fkey`
- [ ] Criar índice para `price_corrections_index_id_fkey`
- [ ] Criar índice para `price_deviation_alerts_basket_id_fkey`
- [ ] Criar índice para `price_history_supplier_id_fkey`
- [ ] Criar índice para `price_records_city_id_fkey`
- [ ] Criar índice para `price_records_product_id_fkey`
- [ ] Criar índice para `price_records_source_id_fkey`
- [ ] Criar índice para `price_records_supplier_id_fkey`
- [ ] Criar índice para `price_supporting_documents_price_analysis_id_fkey`
- [ ] Criar índice para `product_requests_category_id_fkey`
- [ ] Criar índice para `product_requests_management_unit_id_fkey`
- [ ] Criar índice para `product_requests_measurement_unit_id_fkey`
- [ ] Criar índice para `product_requests_requester_id_fkey`
- [ ] Criar índice para `product_requests_reviewed_by_fkey`
- [ ] Criar índice para `products_category_id_fkey`
- [ ] Criar índice para `products_measurement_unit_id_fkey`
- [ ] Criar índice para `fk_profiles_management_unit`
- [ ] Criar índice para `quote_items_basket_item_id_fkey`
- [ ] Criar índice para `quote_items_quote_id_fkey`
- [ ] Criar índice para `supplier_quotation_items_basket_item_id_fkey`
- [ ] Criar índice para `supplier_quotations_created_by_fkey`
- [ ] Criar índice para `supplier_quote_tokens_quote_id_fkey`
- [ ] Criar índice para `supplier_quotes_basket_id_fkey`
- [ ] Criar índice para `supplier_quotes_supplier_id_fkey`
- [ ] Criar índice para `suppliers_city_id_fkey`
- [ ] Criar índice para `suppliers_user_id_fkey`

### Otimização de Políticas RLS

#### Otimizar Inicialização RLS

- [ ] Corrigir política `Users can view own profile` em `profiles`
- [ ] Corrigir política `Users can update own profile` em `profiles`
- [ ] Corrigir política `Allow authenticated users to view quotations` em `supplier_quotations`
- [ ] Corrigir política `Allow authenticated users to manage quotations` em `supplier_quotations`
- [ ] Corrigir política `Suppliers can view own data` em `suppliers`
- [ ] Corrigir política `Suppliers can view own quotes` em `supplier_quotes`
- [ ] Corrigir política `Suppliers can manage own quote items` em `quote_items`
- [ ] Corrigir política `Suppliers can update own quotes` em `supplier_quotes`
- [ ] Corrigir política `Users can create baskets in their unit` em `price_baskets`
- [ ] Corrigir política `Users can view quotes from their unit baskets` em `supplier_quotes`
- [ ] Corrigir política `Users can update quotes from their unit` em `supplier_quotes`
- [ ] Corrigir política `Users can create requests for their unit` em `product_requests`
- [ ] Corrigir política `Users can update own pending requests` em `product_requests`
- [ ] Corrigir política `Users can view own notifications` em `notifications`
- [ ] Corrigir política `Users can update own notifications` em `notifications`
- [ ] Corrigir política `Users can view own activity` em `activity_logs`
- [ ] Corrigir política `Users can manage own preferences` em `notification_preferences`
- [ ] Corrigir política `Users can view own reports` em `generated_reports`
- [ ] Corrigir política `Users can create reports` em `generated_reports`
- [ ] Corrigir política `Users can update own reports` em `generated_reports`
- [ ] Corrigir política `Admins can delete profiles` em `profiles`
- [ ] Corrigir política `Admins can update all profiles` em `profiles`
- [ ] Corrigir política `Suppliers can update own data` em `suppliers`
- [ ] Corrigir política `Admin can manage system settings` em `system_settings`
- [ ] Corrigir política `Users can view price history` em `price_history`
- [ ] Corrigir política `Admins can manage price history` em `price_history`
- [ ] Corrigir política `Users can view analytics` em `price_analytics`
- [ ] Corrigir política `Admins can manage analytics` em `price_analytics`

Para cada política, substituir `auth.<function>()` por `(select auth.<function>())`.

#### Consolidar Políticas Permissivas

- [ ] Consolidar políticas permissivas em `activity_logs` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `basket_items` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `catalog_products` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `cities` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `external_price_integrations` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `index_values` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `integration_sync_logs` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `measurement_units` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `monetary_indexes` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `price_analytics` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `price_history` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `price_sources` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `product_categories` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `product_requests` para ação `UPDATE`
- [ ] Consolidar políticas permissivas em `products` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `profiles` para ações `SELECT` e `UPDATE`
- [ ] Consolidar políticas permissivas em `quote_items` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `regions` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `states` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `supplier_quotations` para ação `SELECT`
- [ ] Consolidar políticas permissivas em `supplier_quotes` para ações `SELECT` e `UPDATE`
- [ ] Consolidar políticas permissivas em `suppliers` para ações `SELECT` e `UPDATE`

### Remover ou Revisar Índices não Utilizados

- [ ] Avaliar o índice `idx_supplier_quotation_responses_access_token`
- [ ] Avaliar o índice `idx_supplier_quotation_items_response_id`
- [ ] Avaliar o índice `idx_external_prices_product_id`
- [ ] Avaliar o índice `idx_external_prices_date`
- [ ] Avaliar o índice `idx_price_history_source`
- [ ] Avaliar o índice `idx_price_history_location`

## Melhorias no Frontend

### Otimizações de Autenticação

- [ ] Refatorar função de limpeza de sessão para ser mais robusta
- [ ] Implementar melhor tratamento de erros nas funções de autenticação
- [ ] Adicionar feedback visual para processos de autenticação

### Melhorias de UX

- [ ] Implementar feedback visual para operações de longa duração
- [ ] Melhorar tratamento de erros na interface de usuário
- [ ] Implementar cache local para consultas frequentes

## Monitoramento e Manutenção

- [ ] Configurar monitoramento de performance no Supabase
- [ ] Implementar logs de auditoria para operações críticas
- [ ] Criar plano de backup e recuperação de dados
- [ ] Estabelecer processo de revisão de código para futuras implementações

## Documentação

- [ ] Criar documentação do banco de dados
- [ ] Documentar fluxos de autenticação e autorização
- [ ] Criar guia de boas práticas para desenvolvedores
