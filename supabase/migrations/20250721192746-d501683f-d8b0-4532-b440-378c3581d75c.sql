-- Criar políticas RLS para permitir que admins gerenciem unidades gestoras
CREATE POLICY "Admins can insert management units" ON public.management_units 
FOR INSERT 
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update management units" ON public.management_units 
FOR UPDATE 
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete management units" ON public.management_units 
FOR DELETE 
TO authenticated
USING (get_current_user_role() = 'admin');