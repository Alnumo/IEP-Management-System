-- Session Media Documentation System
-- This migration implements Story 1.3: Media-Rich Progress Documentation Workflow
-- Enables therapists and parents to share photos, videos, and progress updates

-- Create session_media table for storing media attachments
CREATE TABLE IF NOT EXISTS session_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    session_id UUID REFERENCES therapy_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Media Information
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'document')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    file_extension VARCHAR(10),
    mime_type VARCHAR(100),
    
    -- Media Metadata
    duration_seconds INTEGER, -- for video/audio files
    thumbnail_url TEXT, -- for videos and documents
    width INTEGER, -- for images/videos
    height INTEGER, -- for images/videos
    
    -- Content Information
    caption_ar TEXT,
    caption_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    
    -- Upload Information
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    upload_type VARCHAR(30) NOT NULL CHECK (upload_type IN ('session_documentation', 'home_practice', 'progress_update', 'milestone_celebration')),
    upload_device VARCHAR(20) DEFAULT 'web', -- 'web', 'mobile', 'tablet'
    upload_location GEOGRAPHY(POINT, 4326), -- GPS location if available
    
    -- Organization
    is_featured BOOLEAN DEFAULT false, -- highlight important media
    is_private BOOLEAN DEFAULT false, -- restrict to therapist/admin only
    tags TEXT[], -- flexible tagging system
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    compression_applied BOOLEAN DEFAULT false,
    thumbnail_generated BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create media_goal_tags table for linking media to IEP goals
CREATE TABLE IF NOT EXISTS media_goal_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    media_id UUID REFERENCES session_media(id) ON DELETE CASCADE,
    goal_id UUID, -- References iep_goals table when available
    goal_title_ar TEXT,
    goal_title_en TEXT,
    
    -- Tag Information
    relevance_score INTEGER DEFAULT 1 CHECK (relevance_score BETWEEN 1 AND 5), -- 1=low, 5=high
    tagged_by UUID REFERENCES auth.users(id),
    tag_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(media_id, goal_id)
);

-- Create practice_reviews table for therapist feedback on home practice
CREATE TABLE IF NOT EXISTS practice_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    media_id UUID REFERENCES session_media(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES therapists(id) ON DELETE CASCADE,
    
    -- Review Information
    review_status VARCHAR(20) NOT NULL CHECK (review_status IN ('excellent', 'good', 'satisfactory', 'needs_improvement', 'incorrect')),
    feedback_ar TEXT,
    feedback_en TEXT,
    
    -- Detailed Ratings (1-5 scale)
    technique_rating INTEGER CHECK (technique_rating BETWEEN 1 AND 5),
    consistency_rating INTEGER CHECK (consistency_rating BETWEEN 1 AND 5),
    engagement_rating INTEGER CHECK (engagement_rating BETWEEN 1 AND 5),
    
    -- Follow-up Actions
    follow_up_needed BOOLEAN DEFAULT false,
    corrective_media_url TEXT, -- URL to therapist response video/image
    next_practice_suggestions TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create media_collections table for organized media albums
CREATE TABLE IF NOT EXISTS media_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Collection Information
    title_ar TEXT NOT NULL,
    title_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    
    -- Relations
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    
    -- Collection Settings
    is_public BOOLEAN DEFAULT false, -- visible to parents
    is_milestone_collection BOOLEAN DEFAULT false,
    collection_type VARCHAR(30) DEFAULT 'general' CHECK (collection_type IN ('general', 'milestone', 'assessment', 'progress_tracking', 'home_practice')),
    
    -- Display Settings
    cover_media_id UUID REFERENCES session_media(id),
    sort_order INTEGER DEFAULT 0,
    color_theme VARCHAR(7) DEFAULT '#3B82F6' CHECK (color_theme ~ '^#[0-9A-Fa-f]{6}$'),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create media_collection_items table for many-to-many relationship
CREATE TABLE IF NOT EXISTS media_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES session_media(id) ON DELETE CASCADE,
    
    -- Item Information
    sort_order INTEGER DEFAULT 0,
    added_by UUID REFERENCES auth.users(id),
    item_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(collection_id, media_id)
);

-- Create media_sharing_permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS media_sharing_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    media_id UUID REFERENCES session_media(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Permission Settings
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('view', 'download', 'comment', 'share')),
    granted_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(media_id, user_id, permission_type)
);

-- Create media_access_log table for audit trail
CREATE TABLE IF NOT EXISTS media_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relations
    media_id UUID REFERENCES session_media(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES auth.users(id),
    
    -- Access Information
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'upload', 'edit', 'delete')),
    access_method VARCHAR(20) DEFAULT 'web', -- 'web', 'mobile', 'api'
    ip_address INET,
    user_agent TEXT,
    
    -- Context
    session_context JSONB, -- Additional context data
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_session_media_session ON session_media(session_id);
CREATE INDEX IF NOT EXISTS idx_session_media_student ON session_media(student_id);
CREATE INDEX IF NOT EXISTS idx_session_media_type ON session_media(media_type);
CREATE INDEX IF NOT EXISTS idx_session_media_upload_type ON session_media(upload_type);
CREATE INDEX IF NOT EXISTS idx_session_media_uploaded_by ON session_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_session_media_created_at ON session_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_media_processing_status ON session_media(processing_status) WHERE processing_status != 'completed';
CREATE INDEX IF NOT EXISTS idx_session_media_featured ON session_media(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_media_goal_tags_media ON media_goal_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_goal_tags_goal ON media_goal_tags(goal_id);
CREATE INDEX IF NOT EXISTS idx_media_goal_tags_relevance ON media_goal_tags(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_practice_reviews_media ON practice_reviews(media_id);
CREATE INDEX IF NOT EXISTS idx_practice_reviews_reviewer ON practice_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_practice_reviews_status ON practice_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_practice_reviews_follow_up ON practice_reviews(follow_up_needed) WHERE follow_up_needed = true;

CREATE INDEX IF NOT EXISTS idx_media_collections_student ON media_collections(student_id);
CREATE INDEX IF NOT EXISTS idx_media_collections_type ON media_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_media_collections_public ON media_collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_media_collections_milestone ON media_collections(is_milestone_collection) WHERE is_milestone_collection = true;

CREATE INDEX IF NOT EXISTS idx_media_collection_items_collection ON media_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_media ON media_collection_items(media_id);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_order ON media_collection_items(collection_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_media_sharing_permissions_media ON media_sharing_permissions(media_id);
CREATE INDEX IF NOT EXISTS idx_media_sharing_permissions_user ON media_sharing_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_media_sharing_permissions_expires ON media_sharing_permissions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_access_log_media ON media_access_log(media_id);
CREATE INDEX IF NOT EXISTS idx_media_access_log_user ON media_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_media_access_log_created ON media_access_log(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_session_media_updated_at 
    BEFORE UPDATE ON session_media 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_practice_reviews_updated_at 
    BEFORE UPDATE ON practice_reviews 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_media_collections_updated_at 
    BEFORE UPDATE ON media_collections 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to automatically process media after upload
CREATE OR REPLACE FUNCTION process_uploaded_media()
RETURNS TRIGGER AS $$
BEGIN
    -- Set initial processing status
    NEW.processing_status = 'processing';
    
    -- Generate thumbnails for videos and documents
    IF NEW.media_type IN ('video', 'document') AND NEW.thumbnail_url IS NULL THEN
        -- This would trigger external processing service
        NEW.thumbnail_generated = false;
    END IF;
    
    -- Apply compression for large files
    IF NEW.file_size > 10485760 THEN -- 10MB threshold
        NEW.compression_applied = false;
    ELSE
        NEW.compression_applied = true;
    END IF;
    
    -- Set processing as completed for small files
    IF NEW.file_size <= 10485760 AND NEW.media_type = 'photo' THEN
        NEW.processing_status = 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply media processing trigger
CREATE TRIGGER trigger_process_uploaded_media
    BEFORE INSERT ON session_media
    FOR EACH ROW
    EXECUTE FUNCTION process_uploaded_media();

-- Function to validate media permissions
CREATE OR REPLACE FUNCTION validate_media_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure uploaded_by has view permission
    INSERT INTO media_sharing_permissions (media_id, user_id, permission_type, granted_by)
    VALUES (NEW.id, NEW.uploaded_by, 'view', NEW.uploaded_by)
    ON CONFLICT (media_id, user_id, permission_type) DO NOTHING;
    
    -- Grant view permission to student's parents for session documentation
    IF NEW.upload_type = 'session_documentation' THEN
        INSERT INTO media_sharing_permissions (media_id, user_id, permission_type, granted_by)
        SELECT NEW.id, p.user_id, 'view', NEW.uploaded_by
        FROM student_parents p
        WHERE p.student_id = NEW.student_id
        ON CONFLICT (media_id, user_id, permission_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply permission validation trigger
CREATE TRIGGER trigger_validate_media_access
    AFTER INSERT ON session_media
    FOR EACH ROW
    EXECUTE FUNCTION validate_media_access();

-- Function to log media access
CREATE OR REPLACE FUNCTION log_media_access()
RETURNS TRIGGER AS $$
BEGIN
    -- This function would be called by application layer
    -- when media is accessed, downloaded, etc.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive views for easy data access
CREATE OR REPLACE VIEW student_media_summary AS
SELECT 
    s.id as student_id,
    s.first_name_ar || ' ' || s.last_name_ar as student_name_ar,
    COALESCE(s.first_name_en || ' ' || s.last_name_en, s.first_name_ar || ' ' || s.last_name_ar) as student_name_en,
    COUNT(DISTINCT sm.id) as total_media_count,
    COUNT(DISTINCT sm.id) FILTER (WHERE sm.media_type = 'photo') as photo_count,
    COUNT(DISTINCT sm.id) FILTER (WHERE sm.media_type = 'video') as video_count,
    COUNT(DISTINCT sm.id) FILTER (WHERE sm.upload_type = 'session_documentation') as session_media_count,
    COUNT(DISTINCT sm.id) FILTER (WHERE sm.upload_type = 'home_practice') as home_practice_count,
    COUNT(DISTINCT pr.id) as reviewed_practice_count,
    MAX(sm.created_at) as latest_media_date,
    SUM(sm.file_size) as total_storage_bytes
FROM students s
LEFT JOIN session_media sm ON s.id = sm.student_id
LEFT JOIN practice_reviews pr ON sm.id = pr.media_id
GROUP BY s.id, s.first_name_ar, s.last_name_ar, s.first_name_en, s.last_name_en;

CREATE OR REPLACE VIEW session_media_with_reviews AS
SELECT 
    sm.*,
    ts.session_number,
    ts.scheduled_date,
    ts.status as session_status,
    t.first_name_ar || ' ' || t.last_name_ar as therapist_name_ar,
    COALESCE(t.first_name_en || ' ' || t.last_name_en, t.first_name_ar || ' ' || t.last_name_ar) as therapist_name_en,
    pr.review_status,
    pr.feedback_ar,
    pr.feedback_en,
    pr.technique_rating,
    pr.consistency_rating,
    pr.engagement_rating,
    pr.follow_up_needed
FROM session_media sm
LEFT JOIN therapy_sessions ts ON sm.session_id = ts.id
LEFT JOIN therapists t ON ts.therapist_id = t.id
LEFT JOIN practice_reviews pr ON sm.id = pr.media_id;

CREATE OR REPLACE VIEW media_collections_with_stats AS
SELECT 
    mc.*,
    s.first_name_ar || ' ' || s.last_name_ar as student_name_ar,
    COALESCE(s.first_name_en || ' ' || s.last_name_en, s.first_name_ar || ' ' || s.last_name_ar) as student_name_en,
    COUNT(DISTINCT mci.media_id) as media_count,
    MAX(sm.created_at) as latest_media_date,
    cover_sm.file_url as cover_image_url,
    cover_sm.thumbnail_url as cover_thumbnail_url
FROM media_collections mc
LEFT JOIN students s ON mc.student_id = s.id
LEFT JOIN media_collection_items mci ON mc.id = mci.collection_id
LEFT JOIN session_media sm ON mci.media_id = sm.id
LEFT JOIN session_media cover_sm ON mc.cover_media_id = cover_sm.id
GROUP BY mc.id, s.first_name_ar, s.last_name_ar, s.first_name_en, s.last_name_en, 
         cover_sm.file_url, cover_sm.thumbnail_url;

-- Add table comments for documentation
COMMENT ON TABLE session_media IS 'Stores media files (photos, videos, audio) linked to therapy sessions with bilingual captions';
COMMENT ON TABLE media_goal_tags IS 'Links media files to specific IEP goals for progress tracking';
COMMENT ON TABLE practice_reviews IS 'Therapist feedback and ratings for parent-uploaded home practice media';
COMMENT ON TABLE media_collections IS 'Organized collections/albums of related media files';
COMMENT ON TABLE media_collection_items IS 'Many-to-many relationship between collections and media files';
COMMENT ON TABLE media_sharing_permissions IS 'Fine-grained access control for media files';
COMMENT ON TABLE media_access_log IS 'Audit trail for all media file access and operations';

-- Add column comments for clarity
COMMENT ON COLUMN session_media.upload_type IS 'Type of upload: session_documentation, home_practice, progress_update, milestone_celebration';
COMMENT ON COLUMN session_media.processing_status IS 'Status of media processing: pending, processing, completed, failed';
COMMENT ON COLUMN session_media.tags IS 'Flexible array of tags for categorization and search';
COMMENT ON COLUMN practice_reviews.review_status IS 'Therapist rating: excellent, good, satisfactory, needs_improvement, incorrect';
COMMENT ON COLUMN media_collections.collection_type IS 'Type of collection: general, milestone, assessment, progress_tracking, home_practice';
COMMENT ON COLUMN media_sharing_permissions.permission_type IS 'Permission level: view, download, comment, share';