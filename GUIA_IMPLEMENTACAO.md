# Guia de Implementação de Melhorias

Este documento fornece instruções detalhadas sobre como implementar as correções e melhorias identificadas na análise do projeto Cestas Públicas.

## 1. Correção de Search Path Mutável em Funções

Para cada função listada no plano de implementação, é necessário adicionar uma configuração de search_path fixa para prevenir vulnerabilidades de segurança.

### Exemplo de Correção

#### Antes:

```sql
CREATE OR REPLACE FUNCTION public.send_quotation_batch(...)
RETURNS void AS $$
BEGIN
  -- Lógica da função aqui
END;
$$ LANGUAGE plpgsql;
```

#### Depois:

```sql
CREATE OR REPLACE FUNCTION public.send_quotation_batch(...)
RETURNS void AS $$
BEGIN
  -- Definir explicitamente o search_path
  SET search_path TO public, extensions;
  
  -- Lógica da função aqui
END;
$$ LANGUAGE plpgsql;
```

### Comando SQL para Migração

Para cada função, crie uma nova migração seguindo este padrão:

```sql
-- Exemplo para a função send_quotation_batch
CREATE OR REPLACE FUNCTION public.send_quotation_batch(...)
RETURNS void AS $$
BEGIN
  -- Definir explicitamente o search_path
  SET search_path TO public, extensions;
  
  -- Copiar o resto do código da função original
  -- ...
END;
$$ LANGUAGE plpgsql;
```

## 2. Criação de Índices para Foreign Keys

Para cada foreign key sem índice, crie um índice apropriado para melhorar a performance.

### Exemplo de Criação de Índice

```sql
-- Criar índice para a foreign key activity_logs_user_id_fkey
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
```

### Script de Migração para Índices

Você pode criar uma única migração para adicionar todos os índices de uma vez:

```sql
-- Adicionar índices para foreign keys sem cobertura
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_sync_logs_api_id ON public.api_sync_logs(api_id);
CREATE INDEX IF NOT EXISTS idx_basket_items_basket_id ON public.basket_items(basket_id);
-- ... continuar com os demais índices
```

## 3. Otimização de Políticas RLS

### Substituir auth.function() por (select auth.function())

Para cada política RLS identificada, substitua as chamadas diretas para funções auth por chamadas com select.

#### Exemplo:

```sql
-- Antes:
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Depois:
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING ((SELECT auth.uid()) = id);
```

### Consolidação de Múltiplas Políticas Permissivas

Para tabelas com múltiplas políticas permissivas para a mesma ação e role, consolide-as em uma única política.

#### Exemplo:

```sql
-- Antes:
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);

-- Depois:
CREATE POLICY "Profile access control" ON public.profiles FOR SELECT TO authenticated 
USING (
  get_user_role() = 'admin' OR 
  (SELECT auth.uid()) = id
);
```

## 4. Configuração de Autenticação

### Reduzir Tempo de Expiração de OTP

No Console do Supabase, navegue até:
Authentication > Providers > Email > OTP expiry time

Altere o valor para 3600 segundos (1 hora) ou menos.

### Ativar Proteção Contra Senhas Vazadas

No Console do Supabase, navegue até:
Authentication > Policies > Password Strength > Enable "Prevent use of compromised passwords"

## 5. Revisão de Índices não Utilizados

Para cada índice não utilizado, avalie se ele deve ser mantido ou removido:

1. Verifique se o índice foi criado recentemente e ainda não teve tempo de ser utilizado
2. Verifique se o índice suporta uma constraint única ou primary key
3. Avalie se o padrão de consulta que justificaria o índice realmente existe

### Exemplo de Remoção de Índice:

```sql
-- Remover um índice não utilizado após análise
DROP INDEX IF EXISTS public.idx_supplier_quotation_responses_access_token;
```

## 6. Implementação de Monitoramento

### Configuração de Alertas no Supabase

No Console do Supabase:
1. Navegue até Settings > Database > Monitoring
2. Configure alertas para:
   - CPU usage acima de 80%
   - Disk usage acima de 85%
   - Connection count acima de 80% do limite
   - Falhas de autenticação repetidas

### Implementação de Logs de Performance

Adicione logs estratégicos para operações críticas:

```typescript
// Exemplo de código para medição de performance
const startTime = performance.now();
// Operação a ser medida
const result = await someExpensiveOperation();
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime}ms`);

// Se o tempo exceder um limite, registre um alerta
if (endTime - startTime > 1000) {
  await supabase.from('performance_logs').insert({
    operation: 'someExpensiveOperation',
    duration_ms: endTime - startTime,
    timestamp: new Date().toISOString()
  });
}
```

## Cronograma Recomendado de Implementação

1. **Semana 1**: Correções de Segurança
   - Search Path em funções
   - Configurações de autenticação

2. **Semana 2**: Otimizações de Performance - Banco de Dados
   - Criação de índices para foreign keys
   - Otimização de políticas RLS

3. **Semana 3**: Otimizações de Performance - Frontend
   - Refatoração de autenticação
   - Implementação de cache

4. **Semana 4**: Monitoramento e Documentação
   - Configuração de monitoramento
   - Criação de documentação
