import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ManagementUnitStats } from '@/components/management-units/ManagementUnitStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, BarChart3, Users, ShoppingBasket } from 'lucide-react';

interface ManagementUnit {
  id: string;
  name: string;
  is_active: boolean;
  cities?: {
    name: string;
    states: {
      name: string;
      code: string;
    };
  };
}

export const UnitDashboard = () => {
  const { profile } = useAuth();
  const [userUnit, setUserUnit] = useState<ManagementUnit | null>(null);
  const [allUnits, setAllUnits] = useState<ManagementUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      if (profile?.role === 'admin') {
        // Admin vê todas as unidades
        const { data, error } = await supabase
          .from('management_units')
          .select(`
            id,
            name,
            is_active,
            cities (
              name,
              states (
                name,
                code
              )
            )
          `)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setAllUnits(data || []);
      } else if (profile?.management_unit_id) {
        // Usuário comum vê apenas sua unidade
        const { data, error } = await supabase
          .from('management_units')
          .select(`
            id,
            name,
            is_active,
            cities (
              name,
              states (
                name,
                code
              )
            )
          `)
          .eq('id', profile.management_unit_id)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setUserUnit(data);
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (profile?.role === 'admin') {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard das Unidades
            </h1>
            <p className="text-muted-foreground">
              Visão geral de todas as unidades gestoras
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allUnits.map((unit) => (
            <ManagementUnitStats
              key={unit.id}
              unitId={unit.id}
              unitName={unit.name}
            />
          ))}
        </div>

        {allUnits.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma unidade ativa encontrada
              </h3>
              <p className="text-muted-foreground">
                Crie unidades gestoras para começar a usar o sistema.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (userUnit) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {userUnit.name}
            </h1>
            <p className="text-muted-foreground">
              {userUnit.cities?.name}, {userUnit.cities?.states.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ManagementUnitStats
            unitId={userUnit.id}
            unitName={userUnit.name}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Acesse rapidamente as principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <ShoppingBasket className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Nova Cesta de Preços</p>
                      <p className="text-sm text-muted-foreground">
                        Criar uma nova pesquisa de preços
                      </p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Relatórios</p>
                      <p className="text-sm text-muted-foreground">
                        Visualizar relatórios e estatísticas
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unidade não encontrada
          </h3>
          <p className="text-muted-foreground">
            Você não está vinculado a nenhuma unidade gestora ativa.
            Entre em contato com o administrador do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};