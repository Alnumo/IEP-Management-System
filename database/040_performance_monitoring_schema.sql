-- Performance Monitoring Schema for APM Integration
-- Provides comprehensive database performance tracking and alerting

-- Enable required extensions for performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- Performance metrics storage table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL DEFAULT 'ms',
  metric_category TEXT NOT NULL CHECK (metric_category IN ('query', 'connection', 'cache', 'locks', 'io')),
  table_name TEXT,
  query_type TEXT,
  execution_time NUMERIC,
  rows_affected INTEGER,
  is_cached BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Performance alerts table for threshold monitoring
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  alert_data JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- System health monitoring view
CREATE OR REPLACE VIEW system_health_metrics AS
SELECT 
  -- Database connection metrics
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
  (SELECT count(*) FROM pg_stat_activity) as total_connections,
  
  -- Query performance metrics
  ROUND(AVG(mean_exec_time)::numeric, 2) as avg_query_time_ms,
  COUNT(CASE WHEN mean_exec_time > 50 THEN 1 END) as slow_queries_count,
  
  -- Cache performance
  ROUND(
    (SELECT 
      CASE 
        WHEN heap_blks_read + heap_blks_hit > 0 
        THEN (heap_blks_hit::float / (heap_blks_read + heap_blks_hit) * 100)
        ELSE 0 
      END
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public' 
    LIMIT 1)::numeric, 2
  ) as cache_hit_ratio_percent,
  
  -- Lock monitoring
  (SELECT count(*) FROM pg_locks WHERE mode = 'AccessExclusiveLock') as exclusive_locks_count,
  
  -- Current timestamp for monitoring
  NOW() as measured_at
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%' AND query NOT LIKE '%performance_%';

-- Function to log query performance automatically
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_execution_time NUMERIC DEFAULT NULL,
  p_rows_affected INTEGER DEFAULT NULL,
  p_is_cached BOOLEAN DEFAULT false,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Insert performance metric
  INSERT INTO performance_metrics (
    metric_name,
    metric_value,
    metric_unit,
    metric_category,
    table_name,
    query_type,
    execution_time,
    rows_affected,
    is_cached,
    metadata,
    created_by
  ) VALUES (
    'query_execution_time',
    COALESCE(p_execution_time, 0),
    'ms',
    'query',
    p_table_name,
    p_query_type,
    p_execution_time,
    p_rows_affected,
    p_is_cached,
    p_metadata,
    v_user_id
  ) RETURNING id INTO v_metric_id;
  
  -- Check if performance alert should be triggered
  IF p_execution_time > 50 THEN
    INSERT INTO performance_alerts (
      alert_type,
      severity,
      metric_name,
      threshold_value,
      actual_value,
      alert_data,
      created_by
    ) VALUES (
      'slow_query',
      CASE 
        WHEN p_execution_time > 500 THEN 'critical'
        WHEN p_execution_time > 200 THEN 'high'
        WHEN p_execution_time > 100 THEN 'medium'
        ELSE 'low'
      END,
      'query_execution_time',
      50,
      p_execution_time,
      jsonb_build_object(
        'query_type', p_query_type,
        'table_name', p_table_name,
        'rows_affected', p_rows_affected,
        'is_cached', p_is_cached
      ),
      v_user_id
    );
  END IF;
  
  RETURN v_metric_id;
END;
$$;

-- Function to get performance statistics for monitoring dashboard
CREATE OR REPLACE FUNCTION get_performance_statistics(
  p_time_range_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  avg_query_time_ms NUMERIC,
  slow_queries_count BIGINT,
  total_queries_count BIGINT,
  cache_hit_ratio NUMERIC,
  active_connections INTEGER,
  alert_count BIGINT,
  top_slow_tables JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Average query execution time
    COALESCE(ROUND(AVG(pm.execution_time)::numeric, 2), 0) as avg_query_time_ms,
    
    -- Count of slow queries (> 50ms)
    COUNT(CASE WHEN pm.execution_time > 50 THEN 1 END) as slow_queries_count,
    
    -- Total queries count
    COUNT(pm.id) as total_queries_count,
    
    -- Cache hit ratio from system health
    COALESCE((SELECT cache_hit_ratio_percent FROM system_health_metrics), 0) as cache_hit_ratio,
    
    -- Active connections
    COALESCE((SELECT active_connections FROM system_health_metrics), 0) as active_connections,
    
    -- Performance alerts count
    (SELECT COUNT(*) FROM performance_alerts 
     WHERE created_at >= NOW() - INTERVAL '1 hour' * p_time_range_hours
     AND resolved_at IS NULL) as alert_count,
    
    -- Top slow tables
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'table_name', table_name,
          'avg_time', ROUND(avg_time::numeric, 2),
          'query_count', query_count
        )
      )
      FROM (
        SELECT 
          table_name,
          AVG(execution_time) as avg_time,
          COUNT(*) as query_count
        FROM performance_metrics pm
        WHERE pm.created_at >= NOW() - INTERVAL '1 hour' * p_time_range_hours
        AND pm.table_name IS NOT NULL
        GROUP BY table_name
        ORDER BY avg_time DESC
        LIMIT 5
      ) slow_tables),
      '[]'::jsonb
    ) as top_slow_tables
  FROM performance_metrics pm
  WHERE pm.created_at >= NOW() - INTERVAL '1 hour' * p_time_range_hours;
END;
$$;

-- Function to monitor Arabic text search performance specifically
CREATE OR REPLACE FUNCTION monitor_arabic_search_performance()
RETURNS TABLE (
  search_type TEXT,
  avg_execution_time_ms NUMERIC,
  query_count BIGINT,
  performance_rating TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'arabic_text_search' as search_type,
    ROUND(AVG(pm.execution_time)::numeric, 2) as avg_execution_time_ms,
    COUNT(*) as query_count,
    CASE 
      WHEN AVG(pm.execution_time) < 25 THEN 'excellent'
      WHEN AVG(pm.execution_time) < 50 THEN 'good'
      WHEN AVG(pm.execution_time) < 100 THEN 'fair'
      ELSE 'poor'
    END as performance_rating
  FROM performance_metrics pm
  WHERE pm.created_at >= NOW() - INTERVAL '24 hours'
  AND pm.metadata->>'search_language' = 'arabic';
END;
$$;

-- Function to clean up old performance data
CREATE OR REPLACE FUNCTION cleanup_performance_data(
  p_retention_days INTEGER DEFAULT 30
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  -- Delete old performance metrics
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Delete resolved alerts older than retention period
  DELETE FROM performance_alerts 
  WHERE resolved_at IS NOT NULL 
  AND resolved_at < NOW() - INTERVAL '1 day' * p_retention_days;
  
  -- Archive critical alerts that are still unresolved but old
  UPDATE performance_alerts 
  SET alert_data = alert_data || jsonb_build_object('archived', true)
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND resolved_at IS NULL
  AND severity = 'critical';
  
  RETURN v_deleted_count;
END;
$$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at 
  ON performance_metrics (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_category 
  ON performance_metrics (metric_category);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_table_name 
  ON performance_metrics (table_name) WHERE table_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved 
  ON performance_alerts (created_at DESC) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity 
  ON performance_alerts (severity, created_at DESC);

-- Row Level Security policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for medical consultants and admins to access all performance data
CREATE POLICY "performance_metrics_medical_consultant_access" 
  ON performance_metrics FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'medical_consultant')
    )
  );

-- Policy for therapists to access basic performance metrics
CREATE POLICY "performance_metrics_therapist_access" 
  ON performance_metrics FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('therapist_lead', 'therapist', 'admin', 'medical_consultant')
    )
    AND metric_category IN ('query', 'cache')
  );

-- Similar policies for performance alerts
CREATE POLICY "performance_alerts_admin_access" 
  ON performance_alerts FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'medical_consultant')
    )
  );

-- Grant appropriate permissions
GRANT SELECT ON system_health_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION log_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_arabic_search_performance TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_performance_data TO service_role;

-- Add helpful comments
COMMENT ON TABLE performance_metrics IS 'Stores detailed performance metrics for database operations and system monitoring';
COMMENT ON TABLE performance_alerts IS 'Tracks performance threshold violations and system alerts';
COMMENT ON VIEW system_health_metrics IS 'Real-time view of system health and performance indicators';
COMMENT ON FUNCTION log_query_performance IS 'Logs query execution performance and triggers alerts for slow queries';
COMMENT ON FUNCTION get_performance_statistics IS 'Retrieves performance statistics for dashboard display';
COMMENT ON FUNCTION monitor_arabic_search_performance IS 'Specialized monitoring for Arabic text search operations';
COMMENT ON FUNCTION cleanup_performance_data IS 'Maintains performance data retention and cleanup';