import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuotationEmailRequest {
  quotationId: string;
  supplierEmail: string;
  supplierName: string;
  basketName: string;
  dueDate: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      quotationId, 
      supplierEmail, 
      supplierName, 
      basketName, 
      dueDate, 
      token 
    }: QuotationEmailRequest = await req.json();

    const quoteUrl = `${Deno.env.get("SITE_URL")}/supplier-quote?token=${token}`;

    const emailResponse = await resend.emails.send({
      from: "Sistema de Cotações <noreply@sistema.gov.br>",
      to: [supplierEmail],
      subject: `Nova Cotação - ${basketName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1>Nova Cotação de Preços</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc;">
            <p>Olá <strong>${supplierName}</strong>,</p>
            
            <p>Você foi convidado para participar de uma cotação de preços:</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Detalhes da Cotação</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Cesta:</strong> ${basketName}</li>
                <li><strong>Prazo:</strong> ${new Date(dueDate).toLocaleDateString('pt-BR')}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${quoteUrl}" 
                 style="background-color: #1e40af; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Acessar Cotação
              </a>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⚠️ Importante:</strong> Este link é único e pessoal. 
                Não compartilhe com terceiros.
              </p>
            </div>
            
            <p>Se você tiver dúvidas, entre em contato conosco.</p>
            
            <p>Atenciosamente,<br>
            Equipe de Compras</p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            Este é um e-mail automático, não responda.
          </div>
        </div>
      `,
    });

    console.log("Quotation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-quotation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);