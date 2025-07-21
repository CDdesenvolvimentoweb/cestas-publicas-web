import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, ShoppingBasket, TrendingUp, Users, Building2, FileText, Shield } from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: ShoppingBasket,
      title: "Cestas de Preços",
      description: "Crie e gerencie cestas de preços para licitações públicas com facilidade e transparência.",
      color: "text-blue-600"
    },
    {
      icon: Users,
      title: "Gestão de Fornecedores",
      description: "Cadastre e gerencie fornecedores, mantendo um banco de dados atualizado.",
      color: "text-green-600"
    },
    {
      icon: FileText,
      title: "Cotações Automáticas",
      description: "Envie cotações por e-mail e receba respostas através de interface pública.",
      color: "text-purple-600"
    },
    {
      icon: TrendingUp,
      title: "Análise de Preços",
      description: "Compare cotações e identifique as melhores ofertas automaticamente.",
      color: "text-orange-600"
    },
    {
      icon: Building2,
      title: "Multi-Unidades",
      description: "Gerencie múltiplas unidades gestoras com controle de acesso adequado.",
      color: "text-indigo-600"
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Sistema seguro com controle de acesso baseado em perfis e RLS.",
      color: "text-red-600"
    }
  ];

  const benefits = [
    "✅ Transparência nos processos de formação de preços",
    "✅ Redução de tempo na coleta de cotações",
    "✅ Análise comparativa automática",
    "✅ Histórico completo de preços",
    "✅ Conformidade com legislação",
    "✅ Interface intuitiva e moderna"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Sistema de Cestas de Preços</h1>
          </div>
          <Link to="/login">
            <Button>Acessar Sistema</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Formação de Preços para o Setor Público
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Plataforma completa para gestão de cestas de preços, cotações e análise comparativa 
            para municípios e órgãos públicos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="min-w-48">
                Começar Agora
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="min-w-48">
              Saiba Mais
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Sistema completo com todas as ferramentas necessárias para uma gestão eficiente de preços públicos.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Icon className={`h-12 w-12 ${feature.color} mb-4`} />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Por que escolher nosso sistema?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <p key={index} className="text-lg text-gray-700">
                    {benefit}
                  </p>
                ))}
              </div>
              <div className="mt-8">
                <Link to="/login">
                  <Button size="lg">
                    Experimentar Grátis
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Estatísticas do Sistema</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">150+</div>
                  <div className="text-sm text-gray-600">Municípios Atendidos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">2.5M+</div>
                  <div className="text-sm text-gray-600">Cotações Processadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">15%</div>
                  <div className="text-sm text-gray-600">Economia Média</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">98%</div>
                  <div className="text-sm text-gray-600">Satisfação</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para modernizar sua gestão de preços?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de municípios que já utilizam nossa plataforma para otimizar 
            seus processos de formação de preços.
          </p>
          <Link to="/login">
            <Button size="lg" variant="secondary" className="min-w-48">
              Começar Agora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Calculator className="h-6 w-6 text-white" />
            <span className="text-white font-semibold">Sistema de Cestas de Preços</span>
          </div>
          <p className="text-gray-400">
            © 2024 Sistema de Cestas de Preços. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
