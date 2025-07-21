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
  Download,
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
    href: '/app/baskets',
    icon: ShoppingBasket,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Produtos',
    href: '/app/products',
    icon: Package,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Categorias',
    href: '/app/product-categories',
    icon: Database,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Fornecedores',
    href: '/app/suppliers',
    icon: Building2,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Cotações',
    href: '/app/quotations',
    icon: FileText,
    roles: ['admin', 'servidor', 'fornecedor'],
  },
  {
    title: 'Relatórios',
    href: '/app/reports',
    icon: Download,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Unidades Gestoras',
    href: '/app/management-units',
    icon: Building2,
    roles: ['admin'],
  },
  {
    title: 'Gestão de Usuários',
    href: '/app/user-management',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Dashboard Unidades',
    href: '/app/unit-dashboard',
    icon: TrendingUp,
    roles: ['admin', 'servidor'],
  },
  {
    title: 'Integrações',
    href: '/app/integrations',
    icon: Settings,
    roles: ['admin'],
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
      "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-10",
      isOpen ? "w-64" : "w-0 overflow-hidden"
    )}>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Calculator className="h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
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
                    "w-full justify-start text-foreground hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground"
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