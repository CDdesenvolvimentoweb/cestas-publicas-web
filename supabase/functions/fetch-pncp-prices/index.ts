/**
 * Edge Function para buscar preços de Atas de Registro de Preço do PNCP
 * 
 * Esta função consulta a API oficial do PNCP (Portal Nacional de Contratações Públicas)
 * para obter dados de atas de registro de preços e seus itens, armazenando-os no banco
 * de dados para consultas futuras.
 * 
 * Documentação oficial PNCP: https://pncp.gov.br/api/docs
 * Endpoint usado: /v1/atas (Atas de Registro de Preço)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Headers para resposta CORS - permitir localhost para desenvolvimento
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, use seu domínio específico
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-length, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 horas de cache para preflight
};

// Cliente Supabase para acessar o banco de dados
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  console.log(`🔄 Requisição recebida: ${req.method} ${req.url}`);
  
  // Lidar com requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a requisição OPTIONS (CORS preflight)');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204 
    });
  }
  
  try {
    console.log('🚀 Iniciando busca de preços PNCP');
    
    // Extrair parâmetros da requisição
    const { 
      dataInicial, 
      dataFinal, 
      cnpjOrgao, 
      descricaoItem,
      ufs,
      municipios,
      maxItems = 1000 // Limite de segurança para não sobrecarregar
    } = await req.json();

    // Validar parâmetros obrigatórios
    if (!dataInicial || !dataFinal) {
      throw new Error("Parâmetros dataInicial e dataFinal são obrigatórios");
    }

    const BASE_URL = "https://pncp.gov.br/api/consulta";
    let pagina = 1;
    let todasAtas: any[] = [];
    let totalRegistros = 0;
    let totalAtas = 0;
    
    console.log(`🔍 Buscando atas no período ${dataInicial} a ${dataFinal}`);
    if (cnpjOrgao) console.log(`📎 CNPJ do órgão: ${cnpjOrgao}`);

    // Loop para paginação automática
    while (true) {
      const url = new URL(`${BASE_URL}/v1/atas`);
      
      // Adicionar parâmetros de busca
      url.searchParams.append('dataInicial', dataInicial);
      url.searchParams.append('dataFinal', dataFinal);
      if (cnpjOrgao) url.searchParams.append('cnpjOrgao', cnpjOrgao);
      url.searchParams.append('pagina', pagina.toString());
      
      console.log(`📄 Buscando página ${pagina}: ${url.toString()}`);
      
      // Fazer requisição com timeout de 30 segundos
      const res = await fetch(url.toString(), { 
        headers: { 
          'accept': 'application/json',
          'User-Agent': 'Sistema-Cestas-Publicas/1.0'
        },
        signal: AbortSignal.timeout(30000)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ API PNCP retornou status ${res.status}: ${errorText}`);
        throw new Error(`PNCP retornou ${res.status}: ${errorText}`);
      }
      
      const json = await res.json();
      console.log(`✅ Dados recebidos página ${pagina}:`, {
        empty: json.empty || false,
        size: json.size || 0,
        totalPaginas: json.totalPaginas || 0,
        totalElementos: json.totalElementos || 0,
        itens: json.data?.length || 0
      });
      
      // Se não há dados, sair do loop
      if (json.empty || !json.data || json.data.length === 0) {
        console.log('📭 Sem mais dados para buscar');
        break;
      }

      // Adicionar dados recebidos ao array
      todasAtas.push(...json.data);
      totalAtas += json.data.length;
      
      console.log(`📊 Total de atas até agora: ${totalAtas}`);
      
      // Verificar se chegamos na última página
      if (!json.totalPaginas || pagina >= json.totalPaginas) {
        console.log('🏁 Chegamos à última página');
        break;
      }
      
      // Verificar limite de itens para não sobrecarregar
      if (totalRegistros > maxItems) {
        console.log(`⚠️ Atingido limite de segurança (${maxItems} itens)`);
        break;
      }
      
      // Próxima página
      pagina++;
    }

    console.log(`🗃️ Processando ${todasAtas.length} atas...`);
    
    // Extrai itens de cada ata e cria registros para inserção
    const registros = [];
    
    for (const ata of todasAtas) {
      if (!ata.itensAtaRegistroPreco || !Array.isArray(ata.itensAtaRegistroPreco)) {
        console.warn(`⚠️ Ata ${ata.numeroControlePNCPAta || 'desconhecida'} não possui itens válidos`);
        continue;
      }
      
      // Extrair itens da ata
      for (const item of ata.itensAtaRegistroPreco) {
        // Filtrar por descrição do item, se informada
        if (descricaoItem && !item.descricao?.toLowerCase().includes(descricaoItem.toLowerCase())) {
          continue;
        }
        
        // Filtrar por UF, se informada
        if (ufs && ufs.length > 0) {
          const ataUF = ata.orgao?.uf || ata.unidadeOrgao?.ufSigla || '';
          if (!ufs.includes(ataUF)) {
            continue;
          }
        }
        
        // Filtrar por município, se informado
        if (municipios && municipios.length > 0) {
          const ataMunicipio = ata.orgao?.municipio || ata.unidadeOrgao?.municipioNome || '';
          const municipioMatch = municipios.some(m => 
            ataMunicipio.toLowerCase().includes(m.toLowerCase())
          );
          if (!municipioMatch) {
            continue;
          }
        }
        
        registros.push({
          ata_pncp: ata.numeroControlePNCPAta,
          descricao_item: item.descricao,
          valor_unitario: parseFloat(item.valorUnitario || 0),
          unidade: item.unidade || 'UN',
          quantidade: parseFloat(item.quantidade || 0),
          data_atualizacao: new Date().toISOString(),
          
          // Campos adicionais
          cnpj_orgao: ata.orgao?.cnpj || '',
          nome_orgao: ata.orgao?.razaoSocial || ata.orgao?.nome || '',
          municipio: ata.orgao?.municipio || ata.unidadeOrgao?.municipioNome || '',
          uf: ata.orgao?.uf || ata.unidadeOrgao?.ufSigla || '',
          data_ata: ata.dataAta || ata.dataAssinatura || null,
          numero_ata: ata.numeroAta || '',
          objeto_ata: ata.objeto || ''
        });
        
        totalRegistros++;
        
        // Verificar limite de itens para não sobrecarregar
        if (totalRegistros >= maxItems) {
          console.log(`⚠️ Atingido limite de segurança (${maxItems} itens)`);
          break;
        }
      }
      
      // Verificar limite de itens para não sobrecarregar
      if (totalRegistros >= maxItems) {
        break;
      }
    }

    console.log(`📥 Total de registros a inserir: ${registros.length}`);
    
    if (registros.length === 0) {
      return new Response(
        JSON.stringify({ 
          status: "ok", 
          message: "Nenhum registro encontrado com os critérios especificados",
          atas: todasAtas.length,
          inserted: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Inserir registros no banco em lotes de 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
      const batch = registros.slice(i, i + BATCH_SIZE);
      console.log(`📤 Inserindo lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(registros.length/BATCH_SIZE)} (${batch.length} registros)`);
      
      const { error, count } = await supabase
        .from("pncp_prices")
        .insert(batch)
        .select('id');
        
      if (error) {
        console.error(`❌ Erro ao inserir lote: ${error.message}`);
        throw error;
      }
      
      insertedCount += count || batch.length;
      console.log(`✅ Lote inserido com sucesso (${count || batch.length} registros)`);
    }

    // Registrar na tabela de logs de sincronização
    try {
      await supabase
        .from("integration_sync_logs")
        .insert({
          integration_source_id: (await supabase
            .from('external_price_integrations')
            .select('id')
            .eq('source_name', 'PNCP')
            .single()).data?.id,
          sync_type: "fetch_atas_precos",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: "success",
          records_processed: todasAtas.length,
          records_inserted: insertedCount,
          records_updated: 0,
          error_message: null
        });
      console.log('📝 Log de sincronização registrado');
    } catch (logError) {
      console.warn('⚠️ Erro ao registrar log de sincronização:', logError.message);
    }

    console.log(`✅ Sincronização concluída com sucesso: ${insertedCount} registros inseridos`);
    return new Response(
      JSON.stringify({ 
        status: "ok", 
        message: "Dados de preços PNCP sincronizados com sucesso",
        atas: todasAtas.length,
        inserted: insertedCount,
        timeStamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  } catch (err: any) {
    console.error('💥 Erro ao processar requisição:', err.message);
    
    // Registrar erro no log de sincronização
    try {
      await supabase
        .from("integration_sync_logs")
        .insert({
          integration_source_id: (await supabase
            .from('external_price_integrations')
            .select('id')
            .eq('source_name', 'PNCP')
            .single()).data?.id,
          sync_type: "fetch_atas_precos",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: "error",
          records_processed: 0,
          records_inserted: 0,
          records_updated: 0,
          error_message: err.message
        });
    } catch (logError) {
      console.warn('⚠️ Erro ao registrar log de sincronização:', logError.message);
    }
    
    console.log('❌ Erro na função:', err.message);
    return new Response(
      JSON.stringify({ 
        status: "error", 
        error: err.message,
        details: err.stack || 'Sem detalhes adicionais',
        timeStamp: new Date().toISOString()
      }),
      { 
        status: 200, // Usar sempre 200 mesmo para erros para evitar problemas de CORS
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  }
});
