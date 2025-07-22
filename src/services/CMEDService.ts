import { supabase } from '@/integrations/supabase/client';

interface CMEDProduct {
  id: string;
  registro_anvisa: string;
  principio_ativo: string;
  produto_descricao: string;
  apresentacao_descricao: string;
  preco_maximo_consumidor: number | null;
  preco_maximo_governo: number | null;
  data_atualizacao: string;
  created_at: string;
  updated_at: string;
}

interface CMEDSearchResult {
  products: CMEDProduct[];
  total_count: number;
  has_more: boolean;
}

interface PriceComplianceResult {
  product_description: string;
  quoted_price: number;
  max_consumer_price: number | null;
  max_government_price: number | null;
  is_compliant_consumer: boolean;
  is_compliant_government: boolean;
  savings_consumer: number;
  savings_government: number;
  anvisa_registration: string;
}

export class CMEDService {
  private readonly anvisaBaseUrl = 'https://consultas.anvisa.gov.br/api/consulta/medicamentos';

  async syncCMEDData(): Promise<{
    success: boolean;
    records_processed: number;
    records_updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsUpdated = 0;

    try {
      // ANVISA doesn't provide a direct API for CMED data
      // This would typically involve scraping or using unofficial APIs
      // For now, we'll implement a placeholder that could be extended

      // In a real implementation, you would:
      // 1. Download the CMED Excel file from ANVISA
      // 2. Parse the Excel data
      // 3. Update the database

      // Placeholder implementation
      const sampleData = await this.fetchSampleCMEDData();
      
      for (const product of sampleData) {
        try {
          recordsProcessed++;
          
          const { error } = await supabase
            .from('cmed_products')
            .upsert({
              registro_anvisa: product.registro_anvisa,
              principio_ativo: product.principio_ativo,
              produto_descricao: product.produto_descricao,
              apresentacao_descricao: product.apresentacao_descricao,
              preco_maximo_consumidor: product.preco_maximo_consumidor,
              preco_maximo_governo: product.preco_maximo_governo,
              data_atualizacao: product.data_atualizacao
            }, {
              onConflict: 'registro_anvisa',
              ignoreDuplicates: false
            });

          if (error) {
            errors.push(`Error updating product ${product.registro_anvisa}: ${error.message}`);
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          errors.push(`Error processing product ${product.registro_anvisa}: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        records_processed: recordsProcessed,
        records_updated: recordsUpdated,
        errors
      };

    } catch (error) {
      errors.push(`General sync error: ${error.message}`);
      return {
        success: false,
        records_processed: recordsProcessed,
        records_updated: recordsUpdated,
        errors
      };
    }
  }

  private async fetchSampleCMEDData(): Promise<any[]> {
    // This is a placeholder - in production, this would fetch real CMED data
    // You would implement Excel parsing or API calls here
    return [
      {
        registro_anvisa: '1234567890123',
        principio_ativo: 'PARACETAMOL',
        produto_descricao: 'PARACETAMOL 500MG',
        apresentacao_descricao: 'COMPRIMIDO',
        preco_maximo_consumidor: 15.50,
        preco_maximo_governo: 12.40,
        data_atualizacao: new Date().toISOString().split('T')[0]
      }
      // More sample data would go here
    ];
  }

  async searchByRegistration(registrationNumber: string): Promise<CMEDProduct | null> {
    const { data, error } = await supabase
      .from('cmed_products')
      .select('*')
      .eq('registro_anvisa', registrationNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Error searching by registration: ${error.message}`);
    }

    return data;
  }

  async searchByActiveIngredient(activeIngredient: string, limit: number = 20): Promise<CMEDSearchResult> {
    const { data, error, count } = await supabase
      .from('cmed_products')
      .select('*', { count: 'exact' })
      .ilike('principio_ativo', `%${activeIngredient}%`)
      .order('produto_descricao')
      .limit(limit);

    if (error) {
      throw new Error(`Error searching by active ingredient: ${error.message}`);
    }

    return {
      products: data || [],
      total_count: count || 0,
      has_more: (count || 0) > limit
    };
  }

  async searchByDescription(description: string, limit: number = 20): Promise<CMEDSearchResult> {
    const { data, error, count } = await supabase
      .from('cmed_products')
      .select('*', { count: 'exact' })
      .or(`produto_descricao.ilike.%${description}%,apresentacao_descricao.ilike.%${description}%`)
      .order('produto_descricao')
      .limit(limit);

    if (error) {
      throw new Error(`Error searching by description: ${error.message}`);
    }

    return {
      products: data || [],
      total_count: count || 0,
      has_more: (count || 0) > limit
    };
  }

  async checkPriceCompliance(
    productDescription: string,
    quotedPrice: number,
    anvisaRegistration?: string
  ): Promise<PriceComplianceResult | null> {
    
    let cmedProduct: CMEDProduct | null = null;

    // First try to find by ANVISA registration if provided
    if (anvisaRegistration) {
      cmedProduct = await this.searchByRegistration(anvisaRegistration);
    }

    // If not found by registration, try to find by description
    if (!cmedProduct) {
      const searchResult = await this.searchByDescription(productDescription, 1);
      if (searchResult.products.length > 0) {
        cmedProduct = searchResult.products[0];
      }
    }

    if (!cmedProduct) {
      return null; // No CMED data found for this product
    }

    const maxConsumerPrice = cmedProduct.preco_maximo_consumidor;
    const maxGovernmentPrice = cmedProduct.preco_maximo_governo;

    const isCompliantConsumer = maxConsumerPrice ? quotedPrice <= maxConsumerPrice : true;
    const isCompliantGovernment = maxGovernmentPrice ? quotedPrice <= maxGovernmentPrice : true;

    const savingsConsumer = maxConsumerPrice ? Math.max(0, maxConsumerPrice - quotedPrice) : 0;
    const savingsGovernment = maxGovernmentPrice ? Math.max(0, maxGovernmentPrice - quotedPrice) : 0;

    return {
      product_description: cmedProduct.produto_descricao,
      quoted_price: quotedPrice,
      max_consumer_price: maxConsumerPrice,
      max_government_price: maxGovernmentPrice,
      is_compliant_consumer: isCompliantConsumer,
      is_compliant_government: isCompliantGovernment,
      savings_consumer: savingsConsumer,
      savings_government: savingsGovernment,
      anvisa_registration: cmedProduct.registro_anvisa
    };
  }

  async analyzeBasketCompliance(basketId: string): Promise<{
    total_items: number;
    compliant_items: number;
    non_compliant_items: number;
    total_savings_consumer: number;
    total_savings_government: number;
    compliance_details: PriceComplianceResult[];
  }> {
    
    // Get basket items with their quotes
    const { data: basketItems, error } = await supabase
      .from('basket_items')
      .select(`
        id,
        quantity,
        products!inner(name, anvisa_code),
        quote_items(unit_price, supplier_id)
      `)
      .eq('basket_id', basketId);

    if (error) {
      throw new Error(`Error fetching basket items: ${error.message}`);
    }

    const complianceDetails: PriceComplianceResult[] = [];
    let totalSavingsConsumer = 0;
    let totalSavingsGovernment = 0;
    let compliantItems = 0;
    let nonCompliantItems = 0;

    for (const item of basketItems || []) {
      // Get the best (lowest) price for this item
      const prices = item.quote_items?.map(qi => qi.unit_price).filter(p => p > 0) || [];
      
      if (prices.length === 0) continue;

      const bestPrice = Math.min(...prices);
      
      const compliance = await this.checkPriceCompliance(
        item.products.name,
        bestPrice,
        item.products.anvisa_code
      );

      if (compliance) {
        complianceDetails.push(compliance);
        
        if (compliance.is_compliant_consumer && compliance.is_compliant_government) {
          compliantItems++;
        } else {
          nonCompliantItems++;
        }

        totalSavingsConsumer += compliance.savings_consumer * item.quantity;
        totalSavingsGovernment += compliance.savings_government * item.quantity;
      }
    }

    return {
      total_items: basketItems?.length || 0,
      compliant_items: compliantItems,
      non_compliant_items: nonCompliantItems,
      total_savings_consumer: totalSavingsConsumer,
      total_savings_government: totalSavingsGovernment,
      compliance_details: complianceDetails
    };
  }

  async getComplianceReport(basketId: string): Promise<{
    basket_name: string;
    analysis_date: string;
    compliance_summary: any;
    detailed_analysis: PriceComplianceResult[];
    recommendations: string[];
  }> {
    
    // Get basket info
    const { data: basket, error: basketError } = await supabase
      .from('price_baskets')
      .select('name, reference_date')
      .eq('id', basketId)
      .single();

    if (basketError || !basket) {
      throw new Error('Basket not found');
    }

    const complianceAnalysis = await this.analyzeBasketCompliance(basketId);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (complianceAnalysis.non_compliant_items > 0) {
      recommendations.push(
        `${complianceAnalysis.non_compliant_items} itens estão acima do preço máximo regulamentado pela ANVISA`
      );
    }

    if (complianceAnalysis.total_savings_government > 0) {
      recommendations.push(
        `Economia potencial de R$ ${complianceAnalysis.total_savings_government.toFixed(2)} em compras governamentais`
      );
    }

    const complianceRate = (complianceAnalysis.compliant_items / complianceAnalysis.total_items) * 100;
    
    if (complianceRate < 90) {
      recommendations.push(
        'Revisar fornecedores para garantir conformidade com preços CMED'
      );
    }

    return {
      basket_name: basket.name,
      analysis_date: new Date().toISOString(),
      compliance_summary: {
        compliance_rate: complianceRate,
        total_items: complianceAnalysis.total_items,
        compliant_items: complianceAnalysis.compliant_items,
        potential_savings: complianceAnalysis.total_savings_government
      },
      detailed_analysis: complianceAnalysis.compliance_details,
      recommendations
    };
  }

  async getLastUpdateDate(): Promise<string | null> {
    const { data, error } = await supabase
      .from('cmed_products')
      .select('data_atualizacao')
      .order('data_atualizacao', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.data_atualizacao;
  }

  async getStatistics(): Promise<{
    total_products: number;
    total_active_ingredients: number;
    avg_consumer_price: number;
    avg_government_price: number;
    last_update: string | null;
  }> {
    
    const { data: stats, error } = await supabase
      .from('cmed_products')
      .select(`
        id,
        principio_ativo,
        preco_maximo_consumidor,
        preco_maximo_governo
      `);

    if (error) {
      throw new Error(`Error fetching statistics: ${error.message}`);
    }

    const products = stats || [];
    const uniqueActiveIngredients = new Set(products.map(p => p.principio_ativo)).size;
    
    const consumerPrices = products
      .map(p => p.preco_maximo_consumidor)
      .filter(p => p !== null && p > 0);
    
    const governmentPrices = products
      .map(p => p.preco_maximo_governo)
      .filter(p => p !== null && p > 0);

    const avgConsumerPrice = consumerPrices.length > 0
      ? consumerPrices.reduce((sum, price) => sum + price, 0) / consumerPrices.length
      : 0;

    const avgGovernmentPrice = governmentPrices.length > 0
      ? governmentPrices.reduce((sum, price) => sum + price, 0) / governmentPrices.length
      : 0;

    const lastUpdate = await this.getLastUpdateDate();

    return {
      total_products: products.length,
      total_active_ingredients: uniqueActiveIngredients,
      avg_consumer_price: avgConsumerPrice,
      avg_government_price: avgGovernmentPrice,
      last_update: lastUpdate
    };
  }
}