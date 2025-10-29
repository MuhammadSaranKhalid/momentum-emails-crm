-- =============================================================================
-- TEMPLATES TABLE MIGRATION
-- Email template system for reusable email designs
-- =============================================================================

-- Drop existing table if starting fresh (WARNING: This will delete all data)
-- DROP TABLE IF EXISTS templates CASCADE;

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Information
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    
    -- Categorization
    category TEXT CHECK (category IN ('Newsletter', 'Marketing', 'Transactional', 'Announcement', 'Other')),
    is_favorite BOOLEAN DEFAULT FALSE,
    
    -- References
    user_id UUID NOT NULL,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Key
    CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id) WHERE deleted_at IS NULL;

-- Index for name search
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates USING GIN (to_tsvector('english', name));

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category) WHERE deleted_at IS NULL;

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_templates_favorite ON templates(is_favorite) WHERE deleted_at IS NULL AND is_favorite = TRUE;

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC) WHERE deleted_at IS NULL;

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before any UPDATE
DROP TRIGGER IF EXISTS update_templates_updated_at_trigger ON templates;
CREATE TRIGGER update_templates_updated_at_trigger
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view their own templates"
    ON templates FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert their own templates"
    ON templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update their own templates"
    ON templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can soft-delete their own templates
CREATE POLICY "Users can soft-delete their own templates"
    ON templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View for active templates only
CREATE OR REPLACE VIEW active_templates AS
SELECT *
FROM templates
WHERE deleted_at IS NULL
ORDER BY is_favorite DESC, created_at DESC;

-- View for favorite templates
CREATE OR REPLACE VIEW favorite_templates AS
SELECT *
FROM templates
WHERE deleted_at IS NULL AND is_favorite = TRUE
ORDER BY created_at DESC;

-- View for templates by category
CREATE OR REPLACE VIEW templates_by_category AS
SELECT 
    category,
    COUNT(*) as total_templates,
    COUNT(CASE WHEN is_favorite THEN 1 END) as favorite_count
FROM templates
WHERE deleted_at IS NULL
GROUP BY category
ORDER BY total_templates DESC;

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================

/*
-- Insert sample templates (replace YOUR_USER_ID with your actual user ID)
INSERT INTO templates (name, description, subject, html_content, category, user_id)
VALUES
    (
        'Welcome Email',
        'Sent to new users upon registration',
        'Welcome to Our Platform!',
        '<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h1>Welcome!</h1><p>Thank you for joining us. We''re excited to have you here!</p><a href="#" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Get Started</a></div>',
        'Transactional',
        'YOUR_USER_ID'
    ),
    (
        'Monthly Newsletter',
        'Regular monthly update to subscribers',
        'Your Monthly Update - {{month}} {{year}}',
        '<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"><h1 style="color: #1a1a1a;">Monthly Newsletter</h1><p>Hello {{first_name}},</p><p>Here are the latest updates for you this month.</p><a href="#" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Read More</a></div>',
        'Newsletter',
        'YOUR_USER_ID'
    ),
    (
        'Product Launch',
        'Announce new product launches',
        'Introducing Our New Product!',
        '<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; border: 1px solid #ddd;"><h1 style="color: #d9534f;">New Product Launch!</h1><p>We''re excited to introduce our latest innovation.</p><div style="margin: 20px 0;"><img src="https://via.placeholder.com/400x300" alt="Product" style="max-width: 100%;"/></div><a href="#" style="background-color: #5cb85c; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Learn More</a></div>',
        'Marketing',
        'YOUR_USER_ID'
    );
*/

-- =============================================================================
-- MIGRATION FROM OLD SCHEMA (if needed)
-- =============================================================================

/*
-- If you're migrating from an old templates table without some fields:
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Newsletter', 'Marketing', 'Transactional', 'Announcement', 'Other')),
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Set default subject for existing templates
UPDATE templates
SET subject = name
WHERE subject IS NULL;

-- Make subject NOT NULL after migration
ALTER TABLE templates
ALTER COLUMN subject SET NOT NULL;
*/

-- =============================================================================
-- GRANTS (Optional - depending on your database setup)
-- =============================================================================

-- Grant necessary permissions if needed
-- GRANT ALL ON templates TO authenticated;
-- GRANT ALL ON templates TO service_role;

