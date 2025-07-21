import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Sidebar } from './Sidebar';
import { Menu, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />
        
        {/* Main Content */}
        <div className={cn("flex-1 transition-all duration-300", sidebarOpen ? "ml-64" : "ml-0")}>
          {/* Header */}
          <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                Sistema de Cestas de Preços
              </h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={profile?.full_name} />
                    <AvatarFallback>
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="flex flex-col items-start">
                  <div className="text-sm font-medium">{profile?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {profile?.role === 'admin' && 'Administrador'}
                    {profile?.role === 'servidor' && 'Servidor Público'}
                    {profile?.role === 'fornecedor' && 'Fornecedor'}
                  </div>
                  {profile?.management_units && (
                    <div className="text-xs text-muted-foreground">
                      {profile.management_units.name}
                    </div>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          
          {/* Page Content */}
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};