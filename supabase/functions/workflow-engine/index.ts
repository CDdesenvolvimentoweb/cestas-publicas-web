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

    const { execution_id } = await req.json()

    // Buscar execução pendente
    const { data: execution, error: executionError } = await supabaseClient
      .from('workflow_executions')
      .select(`
        *,
        workflows (*)
      `)
      .eq('id', execution_id)
      .eq('status', 'pending')
      .single()

    if (executionError) {
      throw new Error(`Execução não encontrada: ${executionError.message}`)
    }

    // Marcar execução como em andamento
    await supabaseClient
      .from('workflow_executions')
      .update({
        status: 'running',
        execution_log: [
          ...execution.execution_log,
          {
            timestamp: new Date().toISOString(),
            action: 'started',
            message: 'Execução iniciada'
          }
        ]
      })
      .eq('id', execution_id)

    const workflow = execution.workflows
    const actions = Array.isArray(workflow.actions) ? workflow.actions : []
    const executionLog = [...execution.execution_log]

    try {
      // Processar cada ação do workflow
      for (const action of actions) {
        const actionStart = new Date().toISOString()
        
        try {
          switch (action.type) {
            case 'send_notification':
              await processNotificationAction(supabaseClient, action, execution)
              break
              
            case 'send_email':
              await processEmailAction(supabaseClient, action, execution)
              break
              
            case 'update_status':
              await processStatusUpdateAction(supabaseClient, action, execution)
              break
              
            case 'trigger_webhook':
              await processWebhookAction(supabaseClient, action, execution)
              break
              
            default:
              throw new Error(`Tipo de ação não suportado: ${action.type}`)
          }

          executionLog.push({
            timestamp: actionStart,
            action: action.type,
            status: 'success',
            message: `Ação ${action.type} executada com sucesso`
          })

        } catch (actionError) {
          executionLog.push({
            timestamp: actionStart,
            action: action.type,
            status: 'error',
            message: `Erro na ação ${action.type}: ${actionError.message}`
          })
          throw actionError
        }
      }

      // Marcar execução como completa
      await supabaseClient
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          execution_log: executionLog
        })
        .eq('id', execution_id)

      return new Response(
        JSON.stringify({
          success: true,
          execution_id,
          actions_processed: actions.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )

    } catch (workflowError) {
      // Marcar execução como falha
      await supabaseClient
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: workflowError.message,
          execution_log: executionLog
        })
        .eq('id', execution_id)

      throw workflowError
    }

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

async function processNotificationAction(supabaseClient: any, action: any, execution: any) {
  const { target_users, title, message } = action.config

  if (target_users && target_users.length > 0) {
    for (const userId of target_users) {
      await supabaseClient.rpc('create_notification', {
        user_id_param: userId,
        type_param: 'workflow',
        title_param: title,
        message_param: message,
        data_param: {
          workflow_id: execution.workflow_id,
          execution_id: execution.id,
          entity_type: execution.entity_type,
          entity_id: execution.entity_id
        }
      })
    }
  }
}

async function processEmailAction(supabaseClient: any, action: any, execution: any) {
  // Implementar envio de email via service externo
  console.log('Email action:', action.config)
  // Placeholder para integração com serviço de email
}

async function processStatusUpdateAction(supabaseClient: any, action: any, execution: any) {
  const { table, status_field, status_value, condition_field } = action.config

  await supabaseClient
    .from(table)
    .update({ [status_field]: status_value })
    .eq(condition_field || 'id', execution.entity_id)
}

async function processWebhookAction(supabaseClient: any, action: any, execution: any) {
  const { url, method = 'POST', headers = {}, payload } = action.config

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      ...payload,
      workflow_id: execution.workflow_id,
      execution_id: execution.id,
      entity_type: execution.entity_type,
      entity_id: execution.entity_id,
      trigger_data: execution.trigger_data
    })
  })

  if (!response.ok) {
    throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`)
  }
}