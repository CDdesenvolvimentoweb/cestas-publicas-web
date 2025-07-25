/**
 * Utilitários para lidar com CORS em Edge Functions
 * 
 * Este arquivo contém funções para ajudar a lidar com CORS (Cross-Origin Resource Sharing)
 * em Edge Functions do Supabase, permitindo definir políticas consistentes.
 */

// Headers padrão para CORS
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Em produção, use seu domínio específico
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-length, accept',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 horas de cache para preflight
};

/**
 * Verifica se uma requisição é OPTIONS (preflight) e retorna uma resposta apropriada
 * @param req A requisição a ser verificada
 * @returns Resposta para OPTIONS se for preflight, null caso contrário
 */
export function handleCorsPreflightRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo a requisição OPTIONS (CORS preflight)');
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }
  
  return null;
}

/**
 * Adiciona headers CORS a qualquer resposta existente
 * @param response A resposta original
 * @returns Uma nova resposta com os headers CORS adicionados
 */
export function addCorsHeaders(response: Response): Response {
  const responseHeaders = new Headers(response.headers);
  
  // Adiciona cada header CORS à resposta
  Object.entries(corsHeaders).forEach(([key, value]) => {
    responseHeaders.set(key, value);
  });
  
  // Retorna uma nova resposta com os mesmos status, body, mas com headers atualizados
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

/**
 * Cria uma resposta JSON com headers CORS
 * @param data Os dados a serem serializados como JSON
 * @param status O código de status HTTP (padrão: 200)
 * @returns Uma resposta com o JSON e headers CORS
 */
export function createCorsResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    status
  });
}
