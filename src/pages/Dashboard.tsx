import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ShoppingBasket, TrendingUp, Users } from 'lucide-react';

export const Dashboard = () => {
  const { profile } = useAuth();

  const stats = [
    {
      title: 'Cestas Ativas',
      value: '12',
      description: 'Cestas em andamento',
      icon: ShoppingBasket,
      color: 'text-primary',
    },
    {
      title: 'Cotações Pendentes',
      value: '24',
      description: 'Aguardando resposta',
      icon: CalendarDays,
      color: 'text-orange-600',
    },
    {
      title: 'Fornecedores',
      value: '156',
      description: 'Cadastrados no sistema',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Economia Média',
      value: '18.5%',
      description: 'Comparado ao mês anterior',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema de formação de cestas de preços, {profile?.full_name}
        </p>
      </div>

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
              {profile?.management_units && (
                <p className="text-sm text-muted-foreground">
                  {profile.management_units.name} - {profile.management_units.cities.name}/{profile.management_units.cities.states.code}
                </p>
              )}
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
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
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>
              Últimas ações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Nova cesta criada: "Medicamentos Q1 2024"
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Há 2 horas
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Cotação respondida por Fornecedor XYZ
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Há 4 horas
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Relatório de preços gerado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ontem
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimentos</CardTitle>
            <CardDescription>
              Cotações que vencem em breve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cesta Material Escritório</p>
                  <p className="text-sm text-muted-foreground">15 fornecedores</p>
                </div>
                <Badge variant="destructive">2 dias</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cesta Material Limpeza</p>
                  <p className="text-sm text-muted-foreground">8 fornecedores</p>
                </div>
                <Badge variant="secondary">5 dias</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cesta Combustíveis</p>
                  <p className="text-sm text-muted-foreground">3 fornecedores</p>
                </div>
                <Badge variant="secondary">1 semana</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};