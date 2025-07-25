/**
 * Integração com API PNCP (Portal Nacional de Contratações Públicas)
 * 
 * CONFORMIDADE COM DOCUMENTAÇÃO OFICIAL:
 * Este arquivo implementa as integrações conforme a documentação oficial PNCP
 * disponível em IMPLEMENTACAOPNCP.md
 * 
 * ENDPOINTS OFICIAIS IMPLEMENTADOS:
 * - Seção 6.5.8: Consultar Contrato/Empenho
 *   GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}
 * 
 * - Seção 6.5.9: Consultar Contratos/Empenhos de uma Contratação  
 *   GET /v1/orgaos/{cnpj}/contratos/contratacao/{anoContratacao}/{sequencialContratacao}
 * 
 * OBSERVAÇÕES:
 * - A API de consulta pública não requer autenticação
 * - Endpoints específicos requerem CNPJ do órgão
 * - Para buscas genéricas, são utilizados endpoints não documentados oficialmente
 * 
 * URLs BASE:
 * - Manutenção: https://pncp.gov.br/api/pncp/v1 (requer autenticação)
 * - Consulta: https://pncp.gov.br/api/consulta/v1 (público)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PNCPSearchParams {
  query?: string;
  uf?: string;
  municipio?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
}

interface PNCPDirectSearchParams {
  query?: string;
  uf?: string;
  municipio?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  modalidade?: string;
  situacao?: string;
  tipoLicitacao?: string;
}

interface PNCPContract {
  id: string;
  numero: string;
  objeto: string;
  valorInicial: number;
  fornecedor: {
    nome: string;
    cnpj: string;
  };
  orgaoEntidade: {
    nome: string;
    municipio: string;
    uf: string;
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  console.log('🚀 PNCP Integration iniciada - Método:', req.method, 'URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a requisição OPTIONS (CORS)');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Criando cliente Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📥 Lendo body da requisição...');
    const requestBody = await req.json();
    const { action, ...params } = requestBody;

    console.log('📋 PNCP Integration chamada:', {
      action,
      paramsKeys: Object.keys(params),
      timestamp: new Date().toISOString()
    });

    // Validar ação
    if (!action) {
      console.log('❌ Ação não fornecida');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Ação é obrigatória',
          statusCode: 400
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎯 Executando ação: ${action}`);

    switch (action) {
      case 'search_contracts':
        console.log('🔍 Iniciando busca de contratos...');
        return await searchContracts(params, supabase);
      case 'search':
        console.log('🔍 Iniciando busca direta na API PNCP (como o site oficial)...');
        return await searchPNCPDirect(params, supabase);
      case 'sync_prices':
        console.log('🔄 Iniciando sincronização de preços...');
        return await syncPrices(params, supabase);
      default:
        console.log('❌ Ação não reconhecida:', action);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Ação '${action}' não reconhecida`,
            availableActions: ['search_contracts', 'search', 'sync_prices'],
            statusCode: 400
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (parseError) {
    console.error('💥 Erro ao processar requisição:', {
      name: parseError.name,
      message: parseError.message,
      stack: parseError.stack
    });
    
    // SEMPRE retornar status 200 para evitar erro no frontend
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro ao processar requisição',
        details: parseError.message,
        errorType: parseError.name,
        statusCode: 500
      }),
      { 
        status: 200, // Crítico: sempre 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Função para consultar contrato específico conforme documentação oficial
// Seção 6.5.8: Consultar Contrato/Empenho
async function getSpecificContract(cnpj: string, ano: string, sequencial: string) {
  const baseUrlConsulta = 'https://pncp.gov.br/api/consulta/v1';
  const url = `${baseUrlConsulta}/orgaos/${cnpj}/contratos/${ano}/${sequencial}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Sistema-Cestas-Publicas/1.0'
      }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Erro ao consultar contrato específico:', error);
    throw error;
  }
}

// Função para consultar contratos de uma contratação específica
// Seção 6.5.9: Consultar Contratos/Empenhos de uma Contratação
async function getContractsFromProcurement(cnpj: string, anoContratacao: string, sequencialContratacao: string) {
  const baseUrlConsulta = 'https://pncp.gov.br/api/consulta/v1';
  const url = `${baseUrlConsulta}/orgaos/${cnpj}/contratos/contratacao/${anoContratacao}/${sequencialContratacao}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Sistema-Cestas-Publicas/1.0'
      }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Erro ao consultar contratos da contratação:', error);
    throw error;
  }
}

// Função de busca direta similar ao site oficial PNCP - https://pncp.gov.br/app/editais
async function searchPNCPDirect(params: PNCPDirectSearchParams, supabase: any) {
  // Timeout global para toda a função (25 segundos)
  const globalTimeout = setTimeout(() => {
    console.error('⏰ Timeout global da função searchPNCPDirect (25s)');
  }, 25000);

  try {
    console.log('🔍 Iniciando busca direta na API PNCP como o site oficial com parâmetros:', params);
    
    // URLs base conforme site oficial do PNCP
    const baseUrlPesquisa = 'https://pncp.gov.br/api/pncp';
    
    let results: any[] = [];
    let apiCallSuccess = false;
    let apiError = '';
    
    try {
      // Construir parâmetros de busca similares ao site oficial
      const searchParams = new URLSearchParams();
      
      // Adicionar parâmetros de busca
      if (params.query) {
        searchParams.append('q', params.query);
      }
      if (params.uf) {
        searchParams.append('uf', params.uf);
      }
      if (params.municipio) {
        searchParams.append('municipio', params.municipio);
      }
      if (params.dataInicio) {
        searchParams.append('dataPublicacaoDe', params.dataInicio);
      }
      if (params.dataFim) {
        searchParams.append('dataPublicacaoAte', params.dataFim);
      }
      if (params.modalidade) {
        searchParams.append('modalidade', params.modalidade);
      }
      if (params.situacao) {
        searchParams.append('situacao', params.situacao);
      }
      if (params.tipoLicitacao) {
        searchParams.append('tipoLicitacao', params.tipoLicitacao);
      }
      
      // Parâmetros de paginação - similar ao site oficial
      const pagina = params.pagina || 1;
      searchParams.append('pagina', pagina.toString());
      searchParams.append('tamanhoPagina', '20'); // Padrão do site
      
      // Endpoint usado pelo site oficial do PNCP para pesquisa de editais
      const searchUrl = `${baseUrlPesquisa}/editais/pesquisar?${searchParams.toString()}`;
      
      console.log('🌐 URL de busca no padrão oficial:', searchUrl);
      
      try {
        console.log(`🔍 Realizando consulta na API oficial (simulando o site https://pncp.gov.br/app/editais)...`);
        
        const response = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 Sistema-Cestas-Publicas/1.0 (Official Integration)',
            'Content-Type': 'application/json',
            'Referer': 'https://pncp.gov.br/',
            'Origin': 'https://pncp.gov.br'
          },
          signal: AbortSignal.timeout(15000) // 15 segundos
        });
        
        console.log(`📊 Status da resposta da API oficial PNCP (${response.status}):`, response.statusText);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Dados recebidos da API oficial:', {
            type: typeof responseData,
            hasData: !!responseData?.content,
            isArray: Array.isArray(responseData),
            hasContent: !!responseData?.content,
            totalElements: responseData?.totalElements,
            keys: Object.keys(responseData || {})
          });
          
          apiCallSuccess = true;
          
          // Verificar formato da resposta - site oficial retorna objeto com content: []
          if (responseData && responseData.content && Array.isArray(responseData.content)) {
            results = responseData.content;
            console.log(`📋 API oficial retornou ${results.length} editais na página ${pagina}`);
            console.log(`📊 Total de ${responseData.totalElements} registros disponíveis em ${responseData.totalPages} páginas`);
          } else if (responseData && Array.isArray(responseData)) {
            results = responseData;
            console.log(`📋 Formato alternativo: array direto com ${results.length} resultados`);
          } else {
            console.log('⚠️ Formato de resposta oficial não reconhecido:', responseData);
          }
          
        } else {
          apiError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`❌ Resposta não OK da API oficial (${response.status}):`, response.statusText);
          
          // Tentar obter detalhes do erro
          try {
            const errorData = await response.text();
            console.log('📝 Detalhes do erro da API oficial:', errorData);
            if (errorData) {
              apiError += ` - ${errorData}`;
            }
          } catch (e) {
            console.log('⚠️ Não foi possível obter detalhes do erro');
          }
        }
          
      } catch (fetchError) {
        console.error(`💥 Erro ao acessar API oficial:`, {
          name: fetchError.name,
          message: fetchError.message,
          cause: fetchError.cause
        });
        
        if (fetchError.name === 'TimeoutError') {
          apiError = 'Timeout na conexão com API oficial (15s)';
        } else if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          apiError = 'Erro de rede - API oficial pode estar indisponível';
        } else {
          apiError = fetchError.message || 'Erro de conexão com API oficial';
        }
      }
    
    } catch (requestError) {
      console.error('Erro ao preparar a requisição para API oficial:', requestError);
      apiError = requestError.message || 'Erro ao preparar a requisição';
    }

    // Se conseguiu dados da API oficial
    if (results.length > 0 && apiCallSuccess) {
      await logSync(supabase, 'search_direct_official', 'success', results.length, 0, 0, 'Dados obtidos da API oficial do PNCP');

      // Mapeia os resultados para um formato padronizado
      const mappedResults = results.map(item => ({
        id: item.id || item.sequencialCompra || `pncp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        numeroEdital: item.numeroEdital || item.numeroCompra || 'N/A',
        objeto: item.objeto || item.objetoCompra || 'Objeto não especificado',
        dataPublicacao: item.dataPublicacao || item.dataAtualizacao || new Date().toISOString().split('T')[0],
        dataAbertura: item.dataAbertura || null,
        valorEstimado: parseFloat(item.valorTotalEstimado || item.valorTotal || item.valorGlobal || 0),
        modalidade: item.modalidade || 'Não informada',
        situacao: item.situacao || 'Não informada',
        orgao: {
          nome: item.orgao?.nome || item.orgaoEntidade?.nome || 'Órgão não informado',
          municipio: item.orgao?.municipio || item.orgaoEntidade?.municipio || params.municipio || '',
          uf: item.orgao?.uf || item.orgaoEntidade?.uf || params.uf || ''
        },
        urlPncp: item.urlPncp || item.linkDetalhamento || `https://pncp.gov.br/app/editais/${item.id}`,
        tipoLicitacao: item.tipoLicitacao || '',
        numeroParcelas: item.numeroParcelas || null,
        prazosRecursoTipo: item.prazosRecursoTipo || null
      }));

      clearTimeout(globalTimeout);
      return new Response(
        JSON.stringify({
          success: true,
          data: mappedResults,
          pagination: {
            page: params.pagina || 1,
            totalPages: results.length > 0 ? Math.ceil(results.length / 20) : 1,
            totalElements: results.length
          },
          message: `${mappedResults.length} editais encontrados na API oficial do PNCP`,
          source: 'API oficial PNCP',
          fallback: false
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Se a API funcionou mas não retornou dados
    if (apiCallSuccess && results.length === 0) {
      console.log('API oficial funcionou mas não retornou dados para os parâmetros especificados');
      
      await logSync(supabase, 'search_direct_official', 'success', 0, 0, 0, 'API oficial acessível mas sem dados para os parâmetros');
      
      clearTimeout(globalTimeout);
      return new Response(
        JSON.stringify({ 
          success: true,
          data: [],
          message: 'Nenhum edital encontrado na API oficial do PNCP para os parâmetros especificados',
          source: 'API oficial PNCP',
          fallback: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Se chegou aqui, é porque a API oficial não está acessível
    console.log('API oficial do PNCP não acessível:', apiError);
    
    await logSync(supabase, 'search_direct_official', 'warning', 0, 0, 0, `API oficial do PNCP inacessível: ${apiError}`);
    
    clearTimeout(globalTimeout);
    return new Response(
      JSON.stringify({ 
        success: false,
        data: [],
        message: `API oficial do PNCP não está acessível: ${apiError}`,
        error: apiError,
        fallback: false
      }),
      { 
        status: 200, // Sempre retornar 200 para evitar erro no frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Erro crítico ao buscar na API oficial do PNCP:', error);
    
    await logSync(supabase, 'search_direct_official', 'error', 0, 0, 0, `Erro crítico: ${error.message}`);
    
    clearTimeout(globalTimeout);
    return new Response(
      JSON.stringify({ 
        success: false,
        data: [],
        message: `Erro crítico ao acessar API oficial do PNCP: ${error.message}`,
        error: error.message,
        fallback: false
      }),
      { 
        status: 200, // Sempre retornar 200 para evitar erro no frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function searchContracts(params: PNCPSearchParams, supabase: any) {
  // Timeout global para toda a função (25 segundos)
  const globalTimeout = setTimeout(() => {
    console.error('⏰ Timeout global da função searchContracts (25s)');
  }, 25000);

  try {
    console.log('Buscando contratos PNCP com parâmetros:', params);
    
    // URLs base conforme documentação oficial PNCP
    const baseUrlManutencao = 'https://pncp.gov.br/api/pncp/v1';
    const baseUrlConsulta = 'https://pncp.gov.br/api/consulta/v1';
    
    let contracts: PNCPContract[] = [];
    let apiCallSuccess = false;
    let apiError = '';

    try {
      // IMPORTANTE: A documentação oficial PNCP não possui um endpoint genérico para busca de contratos
      // Os endpoints disponíveis são:
      // 1. /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial} - Para consulta específica
      // 2. /v1/orgaos/{cnpj}/contratos/contratacao/{anoContratacao}/{sequencialContratacao} - Para contratos de uma contratação
      
      // Como não temos CNPJ específico, vamos tentar uma abordagem alternativa
      // usando o endpoint de consulta que pode estar disponível mas não documentado
      
      console.log('⚠️  AVISO: Usando endpoint não documentado oficialmente');
      console.log('📋 Endpoints oficiais requerem CNPJ específico do órgão');
      console.log('🔍 Tentando endpoint de consulta genérica...');
      
      const searchParams = new URLSearchParams();
      
      // Adicionar parâmetros de busca
      if (params.query) {
        searchParams.append('q', params.query);
      }
      if (params.uf) {
        searchParams.append('uf', params.uf);
      }
      if (params.municipio) {
        searchParams.append('municipio', params.municipio);
      }
      if (params.dataInicio) {
        searchParams.append('dataInicial', params.dataInicio);
      }
      if (params.dataFim) {
        searchParams.append('dataFinal', params.dataFim);
      }
      
      // Parâmetros de paginação
      searchParams.append('size', '50');
      searchParams.append('page', '0');
      
      // Tentar diferentes endpoints possíveis
      const possibleEndpoints = [
        `${baseUrlConsulta}/contratos?${searchParams.toString()}`,
        `${baseUrlConsulta}/contratos/busca?${searchParams.toString()}`,
        `${baseUrlConsulta}/contratacoes?${searchParams.toString()}`
      ];
      
      let lastError = '';
      
      for (const consultaUrl of possibleEndpoints) {
        console.log('Tentando endpoint:', consultaUrl);
        
        try {
          console.log(`🔄 Tentando endpoint ${consultaUrl.indexOf('/contratos?') > -1 ? '1/3' : consultaUrl.indexOf('/contratos/busca?') > -1 ? '2/3' : '3/3'}:`, consultaUrl);
          
          const response = await fetch(consultaUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Sistema-Cestas-Publicas/1.0',
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // Reduzido para 10 segundos
          });
          
          console.log(`📊 Status da resposta PNCP (${response.status}):`, response.statusText);
          
          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Dados recebidos da API PNCP:', {
              type: typeof responseData,
              hasData: !!responseData?.data,
              isArray: Array.isArray(responseData),
              hasContent: !!responseData?.content,
              keys: Object.keys(responseData || {})
            });
            
            apiCallSuccess = true;
            
            // Verificar formato da resposta
            if (responseData && Array.isArray(responseData.data)) {
              contracts = responseData.data;
              console.log(`📋 Formato: responseData.data com ${contracts.length} contratos`);
            } else if (responseData && Array.isArray(responseData)) {
              contracts = responseData;
              console.log(`📋 Formato: array direto com ${contracts.length} contratos`);
            } else if (responseData && responseData.content && Array.isArray(responseData.content)) {
              contracts = responseData.content;
              console.log(`📋 Formato: responseData.content com ${contracts.length} contratos`);
            } else {
              console.log('⚠️ Formato de resposta não reconhecido:', responseData);
            }
            
            console.log(`🎯 Total de ${contracts.length} contratos encontrados na API PNCP`);
            
            // Se encontrou dados, sair do loop
            if (contracts.length > 0) {
              console.log('✅ Dados encontrados, parando tentativas');
              break;
            } else {
              console.log('⚠️ API respondeu OK mas sem dados, tentando próximo endpoint...');
            }
            
          } else {
            lastError = `HTTP ${response.status}: ${response.statusText}`;
            console.log(`❌ Resposta não OK da API PNCP (${response.status}):`, response.statusText);
            
            // Tentar resposta de erro detalhada
            try {
              const errorData = await response.text();
              console.log('📝 Detalhes do erro PNCP:', errorData);
              if (errorData) {
                lastError += ` - ${errorData}`;
              }
            } catch (e) {
              console.log('⚠️ Não foi possível obter detalhes do erro');
            }
          }
          
        } catch (endpointError) {
          console.error(`💥 Erro no endpoint ${consultaUrl}:`, {
            name: endpointError.name,
            message: endpointError.message,
            cause: endpointError.cause
          });
          
          if (endpointError.name === 'TimeoutError') {
            lastError = 'Timeout na conexão com API PNCP (10s)';
          } else if (endpointError.name === 'TypeError' && endpointError.message.includes('fetch')) {
            lastError = 'Erro de rede - API PNCP pode estar indisponível';
          } else {
            lastError = endpointError.message || 'Erro de conexão';
          }
          
          console.log(`🔄 Continuando para próximo endpoint... (Erro: ${lastError})`);
          continue;
        }
      }
    
    // Se nenhum endpoint funcionou
    if (!apiCallSuccess) {
      apiError = lastError || 'Nenhum endpoint de consulta funcionou';
      console.error('❌ Todos os endpoints falharam:', apiError);
      console.log('📖 Consulte a documentação oficial em: https://pncp.gov.br/api/docs');
      console.log('🔧 Para consultas específicas, use: /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}');
    } else {
      // Mapear dados para formato padrão
      contracts = contracts.map((contract: any) => ({
        id: contract.numeroControlePNCP || contract.id || `pncp-${Date.now()}-${Math.random()}`,
        numero: contract.numeroContratoEmpenho || contract.numero || 'N/A',
        objeto: contract.objetoContrato || contract.objeto || 'Objeto não especificado',
        valorInicial: parseFloat(contract.valorInicial || contract.valorGlobal || contract.valorTotal || 0),
        fornecedor: {
          nome: contract.nomeRazaoSocialFornecedor || contract.fornecedor?.nome || 'Fornecedor não informado',
          cnpj: contract.niFornecedor || contract.fornecedor?.cnpj || 'N/A'
        },
        orgaoEntidade: {
          nome: contract.orgaoEntidade?.razaosocial || contract.orgaoEntidade?.nome || 'Órgão não informado',
            cnpj: contract.orgaoEntidade?.cnpj || 'N/A',
            uf: contract.unidadeOrgao?.ufSigla || contract.orgaoEntidade?.uf || 'N/A',
            municipio: contract.unidadeOrgao?.municipioNome || contract.orgaoEntidade?.municipio || 'N/A'
        },
        dataAssinatura: contract.dataAssinatura || contract.dataPublicacao || new Date().toISOString(),
        modalidade: contract.tipoContrato?.nome || contract.modalidade || 'Modalidade não informada',
        linkDetalhamento: contract.linkDetalhamento || null
      }));
    }
    
  } catch (fetchError) {
    console.error('Erro ao fazer requisição para API PNCP:', fetchError);
    apiError = fetchError.message || 'Erro de conexão com API PNCP';
  }

    // Se conseguiu dados reais da API
    if (contracts.length > 0 && apiCallSuccess) {
      await logSync(supabase, 'search_contracts', 'success', contracts.length, 0, 0, 'Dados obtidos da API real do PNCP');

      clearTimeout(globalTimeout);
      return new Response(
        JSON.stringify({ 
          success: true,
          data: contracts,
          message: `${contracts.length} contratos encontrados da API oficial PNCP`,
          fallback: false,
          apiStatus: 'Dados reais obtidos da API oficial',
          realApi: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Se a API funcionou mas não retornou dados
    if (apiCallSuccess && contracts.length === 0) {
      console.log('API funcionou mas não retornou dados para os parâmetros especificados');
      
      await logSync(supabase, 'search_contracts', 'success', 0, 0, 0, 'API acessível mas sem dados para os parâmetros');
      
      clearTimeout(globalTimeout);
      return new Response(
        JSON.stringify({ 
          success: true,
          data: [],
          message: 'Nenhum contrato encontrado para os parâmetros especificados',
          fallback: false,
          apiStatus: 'API funcionando - sem dados para filtros',
          realApi: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Se chegou aqui, é porque a API não está acessível
    console.log('API PNCP não acessível, mas retornando sucesso com aviso:', apiError);
    
    await logSync(supabase, 'search_contracts', 'warning', 0, 0, 0, `API PNCP inacessível: ${apiError}`);
    
    clearTimeout(globalTimeout);
    return new Response(
      JSON.stringify({ 
        success: false,
        data: [],
        message: `API do PNCP não está acessível: ${apiError}`,
        fallback: false,
        error: apiError,
        realApi: false,
        statusCode: 503
      }),
      { 
        status: 200, // Sempre retornar 200 para evitar erro no frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Erro crítico ao buscar contratos PNCP:', error);
    
    await logSync(supabase, 'search_contracts', 'error', 0, 0, 0, `Erro crítico: ${error.message}`);
    
    clearTimeout(globalTimeout);
    return new Response(
      JSON.stringify({ 
        success: false,
        data: [],
        message: `Erro crítico ao acessar API do PNCP: ${error.message}`,
        fallback: false,
        error: error.message,
        realApi: false,
        statusCode: 500
      }),
      { 
        status: 200, // Sempre retornar 200 para evitar erro no frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function syncPrices(params: any, supabase: any) {
  try {
    console.log('Iniciando sincronização de preços PNCP...');
    
    // Buscar contratos diretamente da API PNCP
    const baseUrl = 'https://pncp.gov.br/api/consulta/v1';
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    
    // Obter ID da integração PNCP
    const { data: integration, error: integrationError } = await supabase
      .from('external_price_integrations')
      .select('id')
      .eq('source_name', 'PNCP')
      .single();
    
    if (integrationError || !integration) {
      throw new Error('Integração PNCP não encontrada');
    }
    
    const integrationSourceId = integration.id;
    
    try {
      // Buscar contratos dos últimos 7 dias
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const searchParams = new URLSearchParams({
        dataInicial: startDate.toISOString().split('T')[0],
        dataFinal: endDate.toISOString().split('T')[0],
        size: '50',
        page: '0'
      });
      
      const consultaUrl = `${baseUrl}/contratos?${searchParams.toString()}`;
      console.log('Buscando contratos para sincronização:', consultaUrl);
      
      const response = await fetch(consultaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Sistema-Cestas-Publicas/1.0',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Dados recebidos para sincronização:', responseData);
        
        let contracts = [];
        
        // Verificar formato da resposta
        if (responseData && Array.isArray(responseData.data)) {
          contracts = responseData.data;
        } else if (responseData && Array.isArray(responseData)) {
          contracts = responseData;
        }
        
        console.log(`Processando ${contracts.length} contratos para sincronização`);
        
        // Processar cada contrato
        for (const contract of contracts) {
          try {
            totalProcessed++;
            
            // Extrair informações do contrato
            const contractData = {
              integration_source_id: integrationSourceId,
              product_description: contract.objetoCompra || contract.objeto || 'Produto não especificado',
              product_code: contract.numeroControlePNCP || contract.id || `pncp-${Date.now()}-${Math.random()}`,
              unit_measure: 'UN', // Unidade padrão
              unit_price: parseFloat(contract.valorTotalEstimado || contract.valorInicial || 0),
              total_price: parseFloat(contract.valorTotalEstimado || contract.valorInicial || 0),
              quantity: 1, // Quantidade padrão
              supplier_name: contract.fornecedor?.razaoSocial || contract.fornecedor?.nome || 'Fornecedor não informado',
              supplier_cnpj: contract.fornecedor?.cnpj || null,
              procurement_number: contract.numeroCompra || contract.numero || 'N/A',
              procurement_date: contract.dataPublicacao || contract.dataAssinatura || new Date().toISOString(),
              procurement_type: 'Contrato PNCP',
              location_uf: contract.orgaoEntidade?.uf || 'N/A',
              location_city: contract.orgaoEntidade?.municipio || 'N/A',
              source_document_url: contract.linkDetalhamento || null,
              raw_data: contract
            };
            
            // Fazer upsert na tabela external_price_records
            const { data, error } = await supabase
              .from('external_price_records')
              .upsert(contractData, {
                onConflict: 'integration_source_id,product_code,procurement_number',
                ignoreDuplicates: false
              })
              .select();
            
            if (error) {
              console.error('Erro ao inserir/atualizar registro:', error);
              continue;
            }
            
            if (data && data.length > 0) {
              // Verificar se foi inserção ou atualização
              const record = data[0];
              if (record.created_at === record.updated_at) {
                totalInserted++;
              } else {
                totalUpdated++;
              }
            }
            
          } catch (contractError) {
            console.error('Erro ao processar contrato:', contractError);
            continue;
          }
        }
        
        console.log(`Sincronização concluída: ${totalProcessed} processados, ${totalInserted} inseridos, ${totalUpdated} atualizados`);
        
      } else {
        console.log('Erro na resposta da API PNCP:', response.status, response.statusText);
        throw new Error(`API PNCP retornou erro: ${response.status} ${response.statusText}`);
      }
      
    } catch (apiError) {
      console.error('Erro ao acessar API PNCP para sincronização:', apiError);
      throw apiError;
    }
    
    // Atualizar timestamp da última sincronização
    const { error: updateError } = await supabase
      .from('external_price_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('source_name', 'PNCP');
    
    if (updateError) {
      console.error('Erro ao atualizar timestamp de sincronização:', updateError);
    }
    
    // Log da sincronização
    await logSync(supabase, 'sync_prices', 'success', totalProcessed, totalInserted, totalUpdated, null);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        processed: totalProcessed,
        inserted: totalInserted,
        updated: totalUpdated,
        message: `${totalInserted} contratos inseridos, ${totalUpdated} atualizados`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Erro na sincronização de preços:', error);
    await logSync(supabase, 'sync_prices', 'error', 0, 0, 0, error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro ao sincronizar preços',
        details: error.message,
        statusCode: 500
      }),
      { 
        status: 200, // Sempre retornar 200 para evitar erro no frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function logSync(
  supabase: any, 
  syncType: string, 
  status: string, 
  processed: number, 
  inserted: number, 
  updated: number, 
  errorMessage?: string
) {
  try {
    // Buscar o ID da integração PNCP
    const { data: integration } = await supabase
      .from('external_price_integrations')
      .select('id')
      .eq('source_name', 'PNCP')
      .single();

    if (integration) {
      await supabase
        .from('integration_sync_logs')
        .insert({
          integration_source_id: integration.id,
          sync_type: syncType,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status,
          records_processed: processed,
          records_inserted: inserted,
          records_updated: updated,
          error_message: errorMessage || null
        });
    }
  } catch (logError) {
    console.error('Erro ao registrar log:', logError);
  }
}

// Função getFallbackContracts removida - não utilizamos mais dados mockados
