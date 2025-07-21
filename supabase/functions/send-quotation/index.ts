import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotationEmailRequest {
  quotationId: string;
  supplierEmail: string;
  supplierName: string;
  basketName: string;
  dueDate: string;
  accessToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quotationId, supplierEmail, supplierName, basketName, dueDate, accessToken }: QuotationEmailRequest = await req.json();

    // Generate quote URL
    const quotationUrl = `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/cotacao/${accessToken}`;

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Nova Solicitação de Cotação</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .content {
              padding: 20px 0;
            }
            .button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              font-size: 12px;
              color: #666;
              margin-top: 20px;
            }
            .highlight {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 4px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Nova Solicitação de Cotação</h1>
            <p>Prezado(a) ${supplierName},</p>
          </div>
          
          <div class="content">
            <p>Você recebeu uma nova solicitação de cotação para a cesta de preços: <strong>${basketName}</strong></p>
            
            <div class="highlight">
              <p><strong>Prazo para resposta:</strong> ${new Date(dueDate).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <p>Para visualizar os itens e enviar sua cotação, clique no botão abaixo:</p>
            
            <a href="${quotationUrl}" class="button">Acessar Cotação</a>
            
            <p>Ou acesse diretamente o link:</p>
            <p><a href="${quotationUrl}">${quotationUrl}</a></p>
            
            <p><strong>Importante:</strong></p>
            <ul>
              <li>Este link é único e intransferível</li>
              <li>Válido até a data de vencimento informada</li>
              <li>Preencha todos os campos obrigatórios</li>
              <li>Salve suas informações antes de finalizar</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Este é um e-mail automático do Sistema de Cotações.</p>
            <p>Em caso de dúvidas, entre em contato conosco.</p>
          </div>
        </body>
      </html>
    `;

    // For now, we'll just log the email content and return success
    // In production, you would integrate with an email service like Resend
    console.log('Email would be sent to:', supplierEmail);
    console.log('Email content:', emailHtml);

    // Update quotation status to 'sent'
    const { error: updateError } = await supabase
      .from('supplier_quotes')
      .update({ 
        status: 'pendente',
        sent_at: new Date().toISOString()
      })
      .eq('id', quotationId);

    if (updateError) {
      throw new Error(`Failed to update quotation: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quotation email queued successfully',
        quotationUrl 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in send-quotation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);