import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAuditResult {
  rls_enabled: boolean;
  policies_count: number;
  table_name: string;
  is_secure: boolean;
}

export const useSecurityAudit = () => {
  return useQuery({
    queryKey: ['security-audit'],
    queryFn: async (): Promise<SecurityAuditResult[]> => {
      const { data, error } = await supabase.rpc('audit_table_security');
      
      if (error) {
        console.error('Security audit error:', error);
        throw error;
      }
      
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  });
};

export const useSecurityStatus = () => {
  const { data: auditResults, isLoading } = useSecurityAudit();
  
  const securityStatus = {
    totalTables: auditResults?.length || 0,
    secureTables: auditResults?.filter(r => r.is_secure).length || 0,
    vulnerableTables: auditResults?.filter(r => !r.is_secure).length || 0,
    securityScore: auditResults?.length 
      ? Math.round((auditResults.filter(r => r.is_secure).length / auditResults.length) * 100)
      : 0
  };
  
  return {
    ...securityStatus,
    isLoading,
    auditResults
  };
};