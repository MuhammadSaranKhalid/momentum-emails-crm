-- =============================================================================
-- MEMBERS TABLE MIGRATION
-- Updated schema with new fields for comprehensive member management
-- =============================================================================

-- Drop existing table if you want to start fresh (WARNING: This will delete all data)
-- DROP TABLE IF EXISTS members CASCADE;

-- Create updated members table
CREATE TABLE IF NOT EXISTS members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    
    -- Contact Information
    email TEXT NOT NULL UNIQUE,
    contact TEXT,
    mobile TEXT,
    
    -- Company Information
    company_name TEXT,
    address TEXT,
    country TEXT,
    
    -- Business Details
    mode_of_shipment TEXT CHECK (mode_of_shipment IN ('Air', 'Sea', 'Land', 'Rail')),
    import_export TEXT CHECK (import_export IN ('Import', 'Export', 'Both')),
    
    -- References
    user_id UUID NOT NULL,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for better performance
    CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id) WHERE deleted_at IS NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email) WHERE deleted_at IS NULL;

-- Index for full-text search on names
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members USING GIN (to_tsvector('english', full_name));

-- Index for company search
CREATE INDEX IF NOT EXISTS idx_members_company_name ON members(company_name) WHERE deleted_at IS NULL;

-- Index for country filtering
CREATE INDEX IF NOT EXISTS idx_members_country ON members(country) WHERE deleted_at IS NULL;

-- Index for business type filtering
CREATE INDEX IF NOT EXISTS idx_members_import_export ON members(import_export) WHERE deleted_at IS NULL;

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at DESC) WHERE deleted_at IS NULL;

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before any UPDATE
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own members
CREATE POLICY "Users can view their own members"
    ON members FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy: Users can insert their own members
CREATE POLICY "Users can insert their own members"
    ON members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own members
CREATE POLICY "Users can update their own members"
    ON members FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can soft-delete their own members
CREATE POLICY "Users can soft-delete their own members"
    ON members FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- MIGRATION SCRIPT (IF UPDATING EXISTING TABLE)
-- =============================================================================

-- If you're migrating from old schema to new schema, uncomment and run this:

/*
-- Step 1: Add new columns to existing table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
ADD COLUMN IF NOT EXISTS contact TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS mode_of_shipment TEXT CHECK (mode_of_shipment IN ('Air', 'Sea', 'Land', 'Rail')),
ADD COLUMN IF NOT EXISTS import_export TEXT CHECK (import_export IN ('Import', 'Export', 'Both'));

-- Step 2: Migrate existing data if you have a 'name' column
UPDATE members
SET 
    first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
        THEN ARRAY_TO_STRING(ARRAY_REMOVE(STRING_TO_ARRAY(name, ' '), STRING_TO_ARRAY(name, ' ')[1]), ' ')
        ELSE ''
    END
WHERE name IS NOT NULL AND first_name IS NULL;

-- Step 3: Migrate company column to company_name
UPDATE members
SET company_name = company
WHERE company IS NOT NULL AND company_name IS NULL;

-- Step 4: Make required fields NOT NULL after migration
ALTER TABLE members
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Step 5: Drop old columns (optional - only after confirming data migration)
-- ALTER TABLE members DROP COLUMN IF EXISTS name;
-- ALTER TABLE members DROP COLUMN IF EXISTS company;
*/

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View for active members only
CREATE OR REPLACE VIEW active_members AS
SELECT *
FROM members
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- View for member statistics by country
CREATE OR REPLACE VIEW members_by_country AS
SELECT 
    country,
    COUNT(*) as total_members,
    COUNT(CASE WHEN import_export = 'Import' THEN 1 END) as importers,
    COUNT(CASE WHEN import_export = 'Export' THEN 1 END) as exporters,
    COUNT(CASE WHEN import_export = 'Both' THEN 1 END) as both
FROM members
WHERE deleted_at IS NULL
GROUP BY country
ORDER BY total_members DESC;

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

/*
INSERT INTO members (first_name, last_name, email, contact, mobile, company_name, address, country, mode_of_shipment, import_export, user_id)
VALUES
    ('John', 'Doe', 'john.doe@example.com', '+1-555-0101', '+1-555-0102', 'Acme Corp', '123 Main St, New York, NY', 'United States', 'Air', 'Import', 'YOUR_USER_ID_HERE'),
    ('Jane', 'Smith', 'jane.smith@example.com', '+44-20-1234', '+44-7700-900000', 'Smith Trading Ltd', '456 High St, London', 'United Kingdom', 'Sea', 'Export', 'YOUR_USER_ID_HERE'),
    ('Carlos', 'Rodriguez', 'carlos.r@example.com', '+52-55-1234', '+52-1-55-1234', 'Rodriguez Imports', 'Av. Reforma 789, CDMX', 'Mexico', 'Land', 'Both', 'YOUR_USER_ID_HERE');
*/

-- =============================================================================
-- GRANTS (Optional - depending on your database setup)
-- =============================================================================

-- Grant necessary permissions if needed
-- GRANT ALL ON members TO authenticated;
-- GRANT ALL ON members TO service_role;

