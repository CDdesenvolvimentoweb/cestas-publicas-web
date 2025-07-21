import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  report_type: 'basket_analysis' | 'supplier_performance' | 'price_trends' | 'quotation_summary';
  parameters: {
    basket_id?: string;
    management_unit_id?: string;
    start_date?: string;
    end_date?: string;
    supplier_ids?: string[];
    product_categories?: string[];
  };
  format: 'pdf' | 'excel' | 'csv';
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

    const { report_type, parameters, format }: ReportRequest = await req.json();

    console.log('Generating report:', { report_type, format, parameters });

    // Validar parâmetros
    if (!report_type || !format) {
      throw new Error('Tipo de relatório e formato são obrigatórios');
    }

    // Verificar permissões do usuário
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Criar registro do relatório
    const { data: report, error: reportError } = await supabase
      .from('generated_reports')
      .insert({
        generated_by: user.id,
        report_type,
        report_name: generateReportName(report_type, parameters),
        parameters,
        status: 'generating'
      })
      .select()
      .single();

    if (reportError) {
      console.error('Erro ao criar registro do relatório:', reportError);
      throw new Error('Erro ao iniciar geração do relatório');
    }

    try {
      // Gerar dados do relatório baseado no tipo
      const reportData = await generateReportData(supabase, report_type, parameters, user.id);
      
      // Gerar conteúdo do relatório baseado no formato
      const reportContent = await generateReportContent(reportData, format, report_type);
      
      // Simular upload do arquivo (aqui você integraria com storage)
      const fileUrl = `reports/${report.id}.${format}`;
      
      // Atualizar status do relatório
      await supabase
        .from('generated_reports')
        .update({
          status: 'completed',
          file_url: fileUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', report.id);

      // Log da atividade
      await supabase.rpc('log_activity', {
        action_type_param: 'generate_report',
        entity_type_param: 'report',
        entity_id_param: report.id,
        description_param: `Relatório gerado: ${report.report_name}`,
        metadata_param: { report_type, format, file_size: reportContent.length }
      });

      // Enviar notificação de conclusão
      await supabase.functions.invoke('notification-service', {
        body: {
          type: 'report_ready',
          recipient_email: user.email,
          recipient_name: user.user_metadata?.full_name || 'Usuário',
          title: 'Relatório Disponível',
          message: `Seu relatório "${report.report_name}" foi gerado com sucesso.`,
          data: {
            report_id: report.id,
            report_url: fileUrl,
            file_size: formatFileSize(reportContent.length)
          }
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          report_id: report.id,
          file_url: fileUrl,
          download_url: `${supabaseUrl}/functions/v1/download-report?id=${report.id}`,
          message: 'Relatório gerado com sucesso'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error: any) {
      // Atualizar status para erro
      await supabase
        .from('generated_reports')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', report.id);

      throw error;
    }

  } catch (error: any) {
    console.error('Erro no gerador de relatórios:', error);
    
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

function generateReportName(type: string, parameters: any): string {
  const date = new Date().toLocaleDateString('pt-BR');
  
  switch (type) {
    case 'basket_analysis':
      return `Análise de Cesta - ${date}`;
    case 'supplier_performance':
      return `Performance de Fornecedores - ${date}`;
    case 'price_trends':
      return `Tendências de Preços - ${date}`;
    case 'quotation_summary':
      return `Resumo de Cotações - ${date}`;
    default:
      return `Relatório ${type} - ${date}`;
  }
}

async function generateReportData(
  supabase: any, 
  reportType: string, 
  parameters: any, 
  userId: string
): Promise<any> {
  console.log('Generating report data for:', reportType);

  switch (reportType) {
    case 'basket_analysis':
      return await generateBasketAnalysis(supabase, parameters, userId);
    
    case 'supplier_performance':
      return await generateSupplierPerformance(supabase, parameters, userId);
    
    case 'price_trends':
      return await generatePriceTrends(supabase, parameters, userId);
    
    case 'quotation_summary':
      return await generateQuotationSummary(supabase, parameters, userId);
    
    default:
      throw new Error('Tipo de relatório não suportado');
  }
}

async function generateBasketAnalysis(supabase: any, parameters: any, userId: string) {
  const { data: basketStats, error } = await supabase.rpc('calculate_basket_statistics', {
    basket_id_param: parameters.basket_id
  });

  if (error) throw error;

  return {
    title: 'Análise de Cesta de Preços',
    data: basketStats,
    generated_at: new Date().toISOString(),
    parameters
  };
}

async function generateSupplierPerformance(supabase: any, parameters: any, userId: string) {
  const { data: ranking, error } = await supabase.rpc('calculate_supplier_ranking', {
    management_unit_id_param: parameters.management_unit_id,
    days_back: 90
  });

  if (error) throw error;

  return {
    title: 'Performance de Fornecedores',
    data: ranking,
    generated_at: new Date().toISOString(),
    parameters
  };
}

async function generatePriceTrends(supabase: any, parameters: any, userId: string) {
  const { data: trends, error } = await supabase.rpc('analyze_price_trends', {
    management_unit_id_param: parameters.management_unit_id,
    days_back: 90
  });

  if (error) throw error;

  return {
    title: 'Análise de Tendências de Preços',
    data: trends,
    generated_at: new Date().toISOString(),
    parameters
  };
}

async function generateQuotationSummary(supabase: any, parameters: any, userId: string) {
  const { data: summary, error } = await supabase.rpc('get_dashboard_statistics', {
    management_unit_id_param: parameters.management_unit_id,
    days_back: 30
  });

  if (error) throw error;

  return {
    title: 'Resumo de Cotações',
    data: summary,
    generated_at: new Date().toISOString(),
    parameters
  };
}

async function generateReportContent(
  reportData: any, 
  format: string, 
  reportType: string
): Promise<string> {
  switch (format) {
    case 'pdf':
      return generatePDFContent(reportData, reportType);
    case 'excel':
      return generateExcelContent(reportData, reportType);
    case 'csv':
      return generateCSVContent(reportData, reportType);
    default:
      throw new Error('Formato não suportado');
  }
}

function generatePDFContent(reportData: any, reportType: string): string {
  // Simular geração de PDF - aqui você integraria com uma biblioteca como puppeteer
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportData.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportData.title}</h1>
        <p>Gerado em: ${new Date(reportData.generated_at).toLocaleString('pt-BR')}</p>
      </div>
      
      <div class="section">
        <h2>Dados do Relatório</h2>
        <pre>${JSON.stringify(reportData.data, null, 2)}</pre>
      </div>
      
      <div class="footer">
        <p>Sistema de Formação de Cestas de Preços</p>
        <p>Relatório gerado automaticamente</p>
      </div>
    </body>
    </html>
  `;
  
  return htmlContent;
}

function generateExcelContent(reportData: any, reportType: string): string {
  // Simular geração de Excel - aqui você integraria com uma biblioteca como xlsx
  return `Excel content for ${reportType}: ${JSON.stringify(reportData.data)}`;
}

function generateCSVContent(reportData: any, reportType: string): string {
  // Simular geração de CSV
  const headers = Object.keys(reportData.data[0] || {}).join(',');
  const rows = (reportData.data || []).map((item: any) => 
    Object.values(item).join(',')
  ).join('\n');
  
  return `${headers}\n${rows}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

serve(serve_handler);