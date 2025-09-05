-- Story 5.3: Prediction Cache Schema
-- Creates table for caching predictive analytics results

CREATE TABLE prediction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cached_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_prediction_cache_key ON prediction_cache(cache_key);
CREATE INDEX idx_prediction_cache_expires ON prediction_cache(expires_at);
CREATE INDEX idx_prediction_cache_created ON prediction_cache(created_at);
CREATE INDEX idx_prediction_cache_access_count ON prediction_cache(access_count);

-- Row Level Security
ALTER TABLE prediction_cache ENABLE ROW LEVEL SECURITY;

-- Allow admins and managers to access cache
CREATE POLICY "Admins and managers can access prediction cache" ON prediction_cache
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'manager'))
    );

-- Function to update access count and last accessed time
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.access_count = OLD.access_count + 1;
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access stats on SELECT (via UPDATE)
CREATE TRIGGER trigger_update_cache_access
    BEFORE UPDATE OF cached_data ON prediction_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_cache_access();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM prediction_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run every hour
SELECT cron.schedule('cleanup-expired-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');