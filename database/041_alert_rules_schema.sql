/**
 * Alert Rules and Notification System Schema
 * 
 * @description Database schema for performance alert rules management and notification delivery
 * Supports configurable alert thresholds, notification channels, and delivery tracking
 */

-- Alert rules table for configurable performance thresholds
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert configuration
  rule_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('greater_than', 'less_than', 'equals', 'not_equals')),
  severity alert_severity_enum NOT NULL,
  
  -- Rule settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  evaluation_window_minutes INTEGER DEFAULT 5,
  cooldown_minutes INTEGER DEFAULT 15,
  
  -- Notification configuration
  notification_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  notification_template JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Channel configuration
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'whatsapp', 'sms', 'webhook', 'slack')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Channel-specific configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Delivery settings
  retry_attempts INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 100,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Alert delivery tracking table
CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  alert_id UUID REFERENCES performance_alerts(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
  
  -- Delivery details
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed', 'retrying')),
  delivery_method TEXT NOT NULL,
  recipient TEXT NOT NULL,
  
  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  
  -- Message details
  message_subject TEXT,
  message_body TEXT,
  external_message_id TEXT,
  delivery_response JSONB,
  
  -- Error tracking
  last_error TEXT,
  error_details JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert rule evaluations log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS alert_rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  
  -- Evaluation details
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  evaluation_result BOOLEAN NOT NULL,
  triggered_alert_id UUID REFERENCES performance_alerts(id),
  
  -- Evaluation metadata
  evaluation_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  evaluation_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  evaluation_context JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to evaluate alert rules
CREATE OR REPLACE FUNCTION evaluate_alert_rules()
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  triggered BOOLEAN,
  metric_value NUMERIC,
  threshold_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_record RECORD;
  current_metric_value NUMERIC;
  should_trigger BOOLEAN := FALSE;
  evaluation_window_start TIMESTAMP WITH TIME ZONE;
  evaluation_window_end TIMESTAMP WITH TIME ZONE;
BEGIN
  evaluation_window_end := NOW();
  
  FOR rule_record IN 
    SELECT * FROM alert_rules 
    WHERE enabled = true 
    AND deleted_at IS NULL
  LOOP
    evaluation_window_start := evaluation_window_end - INTERVAL '1 minute' * rule_record.evaluation_window_minutes;
    
    -- Get current metric value based on rule configuration
    CASE rule_record.metric_name
      WHEN 'avg_page_load_time' THEN
        SELECT COALESCE(AVG(execution_time), 0) INTO current_metric_value
        FROM performance_metrics pm
        WHERE pm.metric_name = 'page_load_time'
        AND pm.created_at BETWEEN evaluation_window_start AND evaluation_window_end;
        
      WHEN 'avg_api_response_time' THEN
        SELECT COALESCE(AVG(execution_time), 0) INTO current_metric_value
        FROM performance_metrics pm
        WHERE pm.metric_category = 'api'
        AND pm.created_at BETWEEN evaluation_window_start AND evaluation_window_end;
        
      WHEN 'avg_database_query_time' THEN
        SELECT COALESCE(AVG(execution_time), 0) INTO current_metric_value
        FROM performance_metrics pm
        WHERE pm.metric_category = 'database'
        AND pm.created_at BETWEEN evaluation_window_start AND evaluation_window_end;
        
      WHEN 'error_rate' THEN
        SELECT COALESCE(
          (COUNT(*) FILTER (WHERE metadata->>'success' = 'false')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          0
        ) INTO current_metric_value
        FROM performance_metrics pm
        WHERE pm.created_at BETWEEN evaluation_window_start AND evaluation_window_end;
        
      ELSE
        current_metric_value := 0;
    END CASE;
    
    -- Evaluate the rule
    CASE rule_record.comparison_operator
      WHEN 'greater_than' THEN
        should_trigger := current_metric_value > rule_record.threshold_value;
      WHEN 'less_than' THEN
        should_trigger := current_metric_value < rule_record.threshold_value;
      WHEN 'equals' THEN
        should_trigger := current_metric_value = rule_record.threshold_value;
      WHEN 'not_equals' THEN
        should_trigger := current_metric_value != rule_record.threshold_value;
    END CASE;
    
    -- Log the evaluation
    INSERT INTO alert_rule_evaluations (
      rule_id,
      metric_value,
      threshold_value,
      evaluation_result,
      evaluation_window_start,
      evaluation_window_end,
      evaluation_context
    ) VALUES (
      rule_record.id,
      current_metric_value,
      rule_record.threshold_value,
      should_trigger,
      evaluation_window_start,
      evaluation_window_end,
      jsonb_build_object(
        'metric_name', rule_record.metric_name,
        'comparison_operator', rule_record.comparison_operator
      )
    );
    
    -- Return the result
    rule_id := rule_record.id;
    rule_name := rule_record.rule_name;
    triggered := should_trigger;
    metric_value := current_metric_value;
    threshold_value := rule_record.threshold_value;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to create alert from rule trigger
CREATE OR REPLACE FUNCTION create_alert_from_rule(
  p_rule_id UUID,
  p_metric_value NUMERIC,
  p_additional_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
  v_rule_record RECORD;
BEGIN
  -- Get rule details
  SELECT * INTO v_rule_record
  FROM alert_rules
  WHERE id = p_rule_id AND enabled = true AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert rule not found or disabled: %', p_rule_id;
  END IF;
  
  -- Check cooldown period
  IF EXISTS (
    SELECT 1 FROM performance_alerts pa
    JOIN alert_rule_evaluations are ON are.triggered_alert_id = pa.id
    WHERE are.rule_id = p_rule_id
    AND pa.created_at > NOW() - INTERVAL '1 minute' * v_rule_record.cooldown_minutes
    AND pa.resolved_at IS NULL
  ) THEN
    -- Still in cooldown, don't create new alert
    RETURN NULL;
  END IF;
  
  -- Create the alert
  INSERT INTO performance_alerts (
    alert_type,
    severity,
    metric_name,
    threshold_value,
    actual_value,
    alert_data,
    created_at
  ) VALUES (
    v_rule_record.rule_name,
    v_rule_record.severity,
    v_rule_record.metric_name,
    v_rule_record.threshold_value,
    p_metric_value,
    jsonb_build_object(
      'rule_id', p_rule_id,
      'rule_name', v_rule_record.rule_name,
      'description', v_rule_record.description,
      'evaluation_window_minutes', v_rule_record.evaluation_window_minutes
    ) || p_additional_data,
    NOW()
  ) RETURNING id INTO v_alert_id;
  
  -- Update the evaluation record with the triggered alert ID
  UPDATE alert_rule_evaluations 
  SET triggered_alert_id = v_alert_id
  WHERE rule_id = p_rule_id
  AND created_at >= NOW() - INTERVAL '1 minute'
  AND triggered_alert_id IS NULL
  AND evaluation_result = true;
  
  RETURN v_alert_id;
END;
$$;

-- Function to schedule alert notifications
CREATE OR REPLACE FUNCTION schedule_alert_notifications(
  p_alert_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_record RECORD;
  v_rule_record RECORD;
  v_channel_record RECORD;
  v_notifications_scheduled INTEGER := 0;
  v_channel_id UUID;
BEGIN
  -- Get alert details
  SELECT * INTO v_alert_record
  FROM performance_alerts
  WHERE id = p_alert_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert not found: %', p_alert_id;
  END IF;
  
  -- Get associated rule if exists
  SELECT * INTO v_rule_record
  FROM alert_rules
  WHERE id = (v_alert_record.alert_data->>'rule_id')::UUID;
  
  -- If no rule found, use default notification channels
  IF NOT FOUND THEN
    -- Get default channels for this severity level
    FOR v_channel_record IN
      SELECT * FROM notification_channels nc
      WHERE enabled = true
      AND (
        nc.config->>'default_for_severity' IS NULL OR
        nc.config->'default_for_severity' ? v_alert_record.severity::TEXT
      )
    LOOP
      INSERT INTO alert_deliveries (
        alert_id,
        channel_id,
        delivery_status,
        delivery_method,
        recipient
      ) VALUES (
        p_alert_id,
        v_channel_record.id,
        'pending',
        v_channel_record.channel_type,
        COALESCE(v_channel_record.config->>'default_recipient', 'admin@system.local')
      );
      
      v_notifications_scheduled := v_notifications_scheduled + 1;
    END LOOP;
  ELSE
    -- Use channels specified in the rule
    FOR v_channel_id IN
      SELECT jsonb_array_elements_text(v_rule_record.notification_channels)::UUID
    LOOP
      SELECT * INTO v_channel_record
      FROM notification_channels
      WHERE id = v_channel_id AND enabled = true;
      
      IF FOUND THEN
        INSERT INTO alert_deliveries (
          alert_id,
          rule_id,
          channel_id,
          delivery_status,
          delivery_method,
          recipient
        ) VALUES (
          p_alert_id,
          v_rule_record.id,
          v_channel_record.id,
          'pending',
          v_channel_record.channel_type,
          COALESCE(v_channel_record.config->>'recipient', 'admin@system.local')
        );
        
        v_notifications_scheduled := v_notifications_scheduled + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN v_notifications_scheduled;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled 
  ON alert_rules (enabled, deleted_at) WHERE enabled = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alert_rules_metric_name 
  ON alert_rules (metric_name) WHERE enabled = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_channels_type 
  ON notification_channels (channel_type) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_status 
  ON alert_deliveries (delivery_status, created_at) WHERE delivery_status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_alert_id 
  ON alert_deliveries (alert_id);

CREATE INDEX IF NOT EXISTS idx_alert_rule_evaluations_rule_id 
  ON alert_rule_evaluations (rule_id, created_at DESC);

-- Row Level Security policies
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rule_evaluations ENABLE ROW LEVEL SECURITY;

-- Alert rules policies
CREATE POLICY "Users can view alert rules"
  ON alert_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage alert rules"
  ON alert_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'manager')
    )
  );

-- Notification channels policies  
CREATE POLICY "Users can view notification channels"
  ON notification_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage notification channels"
  ON notification_channels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'manager')
    )
  );

-- Alert deliveries policies
CREATE POLICY "Users can view alert deliveries"
  ON alert_deliveries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage alert deliveries"
  ON alert_deliveries FOR ALL
  TO authenticated
  USING (true);

-- Alert rule evaluations policies  
CREATE POLICY "Users can view alert rule evaluations"
  ON alert_rule_evaluations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create alert rule evaluations"
  ON alert_rule_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default notification channels
INSERT INTO notification_channels (channel_name, channel_type, config) VALUES
  ('Default Email', 'email', '{"recipient": "admin@system.local", "smtp_host": "localhost", "smtp_port": 587}'),
  ('System WhatsApp', 'whatsapp', '{"recipient": "+1234567890", "business_account_id": "", "phone_number_id": ""}'),
  ('Admin Webhook', 'webhook', '{"url": "http://localhost:3000/api/webhooks/alerts", "method": "POST", "headers": {"Content-Type": "application/json"}}')
ON CONFLICT DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (rule_name, metric_name, threshold_value, comparison_operator, severity, notification_channels, description) VALUES
  ('High Page Load Time', 'avg_page_load_time', 2000, 'greater_than', 'medium', '[]'::jsonb, 'Alert when average page load time exceeds 2 seconds'),
  ('High API Response Time', 'avg_api_response_time', 500, 'greater_than', 'medium', '[]'::jsonb, 'Alert when average API response time exceeds 500ms'),
  ('Slow Database Queries', 'avg_database_query_time', 50, 'greater_than', 'high', '[]'::jsonb, 'Alert when average database query time exceeds 50ms'),
  ('High Error Rate', 'error_rate', 5, 'greater_than', 'critical', '[]'::jsonb, 'Alert when error rate exceeds 5%')
ON CONFLICT DO NOTHING;