import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ReportRequest {
  type: 'executive_summary' | 'price_analysis' | 'supplier_ranking' | 'compliance_report' | 'trend_analysis';
  parameters: {
    basket_id?: string;
    date_range?: {
      start: string;
      end: string;
    };
    filters?: {
      uf?: string;
      category?: string;
      supplier_id?: string;
    };
    format: 'pdf' | 'excel' | 'json';
  };
}

interface ExecutiveSummaryData {
  period: string;
  total_baskets: number;
  total_products: number;
  total_suppliers: number;
  average_savings: number;
  top_categories: Array<{
    name: string;
    count: number;
    avg_price: number;
  }>;
  price_trends: Array<{
    month: string;
    avg_price: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  regional_analysis: Array<{
    uf: string;
    avg_price: number;
    supplier_count: number;
  }>;
}

class ReportGeneratorService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async generateReport(request: ReportRequest): Promise<{
    success: boolean;
    report_id?: string;
    download_url?: string;
    data?: any;
    error?: string;
  }> {
    try {
      let reportData: any;

      switch (request.type) {
        case 'executive_summary':
          reportData = await this.generateExecutiveSummary(request.parameters);
          break;
        case 'price_analysis':
          reportData = await this.generatePriceAnalysis(request.parameters);
          break;
        case 'supplier_ranking':
          reportData = await this.generateSupplierRanking(request.parameters);
          break;
        case 'compliance_report':
          reportData = await this.generateComplianceReport(request.parameters);
          break;
        case 'trend_analysis':
          reportData = await this.generateTrendAnalysis(request.parameters);
          break;
        default:
          throw new Error(`Unknown report type: ${request.type}`);
      }

      // Save report to database
      const { data: savedReport, error: saveError } = await this.supabase
        .from('generated_reports')
        .insert({
          report_type: request.type,
          report_name: this.getReportName(request.type),
          parameters: request.parameters,
          status: 'completed'
        })
        .select('id')
        .single();

      if (saveError) {
        throw new Error(`Error saving report: ${saveError.message}`);
      }

      if (request.parameters.format === 'json') {
        return {
          success: true,
          report_id: savedReport.id,
          data: reportData
        };
      }

      // Generate file (PDF or Excel)
      const fileUrl = await this.generateReportFile(reportData, request.type, request.parameters.format);

      // Update report with file URL
      await this.supabase
        .from('generated_reports')
        .update({ 
          file_url: fileUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', savedReport.id);

      return {
        success: true,
        report_id: savedReport.id,
        download_url: fileUrl,
        data: reportData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async generateExecutiveSummary(parameters: any): Promise<ExecutiveSummaryData> {
    const dateRange = parameters.date_range || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    };

    // Get basic statistics
    const { data: basketStats } = await this.supabase
      .from('price_baskets')
      .select('id, name, reference_date')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    const { data: productStats } = await this.supabase
      .from('basket_items')
      .select(`
        id,
        quantity,
        products!inner(name, category_id),
        product_categories!inner(name)
      `)
      .in('basket_id', (basketStats || []).map(b => b.id));

    const { data: supplierStats } = await this.supabase
      .from('suppliers')
      .select('id, company_name, city_id, cities!inner(state_id, states!inner(code))')
      .eq('is_active', true);

    // Calculate top categories
    const categoryGroups = (productStats || []).reduce((acc, item) => {
      const categoryName = item.product_categories?.name || 'Sem categoria';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, total_quantity: 0 };
      }
      acc[categoryName].count++;
      acc[categoryName].total_quantity += item.quantity;
      return acc;
    }, {} as Record<string, { count: number; total_quantity: number }>);

    const topCategories = Object.entries(categoryGroups)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avg_price: 0 // Would need price data
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate regional analysis
    const regionalGroups = (supplierStats || []).reduce((acc, supplier) => {
      const uf = supplier.cities?.states?.code || 'N/A';
      if (!acc[uf]) {
        acc[uf] = { supplier_count: 0, avg_price: 0 };
      }
      acc[uf].supplier_count++;
      return acc;
    }, {} as Record<string, { supplier_count: number; avg_price: number }>);

    const regionalAnalysis = Object.entries(regionalGroups)
      .map(([uf, stats]) => ({
        uf,
        avg_price: stats.avg_price,
        supplier_count: stats.supplier_count
      }))
      .sort((a, b) => b.supplier_count - a.supplier_count);

    // Generate price trends (simplified)
    const priceTrends = this.generateMockPriceTrends();

    return {
      period: `${dateRange.start.split('T')[0]} a ${dateRange.end.split('T')[0]}`,
      total_baskets: basketStats?.length || 0,
      total_products: productStats?.length || 0,
      total_suppliers: supplierStats?.length || 0,
      average_savings: 0, // Would calculate from actual price comparisons
      top_categories: topCategories,
      price_trends: priceTrends,
      regional_analysis: regionalAnalysis
    };
  }

  private async generatePriceAnalysis(parameters: any): Promise<any> {
    // Get price records with statistical analysis
    const { data: priceRecords } = await this.supabase
      .from('external_price_records')
      .select(`
        product_description,
        unit_price,
        procurement_date,
        location_uf,
        supplier_name,
        external_price_integrations!inner(source_name)
      `)
      .gte('procurement_date', parameters.date_range?.start || '2024-01-01')
      .lte('procurement_date', parameters.date_range?.end || new Date().toISOString());

    // Group by product and calculate statistics
    const productAnalysis = this.calculateProductStatistics(priceRecords || []);

    // Detect outliers
    const outliers = this.detectPriceOutliers(priceRecords || []);

    // Source comparison
    const sourceComparison = this.compareSourcePrices(priceRecords || []);

    return {
      summary: {
        total_records: priceRecords?.length || 0,
        unique_products: productAnalysis.length,
        outliers_detected: outliers.length,
        sources_analyzed: sourceComparison.length
      },
      product_analysis: productAnalysis,
      outliers: outliers,
      source_comparison: sourceComparison,
      recommendations: this.generatePriceRecommendations(productAnalysis, outliers)
    };
  }

  private async generateSupplierRanking(parameters: any): Promise<any> {
    // Get supplier performance data
    const { data: supplierData } = await this.supabase
      .from('supplier_quotation_responses')
      .select(`
        supplier_id,
        total_value,
        delivery_days,
        submitted_at,
        suppliers!inner(company_name, city_id),
        supplier_quotations!inner(created_at)
      `)
      .eq('status', 'submitted');

    // Calculate supplier rankings
    const supplierRankings = this.calculateSupplierRankings(supplierData || []);

    return {
      ranking_criteria: {
        price_competitiveness: 40,
        delivery_time: 30,
        response_rate: 20,
        reliability: 10
      },
      supplier_rankings: supplierRankings,
      performance_analysis: this.analyzeSupplierPerformance(supplierData || [])
    };
  }

  private async generateComplianceReport(parameters: any): Promise<any> {
    // This would integrate with CMED service for medication compliance
    return {
      compliance_summary: {
        total_items_analyzed: 0,
        compliant_items: 0,
        non_compliant_items: 0,
        potential_savings: 0
      },
      detailed_analysis: [],
      recommendations: []
    };
  }

  private async generateTrendAnalysis(parameters: any): Promise<any> {
    // Analyze price trends over time
    const { data: historicalData } = await this.supabase
      .from('external_price_records')
      .select('product_description, unit_price, procurement_date')
      .gte('procurement_date', parameters.date_range?.start || '2024-01-01')
      .order('procurement_date');

    const trendAnalysis = this.analyzePriceTrends(historicalData || []);

    return {
      trend_summary: {
        products_analyzed: trendAnalysis.length,
        trending_up: trendAnalysis.filter(t => t.trend === 'up').length,
        trending_down: trendAnalysis.filter(t => t.trend === 'down').length,
        stable: trendAnalysis.filter(t => t.trend === 'stable').length
      },
      detailed_trends: trendAnalysis,
      forecasts: this.generatePriceForecasts(trendAnalysis)
    };
  }

  // Helper methods
  private calculateProductStatistics(records: any[]): any[] {
    const productGroups = records.reduce((acc, record) => {
      const key = record.product_description.toLowerCase().trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(record.unit_price);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(productGroups).map(([product, prices]) => {
      const sortedPrices = prices.sort((a, b) => a - b);
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
      const stdDev = Math.sqrt(
        prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
      );

      return {
        product_name: product,
        count: prices.length,
        min_price: Math.min(...prices),
        max_price: Math.max(...prices),
        mean_price: mean,
        median_price: median,
        std_deviation: stdDev,
        coefficient_variation: (stdDev / mean) * 100
      };
    });
  }

  private detectPriceOutliers(records: any[]): any[] {
    // Implement outlier detection logic
    return [];
  }

  private compareSourcePrices(records: any[]): any[] {
    // Compare prices across different sources
    return [];
  }

  private generatePriceRecommendations(analysis: any[], outliers: any[]): string[] {
    const recommendations: string[] = [];
    
    if (outliers.length > 0) {
      recommendations.push(`${outliers.length} outliers detectados - revisar preços destoantes`);
    }

    const highVariationProducts = analysis.filter(p => p.coefficient_variation > 50);
    if (highVariationProducts.length > 0) {
      recommendations.push(`${highVariationProducts.length} produtos com alta variação de preços`);
    }

    return recommendations;
  }

  private calculateSupplierRankings(data: any[]): any[] {
    // Calculate supplier performance rankings
    return [];
  }

  private analyzeSupplierPerformance(data: any[]): any {
    // Analyze supplier performance metrics
    return {};
  }

  private analyzePriceTrends(data: any[]): any[] {
    // Analyze price trends over time
    return [];
  }

  private generatePriceForecasts(trends: any[]): any[] {
    // Generate price forecasts based on trends
    return [];
  }

  private generateMockPriceTrends(): any[] {
    // Generate mock price trends for demonstration
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return months.map(month => ({
      month,
      avg_price: Math.random() * 100 + 50,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
    }));
  }

  private async generateReportFile(data: any, type: string, format: string): Promise<string> {
    // Generate PDF or Excel file
    // This would use libraries like jsPDF or ExcelJS
    // For now, return a mock URL
    return `https://example.com/reports/${type}-${Date.now()}.${format}`;
  }

  private getReportName(type: string): string {
    const names = {
      'executive_summary': 'Relatório Executivo',
      'price_analysis': 'Análise de Preços',
      'supplier_ranking': 'Ranking de Fornecedores',
      'compliance_report': 'Relatório de Conformidade',
      'trend_analysis': 'Análise de Tendências'
    };
    return names[type] || 'Relatório';
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const request: ReportRequest = await req.json();
    const reportService = new ReportGeneratorService();
    const result = await reportService.generateReport(request);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});