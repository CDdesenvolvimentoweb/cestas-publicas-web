import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuração do EmailJS (gratuito para até 200 emails/mês)
const EMAILJS_CONFIG = {
  service_id: 'default_service',
  template_id: 'template_smtp',
  user_id: 'your_emailjs_user_id',
  api_url: 'https://api.emailjs.com/api/v1.0/email/send'
};

// Função para enviar email usando EmailJS
async function sendEmailViaEmailJS(emailData: any): Promise<boolean> {
  try {
    const response = await fetch(EMAILJS_CONFIG.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.service_id,
        template_id: EMAILJS_CONFIG.template_id,
        user_id: EMAILJS_CONFIG.user_id,
        template_params: {
          to_email: emailData.to_email,
          to_name: emailData.to_name || 'Usuário',
          from_name: emailData.from_name,
          from_email: emailData.from_email,
          subject: emailData.subject,
          message_html: emailData.html_content,
          message: emailData.text_content
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('EmailJS error:', error);
    return false;
  }
}

// Função para enviar via SMTP2GO (gratuito para 1000 emails/mês)
async function sendEmailViaSMTP2GO(emailData: any, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey
      },
      body: JSON.stringify({
        to: [emailData.to_email],
        from: `${emailData.from_name} <${emailData.from_email}>`,
        subject: emailData.subject,
        html_body: emailData.html_content,
        text_body: emailData.text_content
      })
    });

    return response.ok;
  } catch (error) {
    console.error('SMTP2GO error:', error);
    return false;
  }
}

// Função para processar queue de emails
export async function processEmailQueue() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Buscar emails pendentes
  const { data: pendingEmails, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !pendingEmails || pendingEmails.length === 0) {
    console.log('No pending emails to process');
    return;
  }

  console.log(`Processing ${pendingEmails.length} pending emails`);

  for (const email of pendingEmails) {
    let sent = false;
    let errorMessage = '';

    // Incrementar tentativas
    await supabase
      .from('email_queue')
      .update({ 
        attempts: email.attempts + 1,
        status: 'retrying',
        updated_at: new Date().toISOString()
      })
      .eq('id', email.id);

    // Tentar EmailJS
    if (!sent) {
      try {
        sent = await sendEmailViaEmailJS(email);
        if (sent) {
          console.log(`✅ Email sent via EmailJS: ${email.to_email}`);
        }
      } catch (error) {
        errorMessage += `EmailJS failed: ${error}; `;
      }
    }

    // Tentar SMTP2GO se disponível
    const smtp2goKey = Deno.env.get('SMTP2GO_API_KEY');
    if (!sent && smtp2goKey) {
      try {
        sent = await sendEmailViaSMTP2GO(email, smtp2goKey);
        if (sent) {
          console.log(`✅ Email sent via SMTP2GO: ${email.to_email}`);
        }
      } catch (error) {
        errorMessage += `SMTP2GO failed: ${error}; `;
      }
    }

    // Atualizar status
    if (sent) {
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', email.id);
    } else {
      const newStatus = email.attempts >= 2 ? 'failed' : 'pending';
      await supabase
        .from('email_queue')
        .update({
          status: newStatus,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', email.id);
    }
  }
}

// Função para obter estatísticas da queue
export async function getEmailQueueStats() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('email_queue')
    .select('status')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error) return null;

  const stats = data.reduce((acc, email) => {
    acc[email.status] = (acc[email.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: data.length,
    pending: stats.pending || 0,
    sent: stats.sent || 0,
    failed: stats.failed || 0,
    retrying: stats.retrying || 0
  };
}
