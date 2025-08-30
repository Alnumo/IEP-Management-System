-- Communication Platform Database Schema
-- Real-time Messaging, Voice Communication, and Assignment Automation
-- Arkan Al-Numo Center - Communication Enhancement

-- =============================================================================
-- CONVERSATIONS TABLE
-- Parent-Therapist-Student conversation threads
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Participant Information
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Conversation Metadata (Bilingual)
    title_ar VARCHAR(200),
    title_en VARCHAR(200),
    description_ar TEXT,
    description_en TEXT,
    
    -- Conversation Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'muted')),
    
    -- Activity Tracking
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_by UUID REFERENCES auth.users(id),
    message_count INTEGER DEFAULT 0,
    unread_count_parent INTEGER DEFAULT 0,
    unread_count_therapist INTEGER DEFAULT 0,
    
    -- Communication Preferences
    parent_notifications_enabled BOOLEAN DEFAULT true,
    therapist_notifications_enabled BOOLEAN DEFAULT true,
    voice_calls_enabled BOOLEAN DEFAULT true,
    media_sharing_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    UNIQUE(parent_id, therapist_id, student_id)
);

-- Indexes for Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_parent ON conversations(parent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_therapist ON conversations(therapist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

-- =============================================================================
-- MESSAGES TABLE
-- Individual messages within conversations
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message Participants
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message Content (Bilingual)
    content_ar TEXT,
    content_en TEXT,
    
    -- Message Classification
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
        'text', 'media', 'voice_note', 'system', 'session_update', 'progress_update'
    )),
    
    -- Priority and Urgency
    priority_level VARCHAR(10) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    requires_response BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Media Attachments (JSON array of file objects)
    media_attachments JSONB DEFAULT '[]',
    
    -- Message Status
    read_status BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Priority Alert Processing
    alert_processed BOOLEAN DEFAULT false,
    alert_level VARCHAR(10),
    escalation_triggered BOOLEAN DEFAULT false,
    escalation_at TIMESTAMP WITH TIME ZONE,
    
    -- Message Context
    related_session_id UUID,
    related_goal_id UUID,
    related_assessment_id UUID,
    
    -- Threading and Replies
    reply_to_message_id UUID REFERENCES messages(id),
    thread_id UUID, -- For grouping related messages
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation: At least one language content required
    CONSTRAINT messages_content_required CHECK (
        content_ar IS NOT NULL OR content_en IS NOT NULL
    )
);

-- Indexes for Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority_level);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(read_status) WHERE read_status = false;
CREATE INDEX IF NOT EXISTS idx_messages_alerts ON messages(alert_processed, priority_level);

-- =============================================================================
-- VOICE CALLS TABLE
-- Voice communication tracking and management
-- =============================================================================
CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Call Participants
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Call Details
    call_type VARCHAR(20) DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
    call_status VARCHAR(20) DEFAULT 'initiated' CHECK (call_status IN (
        'initiated', 'ringing', 'answered', 'ended', 'missed', 'rejected', 'failed'
    )),
    
    -- Call Timeline
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Call Quality Metrics
    call_quality_score INTEGER CHECK (call_quality_score >= 1 AND call_quality_score <= 5),
    connection_quality VARCHAR(20) CHECK (connection_quality IN ('poor', 'fair', 'good', 'excellent')),
    audio_issues_reported BOOLEAN DEFAULT false,
    
    -- WebRTC Technical Details
    peer_connection_id TEXT,
    ice_connection_state VARCHAR(20),
    signaling_state VARCHAR(20),
    
    -- Recording (if enabled)
    recording_enabled BOOLEAN DEFAULT false,
    recording_path TEXT,
    recording_duration_seconds INTEGER,
    
    -- Call Context
    call_reason_ar TEXT,
    call_reason_en TEXT,
    related_session_id UUID,
    emergency_call BOOLEAN DEFAULT false,
    
    -- Notes and Follow-up (Bilingual)
    call_notes_ar TEXT,
    call_notes_en TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes_ar TEXT,
    follow_up_notes_en TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Voice Calls
CREATE INDEX IF NOT EXISTS idx_voice_calls_conversation ON voice_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_caller ON voice_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_callee ON voice_calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(call_status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_date ON voice_calls(initiated_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_emergency ON voice_calls(emergency_call) WHERE emergency_call = true;

-- =============================================================================
-- MESSAGE REACTIONS TABLE
-- Emoji reactions and acknowledgments
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reaction Details
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN (
        'like', 'love', 'helpful', 'important', 'question', 'acknowledge'
    )),
    reaction_emoji VARCHAR(10), -- Unicode emoji
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(message_id, user_id, reaction_type)
);

-- Indexes for Reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- =============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- Extended participant management for group conversations
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participant Role
    role VARCHAR(30) NOT NULL CHECK (role IN (
        'primary_parent', 'secondary_parent', 'primary_therapist', 
        'secondary_therapist', 'supervisor', 'administrator', 'observer'
    )),
    
    -- Participation Settings
    notifications_enabled BOOLEAN DEFAULT true,
    can_initiate_calls BOOLEAN DEFAULT true,
    can_share_media BOOLEAN DEFAULT true,
    can_view_history BOOLEAN DEFAULT true,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'restricted')),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(conversation_id, user_id, role)
);

-- Indexes for Participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_role ON conversation_participants(role);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Conversations RLS Policies
CREATE POLICY "Users can view conversations they participate in" 
ON conversations FOR SELECT 
USING (
    auth.uid() = parent_id OR 
    auth.uid() = therapist_id OR
    auth.uid() IN (
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = conversations.id
    )
);

CREATE POLICY "Therapists and parents can create conversations" 
ON conversations FOR INSERT 
WITH CHECK (
    auth.uid() = parent_id OR 
    auth.uid() = therapist_id
);

CREATE POLICY "Participants can update conversations" 
ON conversations FOR UPDATE 
USING (
    auth.uid() = parent_id OR 
    auth.uid() = therapist_id OR
    auth.uid() IN (
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = conversations.id AND role IN ('supervisor', 'administrator')
    )
);

-- Messages RLS Policies
CREATE POLICY "Users can view messages in their conversations" 
ON messages FOR SELECT 
USING (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE auth.uid() = parent_id OR auth.uid() = therapist_id OR
        auth.uid() IN (
            SELECT user_id FROM conversation_participants 
            WHERE conversation_id = conversations.id
        )
    )
);

CREATE POLICY "Conversation participants can send messages" 
ON messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE auth.uid() = parent_id OR auth.uid() = therapist_id OR
        auth.uid() IN (
            SELECT user_id FROM conversation_participants 
            WHERE conversation_id = conversations.id AND status = 'active'
        )
    )
);

CREATE POLICY "Senders can update their own messages" 
ON messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- Voice Calls RLS Policies
CREATE POLICY "Users can view calls they participate in" 
ON voice_calls FOR SELECT 
USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id
);

CREATE POLICY "Users can initiate calls in their conversations" 
ON voice_calls FOR INSERT 
WITH CHECK (
    auth.uid() = caller_id AND
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE (auth.uid() = parent_id OR auth.uid() = therapist_id) AND
        voice_calls_enabled = true
    )
);

CREATE POLICY "Call participants can update call details" 
ON voice_calls FOR UPDATE 
USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id
);

-- Message Reactions RLS Policies
CREATE POLICY "Users can view reactions on messages they can see" 
ON message_reactions FOR SELECT 
USING (
    message_id IN (
        SELECT id FROM messages 
        WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE auth.uid() = parent_id OR auth.uid() = therapist_id OR
            auth.uid() IN (
                SELECT user_id FROM conversation_participants 
                WHERE conversation_id = conversations.id
            )
        )
    )
);

CREATE POLICY "Users can react to messages they can see" 
ON message_reactions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND
    message_id IN (
        SELECT id FROM messages 
        WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE auth.uid() = parent_id OR auth.uid() = therapist_id OR
            auth.uid() IN (
                SELECT user_id FROM conversation_participants 
                WHERE conversation_id = conversations.id
            )
        )
    )
);

-- Conversation Participants RLS Policies
CREATE POLICY "Users can view participants in their conversations" 
ON conversation_participants FOR SELECT 
USING (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE auth.uid() = parent_id OR auth.uid() = therapist_id
    ) OR auth.uid() = user_id
);

CREATE POLICY "Supervisors can manage conversation participants" 
ON conversation_participants FOR ALL 
USING (
    auth.uid() IN (
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = conversation_participants.conversation_id 
        AND role IN ('supervisor', 'administrator')
    )
);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update conversation last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        last_message_by = NEW.sender_id,
        message_count = message_count + 1,
        -- Update unread counts
        unread_count_parent = CASE 
            WHEN NEW.sender_id != parent_id THEN unread_count_parent
            ELSE unread_count_parent + 1
        END,
        unread_count_therapist = CASE 
            WHEN NEW.sender_id != therapist_id THEN unread_count_therapist
            ELSE unread_count_therapist + 1
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Reset unread count when message is read
CREATE OR REPLACE FUNCTION update_conversation_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when read_status changes from false to true
    IF OLD.read_status = false AND NEW.read_status = true THEN
        UPDATE conversations 
        SET 
            unread_count_parent = CASE 
                WHEN NEW.recipient_id = parent_id THEN GREATEST(0, unread_count_parent - 1)
                ELSE unread_count_parent
            END,
            unread_count_therapist = CASE 
                WHEN NEW.recipient_id = therapist_id THEN GREATEST(0, unread_count_therapist - 1)
                ELSE unread_count_therapist
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_unread_count
    AFTER UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_unread_count();

-- Update timestamps automatically
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_voice_calls_updated_at 
    BEFORE UPDATE ON voice_calls 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Create conversation with proper initialization
CREATE OR REPLACE FUNCTION create_conversation_with_participants(
    p_parent_id UUID,
    p_therapist_id UUID,
    p_student_id UUID,
    p_title_ar TEXT DEFAULT NULL,
    p_title_en TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    conversation_uuid UUID;
BEGIN
    -- Insert conversation
    INSERT INTO conversations (
        parent_id, therapist_id, student_id, 
        title_ar, title_en, created_by
    ) VALUES (
        p_parent_id, p_therapist_id, p_student_id,
        p_title_ar, p_title_en, auth.uid()
    ) RETURNING id INTO conversation_uuid;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id, role, added_by) VALUES
        (conversation_uuid, p_parent_id, 'primary_parent', auth.uid()),
        (conversation_uuid, p_therapist_id, 'primary_therapist', auth.uid());
    
    RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread message count for user
CREATE OR REPLACE FUNCTION get_user_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN user_uuid = parent_id THEN unread_count_parent
            WHEN user_uuid = therapist_id THEN unread_count_therapist
            ELSE 0
        END
    ), 0) INTO unread_count
    FROM conversations
    WHERE (parent_id = user_uuid OR therapist_id = user_uuid)
    AND status = 'active';
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all messages as read in a conversation
CREATE OR REPLACE FUNCTION mark_conversation_messages_read(
    p_conversation_id UUID,
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages 
    SET 
        read_status = true,
        read_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = p_conversation_id
    AND recipient_id = p_user_id
    AND read_status = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Reset unread count for this user in conversation
    UPDATE conversations 
    SET 
        unread_count_parent = CASE 
            WHEN p_user_id = parent_id THEN 0
            ELSE unread_count_parent
        END,
        unread_count_therapist = CASE 
            WHEN p_user_id = therapist_id THEN 0
            ELSE unread_count_therapist
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_conversation_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VIEWS FOR OPTIMIZED QUERIES
-- =============================================================================

-- Conversation summary view with latest message
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    c.*,
    -- Latest message details
    latest.content_ar as last_message_ar,
    latest.content_en as last_message_en,
    latest.message_type as last_message_type,
    latest.priority_level as last_message_priority,
    latest.created_at as last_message_time,
    
    -- Participant details
    parent_profile.name as parent_name,
    parent_profile.email as parent_email,
    therapist_profile.name as therapist_name,
    therapist_profile.email as therapist_email,
    
    -- Student details
    student.first_name_ar,
    student.last_name_ar,
    student.first_name_en,
    student.last_name_en,
    student.registration_number
    
FROM conversations c
LEFT JOIN messages latest ON latest.id = (
    SELECT id FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
)
LEFT JOIN profiles parent_profile ON parent_profile.id = c.parent_id
LEFT JOIN profiles therapist_profile ON therapist_profile.id = c.therapist_id
LEFT JOIN students student ON student.id = c.student_id;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE conversations IS 'Parent-Therapist conversation threads with bilingual support and real-time features';
COMMENT ON TABLE messages IS 'Individual messages within conversations supporting text, media, and priority levels';
COMMENT ON TABLE voice_calls IS 'Voice communication tracking with WebRTC integration and quality metrics';
COMMENT ON TABLE message_reactions IS 'Emoji reactions and acknowledgments for messages';
COMMENT ON TABLE conversation_participants IS 'Extended participant management for group conversations';

-- Communication platform schema complete
-- This schema supports real-time messaging, voice communication,
-- media sharing, and priority alert processing for the Arkan Al-Numo
-- therapy center communication platform.