
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod/mod.ts';

// --- Lógica de Acesso à API do PNCP (copiada e adaptada para Deno) ---

const PncpItemSchema = z.object({
  numeroItem: z.number(),
  descricao: z.string(),
  valorUnitarioEstimado: z.number().nullable(),
  quantidade: z.number().nullable(),
});

const PncpContratacaoSchema = z.object({
  cnpj: z.string(),
  anoCompra: z.number(),
  sequencialCompra: z.number(),
  objetoContratacao: z.string(),
  dataAtualizacao: z.string(),
});

const PncpApiResponseSchema = z.object({
  data: z.array(PncpContratacaoSchema),
});

const PncpItensApiResponseSchema = z.object({
    data: z.array(PncpItemSchema),
});


async function getContratacoesPorData(dataAtualizacao: string) {
  const baseUrl = 'https://pncp.gov.br/api/pncp/v1/contratacoes/atualizacao';
  const url = new URL(baseUrl);
  url.searchParams.append('dataAtualizacao', dataAtualizacao);
  url.searchParams.append('pagina', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erro na API do PNCP (Contratações): ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  const validation = PncpApiResponseSchema.safeParse(result);
  if (!validation.success) {
    throw new Error('Resposta inesperada da API do PNCP (Contratações).');
  }
  return validation.data.data;
}

async function getItensDeContratacao(cnpj: string, ano: number, sequencial: number) {
  const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
  const response = await fetch(url);
  if (!response.ok) {
    // Ignora 404 para itens, pois algumas contratações podem não ter itens listados
    if (response.status === 404) return []; 
    throw new Error(`Erro na API do PNCP (Itens): ${response.status} ${response.statusText}`);
  }
  const result = await response.json();
  const validation = PncpItensApiResponseSchema.safeParse(result);
    if (!validation.success) {
    throw new Error('Resposta inesperada da API do PNCP (Itens).');
  }
  return validation.data.data;
}

// --- Corpo da Edge Function ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { api_config_id, sync_type = 'manual' } = await req.json();

    const { data: apiConfig, error: configError } = await supabaseClient
      .from('external_api_configs')
      .select('*')
      .eq('id', api_config_id)
      .eq('is_active', true)
      .single();

    if (configError) throw new Error(`Configuração da API não encontrada: ${configError.message}`);

    const { data: syncLog, error: logError } = await supabaseClient
      .from('api_sync_logs')
      .insert({ api_config_id, sync_type, status: 'running' })
      .select()
      .single();

    if (logError) throw new Error(`Erro ao criar log: ${logError.message}`);

    let recordsProcessed = 0;
    let errorMessage = null;

    try {
      // Lógica de sincronização específica do PNCP
      const today = new Date().toISOString().split('T')[0];
      const contratacoes = await getContratacoesPorData(today);

      for (const contratacao of contratacoes) {
        try {
          const itens = await getItensDeContratacao(contratacao.cnpj, contratacao.anoCompra, contratacao.sequencialCompra);
          
          for (const item of itens) {
            await supabaseClient.from('external_price_data').upsert({
              api_config_id,
              product_identifier: `${contratacao.cnpj}-${contratacao.anoCompra}-${contratacao.sequencialCompra}-${item.numeroItem}`,
              product_name: item.descricao,
              price: item.valorUnitarioEstimado || 0,
              currency: 'BRL',
              reference_date: contratacao.dataAtualizacao,
              source_location: `PNCP - ${contratacao.cnpj}`,
              raw_data: item,
            });
            recordsProcessed++;
          }
        } catch (itemError) {
          console.error(`Erro ao processar itens para a contratação ${contratacao.sequencialCompra}:`, itemError);
        }
      }

      await supabaseClient
        .from('api_sync_logs')
        .update({ status: 'success', records_processed: recordsProcessed, completed_at: new Date().toISOString() })
        .eq('id', syncLog.id);

      await supabaseClient
        .from('external_api_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', api_config_id);

    } catch (syncError) {
      errorMessage = syncError.message;
      await supabaseClient
        .from('api_sync_logs')
        .update({ status: 'error', error_message: errorMessage, records_processed: recordsProcessed, completed_at: new Date().toISOString() })
        .eq('id', syncLog.id);
    }

    return new Response(
      JSON.stringify({ success: !errorMessage, sync_log_id: syncLog.id, records_processed: recordsProcessed, error_message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: errorMessage ? 400 : 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
