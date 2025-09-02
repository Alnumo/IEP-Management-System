// Custom hook for managing session media documentation
// Story 1.3: Media-Rich Progress Documentation Workflow

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  SessionMedia,
  CreateSessionMediaDto,
  UpdateSessionMediaDto,
  SessionMediaWithReviews,
  MediaSearchParams,
  MediaListResponse,
  MediaUploadProgress,
  StudentMediaSummary,
  PracticeReview,
  CreatePracticeReviewDto,
  UpdatePracticeReviewDto,
  MediaCollection,
  CreateMediaCollectionDto,
  UpdateMediaCollectionDto,
  MediaCollectionWithStats,
  MediaGoalTag,
  CreateMediaGoalTagDto,
  BulkMediaAction,
  BulkMediaResult,
  MediaAnalytics
} from '@/types/media'

// Query keys for React Query cache management
export const MEDIA_QUERY_KEYS = {
  all: ['session-media'] as const,
  lists: () => [...MEDIA_QUERY_KEYS.all, 'list'] as const,
  list: (params: MediaSearchParams) => [...MEDIA_QUERY_KEYS.lists(), params] as const,
  details: () => [...MEDIA_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...MEDIA_QUERY_KEYS.details(), id] as const,
  student: (studentId: string) => [...MEDIA_QUERY_KEYS.all, 'student', studentId] as const,
  session: (sessionId: string) => [...MEDIA_QUERY_KEYS.all, 'session', sessionId] as const,
  summary: () => [...MEDIA_QUERY_KEYS.all, 'summary'] as const,
  studentSummary: (studentId: string) => [...MEDIA_QUERY_KEYS.summary(), studentId] as const,
  reviews: () => [...MEDIA_QUERY_KEYS.all, 'reviews'] as const,
  review: (id: string) => [...MEDIA_QUERY_KEYS.reviews(), id] as const,
  collections: () => [...MEDIA_QUERY_KEYS.all, 'collections'] as const,
  collection: (id: string) => [...MEDIA_QUERY_KEYS.collections(), id] as const,
  collectionItems: (collectionId: string) => [...MEDIA_QUERY_KEYS.collections(), collectionId, 'items'] as const,
  goals: () => [...MEDIA_QUERY_KEYS.all, 'goals'] as const,
  mediaGoals: (mediaId: string) => [...MEDIA_QUERY_KEYS.goals(), mediaId] as const,
  analytics: () => [...MEDIA_QUERY_KEYS.all, 'analytics'] as const,
} as const

// Hook for fetching session media with advanced filtering
export function useSessionMedia(params: MediaSearchParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.list(params),
    queryFn: async (): Promise<MediaListResponse> => {
      let query = supabase
        .from('session_media_with_reviews')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (params.student_id) {
        query = query.eq('student_id', params.student_id)
      }
      if (params.session_id) {
        query = query.eq('session_id', params.session_id)
      }
      if (params.media_type) {
        query = query.eq('media_type', params.media_type)
      }
      if (params.upload_type) {
        query = query.eq('upload_type', params.upload_type)
      }
      if (params.uploaded_by) {
        query = query.eq('uploaded_by', params.uploaded_by)
      }
      if (params.processing_status) {
        query = query.eq('processing_status', params.processing_status)
      }
      if (params.is_featured !== undefined) {
        query = query.eq('is_featured', params.is_featured)
      }
      if (params.has_review !== undefined) {
        if (params.has_review) {
          query = query.not('review_status', 'is', null)
        } else {
          query = query.is('review_status', null)
        }
      }
      if (params.review_status) {
        query = query.eq('review_status', params.review_status)
      }
      if (params.tags && params.tags.length > 0) {
        query = query.contains('tags', params.tags)
      }
      if (params.date_from) {
        query = query.gte('created_at', params.date_from)
      }
      if (params.date_to) {
        query = query.lte('created_at', params.date_to)
      }
      if (params.search_query) {
        query = query.or(`caption_ar.ilike.%${params.search_query}%,caption_en.ilike.%${params.search_query}%,description_ar.ilike.%${params.search_query}%,description_en.ilike.%${params.search_query}%`)
      }

      // Pagination
      const page = params.page || 1
      const limit = params.limit || 20
      const offset = (page - 1) * limit

      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch session media: ${error.message}`)
      }

      return {
        media: data as SessionMediaWithReviews[],
        total_count: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit)
      }
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Hook for fetching a single media item
export function useSessionMediaDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<SessionMediaWithReviews> => {
      const { data, error } = await supabase
        .from('session_media_with_reviews')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch media detail: ${error.message}`)
      }

      return data
    },
    enabled: options?.enabled !== false && !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for fetching student media summary
export function useStudentMediaSummary(studentId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.studentSummary(studentId),
    queryFn: async (): Promise<StudentMediaSummary> => {
      const { data, error } = await supabase
        .from('student_media_summary')
        .select('*')
        .eq('student_id', studentId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch student media summary: ${error.message}`)
      }

      return data
    },
    enabled: options?.enabled !== false && !!studentId,
    staleTime: 10 * 60 * 1000, // 10 minutes for summary data
  })
}

// Hook for creating new session media
export function useCreateSessionMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSessionMediaDto): Promise<SessionMedia> => {
      const { data: media, error } = await supabase
        .from('session_media')
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create session media: ${error.message}`)
      }

      return media
    },
    onSuccess: (newMedia) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all })
      
      // Update student summary if available
      if (newMedia.student_id) {
        queryClient.invalidateQueries({ 
          queryKey: MEDIA_QUERY_KEYS.studentSummary(newMedia.student_id) 
        })
      }
      
      // Update session media if session_id is available
      if (newMedia.session_id) {
        queryClient.invalidateQueries({ 
          queryKey: MEDIA_QUERY_KEYS.session(newMedia.session_id) 
        })
      }
    },
  })
}

// Hook for updating session media
export function useUpdateSessionMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSessionMediaDto }): Promise<SessionMedia> => {
      const { data: media, error } = await supabase
        .from('session_media')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update session media: ${error.message}`)
      }

      return media
    },
    onSuccess: (updatedMedia, variables) => {
      // Update specific media cache
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.detail(variables.id) 
      })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
      
      // Update student summary
      if (updatedMedia.student_id) {
        queryClient.invalidateQueries({ 
          queryKey: MEDIA_QUERY_KEYS.studentSummary(updatedMedia.student_id) 
        })
      }
    },
  })
}

// Hook for deleting session media
export function useDeleteSessionMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('session_media')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete session media: ${error.message}`)
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: MEDIA_QUERY_KEYS.detail(id) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all })
    },
  })
}

// Hook for creating practice reviews
export function useCreatePracticeReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePracticeReviewDto): Promise<PracticeReview> => {
      const { data: review, error } = await supabase
        .from('practice_reviews')
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create practice review: ${error.message}`)
      }

      return review
    },
    onSuccess: (newReview) => {
      // Update media detail
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.detail(newReview.media_id) 
      })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
    },
  })
}

// Hook for updating practice reviews
export function useUpdatePracticeReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePracticeReviewDto }): Promise<PracticeReview> => {
      const { data: review, error } = await supabase
        .from('practice_reviews')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update practice review: ${error.message}`)
      }

      return review
    },
    onSuccess: (updatedReview) => {
      // Update specific review cache
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.review(updatedReview.id) 
      })
      
      // Update media detail
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.detail(updatedReview.media_id) 
      })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
    },
  })
}

// Hook for fetching media collections
export function useMediaCollections(studentId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.collections(),
    queryFn: async (): Promise<MediaCollectionWithStats[]> => {
      let query = supabase
        .from('media_collections_with_stats')
        .select('*')
        .order('sort_order')

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch media collections: ${error.message}`)
      }

      return data
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  })
}

// Hook for creating media collections
export function useCreateMediaCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMediaCollectionDto): Promise<MediaCollection> => {
      const { data: collection, error } = await supabase
        .from('media_collections')
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create media collection: ${error.message}`)
      }

      return collection
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.collections() })
    },
  })
}

// Hook for updating media collections
export function useUpdateMediaCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMediaCollectionDto }): Promise<MediaCollection> => {
      const { data: collection, error } = await supabase
        .from('media_collections')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update media collection: ${error.message}`)
      }

      return collection
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.collection(variables.id) 
      })
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.collections() })
    },
  })
}

// Hook for adding media to collection
export function useAddMediaToCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectionId, mediaId, notes }: { 
      collectionId: string; 
      mediaId: string; 
      notes?: string 
    }): Promise<void> => {
      const { error } = await supabase
        .from('media_collection_items')
        .insert({
          collection_id: collectionId,
          media_id: mediaId,
          item_notes: notes,
        })

      if (error) {
        throw new Error(`Failed to add media to collection: ${error.message}`)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.collectionItems(variables.collectionId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.collection(variables.collectionId) 
      })
    },
  })
}

// Hook for bulk media operations
export function useBulkMediaAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (action: BulkMediaAction): Promise<BulkMediaResult> => {
      const results: BulkMediaResult = {
        successful_count: 0,
        failed_count: 0,
        errors: []
      }

      // Process each media item
      for (const mediaId of action.media_ids) {
        try {
          switch (action.action) {
            case 'delete':
              await supabase
                .from('session_media')
                .delete()
                .eq('id', mediaId)
              break
            
            case 'update_privacy':
              await supabase
                .from('session_media')
                .update({ is_private: action.parameters?.is_private })
                .eq('id', mediaId)
              break
            
            case 'add_tags':
              const { data: currentMedia } = await supabase
                .from('session_media')
                .select('tags')
                .eq('id', mediaId)
                .single()
              
              if (currentMedia) {
                const newTags = [...(currentMedia.tags || []), ...(action.parameters?.tags || [])]
                const uniqueTags = [...new Set(newTags)]
                
                await supabase
                  .from('session_media')
                  .update({ tags: uniqueTags })
                  .eq('id', mediaId)
              }
              break
            
            case 'remove_tags':
              const { data: mediaToUpdate } = await supabase
                .from('session_media')
                .select('tags')
                .eq('id', mediaId)
                .single()
              
              if (mediaToUpdate) {
                const tagsToRemove = action.parameters?.tags || []
                const updatedTags = (mediaToUpdate.tags || []).filter(
                  tag => !tagsToRemove.includes(tag)
                )
                
                await supabase
                  .from('session_media')
                  .update({ tags: updatedTags })
                  .eq('id', mediaId)
              }
              break
          }
          
          results.successful_count++
        } catch (error) {
          results.failed_count++
          results.errors.push({
            media_id: mediaId,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all })
    },
  })
}

// Hook for fetching media analytics
export function useMediaAnalytics(studentId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.analytics(),
    queryFn: async (): Promise<MediaAnalytics> => {
      // This would typically be a more complex aggregation query
      // For now, we'll construct it from basic queries
      let baseQuery = supabase.from('session_media').select('*')
      
      if (studentId) {
        baseQuery = baseQuery.eq('student_id', studentId)
      }
      if (dateFrom) {
        baseQuery = baseQuery.gte('created_at', dateFrom)
      }
      if (dateTo) {
        baseQuery = baseQuery.lte('created_at', dateTo)
      }

      const { data: mediaData, error } = await baseQuery

      if (error) {
        throw new Error(`Failed to fetch media analytics: ${error.message}`)
      }

      // Calculate analytics from the data
      const analytics: MediaAnalytics = {
        total_media_count: mediaData?.length || 0,
        media_by_type: {
          photo: mediaData?.filter(m => m.media_type === 'photo').length || 0,
          video: mediaData?.filter(m => m.media_type === 'video').length || 0,
          audio: mediaData?.filter(m => m.media_type === 'audio').length || 0,
          document: mediaData?.filter(m => m.media_type === 'document').length || 0,
        },
        media_by_upload_type: {
          session_documentation: mediaData?.filter(m => m.upload_type === 'session_documentation').length || 0,
          home_practice: mediaData?.filter(m => m.upload_type === 'home_practice').length || 0,
          progress_update: mediaData?.filter(m => m.upload_type === 'progress_update').length || 0,
          milestone_celebration: mediaData?.filter(m => m.upload_type === 'milestone_celebration').length || 0,
        },
        storage_usage_bytes: mediaData?.reduce((sum, m) => sum + (m.file_size || 0), 0) || 0,
        avg_media_per_session: 0, // Would need session count
        most_active_uploaders: [], // Would need user data
        media_engagement_rate: 0, // Would need access log data
        review_completion_rate: 0, // Would need review data
      }

      return analytics
    },
    staleTime: 15 * 60 * 1000, // 15 minutes for analytics
  })
}

// Hook for tagging media with goals
export function useCreateMediaGoalTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMediaGoalTagDto): Promise<MediaGoalTag> => {
      const { data: tag, error } = await supabase
        .from('media_goal_tags')
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create media goal tag: ${error.message}`)
      }

      return tag
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.mediaGoals(newTag.media_id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: MEDIA_QUERY_KEYS.detail(newTag.media_id) 
      })
    },
  })
}

// Hook for media file upload progress tracking
export function useMediaUploadProgress() {
  // This would integrate with a file upload service
  // For now, we'll return a basic implementation
  return {
    uploadProgress: {} as Record<string, MediaUploadProgress>,
    startUpload: (file: File) => {
      // Implementation would depend on upload service
      return Promise.resolve()
    },
    cancelUpload: (uploadId: string) => {
      // Implementation would cancel the upload
    }
  }
}