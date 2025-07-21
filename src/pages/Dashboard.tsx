import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, ShoppingBasket, TrendingUp, Users, FileText, AlertCircle, Eye, BarChart3, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export const Dashboard = () => {
  const { profile, user, loading } = useAuth();
  const [stats, setStats] = useState({
    basketsCount: 0,
    quotationsCount: 0,
    suppliersCount: 0,
    productsCount: 0,
  });
  const [recentBaskets, setRecentBaskets] = useState([]);
  const [pendingQuotations, setPendingQuotations] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Debug info
  console.log('🎯 Dashboard render - User:', user?.id, 'Profile:', profile, 'Loading:', loading);

  useEffect(() => {
    // Teste de conexão com Supabase
    const testSupabaseConnection = async () => {
      console.log('🧪 Testando conexão com Supabase...');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .limit(1);
        
        console.log('🧪 Teste de conexão - Data:', data, 'Error:', error);
      } catch (err) {
        console.error('🧪 Erro no teste de conexão:', err);
      }
    };
    
    testSupabaseConnection();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);

      // Fetch stats
      const [basketsResult, quotationsResult, suppliersResult, productsResult] = await Promise.all([
        supabase.from('price_baskets').select('id', { count: 'exact', head: true }),
        supabase.from('supplier_quotes').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        basketsCount: basketsResult.count || 0,
        quotationsCount: quotationsResult.count || 0,
        suppliersCount: suppliersResult.count || 0,
        productsCount: productsResult.count || 0,
      });

      // Fetch recent baskets
      const { data: baskets } = await supabase
        .from('price_baskets')
        .select('id, name, reference_date, is_finalized, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentBaskets(baskets || []);

      // Fetch pending quotations
      const { data: quotations } = await supabase
        .from('supplier_quotes')
        .select(`
          id, 
          due_date, 
          status,
          basket:price_baskets(name),
          supplier:suppliers(company_name)
        `)
        .eq('status', 'pendente')
        .order('due_date', { ascending: true })
        .limit(5);

      setPendingQuotations(quotations || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const dashboardStats = [
    {
      title: 'Cestas de Preços',
      value: stats.basketsCount.toString(),
      description: 'Total de cestas criadas',
      icon: ShoppingBasket,
      color: 'text-blue-600',
      href: '/baskets'
    },
    {
      title: 'Cotações',
      value: stats.quotationsCount.toString(),
      description: 'Total de cotações enviadas',
      icon: FileText,
      color: 'text-green-600',
      href: '/quotations'
    },
    {
      title: 'Fornecedores',
      value: stats.suppliersCount.toString(),
      description: 'Cadastrados no sistema',
      icon: Users,
      color: 'text-purple-600',
      href: '/suppliers'
    },
    {
      title: 'Produtos',
      value: stats.productsCount.toString(),
      description: 'Produtos catalogados',
      icon: TrendingUp,
      color: 'text-orange-600',
      href: '/products'
    },
  ];

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBadgeVariant = (days: number) => {
    if (days < 0) return 'destructive';
    if (days <= 2) return 'destructive';
    if (days <= 7) return 'secondary';
    return 'default';
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema de formação de cestas de preços, {profile?.full_name || 'Usuário'}
        </p>
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <strong>Debug:</strong> User ID: {user?.id} | Profile: {profile ? `${profile.full_name} (${profile.role})` : 'null'} | Loading: {loading ? 'yes' : 'no'}
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.phone}</p>
                </div>
                <Badge variant="secondary">
                  {profile?.role === 'admin' && 'Administrador'}
                  {profile?.role === 'servidor' && 'Servidor Público'}
                  {profile?.role === 'fornecedor' && 'Fornecedor'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link key={stat.title} to={stat.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Recent Activity & Quick Actions Grid */}
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cestas Recentes</CardTitle>
                      <CardDescription>Últimas cestas criadas</CardDescription>
                    </div>
                    <Link to="/baskets">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Todas
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentBaskets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma cesta encontrada
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {recentBaskets.map((basket) => (
                        <div key={basket.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium leading-none">{basket.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(basket.reference_date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant={basket.is_finalized ? "default" : "secondary"}>
                            {basket.is_finalized ? "Finalizada" : "Em andamento"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cotações Pendentes</CardTitle>
                      <CardDescription>Cotações que vencem em breve</CardDescription>
                    </div>
                    <Link to="/quotations">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Todas
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {pendingQuotations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma cotação pendente
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingQuotations.map((quotation) => {
                        const daysUntilDue = getDaysUntilDue(quotation.due_date);
                        return (
                          <div key={quotation.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{quotation.basket?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {quotation.supplier?.company_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {daysUntilDue < 0 && <AlertCircle className="h-4 w-4 text-red-500" />}
                              <Badge variant={getBadgeVariant(daysUntilDue)}>
                                {daysUntilDue < 0 
                                  ? `${Math.abs(daysUntilDue)} dias atraso`
                                  : daysUntilDue === 0 
                                    ? "Hoje" 
                                    : `${daysUntilDue} dias`
                                }
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Link to="/baskets">
                    <Button variant="outline">
                      <ShoppingBasket className="h-4 w-4 mr-2" />
                      Nova Cesta de Preços
                    </Button>
                  </Link>
                  <Link to="/quotations">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Enviar Cotação
                    </Button>
                  </Link>
                  <Link to="/suppliers">
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Cadastrar Fornecedor
                    </Button>
                  </Link>
                  <Link to="/products">
                    <Button variant="outline">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Cadastrar Produto
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};