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
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

const apiConfigSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  base_url: z.string().url("URL inválida"),
  api_key_encrypted: z.string().optional(),
  auth_type: z.enum(["bearer", "basic", "api_key", "none"]),
  headers: z.string().optional(),
  rate_limit_per_minute: z.number().min(1).max(1000),
  sync_frequency_minutes: z.number().min(5).max(1440),
  is_active: z.boolean()
})

type APIConfigData = z.infer<typeof apiConfigSchema>

interface APIConfigFormProps {
  config?: any
  onSuccess: () => void
  onCancel: () => void
}

export function APIConfigForm({ config, onSuccess, onCancel }: APIConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const form = useForm<APIConfigData>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      name: config?.name || "",
      description: config?.description || "",
      base_url: config?.base_url || "",
      api_key_encrypted: config?.api_key_encrypted || "",
      auth_type: config?.auth_type || "bearer",
      headers: config?.headers ? JSON.stringify(config.headers, null, 2) : "{}",
      rate_limit_per_minute: config?.rate_limit_per_minute || 60,
      sync_frequency_minutes: config?.sync_frequency_minutes || 60,
      is_active: config?.is_active ?? true
    }
  })

  const testConnection = async () => {
    setTestingConnection(true)
    
    try {
      const formData = form.getValues()
      
      // Simular teste de conexão
      const response = await fetch(formData.base_url, {
        method: 'HEAD',
        headers: {
          'Authorization': formData.auth_type !== 'none' && formData.api_key_encrypted 
            ? `${formData.auth_type} ${formData.api_key_encrypted}` 
            : undefined,
          ...JSON.parse(formData.headers || '{}')
        }
      })

      if (response.ok || response.status === 405) { // 405 = Method Not Allowed é aceitável para teste
        toast.success("Conexão testada com sucesso!")
      } else {
        toast.error(`Falha na conexão: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      toast.error("Erro ao testar conexão")
    } finally {
      setTestingConnection(false)
    }
  }

  const onSubmit = async (data: APIConfigData) => {
    setIsLoading(true)

    try {
      const payload = {
        ...data,
        headers: JSON.parse(data.headers || '{}')
      }

      // Usar client SQL direto até que os tipos sejam atualizados
      let result
      if (config?.id) {
        result = await supabase.rpc('exec_sql', {
          query: `UPDATE external_api_configs SET name = $1, description = $2, base_url = $3, auth_type = $4, is_active = $5 WHERE id = $6`,
          params: [data.name, data.description, data.base_url, data.auth_type, data.is_active, config.id]
        })
      } else {
        result = await supabase.rpc('exec_sql', {
          query: `INSERT INTO external_api_configs (name, description, base_url, auth_type, is_active) VALUES ($1, $2, $3, $4, $5)`,
          params: [data.name, data.description, data.base_url, data.auth_type, data.is_active]
        })
      }

      if (result.error) throw result.error

      toast.success(config?.id ? "API atualizada!" : "API criada!")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {config?.id ? "Editar API Externa" : "Nova API Externa"}
          {config?.is_active !== undefined && (
            <Badge variant={config.is_active ? "default" : "secondary"}>
              {config.is_active ? "Ativa" : "Inativa"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da API" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auth_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Autenticação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="none">Nenhuma</SelectItem>
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
                    <Textarea placeholder="Descrição da API" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="base_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Base</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("auth_type") !== "none" && (
              <FormField
                control={form.control}
                name="api_key_encrypted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave da API</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Chave de acesso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="headers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"Content-Type": "application/json"}'
                      className="h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate_limit_per_minute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite por Minuto</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sync_frequency_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência de Sync (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">API Ativa</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Ativar sincronização automática
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

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testingConnection || !form.watch("base_url")}
              >
                {testingConnection ? "Testando..." : "Testar Conexão"}
              </Button>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : config?.id ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}