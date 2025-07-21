import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Move, AlertCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

const workflowSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  trigger_type: z.enum(["basket_created", "quote_received", "deadline_approaching"]),
  trigger_conditions: z.object({}).passthrough(),
  actions: z.array(z.object({}).passthrough()),
  is_active: z.boolean()
})

type WorkflowData = z.infer<typeof workflowSchema>

interface WorkflowBuilderProps {
  workflow?: any
  onSuccess: () => void
  onCancel: () => void
}

export function WorkflowBuilder({ workflow, onSuccess, onCancel }: WorkflowBuilderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [actions, setActions] = useState(workflow?.actions || [])

  const form = useForm<WorkflowData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: workflow?.name || "",
      description: workflow?.description || "",
      trigger_type: workflow?.trigger_type || "basket_created",
      trigger_conditions: workflow?.trigger_conditions || {},
      actions: workflow?.actions || [],
      is_active: workflow?.is_active ?? true
    }
  })

  const addAction = () => {
    const newAction = {
      id: `action_${Date.now()}`,
      type: "send_notification",
      config: {
        title: "",
        message: "",
        target_users: []
      }
    }
    setActions([...actions, newAction])
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, field: string, value: any) => {
    const updatedActions = [...actions]
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      updatedActions[index] = {
        ...updatedActions[index],
        [parent]: {
          ...updatedActions[index][parent],
          [child]: value
        }
      }
    } else {
      updatedActions[index] = {
        ...updatedActions[index],
        [field]: value
      }
    }
    setActions(updatedActions)
  }

  const onSubmit = async (data: WorkflowData) => {
    setIsLoading(true)

    try {
      const payload = {
        ...data,
        actions,
        created_by: workflow?.created_by || undefined
      }

      let result
      if (workflow?.id) {
        result = await supabase
          .from('workflows')
          .update(payload)
          .eq('id', workflow.id)
      } else {
        result = await supabase
          .from('workflows')
          .insert([payload])
      }

      if (result.error) throw result.error

      toast.success(workflow?.id ? "Workflow atualizado!" : "Workflow criado!")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const renderActionForm = (action: any, index: number) => {
    switch (action.type) {
      case "send_notification":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={action.config?.title || ""}
                onChange={(e) => updateAction(index, "config.title", e.target.value)}
                placeholder="Título da notificação"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                value={action.config?.message || ""}
                onChange={(e) => updateAction(index, "config.message", e.target.value)}
                placeholder="Conteúdo da notificação"
              />
            </div>
          </div>
        )

      case "send_email":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Destinatários</label>
              <Input
                value={action.config?.recipients || ""}
                onChange={(e) => updateAction(index, "config.recipients", e.target.value)}
                placeholder="emails@exemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assunto</label>
              <Input
                value={action.config?.subject || ""}
                onChange={(e) => updateAction(index, "config.subject", e.target.value)}
                placeholder="Assunto do email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Corpo</label>
              <Textarea
                value={action.config?.body || ""}
                onChange={(e) => updateAction(index, "config.body", e.target.value)}
                placeholder="Conteúdo do email"
              />
            </div>
          </div>
        )

      case "update_status":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tabela</label>
              <Select
                value={action.config?.table || ""}
                onValueChange={(value) => updateAction(index, "config.table", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_baskets">Cestas de Preços</SelectItem>
                  <SelectItem value="supplier_quotes">Cotações</SelectItem>
                  <SelectItem value="product_requests">Solicitações de Produtos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Campo Status</label>
                <Input
                  value={action.config?.status_field || ""}
                  onChange={(e) => updateAction(index, "config.status_field", e.target.value)}
                  placeholder="status"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Novo Valor</label>
                <Input
                  value={action.config?.status_value || ""}
                  onChange={(e) => updateAction(index, "config.status_value", e.target.value)}
                  placeholder="aprovado"
                />
              </div>
            </div>
          </div>
        )

      case "trigger_webhook":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={action.config?.url || ""}
                onChange={(e) => updateAction(index, "config.url", e.target.value)}
                placeholder="https://webhook.exemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Método</label>
              <Select
                value={action.config?.method || "POST"}
                onValueChange={(value) => updateAction(index, "config.method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-2" />
            Tipo de ação não configurado
          </div>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {workflow?.id ? "Editar Workflow" : "Novo Workflow"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do workflow" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trigger_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Trigger</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o trigger" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basket_created">Cesta Criada</SelectItem>
                        <SelectItem value="quote_received">Cotação Recebida</SelectItem>
                        <SelectItem value="deadline_approaching">Prazo se Aproximando</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Textarea placeholder="Descrição do workflow" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Ações</h3>
                <Button type="button" onClick={addAction} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Ação
                </Button>
              </div>

              <div className="space-y-4">
                {actions.map((action, index) => (
                  <Card key={action.id || index} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Move className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">Ação {index + 1}</Badge>
                          <Select
                            value={action.type}
                            onValueChange={(value) => updateAction(index, "type", value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="send_notification">Enviar Notificação</SelectItem>
                              <SelectItem value="send_email">Enviar Email</SelectItem>
                              <SelectItem value="update_status">Atualizar Status</SelectItem>
                              <SelectItem value="trigger_webhook">Chamar Webhook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAction(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {renderActionForm(action, index)}
                    </CardContent>
                  </Card>
                ))}

                {actions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma ação configurada. Clique em "Adicionar Ação" para começar.
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Workflow Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Ativar execução automática do workflow
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : workflow?.id ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}