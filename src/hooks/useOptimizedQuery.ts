import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CacheConfig {
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
}

interface OptimizedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheConfig?: CacheConfig;
  dependencies?: any[];
}

// Default cache configurations for different data types
const CACHE_CONFIGS = {
  static: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 48 * 60 * 60 * 1000, // 48 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false
  },
  reference: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false
  },
  dynamic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true
  },
  realtime: {
    staleTime: 0,
    cacheTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true
  }
};

export function useOptimizedQuery<T>(options: OptimizedQueryOptions<T>) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    ...options.cacheConfig,
    enabled: options.dependencies ? options.dependencies.every(dep => dep !== undefined) : true
  });
}

// Specialized hooks for common queries
export function useStatesQuery() {
  return useOptimizedQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.static
  });
}

export function useCitiesQuery(stateId?: string) {
  return useOptimizedQuery({
    queryKey: ['cities', stateId],
    queryFn: async () => {
      let query = supabase
        .from('cities')
        .select('*')
        .order('name');
      
      if (stateId) {
        query = query.eq('state_id', stateId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.static,
    dependencies: stateId ? [stateId] : []
  });
}

export function useProductCategoriesQuery() {
  return useOptimizedQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.reference
  });
}

export function useMeasurementUnitsQuery() {
  return useOptimizedQuery({
    queryKey: ['measurement-units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurement_units')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.reference
  });
}

export function usePriceBasketsQuery(filters?: any) {
  return useOptimizedQuery({
    queryKey: ['price-baskets', filters],
    queryFn: async () => {
      let query = supabase
        .from('price_baskets')
        .select(`
          *,
          management_units!inner(name),
          basket_items(count)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.management_unit_id) {
        query = query.eq('management_unit_id', filters.management_unit_id);
      }
      
      if (filters?.is_finalized !== undefined) {
        query = query.eq('is_finalized', filters.is_finalized);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.dynamic,
    dependencies: [filters]
  });
}

export function useSuppliersQuery(filters?: any) {
  return useOptimizedQuery({
    queryKey: ['suppliers', filters],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select(`
          *,
          cities!inner(name, states!inner(name, code))
        `)
        .eq('is_active', true)
        .order('company_name');
      
      if (filters?.city_id) {
        query = query.eq('city_id', filters.city_id);
      }
      
      if (filters?.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,trade_name.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    cacheConfig: CACHE_CONFIGS.dynamic,
    dependencies: [filters]
  });
}

// Cache invalidation utilities
export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateStates = () => {
    queryClient.invalidateQueries({ queryKey: ['states'] });
  };

  const invalidateCities = (stateId?: string) => {
    if (stateId) {
      queryClient.invalidateQueries({ queryKey: ['cities', stateId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    }
  };

  const invalidateProductCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['product-categories'] });
  };

  const invalidatePriceBaskets = () => {
    queryClient.invalidateQueries({ queryKey: ['price-baskets'] });
  };

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  return {
    invalidateStates,
    invalidateCities,
    invalidateProductCategories,
    invalidatePriceBaskets,
    invalidateSuppliers,
    invalidateAll
  };
}

// Prefetch utilities for better UX
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchStates = () => {
    queryClient.prefetchQuery({
      queryKey: ['states'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('states')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return data;
      },
      ...CACHE_CONFIGS.static
    });
  };

  const prefetchProductCategories = () => {
    queryClient.prefetchQuery({
      queryKey: ['product-categories'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        return data;
      },
      ...CACHE_CONFIGS.reference
    });
  };

  const prefetchMeasurementUnits = () => {
    queryClient.prefetchQuery({
      queryKey: ['measurement-units'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('measurement_units')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        return data;
      },
      ...CACHE_CONFIGS.reference
    });
  };

  const prefetchCommonData = () => {
    prefetchStates();
    prefetchProductCategories();
    prefetchMeasurementUnits();
  };

  return {
    prefetchStates,
    prefetchProductCategories,
    prefetchMeasurementUnits,
    prefetchCommonData
  };
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const queryClient = useQueryClient();

  const getQueryStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      total_queries: queries.length,
      stale_queries: queries.filter(q => q.isStale()).length,
      loading_queries: queries.filter(q => q.isFetching()).length,
      error_queries: queries.filter(q => q.state.status === 'error').length,
      cache_size: JSON.stringify(cache).length
    };
  };

  const clearStaleQueries = () => {
    const cache = queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale());
    
    staleQueries.forEach(query => {
      queryClient.removeQueries({ queryKey: query.queryKey });
    });
    
    return staleQueries.length;
  };

  return {
    getQueryStats,
    clearStaleQueries
  };
}