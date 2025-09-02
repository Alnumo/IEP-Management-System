// Media Upload Service for Session Media Documentation
// Story 1.3: Media-Rich Progress Documentation Workflow

import { supabase } from '@/lib/supabase'
import type { 
  MediaUploadProgress, 
  MediaUploadConfig, 
  SessionMedia,
  CreateSessionMediaDto,
  MediaType 
} from '@/types/media'

// Default upload configuration
const DEFAULT_CONFIG: MediaUploadConfig = {
  max_file_size: 50 * 1024 * 1024, // 50MB
  allowed_file_types: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/avi', 'video/mov', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf', 'text/plain'
  ],
  chunk_size: 1024 * 1024, // 1MB chunks
  concurrent_uploads: 3,
  compression_enabled: true,
  thumbnail_generation: true
}

// Upload progress tracking
class UploadProgressTracker {
  private progressCallbacks: Record<string, (progress: MediaUploadProgress) => void> = {}
  private uploadStates: Record<string, MediaUploadProgress> = {}

  public subscribe(uploadId: string, callback: (progress: MediaUploadProgress) => void) {
    this.progressCallbacks[uploadId] = callback
  }

  public unsubscribe(uploadId: string) {
    delete this.progressCallbacks[uploadId]
    delete this.uploadStates[uploadId]
  }

  public updateProgress(uploadId: string, progress: MediaUploadProgress) {
    this.uploadStates[uploadId] = progress
    const callback = this.progressCallbacks[uploadId]
    if (callback) {
      callback(progress)
    }
  }

  public getProgress(uploadId: string): MediaUploadProgress | undefined {
    return this.uploadStates[uploadId]
  }

  public getAllProgress(): Record<string, MediaUploadProgress> {
    return { ...this.uploadStates }
  }
}

const progressTracker = new UploadProgressTracker()

// Utility functions
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getMediaTypeFromMimeType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'photo'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function generateStoragePath(studentId: string, sessionId: string | undefined, fileName: string): string {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  
  if (sessionId) {
    return `students/${studentId}/sessions/${sessionId}/${timestamp}_${sanitizedFileName}`
  }
  
  return `students/${studentId}/media/${timestamp}_${sanitizedFileName}`
}

function validateFile(file: File, config: MediaUploadConfig = DEFAULT_CONFIG): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.max_file_size) {
    const maxSizeMB = Math.round(config.max_file_size / (1024 * 1024))
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    }
  }

  // Check file type
  if (!config.allowed_file_types.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    }
  }

  return { valid: true }
}

// Image compression utility
async function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file) // Return original if compression fails
        }
      }, file.type, quality)
    }

    img.onerror = () => resolve(file) // Return original if processing fails
    img.src = URL.createObjectURL(file)
  })
}

// Thumbnail generation utility
async function generateThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return undefined
  }

  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const size = 200 // Thumbnail size
        canvas.width = size
        canvas.height = size

        // Calculate crop dimensions for square thumbnail
        const { width, height } = img
        const cropSize = Math.min(width, height)
        const cropX = (width - cropSize) / 2
        const cropY = (height - cropSize) / 2

        ctx?.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.onerror = () => resolve(undefined)
      img.src = URL.createObjectURL(file)
    } else {
      // For videos, we'd need a more complex solution
      // For now, return undefined
      resolve(undefined)
    }
  })
}

// Main upload service class
export class MediaUploadService {
  private config: MediaUploadConfig

  constructor(config: Partial<MediaUploadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Single file upload
  async uploadFile(
    file: File,
    params: {
      studentId: string
      sessionId?: string
      uploadType: CreateSessionMediaDto['upload_type']
      captionAr?: string
      captionEn?: string
      descriptionAr?: string
      descriptionEn?: string
      tags?: string[]
      isPrivate?: boolean
      isFeatured?: boolean
    },
    onProgress?: (progress: MediaUploadProgress) => void
  ): Promise<SessionMedia> {
    const uploadId = generateUploadId()

    try {
      // Validate file
      const validation = validateFile(file, this.config)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Initialize progress
      let progress: MediaUploadProgress = {
        id: uploadId,
        file_name: file.name,
        file_size: file.size,
        uploaded_bytes: 0,
        progress_percentage: 0,
        status: 'pending'
      }

      const updateProgress = (updates: Partial<MediaUploadProgress>) => {
        progress = { ...progress, ...updates }
        progressTracker.updateProgress(uploadId, progress)
        onProgress?.(progress)
      }

      updateProgress({ status: 'uploading' })

      // Process file (compression if needed)
      let processedFile = file
      if (this.config.compression_enabled && file.type.startsWith('image/')) {
        processedFile = await compressImage(file)
        updateProgress({ progress_percentage: 10 })
      }

      // Generate storage path
      const storagePath = generateStoragePath(params.studentId, params.sessionId, processedFile.name)

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('therapy-media')
        .upload(storagePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      updateProgress({ progress_percentage: 70 })

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('therapy-media')
        .getPublicUrl(storagePath)

      // Generate thumbnail if supported
      let thumbnailUrl: string | undefined
      if (this.config.thumbnail_generation) {
        const thumbnailDataUrl = await generateThumbnail(processedFile)
        if (thumbnailDataUrl) {
          const thumbnailPath = `${storagePath}_thumbnail`
          const thumbnailBlob = await fetch(thumbnailDataUrl).then(r => r.blob())
          
          const { error: thumbnailError } = await supabase.storage
            .from('therapy-media')
            .upload(thumbnailPath, thumbnailBlob)

          if (!thumbnailError) {
            const { data: thumbnailUrlData } = supabase.storage
              .from('therapy-media')
              .getPublicUrl(thumbnailPath)
            thumbnailUrl = thumbnailUrlData.publicUrl
          }
        }
      }

      updateProgress({ progress_percentage: 85 })

      // Get image/video dimensions if applicable
      let width: number | undefined
      let height: number | undefined
      let durationSeconds: number | undefined

      if (processedFile.type.startsWith('image/')) {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => resolve({ width: 0, height: 0 })
          img.src = urlData.publicUrl
        })
        width = dimensions.width
        height = dimensions.height
      }

      // Create database record
      const mediaData: CreateSessionMediaDto = {
        student_id: params.studentId,
        session_id: params.sessionId,
        media_type: getMediaTypeFromMimeType(processedFile.type),
        file_url: urlData.publicUrl,
        file_name: processedFile.name,
        file_size: processedFile.size,
        file_extension: getFileExtension(processedFile.name),
        mime_type: processedFile.type,
        thumbnail_url: thumbnailUrl,
        width,
        height,
        duration_seconds: durationSeconds,
        caption_ar: params.captionAr,
        caption_en: params.captionEn,
        description_ar: params.descriptionAr,
        description_en: params.descriptionEn,
        upload_type: params.uploadType,
        upload_device: 'web',
        is_private: params.isPrivate || false,
        is_featured: params.isFeatured || false,
        tags: params.tags
      }

      const { data: media, error: dbError } = await supabase
        .from('session_media')
        .insert(mediaData)
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('therapy-media')
          .remove([storagePath])
        
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      updateProgress({ 
        progress_percentage: 100, 
        status: 'completed',
        uploaded_bytes: processedFile.size
      })

      // Log access
      await this.logMediaAccess(media.id, 'upload')

      return media

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      progressTracker.updateProgress(uploadId, {
        ...progressTracker.getProgress(uploadId)!,
        status: 'error',
        error_message: errorMessage
      })

      onProgress?.({
        ...progressTracker.getProgress(uploadId)!,
        status: 'error',
        error_message: errorMessage
      })

      throw error
    } finally {
      // Clean up progress tracking after a delay
      setTimeout(() => {
        progressTracker.unsubscribe(uploadId)
      }, 10000) // 10 seconds
    }
  }

  // Batch file upload
  async uploadFiles(
    files: File[],
    params: {
      studentId: string
      sessionId?: string
      uploadType: CreateSessionMediaDto['upload_type']
      defaultCaptionAr?: string
      defaultCaptionEn?: string
      tags?: string[]
      isPrivate?: boolean
    },
    onProgress?: (results: { completed: SessionMedia[]; failed: { file: File; error: string }[]; inProgress: MediaUploadProgress[] }) => void
  ): Promise<{ completed: SessionMedia[]; failed: { file: File; error: string }[] }> {
    const results: { completed: SessionMedia[]; failed: { file: File; error: string }[] } = {
      completed: [],
      failed: []
    }

    const inProgressUploads: MediaUploadProgress[] = []

    // Process files with concurrency limit
    const chunks = []
    for (let i = 0; i < files.length; i += this.config.concurrent_uploads) {
      chunks.push(files.slice(i, i + this.config.concurrent_uploads))
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        try {
          const media = await this.uploadFile(
            file,
            {
              ...params,
              captionAr: params.defaultCaptionAr,
              captionEn: params.defaultCaptionEn
            },
            (progress) => {
              const existingIndex = inProgressUploads.findIndex(p => p.id === progress.id)
              if (existingIndex >= 0) {
                inProgressUploads[existingIndex] = progress
              } else {
                inProgressUploads.push(progress)
              }
              
              onProgress?.({ ...results, inProgress: inProgressUploads })
            }
          )
          
          results.completed.push(media)
        } catch (error) {
          results.failed.push({
            file,
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      })

      await Promise.all(chunkPromises)
    }

    return results
  }

  // Cancel upload
  async cancelUpload(uploadId: string): Promise<void> {
    const progress = progressTracker.getProgress(uploadId)
    if (progress) {
      progressTracker.updateProgress(uploadId, {
        ...progress,
        status: 'error',
        error_message: 'Upload cancelled by user'
      })
    }
    
    progressTracker.unsubscribe(uploadId)
  }

  // Get upload progress
  getUploadProgress(uploadId: string): MediaUploadProgress | undefined {
    return progressTracker.getProgress(uploadId)
  }

  // Get all upload progress
  getAllUploadProgress(): Record<string, MediaUploadProgress> {
    return progressTracker.getAllProgress()
  }

  // Subscribe to upload progress
  subscribeToProgress(uploadId: string, callback: (progress: MediaUploadProgress) => void): void {
    progressTracker.subscribe(uploadId, callback)
  }

  // Unsubscribe from upload progress
  unsubscribeFromProgress(uploadId: string): void {
    progressTracker.unsubscribe(uploadId)
  }

  // Log media access for audit trail
  private async logMediaAccess(mediaId: string, accessType: 'upload' | 'view' | 'download' | 'edit' | 'delete'): Promise<void> {
    try {
      await supabase
        .from('media_access_log')
        .insert({
          media_id: mediaId,
          access_type: accessType,
          access_method: 'web',
          ip_address: '', // Would be filled by server
          user_agent: navigator.userAgent
        })
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.warn('Failed to log media access:', error)
    }
  }

  // Delete media file and database record
  async deleteMedia(mediaId: string): Promise<void> {
    // Get media record first
    const { data: media, error: fetchError } = await supabase
      .from('session_media')
      .select('file_url, thumbnail_url')
      .eq('id', mediaId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch media record: ${fetchError.message}`)
    }

    // Extract storage path from URL
    const extractPathFromUrl = (url: string): string => {
      const urlParts = url.split('/')
      return urlParts.slice(-3).join('/') // Get the last 3 parts: students/id/sessions/id/file
    }

    // Delete from storage
    const filesToDelete = [extractPathFromUrl(media.file_url)]
    if (media.thumbnail_url) {
      filesToDelete.push(extractPathFromUrl(media.thumbnail_url))
    }

    const { error: storageError } = await supabase.storage
      .from('therapy-media')
      .remove(filesToDelete)

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('session_media')
      .delete()
      .eq('id', mediaId)

    if (dbError) {
      throw new Error(`Failed to delete media record: ${dbError.message}`)
    }

    // Log access
    await this.logMediaAccess(mediaId, 'delete')
  }
}

// Create and export default instance
export const mediaUploadService = new MediaUploadService()

// Export utility functions
export {
  generateUploadId,
  getMediaTypeFromMimeType,
  validateFile,
  DEFAULT_CONFIG as defaultUploadConfig
}