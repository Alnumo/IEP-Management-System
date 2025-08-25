-- Phase 8: Multi-Center Deployment & Franchise Management Schema
-- Enterprise-grade multi-tenant architecture for therapy center franchising
-- Saudi Arabian healthcare compliance: PDPL, SFDA, MOH regulations

-- =============================================
-- ENTERPRISE MULTI-TENANT FOUNDATION
-- =============================================

-- Organization Hierarchy (Corporate → Regional → Local)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  organization_type TEXT CHECK (organization_type IN ('corporate', 'regional', 'franchise', 'clinic', 'mobile_unit')) NOT NULL,
  parent_organization_id UUID REFERENCES organizations(id),
  organization_code TEXT UNIQUE NOT NULL, -- ARK-RIYADH-001, ARK-JEDDAH-002
  brand_name_ar TEXT,
  brand_name_en TEXT,
  legal_entity_name TEXT NOT NULL,
  tax_number TEXT, -- Saudi tax registration
  commercial_registration TEXT, -- CR number
  moh_license_number TEXT, -- Ministry of Health license
  sfda_registration TEXT, -- SFDA registration
  organization_level INTEGER DEFAULT 1, -- 1=Corporate, 2=Regional, 3=Local
  franchise_status TEXT CHECK (franchise_status IN ('franchiser', 'franchisee', 'company_owned', 'joint_venture')),
  franchise_agreement_id UUID, -- Reference to franchise agreement
  operational_status TEXT CHECK (operational_status IN ('planning', 'construction', 'pre_opening', 'operational', 'suspended', 'closed')) DEFAULT 'planning',
  opening_date DATE,
  closing_date DATE,
  
  -- Contact Information
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  emergency_contact TEXT,
  
  -- Address Information
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Saudi Arabia',
  coordinates POINT, -- GPS coordinates for mapping
  service_area_radius DECIMAL(8,2), -- Service area in kilometers
  
  -- Business Configuration
  business_hours JSONB, -- Operating hours by day of week
  services_offered JSONB, -- Types of therapy services
  capacity_limits JSONB, -- Max patients, therapists, rooms
  technology_capabilities JSONB, -- Telemedicine, AR/VR, etc.
  language_support JSONB, -- Languages supported
  cultural_adaptations JSONB, -- Local cultural considerations
  
  -- Financial Information
  investment_amount DECIMAL(12,2), -- Initial investment
  monthly_operational_cost DECIMAL(10,2),
  revenue_sharing_percentage DECIMAL(5,2), -- Franchise fee percentage
  royalty_fee_percentage DECIMAL(5,2) DEFAULT 6.0, -- Industry standard 6%
  marketing_fee_percentage DECIMAL(5,2) DEFAULT 2.0,
  
  -- Performance Metrics
  target_monthly_revenue DECIMAL(10,2),
  target_patient_capacity INTEGER,
  target_therapist_count INTEGER,
  quality_score DECIMAL(3,2), -- Overall quality rating
  patient_satisfaction_score DECIMAL(3,2),
  compliance_score DECIMAL(3,2),
  
  -- Data Governance & Privacy
  data_residency_region TEXT DEFAULT 'Saudi Arabia',
  pdpl_compliance_level TEXT CHECK (pdpl_compliance_level IN ('basic', 'enhanced', 'maximum')) DEFAULT 'maximum',
  data_sharing_agreements JSONB, -- What data can be shared with parent org
  audit_requirements JSONB, -- Audit frequency and scope
  
  -- Multi-tenant Configuration
  tenant_isolation_level TEXT CHECK (tenant_isolation_level IN ('shared', 'isolated', 'dedicated')) DEFAULT 'isolated',
  database_schema_name TEXT, -- For schema-based multi-tenancy
  custom_branding JSONB, -- Logo, colors, themes
  feature_permissions JSONB, -- What features are enabled
  integration_endpoints JSONB, -- Custom integrations
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Organization Relationships (for complex hierarchies)
CREATE TABLE IF NOT EXISTS organization_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_org_id UUID REFERENCES organizations(id),
  child_org_id UUID REFERENCES organizations(id),
  relationship_type TEXT CHECK (relationship_type IN ('subsidiary', 'franchise', 'partnership', 'service_agreement', 'data_sharing')),
  relationship_status TEXT CHECK (relationship_status IN ('active', 'pending', 'suspended', 'terminated')) DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  terms_and_conditions JSONB, -- Specific relationship terms
  revenue_sharing_rules JSONB, -- How revenue/costs are shared
  data_sharing_rules JSONB, -- What data is shared
  service_level_agreements JSONB, -- SLAs between orgs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FRANCHISE MANAGEMENT SYSTEM
-- =============================================

-- Franchise Agreements
CREATE TABLE IF NOT EXISTS franchise_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_number TEXT UNIQUE NOT NULL, -- FA-2025-001
  franchisor_org_id UUID REFERENCES organizations(id),
  franchisee_org_id UUID REFERENCES organizations(id),
  agreement_type TEXT CHECK (agreement_type IN ('master_franchise', 'unit_franchise', 'area_development', 'conversion')) DEFAULT 'unit_franchise',
  
  -- Financial Terms
  initial_franchise_fee DECIMAL(10,2) NOT NULL,
  ongoing_royalty_rate DECIMAL(5,2) NOT NULL DEFAULT 6.0,
  marketing_fee_rate DECIMAL(5,2) NOT NULL DEFAULT 2.0,
  territory_development_fee DECIMAL(10,2),
  minimum_investment DECIMAL(12,2),
  maximum_investment DECIMAL(12,2),
  
  -- Territory Rights
  exclusive_territory JSONB, -- Geographic boundaries
  territory_population INTEGER,
  market_demographics JSONB, -- Age groups, income levels, etc.
  competition_analysis JSONB, -- Competing therapy centers
  expansion_rights JSONB, -- Rights to open additional units
  
  -- Operational Requirements
  minimum_facility_size INTEGER, -- Square meters
  required_certifications JSONB, -- SFDA, MOH licenses needed
  staff_requirements JSONB, -- Minimum staff levels
  training_requirements JSONB, -- Required training programs
  quality_standards JSONB, -- Service quality benchmarks
  reporting_requirements JSONB, -- What reports must be submitted
  
  -- Technology & Brand Standards
  required_technology_stack JSONB, -- Must use Arkan platform
  branding_guidelines JSONB, -- Logo, colors, marketing materials
  approved_suppliers JSONB, -- Approved vendors and suppliers
  marketing_co_op_contribution DECIMAL(5,2), -- Marketing fund contribution
  
  -- Performance Metrics & KPIs
  minimum_revenue_targets JSONB, -- Monthly/annual targets
  patient_satisfaction_targets DECIMAL(3,2),
  quality_benchmarks JSONB, -- Clinical quality measures
  compliance_requirements JSONB, -- Regulatory compliance levels
  
  -- Agreement Terms
  agreement_start_date DATE NOT NULL,
  agreement_end_date DATE NOT NULL,
  renewal_terms JSONB, -- Renewal conditions
  termination_conditions JSONB, -- Early termination clauses
  non_compete_period INTEGER, -- Months of non-compete after termination
  
  -- Support Services
  training_program_included BOOLEAN DEFAULT true,
  marketing_support_level TEXT CHECK (marketing_support_level IN ('basic', 'standard', 'premium')) DEFAULT 'standard',
  operational_support_level TEXT CHECK (operational_support_level IN ('basic', 'standard', 'premium')) DEFAULT 'standard',
  technology_support_included BOOLEAN DEFAULT true,
  
  -- Legal & Compliance
  governing_law TEXT DEFAULT 'Saudi Arabian Law',
  dispute_resolution_method TEXT CHECK (dispute_resolution_method IN ('arbitration', 'mediation', 'court')) DEFAULT 'arbitration',
  regulatory_compliance_responsibility TEXT, -- Who handles compliance
  insurance_requirements JSONB, -- Required insurance coverage
  
  agreement_status TEXT CHECK (agreement_status IN ('draft', 'pending_approval', 'active', 'suspended', 'terminated', 'expired')) DEFAULT 'draft',
  signed_date DATE,
  signed_by_franchisor UUID REFERENCES auth.users(id),
  signed_by_franchisee UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Franchise Performance Tracking
CREATE TABLE IF NOT EXISTS franchise_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  reporting_frequency TEXT CHECK (reporting_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')) DEFAULT 'monthly',
  
  -- Financial Performance
  gross_revenue DECIMAL(12,2),
  net_revenue DECIMAL(12,2),
  royalty_fees_due DECIMAL(10,2),
  marketing_fees_due DECIMAL(10,2),
  royalty_fees_paid DECIMAL(10,2),
  marketing_fees_paid DECIMAL(10,2),
  outstanding_fees DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  
  -- Operational Performance
  total_patients_served INTEGER,
  new_patient_acquisitions INTEGER,
  patient_retention_rate DECIMAL(5,2),
  average_revenue_per_patient DECIMAL(8,2),
  therapist_utilization_rate DECIMAL(5,2),
  session_completion_rate DECIMAL(5,2),
  
  -- Quality Metrics
  patient_satisfaction_score DECIMAL(3,2),
  clinical_quality_score DECIMAL(3,2),
  safety_incident_count INTEGER DEFAULT 0,
  compliance_score DECIMAL(3,2),
  audit_results JSONB,
  
  -- Staff Performance
  total_staff_count INTEGER,
  therapist_count INTEGER,
  support_staff_count INTEGER,
  staff_turnover_rate DECIMAL(5,2),
  training_completion_rate DECIMAL(5,2),
  
  -- Technology & Innovation
  digital_therapy_utilization DECIMAL(5,2),
  telemedicine_session_percentage DECIMAL(5,2),
  automation_efficiency_score DECIMAL(3,2),
  system_uptime DECIMAL(5,2),
  
  -- Market Performance
  market_share DECIMAL(5,2),
  competitive_positioning JSONB,
  brand_recognition_score DECIMAL(3,2),
  referral_rate DECIMAL(5,2),
  
  -- Compliance & Risk
  regulatory_violations INTEGER DEFAULT 0,
  corrective_actions_taken JSONB,
  risk_assessment_score DECIMAL(3,2),
  insurance_claims INTEGER DEFAULT 0,
  
  -- Comments & Notes
  franchisor_comments TEXT,
  franchisee_comments TEXT,
  improvement_recommendations JSONB,
  next_review_date DATE,
  
  performance_status TEXT CHECK (performance_status IN ('exceeds_expectations', 'meets_expectations', 'needs_improvement', 'below_standards', 'critical')) DEFAULT 'meets_expectations',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- CENTRALIZED OPERATIONS MANAGEMENT
-- =============================================

-- Multi-Center Resource Management
CREATE TABLE IF NOT EXISTS resource_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_name TEXT NOT NULL,
  pool_type TEXT CHECK (pool_type IN ('therapist_network', 'equipment_fleet', 'training_materials', 'technology_licenses', 'marketing_assets')) NOT NULL,
  managing_organization_id UUID REFERENCES organizations(id),
  description_ar TEXT,
  description_en TEXT,
  
  -- Resource Specifications
  total_capacity INTEGER,
  available_capacity INTEGER,
  reserved_capacity INTEGER,
  maintenance_capacity INTEGER,
  
  -- Allocation Rules
  allocation_method TEXT CHECK (allocation_method IN ('first_come_first_served', 'priority_based', 'performance_based', 'geographic_proximity')) DEFAULT 'priority_based',
  sharing_rules JSONB, -- How resources are shared between centers
  cost_sharing_model JSONB, -- How costs are distributed
  utilization_requirements JSONB, -- Minimum utilization requirements
  
  -- Geographic Coverage
  service_regions JSONB, -- Which regions this pool serves
  deployment_strategy JSONB, -- How resources are deployed
  logistics_coordination JSONB, -- Transportation, scheduling
  
  -- Performance Tracking
  utilization_rate DECIMAL(5,2),
  efficiency_score DECIMAL(3,2),
  satisfaction_score DECIMAL(3,2),
  cost_per_utilization DECIMAL(10,2),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Allocation Tracking
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_pool_id UUID REFERENCES resource_pools(id),
  requesting_organization_id UUID REFERENCES organizations(id),
  allocation_type TEXT CHECK (allocation_type IN ('temporary', 'permanent', 'emergency', 'scheduled')) DEFAULT 'scheduled',
  
  -- Allocation Details
  resource_quantity INTEGER NOT NULL,
  allocation_start_date TIMESTAMPTZ NOT NULL,
  allocation_end_date TIMESTAMPTZ,
  actual_return_date TIMESTAMPTZ,
  
  -- Resource Specifications
  resource_specifications JSONB, -- Specific requirements
  performance_requirements JSONB, -- Expected performance levels
  compliance_requirements JSONB, -- Regulatory requirements
  
  -- Cost & Billing
  hourly_rate DECIMAL(8,2),
  daily_rate DECIMAL(8,2),
  total_cost DECIMAL(10,2),
  billing_method TEXT CHECK (billing_method IN ('hourly', 'daily', 'monthly', 'per_use', 'fixed_fee')),
  payment_terms TEXT,
  
  -- Utilization Tracking
  planned_utilization DECIMAL(5,2),
  actual_utilization DECIMAL(5,2),
  utilization_variance DECIMAL(5,2),
  performance_rating DECIMAL(3,2),
  
  -- Status & Workflow
  allocation_status TEXT CHECK (allocation_status IN ('requested', 'approved', 'deployed', 'active', 'completed', 'cancelled')) DEFAULT 'requested',
  approval_workflow JSONB, -- Who needs to approve
  deployment_notes TEXT,
  completion_notes TEXT,
  
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  deployed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CROSS-CENTER DATA ANALYTICS & REPORTING
-- =============================================

-- Multi-Center KPI Definitions
CREATE TABLE IF NOT EXISTS multi_center_kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_name TEXT NOT NULL,
  kpi_category TEXT CHECK (kpi_category IN ('financial', 'operational', 'clinical', 'patient_satisfaction', 'staff_performance', 'compliance', 'growth')) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  
  -- KPI Configuration
  measurement_unit TEXT, -- percentage, currency, count, ratio
  calculation_formula TEXT, -- How to calculate the KPI
  data_sources JSONB, -- What tables/fields to use
  aggregation_method TEXT CHECK (aggregation_method IN ('sum', 'average', 'median', 'min', 'max', 'count', 'percentage')),
  
  -- Benchmarking
  industry_benchmark DECIMAL(10,4),
  internal_benchmark DECIMAL(10,4),
  target_value DECIMAL(10,4),
  minimum_acceptable DECIMAL(10,4),
  maximum_achievable DECIMAL(10,4),
  
  -- Reporting Configuration
  reporting_frequency TEXT CHECK (reporting_frequency IN ('real_time', 'daily', 'weekly', 'monthly', 'quarterly', 'annually')),
  auto_calculation BOOLEAN DEFAULT true,
  alert_thresholds JSONB, -- When to trigger alerts
  stakeholder_visibility JSONB, -- Who can see this KPI
  
  -- Organizational Scope
  applicable_org_types JSONB, -- Which org types this applies to
  mandatory_reporting BOOLEAN DEFAULT false,
  compliance_related BOOLEAN DEFAULT false,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Cross-Center Analytics Data Warehouse
CREATE TABLE IF NOT EXISTS analytics_fact_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  kpi_id UUID REFERENCES multi_center_kpis(id),
  
  -- Time Dimensions
  measurement_date DATE NOT NULL,
  measurement_hour INTEGER, -- For hourly data
  day_of_week INTEGER, -- 1-7
  week_of_year INTEGER, -- 1-53
  month_of_year INTEGER, -- 1-12
  quarter INTEGER, -- 1-4
  year INTEGER,
  
  -- Geographic Dimensions
  city TEXT,
  province TEXT,
  region TEXT,
  country TEXT DEFAULT 'Saudi Arabia',
  
  -- Organizational Dimensions
  organization_level INTEGER, -- 1=Corporate, 2=Regional, 3=Local
  franchise_status TEXT,
  organization_type TEXT,
  
  -- Measurement Values
  measured_value DECIMAL(15,6) NOT NULL,
  target_value DECIMAL(15,6),
  benchmark_value DECIMAL(15,6),
  variance_from_target DECIMAL(15,6),
  variance_from_benchmark DECIMAL(15,6),
  
  -- Performance Context
  performance_band TEXT CHECK (performance_band IN ('excellent', 'good', 'acceptable', 'needs_improvement', 'poor')),
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  seasonality_factor DECIMAL(5,4), -- Seasonal adjustment
  
  -- Data Quality
  data_quality_score DECIMAL(3,2),
  data_source TEXT,
  calculation_method TEXT,
  confidence_level DECIMAL(3,2),
  
  -- Contextual Information
  contributing_factors JSONB, -- What influenced this measurement
  external_factors JSONB, -- External market conditions
  corrective_actions JSONB, -- Actions taken to improve performance
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Center Comparison Reports
CREATE TABLE IF NOT EXISTS center_comparison_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_name TEXT NOT NULL,
  report_type TEXT CHECK (report_type IN ('peer_comparison', 'best_practices', 'performance_ranking', 'trend_analysis', 'benchmark_analysis')) NOT NULL,
  
  -- Report Configuration
  comparison_organizations UUID[], -- Array of org IDs to compare
  comparison_period_start DATE NOT NULL,
  comparison_period_end DATE NOT NULL,
  kpis_included UUID[], -- Array of KPI IDs
  
  -- Analysis Parameters
  statistical_method TEXT CHECK (statistical_method IN ('descriptive', 'correlation', 'regression', 'clustering', 'forecasting')),
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  significance_threshold DECIMAL(4,3) DEFAULT 0.05,
  
  -- Report Results
  executive_summary TEXT,
  key_findings JSONB,
  performance_rankings JSONB, -- Organization rankings by KPI
  best_practices_identified JSONB, -- What top performers do differently
  improvement_opportunities JSONB, -- Recommendations for underperformers
  statistical_insights JSONB, -- Correlations, trends, predictions
  
  -- Visualization Configuration
  charts_config JSONB, -- Chart types and configurations
  dashboard_layout JSONB, -- How to display results
  export_formats JSONB, -- PDF, Excel, PowerBI, etc.
  
  -- Access Control
  visibility_level TEXT CHECK (visibility_level IN ('public', 'franchise_network', 'regional', 'confidential')) DEFAULT 'franchise_network',
  authorized_users UUID[], -- Who can access this report
  
  report_status TEXT CHECK (report_status IN ('generating', 'completed', 'error', 'archived')) DEFAULT 'generating',
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  next_update_scheduled TIMESTAMPTZ,
  auto_refresh BOOLEAN DEFAULT false
);

-- =============================================
-- DISTRIBUTED INFRASTRUCTURE MANAGEMENT
-- =============================================

-- Technology Infrastructure Tracking
CREATE TABLE IF NOT EXISTS infrastructure_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  asset_name TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('server', 'database', 'networking', 'security', 'backup', 'monitoring', 'application', 'license')) NOT NULL,
  
  -- Asset Specifications
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  asset_value DECIMAL(10,2),
  depreciation_rate DECIMAL(5,2),
  
  -- Technical Specifications
  technical_specs JSONB, -- CPU, RAM, storage, etc.
  software_versions JSONB, -- OS, applications, databases
  configuration_details JSONB, -- Network settings, security config
  capacity_limits JSONB, -- Max users, transactions, storage
  
  -- Performance & Monitoring
  current_utilization DECIMAL(5,2),
  performance_metrics JSONB, -- Response time, throughput, etc.
  health_status TEXT CHECK (health_status IN ('excellent', 'good', 'warning', 'critical', 'offline')) DEFAULT 'good',
  last_health_check TIMESTAMPTZ,
  
  -- Maintenance & Support
  maintenance_schedule JSONB, -- Scheduled maintenance windows
  support_contract TEXT,
  support_expiry DATE,
  last_maintenance DATE,
  next_maintenance_due DATE,
  
  -- Security & Compliance
  security_classification TEXT CHECK (security_classification IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'internal',
  compliance_requirements JSONB, -- PDPL, ISO27001, etc.
  encryption_status BOOLEAN DEFAULT true,
  backup_frequency TEXT,
  disaster_recovery_tier TEXT,
  
  -- Cost Management
  monthly_cost DECIMAL(8,2),
  annual_cost DECIMAL(10,2),
  cost_allocation JSONB, -- How costs are distributed
  budget_category TEXT,
  
  asset_status TEXT CHECK (asset_status IN ('active', 'inactive', 'maintenance', 'retired', 'disposed')) DEFAULT 'active',
  location TEXT, -- Physical location
  responsible_person UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Center Communication & Messaging
CREATE TABLE IF NOT EXISTS inter_center_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_organization_id UUID REFERENCES organizations(id),
  recipient_organization_id UUID REFERENCES organizations(id),
  communication_type TEXT CHECK (communication_type IN ('announcement', 'alert', 'request', 'report', 'training', 'compliance', 'emergency')) NOT NULL,
  
  -- Message Content
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  priority_level TEXT CHECK (priority_level IN ('low', 'normal', 'high', 'urgent', 'emergency')) DEFAULT 'normal',
  
  -- Categorization
  category TEXT CHECK (category IN ('operational', 'clinical', 'administrative', 'technical', 'regulatory', 'marketing', 'financial')),
  tags TEXT[], -- Array of tags for filtering
  
  -- Delivery & Response
  delivery_method TEXT CHECK (delivery_method IN ('system_notification', 'email', 'sms', 'mobile_push', 'dashboard_alert')) DEFAULT 'system_notification',
  requires_response BOOLEAN DEFAULT false,
  response_deadline TIMESTAMPTZ,
  
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_text TEXT,
  
  -- Escalation
  escalation_rules JSONB, -- What to do if not read/responded
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth.users(id),
  
  communication_status TEXT CHECK (communication_status IN ('draft', 'sent', 'delivered', 'read', 'responded', 'expired', 'escalated')) DEFAULT 'sent',
  
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR MULTI-CENTER PERFORMANCE
-- =============================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_type_status ON organizations(organization_type, operational_status);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_franchise_status ON organizations(franchise_status);
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(organization_code);

-- Franchise performance indexes
CREATE INDEX IF NOT EXISTS idx_franchise_performance_org_period ON franchise_performance(organization_id, reporting_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_franchise_performance_status ON franchise_performance(performance_status);

-- Resource allocation indexes
CREATE INDEX IF NOT EXISTS idx_resource_allocations_org ON resource_allocations(requesting_organization_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_pool_status ON resource_allocations(resource_pool_id, allocation_status);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(allocation_start_date, allocation_end_date);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_fact_org_date ON analytics_fact_table(organization_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_kpi_date ON analytics_fact_table(kpi_id, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_performance ON analytics_fact_table(performance_band, trend_direction);

-- Infrastructure indexes
CREATE INDEX IF NOT EXISTS idx_infrastructure_org_type ON infrastructure_assets(organization_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_infrastructure_status_health ON infrastructure_assets(asset_status, health_status);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communications_recipient ON inter_center_communications(recipient_organization_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_type_priority ON inter_center_communications(communication_type, priority_level);
CREATE INDEX IF NOT EXISTS idx_communications_status ON inter_center_communications(communication_status);

-- =============================================
-- ROW LEVEL SECURITY FOR MULTI-TENANCY
-- =============================================

-- Enable RLS for all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_fact_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_comparison_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_center_communications ENABLE ROW LEVEL SECURITY;

-- Multi-tenant access policies
-- Users can only access data from their organization and child organizations
CREATE POLICY "Multi-tenant organization access" ON organizations
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      id = (auth.jwt()->>'organization_id')::UUID OR
      parent_organization_id = (auth.jwt()->>'organization_id')::UUID OR
      id IN (
        WITH RECURSIVE org_hierarchy AS (
          SELECT id FROM organizations WHERE id = (auth.jwt()->>'organization_id')::UUID
          UNION ALL
          SELECT o.id FROM organizations o
          JOIN org_hierarchy oh ON o.parent_organization_id = oh.id
        )
        SELECT id FROM org_hierarchy
      )
    )
  );

-- Similar policies would be created for other tables based on organization hierarchy

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Update organization hierarchy levels automatically
CREATE OR REPLACE FUNCTION update_organization_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_organization_id IS NULL THEN
    NEW.organization_level := 1;
  ELSE
    SELECT organization_level + 1 INTO NEW.organization_level
    FROM organizations 
    WHERE id = NEW.parent_organization_id;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_level_trigger
  BEFORE INSERT OR UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organization_level();

-- Calculate franchise fees automatically
CREATE OR REPLACE FUNCTION calculate_franchise_fees()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate royalty fees
  NEW.royalty_fees_due := NEW.gross_revenue * 
    (SELECT royalty_fee_percentage / 100 FROM organizations WHERE id = NEW.organization_id);
    
  -- Calculate marketing fees
  NEW.marketing_fees_due := NEW.gross_revenue * 
    (SELECT marketing_fee_percentage / 100 FROM organizations WHERE id = NEW.organization_id);
    
  -- Calculate outstanding fees
  NEW.outstanding_fees := COALESCE(NEW.royalty_fees_due, 0) + COALESCE(NEW.marketing_fees_due, 0) - 
                         COALESCE(NEW.royalty_fees_paid, 0) - COALESCE(NEW.marketing_fees_paid, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_franchise_fees_trigger
  BEFORE INSERT OR UPDATE ON franchise_performance
  FOR EACH ROW EXECUTE FUNCTION calculate_franchise_fees();

-- =============================================
-- INITIAL SEED DATA FOR MULTI-CENTER DEMO
-- =============================================

-- Corporate Headquarters
INSERT INTO organizations (organization_name, organization_type, organization_code, brand_name_ar, brand_name_en, legal_entity_name, franchise_status, operational_status) VALUES
('Arkan Growth Centers Corporate', 'corporate', 'ARK-CORP-HQ', 'مراكز أركان النمو', 'Arkan Growth Centers', 'Arkan Therapy Management LLC', 'franchiser', 'operational');

-- Regional Centers
INSERT INTO organizations (organization_name, organization_type, parent_organization_id, organization_code, brand_name_ar, brand_name_en, legal_entity_name, franchise_status, operational_status, city, province) VALUES
('Arkan Riyadh Region', 'regional', (SELECT id FROM organizations WHERE organization_code = 'ARK-CORP-HQ'), 'ARK-RIYADH-REG', 'مراكز أركان النمو - الرياض', 'Arkan Growth Centers - Riyadh', 'Arkan Riyadh Regional LLC', 'company_owned', 'operational', 'Riyadh', 'Riyadh Province'),
('Arkan Western Region', 'regional', (SELECT id FROM organizations WHERE organization_code = 'ARK-CORP-HQ'), 'ARK-WEST-REG', 'مراكز أركان النمو - المنطقة الغربية', 'Arkan Growth Centers - Western Region', 'Arkan Western Regional LLC', 'company_owned', 'operational', 'Jeddah', 'Makkah Province');

-- Local Franchise Centers
INSERT INTO organizations (organization_name, organization_type, parent_organization_id, organization_code, brand_name_ar, brand_name_en, legal_entity_name, franchise_status, operational_status, city, province, investment_amount, target_monthly_revenue) VALUES
('Arkan Riyadh North Center', 'franchise', (SELECT id FROM organizations WHERE organization_code = 'ARK-RIYADH-REG'), 'ARK-RUH-N001', 'مركز أركان النمو - شمال الرياض', 'Arkan Growth Center - North Riyadh', 'North Riyadh Therapy Center LLC', 'franchisee', 'operational', 'Riyadh', 'Riyadh Province', 850000.00, 125000.00),
('Arkan Jeddah Downtown Center', 'franchise', (SELECT id FROM organizations WHERE organization_code = 'ARK-WEST-REG'), 'ARK-JED-D001', 'مركز أركان النمو - وسط جدة', 'Arkan Growth Center - Downtown Jeddah', 'Downtown Jeddah Therapy LLC', 'franchisee', 'operational', 'Jeddah', 'Makkah Province', 920000.00, 140000.00),
('Arkan Dammam Center', 'franchise', (SELECT id FROM organizations WHERE organization_code = 'ARK-CORP-HQ'), 'ARK-DAM-C001', 'مركز أركان النمو - الدمام', 'Arkan Growth Center - Dammam', 'Dammam Therapy Center LLC', 'franchisee', 'pre_opening', 'Dammam', 'Eastern Province', 780000.00, 110000.00);

-- Sample Franchise Agreement
INSERT INTO franchise_agreements (agreement_number, franchisor_org_id, franchisee_org_id, agreement_type, initial_franchise_fee, ongoing_royalty_rate, marketing_fee_rate, minimum_investment, maximum_investment, agreement_start_date, agreement_end_date, agreement_status) VALUES
('FA-2025-001', 
 (SELECT id FROM organizations WHERE organization_code = 'ARK-CORP-HQ'),
 (SELECT id FROM organizations WHERE organization_code = 'ARK-RUH-N001'),
 'unit_franchise', 
 75000.00, 6.0, 2.0, 800000.00, 1200000.00, '2025-01-01', '2035-12-31', 'active');

-- Sample KPIs
INSERT INTO multi_center_kpis (kpi_name, kpi_category, description_en, measurement_unit, target_value, industry_benchmark) VALUES
('Patient Satisfaction Score', 'patient_satisfaction', 'Average patient satisfaction rating', 'score', 4.5, 4.2),
('Monthly Revenue Growth', 'financial', 'Month-over-month revenue growth percentage', 'percentage', 8.0, 6.5),
('Therapist Utilization Rate', 'operational', 'Percentage of therapist time utilized', 'percentage', 85.0, 80.0),
('Session Completion Rate', 'clinical', 'Percentage of scheduled sessions completed', 'percentage', 95.0, 90.0),
('Compliance Score', 'compliance', 'Overall regulatory compliance score', 'score', 98.0, 95.0);

-- =============================================
-- VIEWS FOR MULTI-CENTER REPORTING
-- =============================================

-- Organization Hierarchy View
CREATE VIEW organization_hierarchy AS
WITH RECURSIVE org_tree AS (
  -- Base case: root organizations (no parent)
  SELECT id, organization_name, organization_type, organization_code, 
         NULL::UUID as parent_organization_id, 1 as level, 
         organization_code as path
  FROM organizations 
  WHERE parent_organization_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child organizations
  SELECT o.id, o.organization_name, o.organization_type, o.organization_code,
         o.parent_organization_id, ot.level + 1,
         ot.path || ' → ' || o.organization_code
  FROM organizations o
  JOIN org_tree ot ON o.parent_organization_id = ot.id
)
SELECT * FROM org_tree ORDER BY path;

-- Multi-Center Performance Dashboard View
CREATE VIEW multi_center_dashboard AS
SELECT 
  o.id as organization_id,
  o.organization_name,
  o.organization_type,
  o.city,
  o.province,
  o.operational_status,
  fp.gross_revenue,
  fp.patient_satisfaction_score,
  fp.clinical_quality_score,
  fp.compliance_score,
  fp.staff_turnover_rate,
  fp.reporting_period_start,
  fp.reporting_period_end
FROM organizations o
LEFT JOIN franchise_performance fp ON o.id = fp.organization_id
WHERE o.is_active = true
ORDER BY o.organization_type, o.organization_name;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE organizations IS 'Multi-tenant organization hierarchy supporting franchise operations';
COMMENT ON TABLE franchise_agreements IS 'Franchise agreement management with financial and operational terms';
COMMENT ON TABLE franchise_performance IS 'Comprehensive franchise performance tracking and KPI management';
COMMENT ON TABLE resource_pools IS 'Centralized resource management for multi-center operations';
COMMENT ON TABLE analytics_fact_table IS 'Data warehouse for cross-center analytics and benchmarking';
COMMENT ON TABLE infrastructure_assets IS 'Technology infrastructure tracking across all centers';
COMMENT ON TABLE inter_center_communications IS 'Communication system for multi-center coordination';

-- =============================================
-- COMPLETION SUMMARY
-- =============================================

-- This schema provides:
-- 1. Multi-tenant architecture with organization hierarchy
-- 2. Comprehensive franchise management system
-- 3. Cross-center resource sharing and allocation
-- 4. Enterprise-grade analytics and reporting
-- 5. Distributed infrastructure management
-- 6. Inter-center communication system
-- 7. Performance benchmarking and KPI tracking
-- 8. PDPL-compliant data governance
-- 9. Saudi Arabian regulatory compliance
-- 10. Scalable deployment architecture for healthcare franchising

-- Supports enterprise growth from single center to national franchise network
-- Enables centralized management with local autonomy
-- Provides comprehensive business intelligence and operational insights