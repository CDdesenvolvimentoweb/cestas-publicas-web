import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'quote_request' | 'quote_response' | 'quote_reminder' | 'system' | 'report_ready';
  recipient_email: string;
  recipient_name: string;
  title: string;
  message: string;
  data?: any;
}

const serve_handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, recipient_email, recipient_name, title, message, data }: NotificationRequest = await req.json();

    console.log('Processing notification:', { type, recipient_email, title });

    // Validar dados
    if (!recipient_email || !title || !message) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    // Buscar usuário pelo email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', recipient_email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário:', userError);
      throw new Error('Erro ao buscar usuário');
    }

    let userId = user?.id;

    // Se não encontrar usuário pelo email, buscar na tabela auth.users
    if (!userId) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(recipient_email);
      
      if (authError) {
        console.error('Erro ao buscar usuário na auth:', authError);
        throw new Error('Usuário não encontrado');
      }
      
      userId = authUser.user.id;
    }

    // Criar notificação no banco
    const { error: notificationError } = await supabase.rpc('create_notification', {
      user_id_param: userId,
      type_param: type,
      title_param: title,
      message_param: message,
      data_param: data || null
    });

    if (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
      throw new Error('Erro ao criar notificação');
    }

    // Verificar preferências de notificação do usuário
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('email_notifications, quote_reminders, quote_responses, system_updates')
      .eq('user_id', userId)
      .single();

    let shouldSendEmail = true;

    if (preferences) {
      switch (type) {
        case 'quote_request':
        case 'quote_reminder':
          shouldSendEmail = preferences.quote_reminders;
          break;
        case 'quote_response':
          shouldSendEmail = preferences.quote_responses;
          break;
        case 'system':
        case 'report_ready':
          shouldSendEmail = preferences.system_updates;
          break;
      }
      shouldSendEmail = shouldSendEmail && preferences.email_notifications;
    }

    if (!shouldSendEmail) {
      console.log('Email não enviado - usuário desabilitou este tipo de notificação');
      return new Response(
        JSON.stringify({ 
          success: true, 
          notification_created: true,
          email_sent: false,
          reason: 'User disabled email notifications'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Gerar template do email baseado no tipo
    const emailHtml = generateEmailTemplate(type, title, message, recipient_name, data);

    // Simular envio de email (aqui você integraria com um serviço como Resend)
    console.log('Email HTML gerado:', emailHtml.substring(0, 200) + '...');
    
    // Log da atividade
    await supabase.rpc('log_activity', {
      action_type_param: 'send_notification',
      entity_type_param: 'notification',
      entity_id_param: null,
      description_param: `Notificação enviada: ${title}`,
      metadata_param: { type, recipient_email, email_sent: shouldSendEmail }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        notification_created: true,
        email_sent: shouldSendEmail,
        message: 'Notificação processada com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Erro no serviço de notificação:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

function generateEmailTemplate(
  type: string, 
  title: string, 
  message: string, 
  recipientName: string, 
  data?: any
): string {
  const baseTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 15px 0; }
        .success { background: #d1fae5; border: 1px solid #10b981; }
        .danger { background: #fee2e2; border: 1px solid #ef4444; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sistema de Cotações</h1>
        <p>Notificação do Sistema</p>
      </div>
      
      <div class="content">
        <h2>Olá, ${recipientName}!</h2>
        <h3>${title}</h3>
        <p>${message}</p>
        
        ${getTypeSpecificContent(type, data)}
        
        <p>Esta é uma mensagem automática do Sistema de Formação de Cestas de Preços.</p>
      </div>
      
      <div class="footer">
        <p>&copy; 2024 Sistema de Cotações Eletrônicas. Todos os direitos reservados.</p>
        <p>Se você não deseja mais receber estes emails, acesse suas configurações no sistema.</p>
      </div>
    </body>
    </html>
  `;

  return baseTemplate;
}

function getTypeSpecificContent(type: string, data?: any): string {
  switch (type) {
    case 'quote_request':
      return `
        <div class="alert">
          <h4>Nova Solicitação de Cotação</h4>
          <p>Uma nova solicitação de cotação foi enviada para sua empresa.</p>
          ${data?.due_date ? `<p><strong>Prazo:</strong> ${new Date(data.due_date).toLocaleDateString('pt-BR')}</p>` : ''}
          ${data?.access_url ? `<a href="${data.access_url}" class="button">Acessar Cotação</a>` : ''}
        </div>
      `;
      
    case 'quote_response':
      return `
        <div class="alert success">
          <h4>Cotação Respondida</h4>
          <p>Uma cotação foi respondida por um fornecedor.</p>
          ${data?.supplier_name ? `<p><strong>Fornecedor:</strong> ${data.supplier_name}</p>` : ''}
        </div>
      `;
      
    case 'quote_reminder':
      return `
        <div class="alert danger">
          <h4>Lembrete de Prazo</h4>
          <p>O prazo para resposta desta cotação está se aproximando.</p>
          ${data?.days_remaining ? `<p><strong>Dias restantes:</strong> ${data.days_remaining}</p>` : ''}
          ${data?.access_url ? `<a href="${data.access_url}" class="button">Responder Agora</a>` : ''}
        </div>
      `;
      
    case 'report_ready':
      return `
        <div class="alert success">
          <h4>Relatório Disponível</h4>
          <p>Seu relatório foi gerado e está disponível para download.</p>
          ${data?.report_url ? `<a href="${data.report_url}" class="button">Baixar Relatório</a>` : ''}
        </div>
      `;
      
    default:
      return '';
  }
}

serve(serve_handler);