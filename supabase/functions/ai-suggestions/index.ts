import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, entity_type, entity_id, context } = await req.json()

    let suggestion = null
    let confidenceScore = 0.5

    switch (type) {
      case 'supplier_recommendation':
        suggestion = await generateSupplierRecommendation(supabaseClient, entity_id, context)
        break
        
      case 'price_alert':
        suggestion = await generatePriceAlert(supabaseClient, entity_id, context)
        break
        
      case 'optimization':
        suggestion = await generateOptimizationSuggestion(supabaseClient, entity_id, context)
        break
        
      default:
        throw new Error(`Tipo de sugestão não suportado: ${type}`)
    }

    if (suggestion) {
      // Criar sugestão no banco
      const { data: createdSuggestion, error } = await supabaseClient
        .rpc('create_ai_suggestion', {
          type_param: type,
          entity_type_param: entity_type,
          entity_id_param: entity_id,
          suggestion_data_param: suggestion,
          confidence_score_param: confidenceScore
        })

      if (error) {
        throw new Error(`Erro ao criar sugestão: ${error.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          suggestion_id: createdSuggestion,
          suggestion_data: suggestion,
          confidence_score: confidenceScore
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Nenhuma sugestão gerada'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function generateSupplierRecommendation(supabaseClient: any, basketId: string, context: any) {
  // Buscar dados da cesta
  const { data: basket, error: basketError } = await supabaseClient
    .from('price_baskets')
    .select(`
      *,
      basket_items (
        *,
        products (*)
      )
    `)
    .eq('id', basketId)
    .single()

  if (basketError) return null

  // Analisar fornecedores com base no histórico
  const suggestions = []
  
  for (const item of basket.basket_items) {
    const { data: supplierStats } = await supabaseClient
      .rpc('get_supplier_suggestions', {
        product_id_param: item.product_id,
        management_unit_id_param: basket.management_unit_id
      })

    if (supplierStats && supplierStats.length > 0) {
      suggestions.push({
        product_id: item.product_id,
        product_name: item.products.name,
        recommended_suppliers: supplierStats.slice(0, 3).map((s: any) => ({
          supplier_id: s.supplier_id,
          supplier_name: s.supplier_name,
          confidence_score: s.confidence_score,
          avg_price: s.avg_price,
          response_rate: s.response_rate
        }))
      })
    }
  }

  return {
    basket_id: basketId,
    recommendations: suggestions,
    generated_at: new Date().toISOString(),
    reasoning: 'Baseado no histórico de cotações e performance dos fornecedores'
  }
}

async function generatePriceAlert(supabaseClient: any, productId: string, context: any) {
  // Analisar tendências de preço
  const { data: priceData } = await supabaseClient
    .rpc('analyze_price_trends', {
      product_id_param: productId,
      days_back: 90
    })

  if (!priceData || priceData.length === 0) return null

  const product = priceData[0]
  const priceVariance = parseFloat(product.price_variance)
  const trend = product.trend_direction

  // Gerar alerta se houver alta variabilidade ou tendência preocupante
  if (priceVariance > 50 || trend === 'increasing') {
    return {
      product_id: productId,
      product_name: product.product_name,
      alert_type: priceVariance > 50 ? 'high_variance' : 'price_increase',
      current_avg_price: parseFloat(product.avg_price),
      price_variance: priceVariance,
      trend_direction: trend,
      recommendation: priceVariance > 50 
        ? 'Considere aumentar o número de fornecedores cotados para este produto'
        : 'Monitore preços mais de perto - tendência de alta detectada',
      generated_at: new Date().toISOString()
    }
  }

  return null
}

async function generateOptimizationSuggestion(supabaseClient: any, basketId: string, context: any) {
  // Analisar oportunidades de otimização na cesta
  const { data: basketStats } = await supabaseClient
    .rpc('calculate_basket_statistics', {
      basket_id_param: basketId
    })

  if (!basketStats) return null

  const suggestions = []

  // Sugerir consolidação de fornecedores
  if (basketStats.unique_suppliers > 10) {
    suggestions.push({
      type: 'consolidate_suppliers',
      message: `Considere consolidar fornecedores (${basketStats.unique_suppliers} diferentes). Isso pode reduzir custos logísticos.`,
      potential_savings: 'Alto'
    })
  }

  // Sugerir produtos populares não incluídos
  const { data: popularProducts } = await supabaseClient
    .rpc('get_popular_basket_products', {
      limit_param: 5
    })

  if (popularProducts && popularProducts.length > 0) {
    suggestions.push({
      type: 'add_popular_products',
      message: 'Produtos frequentemente cotados que não estão nesta cesta',
      suggested_products: popularProducts.map((p: any) => ({
        product_name: p.product_name,
        usage_count: p.usage_count,
        avg_quantity: parseFloat(p.avg_quantity)
      }))
    })
  }

  return suggestions.length > 0 ? {
    basket_id: basketId,
    optimization_suggestions: suggestions,
    generated_at: new Date().toISOString()
  } : null
}