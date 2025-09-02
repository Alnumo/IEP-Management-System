// Media Documentation System Types
// Supporting Story 1.3: Media-Rich Progress Documentation Workflow

export type MediaType = 'photo' | 'video' | 'audio' | 'document';

export type UploadType = 'session_documentation' | 'home_practice' | 'progress_update' | 'milestone_celebration';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ReviewStatus = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'incorrect';

export type CollectionType = 'general' | 'milestone' | 'assessment' | 'progress_tracking' | 'home_practice';

export type PermissionType = 'view' | 'download' | 'comment' | 'share';

export type AccessType = 'view' | 'download' | 'upload' | 'edit' | 'delete';

// Core media interface
export interface SessionMedia {
  id: string;
  session_id?: string;
  student_id: string;
  
  // Media Information
  media_type: MediaType;
  file_url: string;
  file_name: string;
  file_size: number;
  file_extension?: string;
  mime_type?: string;
  
  // Media Metadata
  duration_seconds?: number;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  
  // Content Information
  caption_ar?: string;
  caption_en?: string;
  description_ar?: string;
  description_en?: string;
  
  // Upload Information
  uploaded_by: string;
  upload_type: UploadType;
  upload_device?: string;
  upload_location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  
  // Organization
  is_featured: boolean;
  is_private: boolean;
  tags?: string[];
  
  // Processing Status
  processing_status: ProcessingStatus;
  compression_applied: boolean;
  thumbnail_generated: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Interface for creating new media
export interface CreateSessionMediaDto {
  session_id?: string;
  student_id: string;
  media_type: MediaType;
  file_url: string;
  file_name: string;
  file_size: number;
  file_extension?: string;
  mime_type?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  caption_ar?: string;
  caption_en?: string;
  description_ar?: string;
  description_en?: string;
  upload_type: UploadType;
  upload_device?: string;
  is_featured?: boolean;
  is_private?: boolean;
  tags?: string[];
}

// Interface for updating media
export interface UpdateSessionMediaDto {
  caption_ar?: string;
  caption_en?: string;
  description_ar?: string;
  description_en?: string;
  is_featured?: boolean;
  is_private?: boolean;
  tags?: string[];
}

// Media goal tag interface
export interface MediaGoalTag {
  id: string;
  media_id: string;
  goal_id?: string;
  goal_title_ar?: string;
  goal_title_en?: string;
  relevance_score: number;
  tagged_by: string;
  tag_notes?: string;
  created_at: string;
}

export interface CreateMediaGoalTagDto {
  media_id: string;
  goal_id?: string;
  goal_title_ar?: string;
  goal_title_en?: string;
  relevance_score?: number;
  tag_notes?: string;
}

// Practice review interface
export interface PracticeReview {
  id: string;
  media_id: string;
  reviewed_by: string;
  review_status: ReviewStatus;
  feedback_ar?: string;
  feedback_en?: string;
  technique_rating?: number;
  consistency_rating?: number;
  engagement_rating?: number;
  follow_up_needed: boolean;
  corrective_media_url?: string;
  next_practice_suggestions?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreatePracticeReviewDto {
  media_id: string;
  review_status: ReviewStatus;
  feedback_ar?: string;
  feedback_en?: string;
  technique_rating?: number;
  consistency_rating?: number;
  engagement_rating?: number;
  follow_up_needed?: boolean;
  corrective_media_url?: string;
  next_practice_suggestions?: string;
}

export interface UpdatePracticeReviewDto {
  review_status?: ReviewStatus;
  feedback_ar?: string;
  feedback_en?: string;
  technique_rating?: number;
  consistency_rating?: number;
  engagement_rating?: number;
  follow_up_needed?: boolean;
  corrective_media_url?: string;
  next_practice_suggestions?: string;
}

// Media collection interface
export interface MediaCollection {
  id: string;
  title_ar: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  student_id: string;
  created_by: string;
  is_public: boolean;
  is_milestone_collection: boolean;
  collection_type: CollectionType;
  cover_media_id?: string;
  sort_order: number;
  color_theme: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface CreateMediaCollectionDto {
  title_ar: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  student_id: string;
  is_public?: boolean;
  is_milestone_collection?: boolean;
  collection_type?: CollectionType;
  cover_media_id?: string;
  sort_order?: number;
  color_theme?: string;
}

export interface UpdateMediaCollectionDto {
  title_ar?: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  is_public?: boolean;
  is_milestone_collection?: boolean;
  collection_type?: CollectionType;
  cover_media_id?: string;
  sort_order?: number;
  color_theme?: string;
}

// Media collection item interface
export interface MediaCollectionItem {
  id: string;
  collection_id: string;
  media_id: string;
  sort_order: number;
  added_by: string;
  item_notes?: string;
  created_at: string;
}

export interface CreateMediaCollectionItemDto {
  collection_id: string;
  media_id: string;
  sort_order?: number;
  item_notes?: string;
}

// Media sharing permissions interface
export interface MediaSharingPermission {
  id: string;
  media_id: string;
  user_id: string;
  permission_type: PermissionType;
  granted_by: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateMediaSharingPermissionDto {
  media_id: string;
  user_id: string;
  permission_type: PermissionType;
  expires_at?: string;
}

// Media access log interface
export interface MediaAccessLog {
  id: string;
  media_id: string;
  accessed_by: string;
  access_type: AccessType;
  access_method: string;
  ip_address?: string;
  user_agent?: string;
  session_context?: Record<string, any>;
  created_at: string;
}

export interface CreateMediaAccessLogDto {
  media_id: string;
  access_type: AccessType;
  access_method?: string;
  ip_address?: string;
  user_agent?: string;
  session_context?: Record<string, any>;
}

// View interfaces for enhanced data retrieval
export interface StudentMediaSummary {
  student_id: string;
  student_name_ar: string;
  student_name_en: string;
  total_media_count: number;
  photo_count: number;
  video_count: number;
  session_media_count: number;
  home_practice_count: number;
  reviewed_practice_count: number;
  latest_media_date: string;
  total_storage_bytes: number;
}

export interface SessionMediaWithReviews extends SessionMedia {
  session_number?: string;
  scheduled_date?: string;
  session_status?: string;
  therapist_name_ar?: string;
  therapist_name_en?: string;
  review_status?: ReviewStatus;
  feedback_ar?: string;
  feedback_en?: string;
  technique_rating?: number;
  consistency_rating?: number;
  engagement_rating?: number;
  follow_up_needed?: boolean;
}

export interface MediaCollectionWithStats extends MediaCollection {
  student_name_ar: string;
  student_name_en: string;
  media_count: number;
  latest_media_date: string;
  cover_image_url?: string;
  cover_thumbnail_url?: string;
}

// Upload progress tracking
export interface MediaUploadProgress {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_bytes: number;
  progress_percentage: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error_message?: string;
  estimated_time_remaining?: number;
}

// Media upload configuration
export interface MediaUploadConfig {
  max_file_size: number;
  allowed_file_types: string[];
  chunk_size: number;
  concurrent_uploads: number;
  compression_enabled: boolean;
  thumbnail_generation: boolean;
}

// Media search and filter interfaces
export interface MediaSearchParams {
  student_id?: string;
  session_id?: string;
  media_type?: MediaType;
  upload_type?: UploadType;
  uploaded_by?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  has_review?: boolean;
  review_status?: ReviewStatus;
  is_featured?: boolean;
  processing_status?: ProcessingStatus;
  search_query?: string; // Search in captions, descriptions
}

export interface MediaSortOptions {
  field: 'created_at' | 'file_size' | 'upload_type' | 'media_type' | 'review_status';
  direction: 'asc' | 'desc';
}

export interface MediaListResponse {
  media: SessionMediaWithReviews[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Media analytics interfaces
export interface MediaAnalytics {
  total_media_count: number;
  media_by_type: Record<MediaType, number>;
  media_by_upload_type: Record<UploadType, number>;
  storage_usage_bytes: number;
  avg_media_per_session: number;
  most_active_uploaders: Array<{
    user_id: string;
    user_name: string;
    upload_count: number;
  }>;
  media_engagement_rate: number; // Percentage of media that has been viewed
  review_completion_rate: number; // Percentage of home practice media that has been reviewed
}

// Bulk operations interfaces
export interface BulkMediaAction {
  action: 'delete' | 'update_privacy' | 'add_tags' | 'remove_tags' | 'move_to_collection';
  media_ids: string[];
  parameters?: Record<string, any>;
}

export interface BulkMediaResult {
  successful_count: number;
  failed_count: number;
  errors: Array<{
    media_id: string;
    error_message: string;
  }>;
}

// Media processing webhook interfaces
export interface MediaProcessingWebhook {
  media_id: string;
  processing_status: ProcessingStatus;
  thumbnail_url?: string;
  compressed_file_url?: string;
  error_message?: string;
  processing_time_ms: number;
}

// Export statements for table names
export const MEDIA_TABLE_NAMES = {
  SESSION_MEDIA: 'session_media',
  MEDIA_GOAL_TAGS: 'media_goal_tags',
  PRACTICE_REVIEWS: 'practice_reviews',
  MEDIA_COLLECTIONS: 'media_collections',
  MEDIA_COLLECTION_ITEMS: 'media_collection_items',
  MEDIA_SHARING_PERMISSIONS: 'media_sharing_permissions',
  MEDIA_ACCESS_LOG: 'media_access_log',
} as const;