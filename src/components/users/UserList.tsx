import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  cpf?: string;
  phone?: string;
  role: 'admin' | 'servidor' | 'fornecedor';
  is_active: boolean;
  created_at: string;
  management_units?: {
    id: string;
    name: string;
  };
}

const roleLabels = {
  admin: 'Administrador',
  servidor: 'Servidor Público', 
  fornecedor: 'Fornecedor',
};

const roleBadgeVariants = {
  admin: 'destructive',
  servidor: 'default',
  fornecedor: 'secondary',
} as const;

export const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          cpf,
          phone,
          role,
          is_active,
          created_at,
          management_units (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingUsers(prev => new Set(prev).add(userId));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );

      toast.success(
        !currentStatus ? 'Usuário ativado com sucesso' : 'Usuário desativado com sucesso'
      );
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
      toast.error('Erro ao atualizar status do usuário');
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum usuário encontrado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Unidade Gestora</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell>
                <Badge variant={roleBadgeVariants[user.role]}>
                  {roleLabels[user.role]}
                </Badge>
              </TableCell>
              <TableCell>
                {user.management_units?.name || '-'}
              </TableCell>
              <TableCell>{user.cpf || '-'}</TableCell>
              <TableCell>{user.phone || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                    disabled={updatingUsers.has(user.id)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  {updatingUsers.has(user.id) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};