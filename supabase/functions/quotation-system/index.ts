import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail, quotationInviteTemplate, quotationReminderTemplate } from '../_shared/email-service.ts'

// Declare global Deno for TypeScript
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

interface QuotationRequest {
  basket_id: string;
  suppliers: string[];
  deadline: string;
  message?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'create_quotation':
        return await sendQuotationRequest(supabase, params as QuotationRequest)
      
      case 'send_reminder':
        return await sendDeadlineReminder(supabase, params.quotation_id)
      
      case 'test_email':
        return await testEmail(supabase, params.email)
      
      default:
        throw new Error('Action not supported')
    }

  } catch (error) {
    console.error('Error in quotation-system function:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function sendQuotationRequest(supabase: any, request: QuotationRequest) {
  // Get basket details
  const { data: basket, error: basketError } = await supabase
    .from('price_baskets')
    .select(`
      *,
      basket_items (
        id,
        quantity,
        products (
          id,
          name,
          description,
          code,
          measurement_units (name, symbol)
        )
      ),
      management_units (name)
    `)
    .eq('id', request.basket_id)
    .single()

  if (basketError || !basket) {
    throw new Error('Basket not found')
  }

  // Get suppliers details
  const { data: suppliers, error: suppliersError } = await supabase
    .from('suppliers')
    .select('*')
    .in('id', request.suppliers)

  if (suppliersError) {
    throw new Error('Error fetching suppliers')
  }

  const results: Array<{
    supplier_id: string;
    supplier_name: string;
    email: string;
    sent: boolean;
    error: string | null;
  }> = [];

  // Create quotation record
  const { data: quotation, error: quotationError } = await supabase
    .from('supplier_quotations')
    .insert({
      basket_id: request.basket_id,
      deadline: request.deadline,
      status: 'sent',
      total_suppliers: suppliers.length
    })
    .select()
    .single()

  if (quotationError) {
    throw new Error('Error creating quotation')
  }

  // Send emails to each supplier
  for (const supplier of suppliers) {
    try {
      // Generate unique access token for supplier
      const accessToken = crypto.randomUUID()
      
      // Create supplier quotation record
      const { data: supplierQuotation } = await supabase
        .from('supplier_quotation_responses')
        .insert({
          quotation_id: quotation.id,
          supplier_id: supplier.id,
          access_token: accessToken,
          status: 'pending'
        })
        .select()
        .single()

      // Generate email content variables
      const emailVariables = {
        supplier_name: supplier.company_name,
        basket_name: basket.name,
        unidade_gestora: basket.management_units.name,
        municipio: 'Santa Teresa/ES',
        created_date: new Date().toLocaleDateString('pt-BR'),
        deadline: new Date(request.deadline).toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        message: request.message,
        item_count: basket.basket_items.length,
        portal_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/quotation/${accessToken}`
      };

      // Send email using new service
      try {
        await sendEmail({
          to: supplier.email,
          toName: supplier.company_name,
          template: quotationInviteTemplate,
          variables: emailVariables
        });

        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.company_name,
          email: supplier.email,
          sent: true,
          error: null
        });
      } catch (emailError) {
        results.push({
          supplier_id: supplier.id,
          supplier_name: supplier.company_name,
          email: supplier.email,
          sent: false,
          error: emailError.message
        });
      }

    } catch (error) {
      console.error(`Error sending to supplier ${supplier.id}:`, error)
      results.push({
        supplier_id: supplier.id,
        supplier_name: supplier.company_name,
        email: supplier.email,
        sent: false,
        error: error.message
      })
    }
  }

  // Update quotation status
  const successCount = results.filter(r => r.sent).length
  await supabase
    .from('supplier_quotations')
    .update({
      emails_sent: successCount,
      status: successCount > 0 ? 'active' : 'failed'
    })
    .eq('id', quotation.id)

  return new Response(JSON.stringify({
    success: true,
    quotation_id: quotation.id,
    results: results,
    summary: {
      total_suppliers: suppliers.length,
      emails_sent: successCount,
      emails_failed: suppliers.length - successCount
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function sendDeadlineReminder(supabase: any, quotationId: string) {
  const { data: pendingResponses } = await supabase
    .from('supplier_quotation_responses')
    .select(`
      *,
      suppliers (company_name, email),
      supplier_quotations (deadline, basket_id, price_baskets(name))
    `)
    .eq('quotation_id', quotationId)
    .eq('status', 'pending')

  const results: Array<{
    supplier_id: string;
    email: string;
    sent: boolean;
    error?: string;
  }> = [];

  for (const response of pendingResponses || []) {
    try {
      const deadline = new Date(response.supplier_quotations.deadline);
      const now = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const emailVariables = {
        supplier_name: response.suppliers.company_name,
        basket_name: response.supplier_quotations.price_baskets.name,
        deadline: deadline.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        days_remaining: daysRemaining.toString(),
        municipio: 'Santa Teresa/ES',
        portal_url: `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/quotation/${response.access_token}`
      };

      await sendEmail({
        to: response.suppliers.email,
        toName: response.suppliers.company_name,
        template: quotationReminderTemplate,
        variables: emailVariables
      });
      
      results.push({
        supplier_id: response.supplier_id,
        email: response.suppliers.email,
        sent: true
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      results.push({
        supplier_id: response.supplier_id,
        email: response.suppliers.email,
        sent: false,
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    reminders_sent: results.filter(r => r.sent).length,
    results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

// Test email function
async function testEmail(supabase: any, email: string) {
  try {
    const testTemplate = {
      subject: "Teste de Email - Sistema de Cestas de Preços",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1>✅ Teste de Email</h1>
            <p>Sistema de Cestas de Preços Públicas</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; margin-top: 20px;">
            <h3>Configuração funcionando corretamente!</h3>
            <p>Este é um email de teste para verificar se as configurações de email estão funcionando.</p>
            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-BR")}</p>
            <p><strong>Sistema:</strong> Cestas de Preços Públicas</p>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d;">
            <p>Prefeitura Municipal de Santa Teresa - ES</p>
          </div>
        </div>
      `,
      text: `TESTE DE EMAIL - Sistema de Cestas de Preços

Configuração funcionando corretamente!

Este é um email de teste para verificar se as configurações estão funcionando.

Data/Hora: ${new Date().toLocaleString("pt-BR")}
Sistema: Cestas de Preços Públicas

Prefeitura Municipal de Santa Teresa - ES`
    };

    await sendEmail({
      to: email,
      toName: "Teste",
      template: testTemplate,
      variables: {}
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Email de teste enviado com sucesso"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro ao enviar email de teste:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}
