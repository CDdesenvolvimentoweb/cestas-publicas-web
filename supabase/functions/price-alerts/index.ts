import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AlertRule {
  id: string;
  name: string;
  product_pattern: string;
  alert_type: 'price_deviation' | 'outlier' | 'trend_change' | 'source_discrepancy';
  threshold_percentage: number;
  is_active: boolean;
  notification_emails: string[];
}

interface PriceAlert {
  id: string;
  rule_id: string;
  product_description: string;
  alert_type: string;
  current_value: number;
  expected_value: number;
  deviation_percentage: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  created_at: string;
}

class PriceAlertService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async runAlertAnalysis(): Promise<{
    alerts_generated: number;
    notifications_sent: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let alertsGenerated = 0;
    let notificationsSent = 0;

    try {
      // Get active alert rules
      const { data: rules, error: rulesError } = await this.supabase
        .from('price_alert_rules')
        .select('*')
        .eq('is_active', true);

      if (rulesError) {
        errors.push(`Error fetching rules: ${rulesError.message}`);
        return { alerts_generated: 0, notifications_sent: 0, errors };
      }

      // Process each rule
      for (const rule of rules || []) {
        try {
          const alerts = await this.processAlertRule(rule);
          alertsGenerated += alerts.length;

          // Send notifications for new alerts
          for (const alert of alerts) {
            try {
              await this.sendAlertNotification(alert, rule);
              notificationsSent++;
            } catch (error) {
              errors.push(`Notification error for alert ${alert.id}: ${error.message}`);
            }
          }
        } catch (error) {
          errors.push(`Error processing rule ${rule.name}: ${error.message}`);
        }
      }

      return { alerts_generated: alertsGenerated, notifications_sent: notificationsSent, errors };

    } catch (error) {
      errors.push(`General error: ${error.message}`);
      return { alerts_generated: 0, notifications_sent: 0, errors };
    }
  }

  private async processAlertRule(rule: AlertRule): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    switch (rule.alert_type) {
      case 'price_deviation':
        alerts.push(...await this.detectPriceDeviations(rule));
        break;
      case 'outlier':
        alerts.push(...await this.detectOutliers(rule));
        break;
      case 'trend_change':
        alerts.push(...await this.detectTrendChanges(rule));
        break;
      case 'source_discrepancy':
        alerts.push(...await this.detectSourceDiscrepancies(rule));
        break;
    }

    // Save alerts to database
    for (const alert of alerts) {
      const { error } = await this.supabase
        .from('price_deviation_alerts')
        .insert({
          alert_type: alert.alert_type,
          item_description: alert.product_description,
          deviation_percentage: alert.deviation_percentage,
          threshold_percentage: rule.threshold_percentage,
          message: alert.message,
          is_resolved: false
        });

      if (error) {
        console.error('Error saving alert:', error);
      }
    }

    return alerts;
  }

  private async detectPriceDeviations(rule: AlertRule): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    // Get recent price records matching the pattern
    const { data: records, error } = await this.supabase
      .from('external_price_records')
      .select('*')
      .ilike('product_description', `%${rule.product_pattern}%`)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    if (error || !records) return alerts;

    // Group by product description
    const productGroups = records.reduce((acc, record) => {
      const key = record.product_description.toLowerCase().trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    // Analyze each product group
    for (const [productName, productRecords] of Object.entries(productGroups)) {
      if (productRecords.length < 3) continue; // Need at least 3 records

      const prices = productRecords.map(r => r.unit_price).sort((a, b) => a - b);
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const stdDev = Math.sqrt(
        prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
      );

      // Check for recent prices that deviate significantly
      const recentRecords = productRecords.slice(0, 3); // Last 3 records
      
      for (const record of recentRecords) {
        const deviationPercentage = Math.abs((record.unit_price - mean) / mean) * 100;
        
        if (deviationPercentage > rule.threshold_percentage) {
          const severity = this.calculateSeverity(deviationPercentage, rule.threshold_percentage);
          
          alerts.push({
            id: crypto.randomUUID(),
            rule_id: rule.id,
            product_description: record.product_description,
            alert_type: 'price_deviation',
            current_value: record.unit_price,
            expected_value: mean,
            deviation_percentage: deviationPercentage,
            message: `Preço de R$ ${record.unit_price.toFixed(2)} desvia ${deviationPercentage.toFixed(1)}% da média histórica (R$ ${mean.toFixed(2)})`,
            severity,
            is_resolved: false,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    return alerts;
  }

  private async detectOutliers(rule: AlertRule): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    // Statistical outlier detection using IQR method
    const { data: records, error } = await this.supabase
      .from('external_price_records')
      .select('*')
      .ilike('product_description', `%${rule.product_pattern}%`)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('unit_price');

    if (error || !records || records.length < 10) return alerts;

    const prices = records.map(r => r.unit_price);
    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);
    const q1 = prices[q1Index];
    const q3 = prices[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Find outliers
    const outliers = records.filter(record => 
      record.unit_price < lowerBound || record.unit_price > upperBound
    );

    for (const outlier of outliers) {
      const median = prices[Math.floor(prices.length / 2)];
      const deviationPercentage = Math.abs((outlier.unit_price - median) / median) * 100;

      if (deviationPercentage > rule.threshold_percentage) {
        alerts.push({
          id: crypto.randomUUID(),
          rule_id: rule.id,
          product_description: outlier.product_description,
          alert_type: 'outlier',
          current_value: outlier.unit_price,
          expected_value: median,
          deviation_percentage: deviationPercentage,
          message: `Outlier detectado: R$ ${outlier.unit_price.toFixed(2)} está fora do intervalo normal (R$ ${lowerBound.toFixed(2)} - R$ ${upperBound.toFixed(2)})`,
          severity: this.calculateSeverity(deviationPercentage, rule.threshold_percentage),
          is_resolved: false,
          created_at: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  private async detectTrendChanges(rule: AlertRule): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    // Get price records for trend analysis
    const { data: records, error } = await this.supabase
      .from('external_price_records')
      .select('*')
      .ilike('product_description', `%${rule.product_pattern}%`)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Last 60 days
      .order('created_at');

    if (error || !records || records.length < 10) return alerts;

    // Group by product and analyze trends
    const productGroups = records.reduce((acc, record) => {
      const key = record.product_description.toLowerCase().trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [productName, productRecords] of Object.entries(productGroups)) {
      if (productRecords.length < 10) continue;

      // Split into two periods for comparison
      const midPoint = Math.floor(productRecords.length / 2);
      const olderPeriod = productRecords.slice(0, midPoint);
      const recentPeriod = productRecords.slice(midPoint);

      const olderAvg = olderPeriod.reduce((sum, r) => sum + r.unit_price, 0) / olderPeriod.length;
      const recentAvg = recentPeriod.reduce((sum, r) => sum + r.unit_price, 0) / recentPeriod.length;

      const trendChangePercentage = Math.abs((recentAvg - olderAvg) / olderAvg) * 100;

      if (trendChangePercentage > rule.threshold_percentage) {
        const trendDirection = recentAvg > olderAvg ? 'aumento' : 'diminuição';
        
        alerts.push({
          id: crypto.randomUUID(),
          rule_id: rule.id,
          product_description: productName,
          alert_type: 'trend_change',
          current_value: recentAvg,
          expected_value: olderAvg,
          deviation_percentage: trendChangePercentage,
          message: `Mudança de tendência detectada: ${trendDirection} de ${trendChangePercentage.toFixed(1)}% no preço médio`,
          severity: this.calculateSeverity(trendChangePercentage, rule.threshold_percentage),
          is_resolved: false,
          created_at: new Date().toISOString()
        });
      }
    }

    return alerts;
  }

  private async detectSourceDiscrepancies(rule: AlertRule): Promise<PriceAlert[]> {
    const alerts: PriceAlert[] = [];

    // Compare prices from different sources for the same products
    const { data: records, error } = await this.supabase
      .from('external_price_records')
      .select(`
        *,
        external_price_integrations!inner(source_name)
      `)
      .ilike('product_description', `%${rule.product_pattern}%`)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error || !records) return alerts;

    // Group by product and then by source
    const productGroups = records.reduce((acc, record) => {
      const productKey = record.product_description.toLowerCase().trim();
      const sourceName = record.external_price_integrations?.source_name || 'unknown';
      
      if (!acc[productKey]) acc[productKey] = {};
      if (!acc[productKey][sourceName]) acc[productKey][sourceName] = [];
      
      acc[productKey][sourceName].push(record);
      return acc;
    }, {} as Record<string, Record<string, any[]>>);

    // Analyze discrepancies between sources
    for (const [productName, sourceGroups] of Object.entries(productGroups)) {
      const sources = Object.keys(sourceGroups);
      if (sources.length < 2) continue; // Need at least 2 sources

      // Calculate average price for each source
      const sourceAverages = sources.map(source => ({
        source,
        average: sourceGroups[source].reduce((sum, r) => sum + r.unit_price, 0) / sourceGroups[source].length,
        count: sourceGroups[source].length
      }));

      // Find significant discrepancies
      for (let i = 0; i < sourceAverages.length; i++) {
        for (let j = i + 1; j < sourceAverages.length; j++) {
          const source1 = sourceAverages[i];
          const source2 = sourceAverages[j];
          
          const discrepancyPercentage = Math.abs((source1.average - source2.average) / Math.min(source1.average, source2.average)) * 100;
          
          if (discrepancyPercentage > rule.threshold_percentage) {
            alerts.push({
              id: crypto.randomUUID(),
              rule_id: rule.id,
              product_description: productName,
              alert_type: 'source_discrepancy',
              current_value: Math.max(source1.average, source2.average),
              expected_value: Math.min(source1.average, source2.average),
              deviation_percentage: discrepancyPercentage,
              message: `Discrepância entre fontes: ${source1.source} (R$ ${source1.average.toFixed(2)}) vs ${source2.source} (R$ ${source2.average.toFixed(2)}) - ${discrepancyPercentage.toFixed(1)}% de diferença`,
              severity: this.calculateSeverity(discrepancyPercentage, rule.threshold_percentage),
              is_resolved: false,
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }

    return alerts;
  }

  private calculateSeverity(deviationPercentage: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviationPercentage > threshold * 3) return 'critical';
    if (deviationPercentage > threshold * 2) return 'high';
    if (deviationPercentage > threshold * 1.5) return 'medium';
    return 'low';
  }

  private async sendAlertNotification(alert: PriceAlert, rule: AlertRule): Promise<void> {
    // Send email notification
    const { error } = await this.supabase.functions.invoke('notification-service', {
      body: {
        type: 'price_alert',
        recipients: rule.notification_emails,
        subject: `Alerta de Preço: ${alert.product_description}`,
        template: 'price_alert',
        data: {
          alert,
          rule
        }
      }
    });

    if (error) {
      throw new Error(`Notification service error: ${error.message}`);
    }

    // Create in-app notification
    await this.supabase
      .from('notifications')
      .insert({
        type: 'price_alert',
        title: `Alerta de Preço - ${alert.alert_type}`,
        message: alert.message,
        data: { alert_id: alert.id, severity: alert.severity }
      });
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const alertService = new PriceAlertService();
    const result = await alertService.runAlertAnalysis();
    
    return new Response(JSON.stringify({
      success: true,
      ...result
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