import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  product_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  product_code: z.string().optional(),
  anvisa_code: z.string().optional(),
  description: z.string().optional(),
  specification: z.string().optional(),
  category_id: z.string().min(1, "Categoria é obrigatória"),
  measurement_unit_id: z.string().min(1, "Unidade de medida é obrigatória"),
  justification: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres"),
});

interface ProductCategory {
  id: string;
  name: string;
}

interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string;
}

interface DuplicateProduct {
  id: string;
  name: string;
  code?: string;
  anvisa_code?: string;
  match_type: 'name' | 'code' | 'anvisa_code' | 'partial';
}

interface ProductRequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
  onCheckDuplicates: (name: string, code?: string, anvisaCode?: string) => Promise<boolean>;
  duplicates: DuplicateProduct[];
}

export function ProductRequestForm({ onClose, onSuccess, onCheckDuplicates, duplicates }: ProductRequestFormProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [measurementUnits, setMeasurementUnits] = useState<MeasurementUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      product_code: "",
      anvisa_code: "",
      description: "",
      specification: "",
      category_id: "",
      measurement_unit_id: "",
      justification: "",
    },
  });

  useEffect(() => {
    fetchCategories();
    fetchMeasurementUnits();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMeasurementUnits = async () => {
    try {
      const { data, error } = await supabase
        .from("measurement_units")
        .select("id, name, symbol")
        .order("name");

      if (error) throw error;
      setMeasurementUnits(data || []);
    } catch (error) {
      console.error("Error fetching measurement units:", error);
    }
  };

  const handleCheckDuplicates = async () => {
    const values = form.getValues();
    if (values.product_name) {
      const foundDuplicates = await onCheckDuplicates(
        values.product_name,
        values.product_code || undefined,
        values.anvisa_code || undefined
      );
      setHasDuplicates(foundDuplicates);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      // Get current user's management unit
      const { data: profile } = await supabase
        .from("profiles")
        .select("management_unit_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.management_unit_id) {
        throw new Error("Unidade gestora não encontrada");
      }

      const { error } = await supabase.from("product_requests").insert({
        product_name: values.product_name,
        product_code: values.product_code || null,
        anvisa_code: values.anvisa_code || null,
        description: values.description || null,
        specification: values.specification || null,
        category_id: values.category_id || null,
        measurement_unit_id: values.measurement_unit_id || null,
        justification: values.justification,
        requester_id: (await supabase.auth.getUser()).data.user?.id,
        management_unit_id: profile.management_unit_id,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de produto enviada com sucesso",
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating product request:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação de produto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Novo Produto</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome do produto"
                      {...field}
                      onBlur={() => {
                        field.onBlur();
                        handleCheckDuplicates();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Produto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Código interno"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleCheckDuplicates();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anvisa_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código ANVISA</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Código ANVISA"
                        {...field}
                        onBlur={() => {
                          field.onBlur();
                          handleCheckDuplicates();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do produto"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especificação Técnica</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Especificações técnicas detalhadas"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurement_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {measurementUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Por que este produto deve ser adicionado ao catálogo?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {duplicates.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Produtos similares encontrados:</p>
                    {duplicates.map((dup) => (
                      <div key={dup.id} className="text-sm">
                        <strong>{dup.name}</strong>
                        {dup.code && <span> - Código: {dup.code}</span>}
                        {dup.anvisa_code && <span> - ANVISA: {dup.anvisa_code}</span>}
                        <Badge variant="outline" className="ml-2">
                          {dup.match_type === 'name' && 'Nome igual'}
                          {dup.match_type === 'code' && 'Código igual'}
                          {dup.match_type === 'anvisa_code' && 'Código ANVISA igual'}
                          {dup.match_type === 'partial' && 'Nome similar'}
                        </Badge>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      Verifique se o produto que você está solicitando já não existe no catálogo.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}