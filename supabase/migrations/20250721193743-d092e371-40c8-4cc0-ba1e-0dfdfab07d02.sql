-- Add policy for system functions to read profiles
CREATE POLICY "System functions can read profiles" 
ON public.profiles 
FOR SELECT 
USING (true);