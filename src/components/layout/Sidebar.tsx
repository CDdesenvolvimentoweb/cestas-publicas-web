import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Calculator,
  ShoppingBasket,
  Package,
  Building2,
  Users,
  FileText,
  Settings,
  BarChart3,
  Database,
  TrendingUp,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    roles: ['admin', 'servidor', 'fornecedor'],
  },
  {
    title: 'Cestas de Preços',
    href: '/baskets',
    icon: ShoppingBasket,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Produtos',
    href: '/products',
    icon: Package,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Fornecedores',
    href: '/suppliers',
    icon: Building2,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Cotações',
    href: '/quotes',
    icon: FileText,
    roles: ['admin', 'servidor', 'fornecedor'],
  },
  {
    title: 'Preços de Mercado',
    href: '/market-prices',
    icon: TrendingUp,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Usuários',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Unidades Gestoras',
    href: '/management-units',
    icon: Building2,
    roles: ['admin'],
  },
  {
    title: 'Relatórios',
    href: '/reports',
    icon: FileText,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Dados Externos',
    href: '/external-data',
    icon: Database,
    roles: ['admin'],
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'servidor'],
  },
];

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const location = useLocation();
  const { profile } = useAuth();

  const filteredItems = navigationItems.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-10",
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Calculator className="h-8 w-8 text-sidebar-primary" />
          <h2 className="text-xl font-bold text-sidebar-foreground">
            Cestas Preços
          </h2>
        </div>
        
        <nav className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};