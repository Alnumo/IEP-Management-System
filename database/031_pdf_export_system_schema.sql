-- =====================================================
-- PDF Export System Database Schema
-- Complete database schema for PDF generation, templates, and analytics
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PDF Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    
    -- Template configuration
    format TEXT NOT NULL CHECK (format IN (
        'standard', 'compact', 'detailed', 'summary', 'legal', 'parent_friendly'
    )) DEFAULT 'standard',
    page_size TEXT NOT NULL CHECK (page_size IN ('A4', 'Letter', 'Legal', 'A3')) DEFAULT 'A4',
    orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')) DEFAULT 'portrait',
    language TEXT NOT NULL CHECK (language IN ('ar', 'en', 'bilingual')) DEFAULT 'bilingual',
    
    -- Template structure
    sections JSONB DEFAULT '[]',
    header_config JSONB DEFAULT '{}',
    footer_config JSONB DEFAULT '{}',
    styling JSONB DEFAULT '{}',
    
    -- Template settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for pdf_templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_format ON pdf_templates(format);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_language ON pdf_templates(language);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_active ON pdf_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_default ON pdf_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_created_at ON pdf_templates(created_at);

-- =====================================================
-- PDF Generation Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_generation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID UNIQUE NOT NULL,
    
    -- Source information
    iep_id UUID NOT NULL,
    template_id UUID REFERENCES pdf_templates(id),
    
    -- Generation parameters
    language TEXT NOT NULL CHECK (language IN ('ar', 'en', 'bilingual')),
    format TEXT NOT NULL,
    
    -- File information
    file_path TEXT,
    file_url TEXT,
    file_size INTEGER DEFAULT 0,
    file_name TEXT,
    
    -- Generation metrics
    pages_generated INTEGER DEFAULT 0,
    generation_time INTEGER DEFAULT 0, -- milliseconds
    success BOOLEAN DEFAULT true,
    
    -- Security features
    is_password_protected BOOLEAN DEFAULT false,
    has_digital_signature BOOLEAN DEFAULT false,
    has_watermark BOOLEAN DEFAULT false,
    
    -- Request details
    generated_by UUID NOT NULL,
    generation_purpose TEXT,
    recipient_info JSONB DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    -- Batch information
    is_batch_generation BOOLEAN DEFAULT false,
    batch_id UUID,
    
    -- Expiry and access
    expires_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Error information
    error_details JSONB DEFAULT '{}',
    warnings JSONB DEFAULT '[]',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pdf_generation_logs
CREATE INDEX IF NOT EXISTS idx_pdf_logs_document_id ON pdf_generation_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_iep_id ON pdf_generation_logs(iep_id);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_template_id ON pdf_generation_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_generated_by ON pdf_generation_logs(generated_by);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_success ON pdf_generation_logs(success);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_created_at ON pdf_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_batch_id ON pdf_generation_logs(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- PDF Template Usage Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_template_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES pdf_templates(id) ON DELETE CASCADE,
    
    -- Usage metrics
    date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    failed_generations INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_generation_time INTEGER DEFAULT 0,
    total_generation_time INTEGER DEFAULT 0,
    average_file_size INTEGER DEFAULT 0,
    total_file_size BIGINT DEFAULT 0,
    
    -- User metrics
    unique_users INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    
    -- Language breakdown
    arabic_usage INTEGER DEFAULT 0,
    english_usage INTEGER DEFAULT 0,
    bilingual_usage INTEGER DEFAULT 0,
    
    -- Format breakdown
    format_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per template per date
    UNIQUE(template_id, date)
);

-- Indexes for template usage
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON pdf_template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_date ON pdf_template_usage(date);
CREATE INDEX IF NOT EXISTS idx_template_usage_usage_count ON pdf_template_usage(usage_count DESC);

-- =====================================================
-- PDF Quality Assessments
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_quality_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES pdf_generation_logs(document_id) ON DELETE CASCADE,
    
    -- Quality scores (0-100)
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    content_quality INTEGER CHECK (content_quality >= 0 AND content_quality <= 100),
    formatting_quality INTEGER CHECK (formatting_quality >= 0 AND formatting_quality <= 100),
    accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
    arabic_typography_score INTEGER CHECK (arabic_typography_score >= 0 AND arabic_typography_score <= 100),
    
    -- Quality issues
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- Assessment details
    assessed_by TEXT,
    assessment_method TEXT CHECK (assessment_method IN ('automated', 'manual', 'hybrid')),
    assessment_criteria JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quality assessments
CREATE INDEX IF NOT EXISTS idx_quality_document_id ON pdf_quality_assessments(document_id);
CREATE INDEX IF NOT EXISTS idx_quality_overall_score ON pdf_quality_assessments(overall_score);
CREATE INDEX IF NOT EXISTS idx_quality_created_at ON pdf_quality_assessments(created_at);

-- =====================================================
-- PDF Batch Operations
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_batch_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID UNIQUE NOT NULL,
    
    -- Batch configuration
    operation_type TEXT NOT NULL CHECK (operation_type IN ('generate', 'combine', 'convert')),
    total_documents INTEGER NOT NULL,
    completed_documents INTEGER DEFAULT 0,
    failed_documents INTEGER DEFAULT 0,
    
    -- Processing status
    status TEXT NOT NULL CHECK (status IN (
        'queued', 'processing', 'completed', 'failed', 'cancelled'
    )) DEFAULT 'queued',
    
    -- Batch settings
    settings JSONB DEFAULT '{}',
    combine_into_single_pdf BOOLEAN DEFAULT false,
    zip_output BOOLEAN DEFAULT false,
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    current_document TEXT,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Results
    output_files JSONB DEFAULT '[]',
    combined_file_path TEXT,
    zip_file_path TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time INTEGER, -- milliseconds
    
    -- Error handling
    errors JSONB DEFAULT '[]',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- User information
    requested_by UUID NOT NULL,
    request_details JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for batch operations
CREATE INDEX IF NOT EXISTS idx_batch_operations_batch_id ON pdf_batch_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_status ON pdf_batch_operations(status);
CREATE INDEX IF NOT EXISTS idx_batch_operations_requested_by ON pdf_batch_operations(requested_by);
CREATE INDEX IF NOT EXISTS idx_batch_operations_created_at ON pdf_batch_operations(created_at);

-- =====================================================
-- PDF Access Logs
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    
    -- Access details
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'print')),
    user_id UUID,
    user_agent TEXT,
    ip_address INET,
    
    -- Location and device
    location_country TEXT,
    location_city TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    
    -- Access metadata
    referrer TEXT,
    session_id TEXT,
    access_duration INTEGER, -- seconds for view operations
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for access logs
CREATE INDEX IF NOT EXISTS idx_access_logs_document_id ON pdf_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON pdf_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_type ON pdf_access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON pdf_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON pdf_access_logs(ip_address);

-- =====================================================
-- PDF Security Audit
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_security_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    
    -- Security event
    event_type TEXT NOT NULL CHECK (event_type IN (
        'password_access', 'unauthorized_attempt', 'signature_verification', 
        'watermark_detection', 'permission_check', 'encryption_status'
    )),
    event_description TEXT NOT NULL,
    
    -- Event details
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    
    -- Security context
    security_level TEXT CHECK (security_level IN ('none', 'basic', 'standard', 'high', 'maximum')),
    permissions_checked JSONB DEFAULT '{}',
    violation_details JSONB DEFAULT '{}',
    
    -- Response actions
    action_taken TEXT,
    blocked BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for security audit
CREATE INDEX IF NOT EXISTS idx_security_audit_document_id ON pdf_security_audit(document_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON pdf_security_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON pdf_security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_success ON pdf_security_audit(success);
CREATE INDEX IF NOT EXISTS idx_security_audit_blocked ON pdf_security_audit(blocked);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON pdf_security_audit(created_at);

-- =====================================================
-- Database Functions
-- =====================================================

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily usage stats
    INSERT INTO pdf_template_usage (
        template_id,
        date,
        usage_count,
        successful_generations,
        failed_generations,
        average_generation_time,
        total_generation_time,
        average_file_size,
        total_file_size
    )
    SELECT 
        NEW.template_id,
        DATE(NEW.created_at),
        1,
        CASE WHEN NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NEW.success THEN 0 ELSE 1 END,
        NEW.generation_time,
        NEW.generation_time,
        NEW.file_size,
        NEW.file_size
    ON CONFLICT (template_id, date) DO UPDATE SET
        usage_count = pdf_template_usage.usage_count + 1,
        successful_generations = pdf_template_usage.successful_generations + 
            CASE WHEN NEW.success THEN 1 ELSE 0 END,
        failed_generations = pdf_template_usage.failed_generations + 
            CASE WHEN NEW.success THEN 0 ELSE 1 END,
        total_generation_time = pdf_template_usage.total_generation_time + NEW.generation_time,
        average_generation_time = (pdf_template_usage.total_generation_time + NEW.generation_time) / 
            (pdf_template_usage.usage_count + 1),
        total_file_size = pdf_template_usage.total_file_size + NEW.file_size,
        average_file_size = (pdf_template_usage.total_file_size + NEW.file_size) / 
            (pdf_template_usage.usage_count + 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for template usage stats
DROP TRIGGER IF EXISTS trigger_update_template_usage ON pdf_generation_logs;
CREATE TRIGGER trigger_update_template_usage
    AFTER INSERT ON pdf_generation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage_stats();

-- Function to clean up expired PDFs
CREATE OR REPLACE FUNCTION cleanup_expired_pdfs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired PDF records
    DELETE FROM pdf_generation_logs 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND download_count = 0; -- Only delete if never downloaded
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up orphaned quality assessments
    DELETE FROM pdf_quality_assessments 
    WHERE document_id NOT IN (SELECT document_id FROM pdf_generation_logs);
    
    -- Clean up old access logs (keep last 90 days)
    DELETE FROM pdf_access_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old security audit logs (keep last 180 days)
    DELETE FROM pdf_security_audit 
    WHERE created_at < NOW() - INTERVAL '180 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get PDF generation statistics
CREATE OR REPLACE FUNCTION get_pdf_generation_stats(
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_template_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_generations INTEGER,
    successful_generations INTEGER,
    failed_generations INTEGER,
    success_rate DECIMAL,
    average_generation_time INTEGER,
    average_file_size INTEGER,
    most_used_template_id UUID,
    most_used_language TEXT,
    total_downloads INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_generations,
        COUNT(*) FILTER (WHERE success = true)::INTEGER as successful_generations,
        COUNT(*) FILTER (WHERE success = false)::INTEGER as failed_generations,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE success = true)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0::DECIMAL
        END as success_rate,
        COALESCE(AVG(generation_time) FILTER (WHERE success = true), 0)::INTEGER as average_generation_time,
        COALESCE(AVG(file_size) FILTER (WHERE success = true), 0)::INTEGER as average_file_size,
        (
            SELECT pgl.template_id 
            FROM pdf_generation_logs pgl 
            WHERE (p_date_from IS NULL OR DATE(pgl.created_at) >= p_date_from)
            AND (p_date_to IS NULL OR DATE(pgl.created_at) <= p_date_to)
            AND (p_template_id IS NULL OR pgl.template_id = p_template_id)
            GROUP BY pgl.template_id 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as most_used_template_id,
        (
            SELECT pgl.language 
            FROM pdf_generation_logs pgl 
            WHERE (p_date_from IS NULL OR DATE(pgl.created_at) >= p_date_from)
            AND (p_date_to IS NULL OR DATE(pgl.created_at) <= p_date_to)
            AND (p_template_id IS NULL OR pgl.template_id = p_template_id)
            GROUP BY pgl.language 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as most_used_language,
        SUM(download_count)::INTEGER as total_downloads
    FROM pdf_generation_logs
    WHERE (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
    AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to)
    AND (p_template_id IS NULL OR template_id = p_template_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_quality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_batch_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_templates
CREATE POLICY "Users can view active templates" ON pdf_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Template creators can manage their templates" ON pdf_templates
    FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all templates" ON pdf_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'system_admin')
        )
    );

-- RLS Policies for pdf_generation_logs
CREATE POLICY "Users can view their own PDF generations" ON pdf_generation_logs
    FOR SELECT USING (generated_by = auth.uid());

CREATE POLICY "Users can create PDF generation logs" ON pdf_generation_logs
    FOR INSERT WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Users can update their own PDF logs" ON pdf_generation_logs
    FOR UPDATE USING (generated_by = auth.uid());

-- RLS Policies for pdf_batch_operations
CREATE POLICY "Users can view their own batch operations" ON pdf_batch_operations
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Users can create batch operations" ON pdf_batch_operations
    FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can update their own batch operations" ON pdf_batch_operations
    FOR UPDATE USING (requested_by = auth.uid());

-- Admin policies for monitoring and management
CREATE POLICY "Admins can view all PDF operations" ON pdf_generation_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- Initial Data Setup
-- =====================================================

-- Insert default PDF templates
INSERT INTO pdf_templates (
    name_ar, name_en, description_ar, description_en,
    format, page_size, orientation, language,
    sections, header_config, footer_config, styling,
    is_active, is_default
) VALUES
    (
        'القالب القياسي للبرنامج التعليمي الفردي',
        'Standard IEP Template',
        'القالب الافتراضي للبرامج التعليمية الفردية مع جميع الأقسام الأساسية',
        'Default template for Individual Education Programs with all essential sections',
        'standard',
        'A4',
        'portrait',
        'bilingual',
        '[
            {"id": "1", "type": "student_info", "title_ar": "معلومات الطالب", "title_en": "Student Information", "order_index": 1, "is_required": true, "is_visible": true},
            {"id": "2", "type": "goals_objectives", "title_ar": "الأهداف والغايات", "title_en": "Goals and Objectives", "order_index": 2, "is_required": true, "is_visible": true},
            {"id": "3", "type": "services", "title_ar": "الخدمات المطلوبة", "title_en": "Required Services", "order_index": 3, "is_required": true, "is_visible": true},
            {"id": "4", "type": "team_members", "title_ar": "أعضاء الفريق", "title_en": "Team Members", "order_index": 4, "is_required": true, "is_visible": true},
            {"id": "5", "type": "signatures", "title_ar": "التوقيعات", "title_en": "Signatures", "order_index": 5, "is_required": true, "is_visible": true}
        ]',
        '{"enabled": true, "height": 60, "content_ar": "البرنامج التعليمي الفردي", "content_en": "Individual Education Program", "show_logo": true, "show_page_numbers": true, "show_date": true}',
        '{"enabled": true, "height": 40, "content_ar": "مركز أركان للنمو", "content_en": "Arkan Growth Center", "show_page_numbers": true}',
        '{"primary_font_ar": "Tajawal", "primary_font_en": "Arial", "primary_color": "#1f2937", "text_color": "#111827", "background_color": "#ffffff"}',
        true,
        true
    ),
    (
        'قالب مبسط للوالدين',
        'Parent-Friendly Template',
        'قالب مبسط ومفهوم للوالدين مع التركيز على النقاط الأساسية',
        'Simplified template for parents focusing on key points',
        'parent_friendly',
        'A4',
        'portrait',
        'bilingual',
        '[
            {"id": "1", "type": "student_info", "title_ar": "معلومات الطالب", "title_en": "Student Information", "order_index": 1, "is_required": true, "is_visible": true},
            {"id": "2", "type": "goals_objectives", "title_ar": "الأهداف", "title_en": "Goals", "order_index": 2, "is_required": true, "is_visible": true},
            {"id": "3", "type": "services", "title_ar": "الخدمات", "title_en": "Services", "order_index": 3, "is_required": true, "is_visible": true}
        ]',
        '{"enabled": true, "height": 60, "content_ar": "ملخص البرنامج التعليمي للطالب", "content_en": "Student Education Program Summary", "show_logo": true}',
        '{"enabled": true, "height": 40, "content_ar": "للاستفسارات يرجى التواصل معنا", "content_en": "For inquiries please contact us"}',
        '{"primary_font_ar": "Cairo", "primary_font_en": "Helvetica", "primary_color": "#2563eb", "text_color": "#1f2937", "background_color": "#ffffff"}',
        true,
        false
    ),
    (
        'القالب القانوني الرسمي',
        'Legal Official Template',
        'القالب الرسمي للاستخدام القانوني والحكومي مع جميع التفاصيل المطلوبة',
        'Official template for legal and governmental use with all required details',
        'legal',
        'A4',
        'portrait',
        'bilingual',
        '[
            {"id": "1", "type": "student_info", "title_ar": "معلومات الطالب الرسمية", "title_en": "Official Student Information", "order_index": 1, "is_required": true, "is_visible": true},
            {"id": "2", "type": "iep_details", "title_ar": "تفاصيل البرنامج التعليمي", "title_en": "IEP Details", "order_index": 2, "is_required": true, "is_visible": true},
            {"id": "3", "type": "goals_objectives", "title_ar": "الأهداف والغايات المفصلة", "title_en": "Detailed Goals and Objectives", "order_index": 3, "is_required": true, "is_visible": true},
            {"id": "4", "type": "services", "title_ar": "الخدمات المطلوبة", "title_en": "Required Services", "order_index": 4, "is_required": true, "is_visible": true},
            {"id": "5", "type": "assessments", "title_ar": "التقييمات", "title_en": "Assessments", "order_index": 5, "is_required": true, "is_visible": true},
            {"id": "6", "type": "accommodations", "title_ar": "التعديلات والتسهيلات", "title_en": "Accommodations and Modifications", "order_index": 6, "is_required": true, "is_visible": true},
            {"id": "7", "type": "team_members", "title_ar": "أعضاء الفريق", "title_en": "Team Members", "order_index": 7, "is_required": true, "is_visible": true},
            {"id": "8", "type": "signatures", "title_ar": "التوقيعات الرسمية", "title_en": "Official Signatures", "order_index": 8, "is_required": true, "is_visible": true},
            {"id": "9", "type": "appendices", "title_ar": "الملاحق", "title_en": "Appendices", "order_index": 9, "is_required": false, "is_visible": true}
        ]',
        '{"enabled": true, "height": 80, "content_ar": "وثيقة رسمية - البرنامج التعليمي الفردي", "content_en": "Official Document - Individual Education Program", "show_logo": true, "show_page_numbers": true, "show_date": true}',
        '{"enabled": true, "height": 50, "content_ar": "هذه وثيقة رسمية معتمدة قانونياً", "content_en": "This is an officially approved legal document", "show_page_numbers": true, "show_document_id": true}',
        '{"primary_font_ar": "Amiri", "primary_font_en": "Times New Roman", "primary_color": "#000000", "text_color": "#000000", "background_color": "#ffffff"}',
        true,
        false
    )
ON CONFLICT DO NOTHING;

-- =====================================================
-- Performance Optimization
-- =====================================================

-- Create materialized view for template statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_template_statistics AS
SELECT 
    t.id as template_id,
    t.name_ar,
    t.name_en,
    t.format,
    t.language,
    COUNT(l.id) as total_usage,
    COUNT(l.id) FILTER (WHERE l.success = true) as successful_usage,
    COUNT(l.id) FILTER (WHERE l.success = false) as failed_usage,
    AVG(l.generation_time) FILTER (WHERE l.success = true) as avg_generation_time,
    AVG(l.file_size) FILTER (WHERE l.success = true) as avg_file_size,
    MAX(l.created_at) as last_used,
    SUM(l.download_count) as total_downloads
FROM pdf_templates t
LEFT JOIN pdf_generation_logs l ON t.id = l.template_id
WHERE t.is_active = true
GROUP BY t.id, t.name_ar, t.name_en, t.format, t.language;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_template_stats_template_id 
    ON mv_template_statistics(template_id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_template_statistics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_statistics;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON TABLE pdf_templates IS 'PDF template configurations for IEP document generation';
COMMENT ON TABLE pdf_generation_logs IS 'Log of all PDF generation requests and results';
COMMENT ON TABLE pdf_template_usage IS 'Daily aggregated statistics for template usage';
COMMENT ON TABLE pdf_quality_assessments IS 'Quality assessment results for generated PDFs';
COMMENT ON TABLE pdf_batch_operations IS 'Batch PDF operation tracking and management';
COMMENT ON TABLE pdf_access_logs IS 'Access logs for PDF documents (view, download, etc.)';
COMMENT ON TABLE pdf_security_audit IS 'Security events and audit trail for PDF documents';

COMMENT ON FUNCTION update_template_usage_stats() IS 'Automatically updates template usage statistics on new PDF generation';
COMMENT ON FUNCTION cleanup_expired_pdfs() IS 'Cleans up expired PDF files and old log entries';
COMMENT ON FUNCTION get_pdf_generation_stats(DATE, DATE, UUID) IS 'Returns comprehensive PDF generation statistics for specified period and template';

-- =====================================================
-- Schema Validation
-- =====================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'pdf_templates',
        'pdf_generation_logs',
        'pdf_template_usage',
        'pdf_quality_assessments',
        'pdf_batch_operations',
        'pdf_access_logs',
        'pdf_security_audit'
    ];
    table_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name 
            AND table_schema = 'public'
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All PDF export system tables created successfully!';
    END IF;
END $$;