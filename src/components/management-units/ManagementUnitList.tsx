import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { ManagementUnitForm } from '@/components/management-units/ManagementUnitForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ManagementUnit {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  cities?: {
    id: string;
    name: string;
    states: {
      id: string;
      name: string;
      code: string;
    };
  };
  _count?: {
    profiles: number;
  };
}

export const ManagementUnitList = () => {
  const [units, setUnits] = useState<ManagementUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUnits, setUpdatingUnits] = useState<Set<string>>(new Set());
  const [editingUnit, setEditingUnit] = useState<ManagementUnit | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState<ManagementUnit | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('management_units')
        .select(`
          id,
          name,
          cnpj,
          address,
          phone,
          email,
          is_active,
          created_at,
          cities (
            id,
            name,
            states (
              id,
              name,
              code
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar contagem de usuários para cada unidade
      const unitsWithCount = await Promise.all(
        (data || []).map(async (unit) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('management_unit_id', unit.id)
            .eq('is_active', true);

          return {
            ...unit,
            _count: { profiles: count || 0 }
          };
        })
      );

      setUnits(unitsWithCount);
    } catch (error) {
      console.error('Erro ao carregar unidades gestoras:', error);
      toast.error('Erro ao carregar unidades gestoras');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnitStatus = async (unitId: string, currentStatus: boolean) => {
    setUpdatingUnits(prev => new Set(prev).add(unitId));
    
    try {
      const { error } = await supabase
        .from('management_units')
        .update({ is_active: !currentStatus })
        .eq('id', unitId);

      if (error) throw error;

      setUnits(prev =>
        prev.map(unit =>
          unit.id === unitId
            ? { ...unit, is_active: !currentStatus }
            : unit
        )
      );

      toast.success(
        !currentStatus ? 'Unidade ativada com sucesso' : 'Unidade desativada com sucesso'
      );
    } catch (error) {
      console.error('Erro ao atualizar status da unidade:', error);
      toast.error('Erro ao atualizar status da unidade');
    } finally {
      setUpdatingUnits(prev => {
        const newSet = new Set(prev);
        newSet.delete(unitId);
        return newSet;
      });
    }
  };

  const handleEdit = (unit: ManagementUnit) => {
    setEditingUnit(unit);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingUnit(null);
    fetchUnits();
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;

    try {
      // Verificar se há usuários vinculados à unidade
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('management_unit_id', deletingUnit.id);

      if (count && count > 0) {
        toast.error('Não é possível excluir uma unidade que possui usuários vinculados');
        setDeletingUnit(null);
        return;
      }

      const { error } = await supabase
        .from('management_units')
        .delete()
        .eq('id', deletingUnit.id);

      if (error) throw error;

      setUnits(prev => prev.filter(unit => unit.id !== deletingUnit.id));
      toast.success('Unidade gestora excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      toast.error('Erro ao excluir unidade gestora');
    } finally {
      setDeletingUnit(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma unidade gestora encontrada
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{unit.name}</div>
                    {unit.address && (
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {unit.address}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {unit.cities ? (
                    <div className="text-sm">
                      <div>{unit.cities.name}</div>
                      <div className="text-muted-foreground">
                        {unit.cities.states.name} ({unit.cities.states.code})
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {unit.phone && (
                      <div className="text-sm flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {unit.phone}
                      </div>
                    )}
                    {unit.email && (
                      <div className="text-sm flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {unit.email}
                      </div>
                    )}
                    {!unit.phone && !unit.email && '-'}
                  </div>
                </TableCell>
                <TableCell>{unit.cnpj || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {unit._count?.profiles || 0} usuários
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={unit.is_active}
                      onCheckedChange={() => toggleUnitStatus(unit.id, unit.is_active)}
                      disabled={updatingUnits.has(unit.id)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {unit.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                    {updatingUnits.has(unit.id) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(unit)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingUnit(unit)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Edição */}
      {editingUnit && (
        <ManagementUnitForm
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSuccess={handleEditSuccess}
          unit={editingUnit}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingUnit} onOpenChange={() => setDeletingUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade gestora "{deletingUnit?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};