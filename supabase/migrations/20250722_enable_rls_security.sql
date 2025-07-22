-- Enable RLS on all public tables that need it
-- Migration: Enable RLS Security

-- Enable RLS on reference tables
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE monetary_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for reference tables (public read access)
CREATE POLICY "Allow public read access to states" ON states
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to states" ON states
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow public read access to cities" ON cities
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to cities" ON cities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow public read access to regions" ON regions
    FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to regions" ON regions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Products policies (read for authenticated users, write for admin)
CREATE POLICY "Allow authenticated read access to products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access to products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Price sources policies
CREATE POLICY "Allow authenticated read access to price_sources" ON price_sources
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access to price_sources" ON price_sources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Monetary indexes policies
CREATE POLICY "Allow authenticated read access to monetary_indexes" ON monetary_indexes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access to monetary_indexes" ON monetary_indexes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Index values policies
CREATE POLICY "Allow authenticated read access to index_values" ON index_values
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access to index_values" ON index_values
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- External APIs policies (admin only)
CREATE POLICY "Allow admin access to external_apis" ON external_apis
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- API sync logs policies (admin only)
CREATE POLICY "Allow admin access to api_sync_logs" ON api_sync_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add missing policies for tables with RLS enabled but no policies
CREATE POLICY "Allow management unit access to price_corrections" ON price_corrections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN price_baskets pb ON pb.management_unit_id = p.management_unit_id
            WHERE p.id = auth.uid() 
            AND pb.id = price_corrections.basket_id
        )
    );

CREATE POLICY "Allow authenticated read access to price_records" ON price_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin write access to price_records" ON price_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'servidor')
        )
    );