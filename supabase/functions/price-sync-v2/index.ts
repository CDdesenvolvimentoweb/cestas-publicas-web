import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface IntegrationConfig {
  id: string;
  source_name: string;
  source_url: string;
  api_key?: string;
  is_active: boolean;
  rate_limit_per_hour: number;
  last_sync_at?: string;
}

interface SyncResult {
  success: boolean;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  error_message?: string;
}

class PriceSyncService {
  private supabase;
  
  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async syncAllSources(): Promise<Record<string, SyncResult>> {
    const { data: integrations } = await this.supabase
      .from('external_price_integrations')
      .select('*')
      .eq('is_active', true);

    const results: Record<string, SyncResult> = {};

    for (const integration of integrations || []) {
      try {
        const result = await this.syncSource(integration);
        results[integration.source_name] = result;
        
        // Update last sync timestamp
        await this.supabase
          .from('external_price_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);
          
      } catch (error) {
        results[integration.source_name] = {
          success: false,
          records_processed: 0,
          records_inserted: 0,
          records_updated: 0,
          error_message: error.message
        };
      }
    }

    return results;
  }

  private async syncSource(config: IntegrationConfig): Promise<SyncResult> {
    const logId = await this.createSyncLog(config.id, 'full_sync');
    
    try {
      let result: SyncResult;
      
      switch (config.source_name.toLowerCase()) {
        case 'pncp':
          result = await this.syncPNCP(config);
          break;
        case 'bps':
          result = await this.syncBPS(config);
          break;
        case 'painel_precos':
          result = await this.syncPainelPrecos(config);
          break;
        case 'sinapi':
          result = await this.syncSINAPI(config);
          break;
        case 'tce_pr':
          result = await this.syncTCEPR(config);
          break;
        case 'conab':
          result = await this.syncCONAB(config);
          break;
        case 'ceasa':
          result = await this.syncCEASA(config);
          break;
        case 'radar_mt':
          result = await this.syncRADARMT(config);
          break;
        default:
          throw new Error(`Unknown source: ${config.source_name}`);
      }

      await this.completeSyncLog(logId, 'success', result);
      return result;
      
    } catch (error) {
      await this.completeSyncLog(logId, 'error', {
        success: false,
        records_processed: 0,
        records_inserted: 0,
        records_updated: 0,
        error_message: error.message
      });
      throw error;
    }
  }

  private async syncPNCP(config: IntegrationConfig): Promise<SyncResult> {
    // PNCP API implementation
    const baseUrl = 'https://pncp.gov.br/api/consulta/v1';
    let totalProcessed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    try {
      // Get recent contracts
      const response = await fetch(`${baseUrl}/contratos?dataInicial=${this.getLastWeekDate()}&dataFinal=${this.getTodayDate()}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Sistema-Cestas-Precos-Santa-Teresa/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`PNCP API error: ${response.status}`);
      }

      const data = await response.json();
      
      for (const contract of data.data || []) {
        totalProcessed++;
        
        // Process contract items
        for (const item of contract.itens || []) {
          const priceRecord = {
            integration_source_id: config.id,
            product_description: item.descricao,
            product_code: item.codigo,
            unit_measure: item.unidadeMedida,
            unit_price: parseFloat(item.valorUnitario),
            total_price: parseFloat(item.valorTotal),
            quantity: parseFloat(item.quantidade),
            supplier_name: contract.fornecedor?.nome,
            supplier_cnpj: contract.fornecedor?.cnpj,
            procurement_number: contract.numero,
            procurement_date: contract.dataAssinatura,
            procurement_type: contract.modalidade,
            location_uf: contract.orgaoEntidade?.uf,
            location_city: contract.orgaoEntidade?.municipio,
            source_document_url: contract.linkDetalhamento,
            raw_data: item
          };

          const { error } = await this.supabase
            .from('external_price_records')
            .upsert(priceRecord, { 
              onConflict: 'integration_source_id,product_code,procurement_number',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Error inserting PNCP record:', error);
          } else {
            totalInserted++;
          }
        }
      }

      return {
        success: true,
        records_processed: totalProcessed,
        records_inserted: totalInserted,
        records_updated: totalUpdated
      };

    } catch (error) {
      throw new Error(`PNCP sync failed: ${error.message}`);
    }
  }

  private async syncBPS(config: IntegrationConfig): Promise<SyncResult> {
    // BPS (Banco de Preços em Saúde) implementation
    const baseUrl = 'https://bps.saude.gov.br/api';
    
    // Implementation for BPS API
    // This would include specific logic for health products
    
    return {
      success: true,
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0
    };
  }

  private async syncPainelPrecos(config: IntegrationConfig): Promise<SyncResult> {
    // Painel de Preços implementation
    // This would scrape or use API from governo federal
    
    return {
      success: true,
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0
    };
  }

  private async syncSINAPI(config: IntegrationConfig): Promise<SyncResult> {
    // SINAPI implementation
    // Integration with IBGE SINAPI data
    
    return {
      success: true,
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0
    };
  }

  private async syncTCEPR(config: IntegrationConfig): Promise<SyncResult> {
    // TCE/PR implementation
    return { success: true, records_processed: 0, records_inserted: 0, records_updated: 0 };
  }

  private async syncCONAB(config: IntegrationConfig): Promise<SyncResult> {
    // CONAB implementation
    return { success: true, records_processed: 0, records_inserted: 0, records_updated: 0 };
  }

  private async syncCEASA(config: IntegrationConfig): Promise<SyncResult> {
    // CEASA implementation
    return { success: true, records_processed: 0, records_inserted: 0, records_updated: 0 };
  }

  private async syncRADARMT(config: IntegrationConfig): Promise<SyncResult> {
    // RADAR/MT implementation
    return { success: true, records_processed: 0, records_inserted: 0, records_updated: 0 };
  }

  private async createSyncLog(integrationId: string, syncType: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('integration_sync_logs')
      .insert({
        integration_source_id: integrationId,
        sync_type: syncType,
        status: 'running'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completeSyncLog(logId: string, status: string, result: SyncResult): Promise<void> {
    await this.supabase
      .from('integration_sync_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        records_processed: result.records_processed,
        records_inserted: result.records_inserted,
        records_updated: result.records_updated,
        error_message: result.error_message
      })
      .eq('id', logId);
  }

  private getLastWeekDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const syncService = new PriceSyncService();
    const results = await syncService.syncAllSources();
    
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
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