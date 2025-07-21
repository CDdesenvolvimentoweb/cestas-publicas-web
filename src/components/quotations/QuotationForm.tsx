import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface QuotationFormProps {
  baskets: any[];
  suppliers: any[];
  onSuccess: () => void;
}

export const QuotationForm = ({ baskets, suppliers, onSuccess }: QuotationFormProps) => {
  const [selectedBasket, setSelectedBasket] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date>();
  const [loading, setLoading] = useState(false);

  const handleSupplierToggle = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBasket || selectedSuppliers.length === 0 || !dueDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use the new send_quotation_batch function
      const { data, error } = await supabase
        .rpc('send_quotation_batch', {
          basket_id_param: selectedBasket,
          supplier_ids: selectedSuppliers,
          due_date_param: dueDate.toISOString()
        });

      if (error) throw error;

      const result = data as {
        success_count: number;
        error_count: number;
        errors: string[];
        total_processed: number;
      };

      if (result.error_count > 0) {
        toast({
          title: "Atenção",
          description: `${result.success_count} cotações criadas, ${result.error_count} com erro`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: `${result.success_count} cotação(ões) criada(s) com sucesso`,
        });
      }
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cotações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="basket">Cesta de Preços *</Label>
        <Select value={selectedBasket} onValueChange={setSelectedBasket}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma cesta" />
          </SelectTrigger>
          <SelectContent>
            {baskets.map((basket) => (
              <SelectItem key={basket.id} value={basket.id}>
                {basket.name} - {format(new Date(basket.reference_date), "dd/MM/yyyy", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prazo de Resposta *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Fornecedores *</Label>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecione os fornecedores para enviar a cotação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center space-x-2">
                <Checkbox
                  id={supplier.id}
                  checked={selectedSuppliers.includes(supplier.id)}
                  onCheckedChange={() => handleSupplierToggle(supplier.id)}
                />
                <Label htmlFor={supplier.id} className="text-sm cursor-pointer">
                  <div>
                    <div className="font-medium">{supplier.company_name}</div>
                    <div className="text-muted-foreground">{supplier.email}</div>
                  </div>
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          {selectedSuppliers.length} fornecedor(es) selecionado(s)
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Criando..." : "Criar Cotações"}
        </Button>
      </div>
    </form>
  );
};