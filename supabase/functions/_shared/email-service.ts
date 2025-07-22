// Email service configuration and utilities
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare global Deno for TypeScript
declare const Deno: any;

// Email service types
export interface EmailConfig {
  provider: 'sendgrid' | 'resend' | 'mock';
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailRequest {
  to: string;
  toName?: string;
  template: EmailTemplate;
  variables?: Record<string, any>;
}

// Get email configuration from Supabase secrets
export async function getEmailConfig(): Promise<EmailConfig> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get configuration from database
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['email_provider', 'email_settings']);

    if (settings && settings.length > 0) {
      const provider = settings.find(s => s.key === 'email_provider')?.value || 'mock';
      const emailSettings = settings.find(s => s.key === 'email_settings')?.value || {};
      
      const providerConfig = emailSettings[provider] || {};
      
      return {
        provider: provider as 'sendgrid' | 'resend' | 'mock',
        apiKey: providerConfig.api_key || Deno.env.get('EMAIL_API_KEY') || '',
        fromEmail: providerConfig.from_email || 'noreply@santateresa.es.gov.br',
        fromName: providerConfig.from_name || 'Sistema de Cestas de Preços'
      };
    }
  } catch (error) {
    console.error('Error fetching email config from database:', error);
  }

  // Fallback to environment variables
  return {
    provider: (Deno.env.get('EMAIL_PROVIDER') as 'sendgrid' | 'resend' | 'mock') || 'mock',
    apiKey: Deno.env.get('EMAIL_API_KEY') || '',
    fromEmail: Deno.env.get('EMAIL_FROM') || 'noreply@santateresa.es.gov.br',
    fromName: Deno.env.get('EMAIL_FROM_NAME') || 'Sistema de Cestas de Preços'
  };
}

// SendGrid email sender
async function sendEmailSendGrid(config: EmailConfig, request: SendEmailRequest): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: request.to, name: request.toName }],
        dynamic_template_data: request.variables || {}
      }],
      from: { email: config.fromEmail, name: config.fromName },
      subject: processTemplate(request.template.subject, request.variables),
      content: [
        {
          type: 'text/plain',
          value: processTemplate(request.template.text, request.variables)
        },
        {
          type: 'text/html',
          value: processTemplate(request.template.html, request.variables)
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${error}`);
  }
}

// Resend email sender
async function sendEmailResend(config: EmailConfig, request: SendEmailRequest): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [request.to],
      subject: processTemplate(request.template.subject, request.variables),
      html: processTemplate(request.template.html, request.variables),
      text: processTemplate(request.template.text, request.variables)
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${response.status} - ${error}`);
  }
}

// Mock email sender for development
function sendEmailMock(config: EmailConfig, request: SendEmailRequest): Promise<void> {
  console.log('📧 MOCK EMAIL SENT:');
  console.log(`To: ${request.to} (${request.toName || 'N/A'})`);
  console.log(`From: ${config.fromName} <${config.fromEmail}>`);
  console.log(`Subject: ${processTemplate(request.template.subject, request.variables)}`);
  console.log(`HTML: ${processTemplate(request.template.html, request.variables).substring(0, 200)}...`);
  console.log('---');
  return Promise.resolve();
}

// Process template variables
function processTemplate(template: string, variables?: Record<string, any>): string {
  if (!variables) return template;
  
  return Object.keys(variables).reduce((result, key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    return result.replace(regex, String(variables[key]));
  }, template);
}

// Main email sending function
export async function sendEmail(request: SendEmailRequest): Promise<void> {
  const config = await getEmailConfig();
  
  switch (config.provider) {
    case 'sendgrid':
      return sendEmailSendGrid(config, request);
    case 'resend':
      return sendEmailResend(config, request);
    case 'mock':
    default:
      return sendEmailMock(config, request);
  }
}

// Email templates for quotations
export const quotationInviteTemplate: EmailTemplate = {
  subject: 'Convite para Cotação Eletrônica - {{municipio}}',
  html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para Cotação</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .info-box { background-color: #e9ecef; padding: 15px; border-left: 4px solid #0066cc; margin: 15px 0; }
        .item-list { background-color: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 10px 0; }
        .deadline { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; color: #856404; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Convite para Cotação Eletrônica</h1>
        <p>{{municipio}} - {{unidade_gestora}}</p>
    </div>
    
    <div class="content">
        <p>Prezado(a) fornecedor(a) <strong>{{supplier_name}}</strong>,</p>
        
        <p>Você está sendo convidado(a) a participar de uma cotação eletrônica para fornecimento de itens conforme especificações abaixo:</p>
        
        <div class="info-box">
            <h3>Informações da Cotação</h3>
            <p><strong>Cesta de Preços:</strong> {{basket_name}}</p>
            <p><strong>Unidade Gestora:</strong> {{unidade_gestora}}</p>
            <p><strong>Data de Abertura:</strong> {{created_date}}</p>
        </div>
        
        <div class="deadline">
            <h3>⏰ Prazo para Resposta</h3>
            <p><strong>Data Limite:</strong> {{deadline}}</p>
            <p>Não perca o prazo! Sua cotação deve ser enviada até a data e horário limite.</p>
        </div>
        
        {{#if message}}
        <div class="info-box">
            <h3>Mensagem Adicional</h3>
            <p>{{message}}</p>
        </div>
        {{/if}}
        
        <div class="item-list">
            <h3>Itens para Cotação</h3>
            <p>Total de {{item_count}} itens solicitados. Você poderá visualizar todos os detalhes no portal de cotação.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{portal_url}}" class="button">🔗 Acessar Portal de Cotação</a>
        </div>
        
        <div class="info-box">
            <h3>📋 Como Participar</h3>
            <ol>
                <li>Clique no link acima para acessar o portal</li>
                <li>Preencha os preços para cada item</li>
                <li>Adicione observações se necessário</li>
                <li>Confirme e envie sua cotação</li>
            </ol>
        </div>
        
        <div class="info-box">
            <h3>ℹ️ Informações Importantes</h3>
            <ul>
                <li>Este link é exclusivo para sua empresa</li>
                <li>Você pode alterar sua cotação até o prazo limite</li>
                <li>Após o prazo, não será possível enviar cotações</li>
                <li>Em caso de dúvidas, entre em contato conosco</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>Sistema de Cestas de Preços Públicas</p>
        <p>{{municipio}} - Governo Transparente</p>
        <p>Este é um e-mail automático. Não responda diretamente a esta mensagem.</p>
    </div>
</body>
</html>`,
  text: `
Convite para Cotação Eletrônica - {{municipio}}

Prezado(a) {{supplier_name}},

Você está sendo convidado(a) para participar de uma cotação eletrônica.

Informações da Cotação:
- Cesta de Preços: {{basket_name}}
- Unidade Gestora: {{unidade_gestora}}
- Prazo Limite: {{deadline}}

{{#if message}}
Mensagem: {{message}}
{{/if}}

Para participar, acesse: {{portal_url}}

Este link é exclusivo para sua empresa e você pode alterar sua cotação até o prazo limite.

Sistema de Cestas de Preços Públicas
{{municipio}}
`
};

export const quotationReminderTemplate: EmailTemplate = {
  subject: 'Lembrete: Cotação Eletrônica - Prazo {{days_remaining}} dia(s)',
  html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lembrete - Cotação</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff6b35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .urgent { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; color: #721c24; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 Lembrete Importante</h1>
        <p>Cotação Eletrônica - {{municipio}}</p>
    </div>
    
    <div class="content">
        <p>Prezado(a) <strong>{{supplier_name}}</strong>,</p>
        
        <div class="urgent">
            <h3>⏰ Prazo Urgente!</h3>
            <p>Sua cotação para "<strong>{{basket_name}}</strong>" ainda está pendente.</p>
            <p><strong>Prazo final:</strong> {{deadline}}</p>
            <p><strong>Tempo restante:</strong> {{days_remaining}} dia(s)</p>
        </div>
        
        <p>Para não perder esta oportunidade de negócio, acesse o portal e envie sua cotação:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{portal_url}}" class="button">🔗 Enviar Cotação Agora</a>
        </div>
    </div>
    
    <div class="footer">
        <p>Sistema de Cestas de Preços Públicas - {{municipio}}</p>
    </div>
</body>
</html>`,
  text: `
LEMBRETE URGENTE - Cotação Eletrônica

{{supplier_name}},

Sua cotação para "{{basket_name}}" ainda está pendente!

Prazo final: {{deadline}}
Tempo restante: {{days_remaining}} dia(s)

Acesse: {{portal_url}}

Sistema de Cestas de Preços - {{municipio}}
`
};
