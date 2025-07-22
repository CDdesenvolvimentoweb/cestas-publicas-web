# 📚 Manual de Treinamento - Sistema de Cestas de Preços Públicas

## 🎯 **Objetivo do Treinamento**

Este manual fornece um guia completo para capacitar usuários finais no uso do Sistema de Cestas de Preços Públicas, cobrindo todas as funcionalidades desde o básico até as ferramentas avançadas.

---

## 📋 **Estrutura do Treinamento**

### **Módulo 1: Introdução e Acesso (30 min)**
- Visão geral do sistema
- Como fazer login
- Navegação básica
- Perfis de usuário

### **Módulo 2: Cadastros Básicos (45 min)**
- Gestão de produtos
- Cadastro de fornecedores
- Unidades de medida
- Categorias de produtos

### **Módulo 3: Cotações e Processos (60 min)**
- Criação de cestas de preços
- Envio de cotações
- Análise de propostas
- Finalização de processos

### **Módulo 4: Integrações e Pesquisas (45 min)**
- Portais externos (PNCP, BPS, Painel de Preços)
- Busca automática de preços
- Comparação de fontes

### **Módulo 5: Análises Avançadas (60 min)**
- Dashboard e relatórios
- Média ponderada BPS
- Análise crítica de preços
- Documentos automáticos

---

## 🚀 **MÓDULO 1: INTRODUÇÃO E ACESSO**

### **1.1 Visão Geral do Sistema**

O Sistema de Cestas de Preços Públicas é uma plataforma web desenvolvida para:
- ✅ Formar cestas de preços de forma transparente
- ✅ Integrar com portais públicos de preços
- ✅ Automatizar processos de cotação
- ✅ Gerar documentos comprobatórios
- ✅ Analisar tendências de mercado

### **1.2 Como Fazer Login**

**Passo a Passo:**
1. Acesse o sistema através do navegador
2. Clique em "Entrar" no menu superior
3. Digite seu **e-mail** e **senha**
4. Clique em "Entrar"

**Primeiro Acesso:**
- Use as credenciais fornecidas pelo administrador
- Altere sua senha no primeiro login
- Complete seu perfil com informações adicionais

### **1.3 Navegação Básica**

**Menu Principal:**
- 🏠 **Dashboard**: Visão geral e estatísticas
- 🛒 **Cestas de Preços**: Gestão de processos licitatórios
- 📋 **Cotações**: Envio e análise de cotações
- 🏢 **Fornecedores**: Cadastro e gestão de fornecedores
- 📦 **Produtos**: Catálogo de produtos e serviços
- 📊 **Relatórios**: Análises e documentos

**Barra Superior:**
- 🔔 **Notificações**: Alertas e avisos
- 👤 **Perfil**: Configurações pessoais
- 🚪 **Sair**: Logout seguro

### **1.4 Perfis de Usuário**

**👑 Administrador:**
- Acesso total ao sistema
- Gestão de usuários e configurações
- Relatórios avançados

**🏛️ Servidor Público:**
- Criação e gestão de cestas
- Análise de cotações
- Relatórios operacionais

**🏢 Fornecedor:**
- Visualização de cotações
- Envio de propostas
- Acompanhamento de processos

---

## 📦 **MÓDULO 2: CADASTROS BÁSICOS**

### **2.1 Gestão de Produtos**

**Acessando Produtos:**
1. Menu principal → **"Produtos"**
2. Visualize a lista de produtos cadastrados
3. Use filtros para encontrar produtos específicos

**Cadastrando Novo Produto:**
1. Clique em **"Novo Produto"**
2. Preencha os campos obrigatórios:
   - **Nome**: Descrição do produto
   - **Categoria**: Selecione a categoria apropriada
   - **Código**: Código interno (opcional)
   - **Unidade de Medida**: Kg, unidade, metro, etc.
   - **Especificação**: Detalhes técnicos
3. Marque **"Objeto Comum"** se aplicável
4. Clique em **"Salvar"**

**Dicas Importantes:**
- ✅ Use nomes descritivos e padronizados
- ✅ Categorize corretamente para facilitar buscas
- ✅ Especifique detalhes técnicos relevantes
- ❌ Evite duplicatas desnecessárias

### **2.2 Cadastro de Fornecedores**

**Novo Fornecedor:**
1. Menu → **"Fornecedores"** → **"Novo Fornecedor"**
2. **Dados da Empresa:**
   - Razão Social
   - CNPJ
   - Nome Fantasia
   - Inscrição Estadual
3. **Contato:**
   - E-mail principal
   - Telefone
   - Endereço completo
4. **Dados Bancários** (opcional):
   - Banco, agência, conta
5. Clique em **"Salvar"**

**Validações Automáticas:**
- ✅ CNPJ é validado automaticamente
- ✅ E-mail é verificado
- ✅ Duplicatas são detectadas

### **2.3 Categorias de Produtos**

**Gerenciando Categorias:**
1. Menu → **"Produtos"** → **"Categorias"**
2. Visualize a hierarquia de categorias
3. Para **nova categoria**:
   - Nome da categoria
   - Descrição
   - Categoria pai (se subcategoria)

**Estrutura Recomendada:**
```
📁 Alimentação
  └── 🥬 Hortifrutigranjeiros
  └── 🥩 Carnes e Derivados
  └── 🥛 Laticínios

📁 Material de Escritório
  └── 📄 Papelaria
  └── 🖥️ Equipamentos

📁 Limpeza
  └── 🧽 Produtos de Limpeza
  └── 🧻 Descartáveis
```

---

## 🛒 **MÓDULO 3: COTAÇÕES E PROCESSOS**

### **3.1 Criação de Cestas de Preços**

**Iniciando Nova Cesta:**
1. Menu → **"Cestas de Preços"** → **"Nova Cesta"**
2. **Informações Básicas:**
   - Nome da cesta
   - Data de referência
   - Descrição/Justificativa
   - Unidade gestora responsável

**Assistente de Criação:**
1. **Passo 1**: Dados gerais
2. **Passo 2**: Seleção de produtos
3. **Passo 3**: Especificações técnicas
4. **Passo 4**: Configurações de cotação
5. **Passo 5**: Revisão e finalização

**Adicionando Produtos:**
- Use o **catálogo** para selecionar produtos
- Defina **quantidade** para cada item
- Especifique **critérios técnicos** quando necessário
- Configure **pesos** para análise (se aplicável)

### **3.2 Envio de Cotações**

**Processo de Cotação:**
1. **Seleção de Fornecedores:**
   - Escolha fornecedores qualificados
   - Verifique dados de contato atualizados
   - Confirme especialização no produto

2. **Configuração de Prazos:**
   - Data limite para envio de propostas
   - Prazo de validade das propostas
   - Data de abertura/análise

3. **Personalização do E-mail:**
   - Assunto personalizado
   - Instruções específicas
   - Anexos técnicos (se necessário)

**Monitoramento:**
- 📊 Acompanhe status dos envios
- 📧 Verifique e-mails entregues
- ⏰ Monitore prazos de resposta
- 🔔 Configure lembretes automáticos

### **3.3 Análise de Propostas**

**Recebimento de Propostas:**
1. Acesse **"Cotações"** → **"Propostas Recebidas"**
2. Visualize propostas por cesta
3. Analise dados de cada fornecedor

**Ferramentas de Análise:**
- 📊 **Comparação lado a lado** de preços
- 📈 **Gráficos** de variação de preços
- 🏆 **Ranking** automático por critérios
- ⚠️ **Alertas** para valores discrepantes

**Processo de Avaliação:**
1. **Análise Técnica:**
   - Conformidade com especificações
   - Qualidade dos produtos oferecidos
   - Prazos de entrega propostos

2. **Análise Comercial:**
   - Competitividade dos preços
   - Condições de pagamento
   - Garantias oferecidas

3. **Documentação:**
   - Registre justificativas para decisões
   - Anexe pareceres técnicos
   - Mantenha histórico de análises

---

## 🔗 **MÓDULO 4: INTEGRAÇÕES E PESQUISAS**

### **4.1 Portais Externos**

**Portais Integrados:**

**🏛️ PNCP (Portal Nacional de Contratações Públicas):**
- Acesso a preços de contratos públicos
- Dados atualizados do governo federal
- Histórico de licitações por produto

**🏥 BPS (Banco de Preços em Saúde):**
- Preços específicos do setor saúde
- Medicamentos e insumos médicos
- Média ponderada especializada

**📊 Painel de Preços:**
- Preços de referência governamentais
- Comparação entre órgãos
- Tendências de mercado

### **4.2 Busca Automática de Preços**

**Funcionalidade de Busca Automática:**
1. Menu → **"Dashboard"** → **"Funcionalidades Avançadas"**
2. Aba **"Busca Automática"**

**Como Usar:**
1. **Selecionar Produto:**
   - Escolha produto do catálogo
   - Ou use busca por nome
   - Foque em "objetos comuns"

2. **Configurar Busca:**
   - Selecione portais de origem
   - Defina período de consulta
   - Configure critérios de qualidade

3. **Executar Busca:**
   - Clique em **"Busca Automática"**
   - Aguarde processamento (2-5 minutos)
   - Visualize resultados organizados

**Interpretando Resultados:**
- 🎯 **Score de Confiança**: 0-100%
- 📅 **Data do Preço**: Relevância temporal
- 📍 **Localização**: Contexto geográfico
- 🏢 **Fonte**: Portal de origem

### **4.3 Comparação de Fontes**

**Análise Multi-Portal:**
- Compare preços do mesmo produto entre portais
- Identifique discrepâncias significativas
- Valide dados com múltiplas fontes
- Use na justificativa de preços

**Relatório de Comparação:**
- Gere relatórios automáticos
- Inclua gráficos comparativos
- Destaque variações importantes
- Exporte para documentação oficial

---

## 📊 **MÓDULO 5: ANÁLISES AVANÇADAS**

### **5.1 Dashboard e Relatórios**

**Dashboard Principal:**
- 📈 **Estatísticas Gerais**: Visão macro do sistema
- 🔔 **Notificações**: Alertas e pendências
- 📊 **Analytics**: Gráficos e tendências
- ⚡ **Ações Rápidas**: Acesso direto a funcionalidades

**Funcionalidades do Dashboard:**

**Aba "Analytics":**
- Histórico de preços por produto
- Tendências de mercado
- Comparações temporais
- Análise de fornecedores

**Navegação:**
1. Selecione **período** de análise
2. Filtre por **produto** ou **categoria**
3. Escolha **tipo de visualização**
4. Exporte **relatórios** em PDF/Excel

### **5.2 Média Ponderada BPS**

**Conceito:**
A média ponderada BPS considera:
- 📅 **Temporal**: Preços mais recentes têm maior peso
- 📊 **Volume**: Quantidade de dados influencia confiabilidade
- 🎯 **Qualidade**: Score de confiança da fonte

**Como Usar:**
1. Acesse **"Funcionalidades Avançadas"** → **"Média Ponderada"**
2. **Configure Filtros:**
   - Produto específico ou categoria
   - Período de análise
   - Localização geográfica

3. **Execute Cálculo:**
   - Clique em **"Calcular Médias"**
   - Aguarde processamento
   - Analise resultados estatísticos

**Interpretação dos Resultados:**
- 💙 **Média Ponderada**: Valor recomendado
- 📊 **Média Simples**: Referência básica
- 📈 **Desvio Padrão**: Variabilidade dos dados
- 🎯 **Intervalo de Confiança**: Margem de segurança (95%)

**Uso Prático:**
- ✅ Use como **preço de referência** em licitações
- ✅ Justifique escolhas com **base estatística**
- ✅ Compare com **propostas recebidas**
- ✅ Documente **metodologia** utilizada

### **5.3 Análise Crítica de Preços**

**Funcionalidade de Análise Crítica:**
Detecta automaticamente:
- 🚨 **Outliers**: Preços muito acima/abaixo da média
- 📊 **Anomalias**: Padrões suspeitos nos dados
- ⚠️ **Riscos**: Classificação de níveis de alerta

**Classificação de Riscos:**
- 🟢 **BAIXO**: Preço dentro da normalidade
- 🟡 **MÉDIO**: Variação moderada (10-25%)
- 🟠 **ALTO**: Variação significativa (25-50%)
- 🔴 **CRÍTICO**: Variação extrema (>50%)

**Como Interpretar:**
1. **Análise Automática:**
   - Sistema executa análise contínua
   - Gera alertas em tempo real
   - Classifica automaticamente os riscos

2. **Recomendações do Sistema:**
   - 🔍 **Verificar fornecedores alternativos**
   - 📋 **Revisar especificações**
   - 💬 **Negociar condições**
   - ✅ **Validar com fornecedor**

3. **Ações Recomendadas:**
   - Investigue preços com risco ALTO/CRÍTICO
   - Documente justificativas para decisões
   - Busque segunda opinião quando necessário
   - Use análise na tomada de decisão

### **5.4 Documentos Automáticos**

**Tipos de Documentos Gerados:**

**📋 Pesquisa de Preços:**
- Relatório completo de pesquisa de mercado
- Comparação entre fontes
- Justificativa metodológica
- Conclusões e recomendações

**📊 Análise de Mercado:**
- Estudo de comportamento do mercado
- Tendências temporais
- Análise de competitividade
- Fatores que influenciam preços

**📄 Proposta Comercial:**
- Documento para fornecedores
- Especificações técnicas
- Condições comerciais
- Prazos e critérios

**🛡️ Relatório de Conformidade:**
- Verificação de normas e regulamentos
- Comprovação de qualidade
- Atestado de conformidade técnica

**Como Gerar Documentos:**
1. Acesse **"Funcionalidades Avançadas"** → **"Documentos"**
2. **Selecione Template:**
   - Escolha tipo de documento
   - Verifique campos obrigatórios
   - Configure formato de saída (PDF/DOCX)

3. **Configure Dados:**
   - Título do documento
   - Produto/processo relacionado
   - Período de referência
   - Observações específicas

4. **Gere e Baixe:**
   - Clique em **"Gerar Documento"**
   - Aguarde processamento (1-3 minutos)
   - Baixe arquivo pronto
   - Revise antes do uso oficial

---

## 🎯 **BOAS PRÁTICAS E DICAS**

### **💡 Dicas Gerais**

**Organização:**
- ✅ Use nomenclatura padronizada para produtos
- ✅ Mantenha cadastros sempre atualizados
- ✅ Organize produtos por categorias lógicas
- ✅ Documente processos e decisões

**Eficiência:**
- ⚡ Use filtros para encontrar informações rapidamente
- ⚡ Configure notificações para prazos importantes
- ⚡ Aproveite a busca automática para pesquisas
- ⚡ Utilize templates prontos quando possível

**Qualidade:**
- 🎯 Sempre valide dados de múltiplas fontes
- 🎯 Documente justificativas para decisões
- 🎯 Revise informações antes de finalizar
- 🎯 Mantenha histórico de análises

### **⚠️ Erros Comuns a Evitar**

**Cadastros:**
- ❌ Não duplicar produtos desnecessariamente
- ❌ Não deixar campos obrigatórios vazios
- ❌ Não usar descrições vagas ou genéricas
- ❌ Não esquecer de categorizar corretamente

**Cotações:**
- ❌ Não enviar cotações com prazos muito curtos
- ❌ Não esquecer de verificar dados dos fornecedores
- ❌ Não negligenciar especificações técnicas
- ❌ Não deixar de documentar análises

**Análises:**
- ❌ Não ignorar alertas de preços discrepantes
- ❌ Não tomar decisões sem justificativa
- ❌ Não usar dados desatualizados
- ❌ Não esquecer de validar resultados

### **🔧 Solução de Problemas**

**Problemas de Login:**
- Verifique e-mail e senha
- Limpe cache do navegador
- Tente navegador diferente
- Contate administrador se persistir

**Lentidão no Sistema:**
- Verifique conexão com internet
- Feche abas desnecessárias
- Atualize página (F5)
- Tente em horário de menor uso

**Dados Não Aparecem:**
- Verifique filtros aplicados
- Confirme permissões de acesso
- Aguarde carregamento completo
- Recarregue a página

**Dúvidas Específicas:**
- Consulte esta documentação
- Use função de ajuda (?) no sistema
- Contate suporte técnico
- Participe de treinamentos periódicos

---

## 📞 **SUPORTE E CONTATOS**

### **🆘 Canais de Suporte**

**Suporte Técnico:**
- 📧 E-mail: suporte@sistema-cestas.gov.br
- 📞 Telefone: (27) 3636-0000
- 💬 Chat online: Disponível no sistema
- 🕐 Horário: Segunda a sexta, 8h às 18h

**Treinamentos:**
- 📚 Treinamentos mensais online
- 🎥 Vídeos tutoriais disponíveis
- 📖 Documentação sempre atualizada
- 👥 Grupos de usuários por região

**Atualizações:**
- 🔔 Notificações automáticas de atualizações
- 📰 Newsletter mensal com novidades
- 📋 Release notes detalhadas
- 🗓️ Cronograma de manutenções programadas

---

## 📋 **CHECKLIST DE CAPACITAÇÃO**

### **✅ Após Módulo 1:**
- [ ] Consegue fazer login sem ajuda
- [ ] Navega pelos menus principais
- [ ] Identifica funcionalidades básicas
- [ ] Compreende perfis de usuário

### **✅ Após Módulo 2:**
- [ ] Cadastra produtos corretamente
- [ ] Gerencia fornecedores
- [ ] Organiza categorias
- [ ] Usa filtros de busca

### **✅ Após Módulo 3:**
- [ ] Cria cestas de preços
- [ ] Envia cotações
- [ ] Analisa propostas
- [ ] Documenta decisões

### **✅ Após Módulo 4:**
- [ ] Usa busca automática
- [ ] Interpreta dados de portais
- [ ] Compara múltiplas fontes
- [ ] Valida informações

### **✅ Após Módulo 5:**
- [ ] Navega no dashboard
- [ ] Calcula média ponderada
- [ ] Interpreta análise crítica
- [ ] Gera documentos automáticos

### **🎓 Certificação Completa:**
- [ ] Domina todas as funcionalidades
- [ ] Resolve problemas básicos
- [ ] Orienta outros usuários
- [ ] Sugere melhorias

---

## 📚 **RECURSOS ADICIONAIS**

### **📖 Documentação Técnica**
- Manual do Administrador
- Guia de Integração com Portais
- Especificações Técnicas
- FAQ Avançado

### **🎥 Materiais de Apoio**
- Vídeos tutoriais por funcionalidade
- Webinars mensais
- Cases de sucesso
- Apresentações de atualização

### **👥 Comunidade**
- Fórum de usuários
- Grupos regionais
- Canal no Telegram
- Encontros presenciais anuais

---

**📅 Versão:** 1.0 - Janeiro 2025  
**📝 Última Atualização:** 22/07/2025  
**👤 Responsável:** Equipe de Desenvolvimento  
**📧 Contato:** treinamento@sistema-cestas.gov.br

---

*Este manual é um documento vivo e será atualizado regularmente conforme novas funcionalidades são adicionadas ao sistema. Mantenha-se sempre atualizado consultando a versão mais recente.*
