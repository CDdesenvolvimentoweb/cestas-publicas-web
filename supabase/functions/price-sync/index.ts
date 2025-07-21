import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { api_config_id, sync_type = 'manual' } = await req.json()

    // Buscar configuração da API
    const { data: apiConfig, error: configError } = await supabaseClient
      .from('external_api_configs')
      .select('*')
      .eq('id', api_config_id)
      .eq('is_active', true)
      .single()

    if (configError) {
      throw new Error(`Configuração da API não encontrada: ${configError.message}`)
    }

    // Iniciar log de sincronização
    const { data: syncLog, error: logError } = await supabaseClient
      .from('api_sync_logs')
      .insert({
        api_config_id,
        sync_type,
        status: 'running'
      })
      .select()
      .single()

    if (logError) {
      throw new Error(`Erro ao criar log: ${logError.message}`)
    }

    let recordsProcessed = 0
    let errorMessage = null

    try {
      // Simular sincronização de preços (implementar lógica específica por API)
      const response = await fetch(apiConfig.base_url, {
        headers: {
          'Authorization': `${apiConfig.auth_type} ${apiConfig.api_key_encrypted}`,
          'Content-Type': 'application/json',
          ...JSON.parse(apiConfig.headers || '{}')
        }
      })

      if (!response.ok) {
        throw new Error(`API retornou erro: ${response.status}`)
      }

      const data = await response.json()
      
      // Processar dados de preços (exemplo genérico)
      if (Array.isArray(data)) {
        for (const item of data) {
          try {
            await supabaseClient
              .from('external_price_data')
              .upsert({
                api_config_id,
                product_identifier: item.code || item.id,
                product_name: item.name || item.description,
                price: parseFloat(item.price || item.valor || 0),
                currency: item.currency || 'BRL',
                reference_date: item.date || new Date().toISOString().split('T')[0],
                source_location: item.location,
                raw_data: item
              })
            
            recordsProcessed++
          } catch (itemError) {
            console.error('Erro ao processar item:', itemError)
          }
        }
      }

      // Atualizar log como sucesso
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'success',
          records_processed: recordsProcessed,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)

      // Atualizar timestamp da última sincronização
      await supabaseClient
        .from('external_api_configs')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', api_config_id)

    } catch (syncError) {
      errorMessage = syncError.message

      // Atualizar log como erro
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'error',
          error_message: errorMessage,
          records_processed: recordsProcessed,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)
    }

    return new Response(
      JSON.stringify({
        success: !errorMessage,
        sync_log_id: syncLog.id,
        records_processed: recordsProcessed,
        error_message: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorMessage ? 400 : 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})