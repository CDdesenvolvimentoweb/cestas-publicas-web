import { supabase } from '@/integrations/supabase/client';

interface PNCPContract {
  id: string;
  numero: string;
  dataAssinatura: string;
  modalidade: string;
  objeto: string;
  valorTotal: number;
  fornecedor: {
    nome: string;
    cnpj: string;
  };
  orgaoEntidade: {
    nome: string;
    cnpj: string;
    uf: string;
    municipio: string;
  };
  itens: PNCPItem[];
  linkDetalhamento: string;
}

interface PNCPItem {
  numero: number;
  codigo: string;
  descricao: string;
  unidadeMedida: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  marca?: string;
  especificacao?: string;
}

interface PNCPResponse {
  data: PNCPContract[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export class PNCPService {
  private readonly baseUrl = 'https://pncp.gov.br/api/consulta/v1';
  private readonly userAgent = 'Sistema-Cestas-Precos-Santa-Teresa/1.0';

  async searchContracts(params: {
    dataInicial?: string;
    dataFinal?: string;
    uf?: string;
    municipio?: string;
    cnpjOrgao?: string;
    modalidade?: string;
    page?: number;
    size?: number;
  }): Promise<PNCPResponse> {
    const searchParams = new URLSearchParams();
    
    // Add parameters
    if (params.dataInicial) searchParams.append('dataInicial', params.dataInicial);
    if (params.dataFinal) searchParams.append('dataFinal', params.dataFinal);
    if (params.uf) searchParams.append('uf', params.uf);
    if (params.municipio) searchParams.append('municipio', params.municipio);
    if (params.cnpjOrgao) searchParams.append('cnpjOrgao', params.cnpjOrgao);
    if (params.modalidade) searchParams.append('modalidade', params.modalidade);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.size) searchParams.append('size', params.size.toString());

    const response = await fetch(`${this.baseUrl}/contratos?${searchParams}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`PNCP API error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }

  async searchByProduct(productDescription: string, uf?: string): Promise<PNCPResponse> {
    const searchParams = new URLSearchParams({
      q: productDescription,
      size: '100'
    });

    if (uf) searchParams.append('uf', uf);

    const response = await fetch(`${this.baseUrl}/contratos/busca?${searchParams}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`PNCP search error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }

  async getContractDetails(contractId: string): Promise<PNCPContract> {
    const response = await fetch(`${this.baseUrl}/contratos/${contractId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`PNCP contract details error: ${response.status}`);
    }

    return await response.json();
  }

  async syncRecentContracts(integrationId: string, daysBack: number = 7): Promise<{
    processed: number;
    inserted: number;
    errors: string[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const params = {
      dataInicial: startDate.toISOString().split('T')[0],
      dataFinal: endDate.toISOString().split('T')[0],
      uf: 'ES', // Focus on Espírito Santo
      size: 100
    };

    let processed = 0;
    let inserted = 0;
    const errors: string[] = [];
    let currentPage = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const response = await this.searchContracts({
          ...params,
          page: currentPage
        });

        for (const contract of response.data) {
          try {
            processed++;
            
            // Process each item in the contract
            for (const item of contract.itens) {
              const priceRecord = {
                integration_source_id: integrationId,
                product_description: item.descricao,
                product_code: item.codigo,
                unit_measure: item.unidadeMedida,
                unit_price: item.valorUnitario,
                total_price: item.valorTotal,
                quantity: item.quantidade,
                supplier_name: contract.fornecedor.nome,
                supplier_cnpj: contract.fornecedor.cnpj,
                procurement_number: contract.numero,
                procurement_date: contract.dataAssinatura,
                procurement_type: contract.modalidade,
                location_uf: contract.orgaoEntidade.uf,
                location_city: contract.orgaoEntidade.municipio,
                source_document_url: contract.linkDetalhamento,
                raw_data: {
                  contract: contract,
                  item: item
                }
              };

              const { error } = await supabase
                .from('external_price_records')
                .upsert(priceRecord, {
                  onConflict: 'integration_source_id,product_code,procurement_number',
                  ignoreDuplicates: false
                });

              if (error) {
                errors.push(`Error inserting item ${item.codigo}: ${error.message}`);
              } else {
                inserted++;
              }
            }
          } catch (error) {
            errors.push(`Error processing contract ${contract.numero}: ${error.message}`);
          }
        }

        // Check if there are more pages
        hasMorePages = currentPage < response.totalPages - 1;
        currentPage++;

        // Rate limiting - wait 1 second between requests
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        errors.push(`Error fetching page ${currentPage}: ${error.message}`);
        hasMorePages = false;
      }
    }

    return { processed, inserted, errors };
  }

  async searchSimilarProducts(productName: string, limit: number = 10): Promise<{
    product_description: string;
    unit_price: number;
    supplier_name: string;
    procurement_date: string;
    location_city: string;
    location_uf: string;
  }[]> {
    const { data, error } = await supabase
      .from('external_price_records')
      .select(`
        product_description,
        unit_price,
        supplier_name,
        procurement_date,
        location_city,
        location_uf
      `)
      .ilike('product_description', `%${productName}%`)
      .order('procurement_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database search error: ${error.message}`);
    }

    return data || [];
  }

  async getPriceStatistics(productName: string, uf?: string): Promise<{
    count: number;
    min_price: number;
    max_price: number;
    avg_price: number;
    median_price: number;
  }> {
    let query = supabase
      .from('external_price_records')
      .select('unit_price')
      .ilike('product_description', `%${productName}%`)
      .not('unit_price', 'is', null);

    if (uf) {
      query = query.eq('location_uf', uf);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Statistics error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        count: 0,
        min_price: 0,
        max_price: 0,
        avg_price: 0,
        median_price: 0
      };
    }

    const prices = data.map(record => record.unit_price).sort((a, b) => a - b);
    const count = prices.length;
    const min_price = Math.min(...prices);
    const max_price = Math.max(...prices);
    const avg_price = prices.reduce((sum, price) => sum + price, 0) / count;
    const median_price = count % 2 === 0 
      ? (prices[count / 2 - 1] + prices[count / 2]) / 2
      : prices[Math.floor(count / 2)];

    return {
      count,
      min_price,
      max_price,
      avg_price,
      median_price
    };
  }
}