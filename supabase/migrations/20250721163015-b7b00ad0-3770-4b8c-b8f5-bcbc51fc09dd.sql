-- Create table for supplier quote tokens
CREATE TABLE public.supplier_quote_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_quote_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for token access (public access with valid token)
CREATE POLICY "Anyone can access with valid token" 
ON public.supplier_quote_tokens 
FOR SELECT 
USING (expires_at > now() AND NOT is_used);

-- Add missing policies for quote_items
CREATE POLICY "Suppliers can manage own quote items" 
ON public.quote_items 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM supplier_quotes sq 
    JOIN suppliers s ON s.id = sq.supplier_id 
    WHERE sq.id = quote_items.quote_id AND s.user_id = auth.uid()
));

CREATE POLICY "Users can view quote items from their unit" 
ON public.quote_items 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM supplier_quotes sq 
    JOIN price_baskets pb ON pb.id = sq.basket_id 
    WHERE sq.id = quote_items.quote_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
));

-- Add policies for supplier_quotes management
CREATE POLICY "Users can create quotes for their unit baskets" 
ON public.supplier_quotes 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = basket_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
));

CREATE POLICY "Users can update quotes from their unit" 
ON public.supplier_quotes 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM price_baskets pb 
    WHERE pb.id = basket_id 
    AND (pb.management_unit_id = get_current_user_management_unit() OR get_current_user_role() = 'admin')
));

CREATE POLICY "Suppliers can update own quotes" 
ON public.supplier_quotes 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM suppliers s 
    WHERE s.id = supplier_id AND s.user_id = auth.uid()
));

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_quote_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'base64');
    -- Remove potentially problematic characters for URLs
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    RETURN token;
END;
$$;

-- Function to create quote tokens
CREATE OR REPLACE FUNCTION public.create_quote_token(quote_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_token TEXT;
BEGIN
    new_token := generate_quote_token();
    
    INSERT INTO supplier_quote_tokens (quote_id, token, expires_at)
    VALUES (quote_uuid, new_token, now() + interval '30 days');
    
    RETURN new_token;
END;
$$;