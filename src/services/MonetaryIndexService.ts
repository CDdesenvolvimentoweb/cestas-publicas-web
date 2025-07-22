import { supabase } from '@/integrations/supabase/client';

interface IndexValue {
  id: string;
  index_id: string;
  reference_date: string;
  value: number;
  created_at: string;
}

interface MonetaryIndex {
  id: string;
  name: string;
  description: string;
  source_url: string;
  is_active: boolean;
  created_at: string;
}

interface CorrectionResult {
  original_value: number;
  corrected_value: number;
  correction_factor: number;
  index_name: string;
  base_date: string;
  target_date: string;
}

export class MonetaryIndexService {
  
  async getAvailableIndexes(): Promise<MonetaryIndex[]> {
    const { data, error } = await supabase
      .from('monetary_indexes')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Error fetching indexes: ${error.message}`);
    }

    return data || [];
  }

  async getIndexValues(indexId: string, startDate: string, endDate: string): Promise<IndexValue[]> {
    const { data, error } = await supabase
      .from('index_values')
      .select('*')
      .eq('index_id', indexId)
      .gte('reference_date', startDate)
      .lte('reference_date', endDate)
      .order('reference_date');

    if (error) {
      throw new Error(`Error fetching index values: ${error.message}`);
    }

    return data || [];
  }

  async syncIPCAData(): Promise<{ success: boolean; records_updated: number; error?: string }> {
    try {
      // IBGE IPCA API
      const response = await fetch('https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-60/variaveis/63?localidades=N1[all]');
      
      if (!response.ok) {
        throw new Error(`IBGE API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Get or create IPCA index
      let { data: ipcaIndex, error: indexError } = await supabase
        .from('monetary_indexes')
        .select('id')
        .eq('name', 'IPCA')
        .single();

      if (indexError || !ipcaIndex) {
        const { data: newIndex, error: createError } = await supabase
          .from('monetary_indexes')
          .insert({
            name: 'IPCA',
            description: 'Índice Nacional de Preços ao Consumidor Amplo',
            source_url: 'https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html',
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Error creating IPCA index: ${createError.message}`);
        }

        ipcaIndex = newIndex;
      }

      let recordsUpdated = 0;

      // Process IBGE data
      for (const result of data[0]?.resultados || []) {
        for (const serie of result.series || []) {
          for (const [period, value] of Object.entries(serie.serie)) {
            if (value && value !== '...') {
              // Convert period (YYYYMM) to date
              const year = period.substring(0, 4);
              const month = period.substring(4, 6);
              const referenceDate = `${year}-${month}-01`;

              const { error: upsertError } = await supabase
                .from('index_values')
                .upsert({
                  index_id: ipcaIndex.id,
                  reference_date: referenceDate,
                  value: parseFloat(value as string)
                }, {
                  onConflict: 'index_id,reference_date'
                });

              if (!upsertError) {
                recordsUpdated++;
              }
            }
          }
        }
      }

      return { success: true, records_updated: recordsUpdated };

    } catch (error) {
      return { 
        success: false, 
        records_updated: 0, 
        error: error.message 
      };
    }
  }

  async syncIGPMData(): Promise<{ success: boolean; records_updated: number; error?: string }> {
    try {
      // FGV IGPM data would need to be scraped or accessed via API
      // This is a simplified implementation
      
      // Get or create IGPM index
      let { data: igpmIndex, error: indexError } = await supabase
        .from('monetary_indexes')
        .select('id')
        .eq('name', 'IGPM')
        .single();

      if (indexError || !igpmIndex) {
        const { data: newIndex, error: createError } = await supabase
          .from('monetary_indexes')
          .insert({
            name: 'IGPM',
            description: 'Índice Geral de Preços do Mercado',
            source_url: 'https://portalibre.fgv.br/estudos-e-pesquisas/indices-de-precos/igp',
            is_active: true
          })
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Error creating IGPM index: ${createError.message}`);
        }

        igpmIndex = newIndex;
      }

      // For now, return success with 0 records
      // In production, this would implement actual IGPM data fetching
      return { success: true, records_updated: 0 };

    } catch (error) {
      return { 
        success: false, 
        records_updated: 0, 
        error: error.message 
      };
    }
  }

  async calculateCorrection(
    originalValue: number,
    indexName: string,
    baseDate: string,
    targetDate: string
  ): Promise<CorrectionResult> {
    
    // Get index ID
    const { data: index, error: indexError } = await supabase
      .from('monetary_indexes')
      .select('id')
      .eq('name', indexName)
      .eq('is_active', true)
      .single();

    if (indexError || !index) {
      throw new Error(`Index ${indexName} not found`);
    }

    // Get base value
    const { data: baseValue, error: baseError } = await supabase
      .from('index_values')
      .select('value')
      .eq('index_id', index.id)
      .eq('reference_date', baseDate)
      .single();

    if (baseError || !baseValue) {
      throw new Error(`Base value not found for ${baseDate}`);
    }

    // Get target value
    const { data: targetValue, error: targetError } = await supabase
      .from('index_values')
      .select('value')
      .eq('index_id', index.id)
      .eq('reference_date', targetDate)
      .single();

    if (targetError || !targetValue) {
      throw new Error(`Target value not found for ${targetDate}`);
    }

    // Calculate correction factor
    const correctionFactor = targetValue.value / baseValue.value;
    const correctedValue = originalValue * correctionFactor;

    return {
      original_value: originalValue,
      corrected_value: correctedValue,
      correction_factor: correctionFactor,
      index_name: indexName,
      base_date: baseDate,
      target_date: targetDate
    };
  }

  async applyBasketCorrection(
    basketId: string,
    indexName: string,
    targetDate: string
  ): Promise<{
    success: boolean;
    corrections_applied: number;
    total_original: number;
    total_corrected: number;
    error?: string;
  }> {
    try {
      // Get basket details
      const { data: basket, error: basketError } = await supabase
        .from('price_baskets')
        .select('reference_date')
        .eq('id', basketId)
        .single();

      if (basketError || !basket) {
        throw new Error('Basket not found');
      }

      // Get basket items with their calculated prices
      const { data: items, error: itemsError } = await supabase
        .from('basket_items')
        .select(`
          id,
          quantity,
          products!inner(name),
          quote_items(unit_price, total_price)
        `)
        .eq('basket_id', basketId);

      if (itemsError) {
        throw new Error(`Error fetching basket items: ${itemsError.message}`);
      }

      let correctionsApplied = 0;
      let totalOriginal = 0;
      let totalCorrected = 0;

      for (const item of items || []) {
        // Get the average price for this item
        const prices = item.quote_items?.map(qi => qi.unit_price).filter(p => p > 0) || [];
        
        if (prices.length === 0) continue;

        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const itemTotal = averagePrice * item.quantity;

        // Apply correction
        const correction = await this.calculateCorrection(
          itemTotal,
          indexName,
          basket.reference_date,
          targetDate
        );

        // Save correction record
        const { error: correctionError } = await supabase
          .from('price_corrections')
          .insert({
            basket_id: basketId,
            index_id: (await supabase
              .from('monetary_indexes')
              .select('id')
              .eq('name', indexName)
              .single()
            ).data?.id,
            base_date: basket.reference_date,
            target_date: targetDate,
            correction_factor: correction.correction_factor,
            applied_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (!correctionError) {
          correctionsApplied++;
          totalOriginal += correction.original_value;
          totalCorrected += correction.corrected_value;
        }
      }

      return {
        success: true,
        corrections_applied: correctionsApplied,
        total_original: totalOriginal,
        total_corrected: totalCorrected
      };

    } catch (error) {
      return {
        success: false,
        corrections_applied: 0,
        total_original: 0,
        total_corrected: 0,
        error: error.message
      };
    }
  }

  async getCorrectionHistory(basketId: string): Promise<{
    id: string;
    index_name: string;
    base_date: string;
    target_date: string;
    correction_factor: number;
    applied_at: string;
    applied_by: string;
  }[]> {
    const { data, error } = await supabase
      .from('price_corrections')
      .select(`
        id,
        base_date,
        target_date,
        correction_factor,
        applied_at,
        applied_by,
        monetary_indexes!inner(name)
      `)
      .eq('basket_id', basketId)
      .order('applied_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching correction history: ${error.message}`);
    }

    return (data || []).map(record => ({
      id: record.id,
      index_name: record.monetary_indexes?.name || 'Unknown',
      base_date: record.base_date,
      target_date: record.target_date,
      correction_factor: record.correction_factor,
      applied_at: record.applied_at,
      applied_by: record.applied_by
    }));
  }
}