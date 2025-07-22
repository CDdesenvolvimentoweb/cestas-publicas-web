import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail, quotationInviteTemplate, quotationReminderTemplate } from '../_shared/email-service.ts'

// Declare global Deno for TypeScript
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        unit_price,
        catalog_products (
          id,
          name,
          description,
          measurement_unit,
          tce_code
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

async function processSupplierResponse(supabase: any, params: any) {
  const { access_token, quotation_items } = params

  // Validate access token
  const { data: supplierQuotation, error: tokenError } = await supabase
    .from('supplier_quotation_responses')
    .select('*')
    .eq('access_token', access_token)
    .eq('status', 'pending')
    .single()

  if (tokenError || !supplierQuotation) {
    throw new Error('Invalid or expired access token')
  }

  // Update quotation items
  for (const item of quotation_items) {
    await supabase
      .from('supplier_quotation_items')
      .upsert({
        quotation_response_id: supplierQuotation.id,
        basket_item_id: item.basket_item_id,
        unit_price: item.unit_price,
        total_price: item.total_price,
        delivery_days: item.delivery_days,
        observations: item.observations
      })
  }

  // Update response status
  await supabase
    .from('supplier_quotation_responses')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
    .eq('id', supplierQuotation.id)

  return new Response(JSON.stringify({
    success: true,
    message: 'Quotation submitted successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

async function getQuotationStatus(supabase: any, quotationId: string) {
  const { data: quotation, error } = await supabase
    .from('supplier_quotations')
    .select(`
      *,
      supplier_quotation_responses (
        id,
        supplier_id,
        status,
        submitted_at,
        suppliers (company_name, email),
        supplier_quotation_items (
          id,
          basket_item_id,
          unit_price,
          total_price,
          delivery_days
        )
      )
    `)
    .eq('id', quotationId)
    .single()

  if (error) {
    throw new Error('Quotation not found')
  }

  const summary = {
    total_suppliers: quotation.total_suppliers,
    responses_received: quotation.supplier_quotation_responses.filter((r: any) => r.status === 'submitted').length,
    responses_pending: quotation.supplier_quotation_responses.filter((r: any) => r.status === 'pending').length,
  }

  return new Response(JSON.stringify({
    success: true,
    quotation,
    summary
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

function generateQuotationEmail(basket: any, supplier: any, accessToken: string, deadline: string, message?: string): EmailTemplate {
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.app') || 'http://localhost:5173'
  const quotationUrl = `${baseUrl}/supplier-quote?token=${accessToken}`
  
  const itemsHtml = basket.basket_items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.catalog_products.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity} ${item.catalog_products.measurement_unit}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.catalog_products.tce_code || '-'}</td>
    </tr>
  `).join('')

  const subject = `Solicitação de Cotação - ${basket.name} - ${basket.management_units.name}`
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2563eb;">Solicitação de Cotação de Preços</h2>
        
        <p>Prezado(a) fornecedor <strong>${supplier.company_name}</strong>,</p>
        
        <p>A <strong>${basket.management_units.name}</strong> está solicitando cotação para os seguintes itens:</p>
        
        <div style="margin: 20px 0;">
          <h3>Detalhes da Cotação:</h3>
          <ul>
            <li><strong>Cesta:</strong> ${basket.name}</li>
            <li><strong>Prazo para resposta:</strong> ${new Date(deadline).toLocaleDateString('pt-BR')}</li>
            <li><strong>Total de itens:</strong> ${basket.basket_items.length}</li>
          </ul>
        </div>

        ${message ? `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>Observações:</h4>
            <p>${message}</p>
          </div>
        ` : ''}
        
        <h3>Itens para Cotação:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Produto</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Quantidade</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Código TCE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #1d4ed8;">Acesse o Portal de Cotação</h3>
          <p>Clique no link abaixo para acessar o sistema e enviar sua proposta:</p>
          <a href="${quotationUrl}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
            ENVIAR COTAÇÃO
          </a>
          <p style="font-size: 12px; color: #6b7280;">Link válido até ${new Date(deadline).toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280;">
          <p><strong>Sistema de Cestas de Preços Públicas</strong><br>
          Prefeitura Municipal de Santa Teresa - ES<br>
          Este é um e-mail automático, não responda.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Solicitação de Cotação - ${basket.name}

Prezado(a) ${supplier.company_name},

A ${basket.management_units.name} está solicitando cotação para ${basket.basket_items.length} itens.

Prazo: ${new Date(deadline).toLocaleDateString('pt-BR')}

Acesse: ${quotationUrl}

Sistema de Cestas de Preços Públicas
Prefeitura Municipal de Santa Teresa - ES
  `

  return { subject, html, text }
}

function generateReminderEmail(response: any): EmailTemplate {
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.app') || 'http://localhost:5173'
  const quotationUrl = `${baseUrl}/supplier-quote?token=${response.access_token}`
  
  const subject = `LEMBRETE: Cotação com prazo próximo - ${response.suppliers.company_name}`
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #92400e; margin-top: 0;">⚠️ LEMBRETE: Prazo de Cotação</h2>
        </div>
        
        <p>Prezado(a) fornecedor <strong>${response.suppliers.company_name}</strong>,</p>
        
        <p>Este é um lembrete sobre a cotação pendente com prazo para <strong>${new Date(response.supplier_quotations.deadline).toLocaleDateString('pt-BR')}</strong>.</p>
        
        <p>Sua resposta ainda não foi enviada. Para não perder esta oportunidade de negócio, acesse o link abaixo:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${quotationUrl}" 
             style="display: inline-block; background: #dc2626; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            ENVIAR COTAÇÃO AGORA
          </a>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280;">
          <p><strong>Sistema de Cestas de Preços Públicas</strong><br>
          Prefeitura Municipal de Santa Teresa - ES</p>
        </div>
      </body>
    </html>
  `

  const text = `
LEMBRETE: Cotação com prazo próximo

Prezado(a) ${response.suppliers.company_name},

Sua cotação tem prazo até ${new Date(response.supplier_quotations.deadline).toLocaleDateString('pt-BR')}.

Acesse: ${quotationUrl}

Sistema de Cestas de Preços Públicas
Prefeitura Municipal de Santa Teresa - ES
  `

  return { subject, html, text }
}

 
 / /   T e s t   e m a i l   f u n c t i o n 
 a s y n c   f u n c t i o n   t e s t E m a i l ( s u p a b a s e :   a n y ,   e m a i l :   s t r i n g )   { 
     t r y   { 
         c o n s t   t e s t T e m p l a t e   =   { 
             s u b j e c t :   "   T e s t e   d e   E m a i l   -   S i s t e m a   d e   C e s t a s   d e   P r e � o s " , 
             h t m l :   ` 
                 < d i v   s t y l e = " f o n t - f a m i l y :   A r i a l ,   s a n s - s e r i f ;   m a x - w i d t h :   6 0 0 p x ;   m a r g i n :   0   a u t o ;   p a d d i n g :   2 0 p x ; " > 
                     < d i v   s t y l e = " b a c k g r o u n d - c o l o r :   # 2 8 a 7 4 5 ;   c o l o r :   w h i t e ;   p a d d i n g :   2 0 p x ;   t e x t - a l i g n :   c e n t e r ;   b o r d e r - r a d i u s :   8 p x ; " > 
                         < h 1 >   T e s t e   d e   E m a i l < / h 1 > 
                         < p > S i s t e m a   d e   C e s t a s   d e   P r e � o s   P � b l i c a s < / p > 
                     < / d i v > 
                     < d i v   s t y l e = " b a c k g r o u n d - c o l o r :   # f 8 f 9 f a ;   p a d d i n g :   2 0 p x ;   b o r d e r :   1 p x   s o l i d   # d e e 2 e 6 ;   m a r g i n - t o p :   2 0 p x ; " > 
                         < h 3 > C o n f i g u r a � � o   f u n c i o n a n d o   c o r r e t a m e n t e ! < / h 3 > 
                         < p > E s t e   �   u m   e m a i l   d e   t e s t e   p a r a   v e r i f i c a r   s e   a s   c o n f i g u r a � � e s   d e   e m a i l   e s t � o   f u n c i o n a n d o . < / p > 
                         < p > < s t r o n g > D a t a / H o r a : < / s t r o n g >   $ { n e w   D a t e ( ) . t o L o c a l e S t r i n g ( " p t - B R " ) } < / p > 
                         < p > < s t r o n g > S i s t e m a : < / s t r o n g >   C e s t a s   d e   P r e � o s   P � b l i c a s < / p > 
                     < / d i v > 
                     < d i v   s t y l e = " t e x t - a l i g n :   c e n t e r ;   m a r g i n - t o p :   2 0 p x ;   f o n t - s i z e :   1 2 p x ;   c o l o r :   # 6 c 7 5 7 d ; " > 
                         < p > P r e f e i t u r a   M u n i c i p a l   d e   S a n t a   T e r e s a   -   E S < / p > 
                     < / d i v > 
                 < / d i v > 
             ` , 
             t e x t :   `   T E S T E   D E   E M A I L   -   S i s t e m a   d e   C e s t a s   d e   P r e � o s 
 
 C o n f i g u r a � � o   f u n c i o n a n d o   c o r r e t a m e n t e ! 
 
 E s t e   �   u m   e m a i l   d e   t e s t e   p a r a   v e r i f i c a r   s e   a s   c o n f i g u r a � � e s   e s t � o   f u n c i o n a n d o . 
 
 D a t a / H o r a :   $ { n e w   D a t e ( ) . t o L o c a l e S t r i n g ( " p t - B R " ) } 
 S i s t e m a :   C e s t a s   d e   P r e � o s   P � b l i c a s 
 
 P r e f e i t u r a   M u n i c i p a l   d e   S a n t a   T e r e s a   -   E S ` 
         } ; 
 
         a w a i t   s e n d E m a i l ( { 
             t o :   e m a i l , 
             t o N a m e :   " T e s t e " , 
             t e m p l a t e :   t e s t T e m p l a t e , 
             v a r i a b l e s :   { } 
         } ) ; 
 
         r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( { 
             s u c c e s s :   t r u e , 
             m e s s a g e :   " E m a i l   d e   t e s t e   e n v i a d o   c o m   s u c e s s o " 
         } ) ,   { 
             h e a d e r s :   {   . . . c o r s H e a d e r s ,   " C o n t e n t - T y p e " :   " a p p l i c a t i o n / j s o n "   } , 
             s t a t u s :   2 0 0 , 
         } ) ; 
 
     }   c a t c h   ( e r r o r )   { 
         c o n s o l e . e r r o r ( " E r r o   a o   e n v i a r   e m a i l   d e   t e s t e : " ,   e r r o r ) ; 
         r e t u r n   n e w   R e s p o n s e ( J S O N . s t r i n g i f y ( { 
             s u c c e s s :   f a l s e , 
             e r r o r :   e r r o r . m e s s a g e 
         } ) ,   { 
             h e a d e r s :   {   . . . c o r s H e a d e r s ,   " C o n t e n t - T y p e " :   " a p p l i c a t i o n / j s o n "   } , 
             s t a t u s :   5 0 0 , 
         } ) ; 
     } 
 }  
 