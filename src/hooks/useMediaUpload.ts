import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { retryApiCall } from '@/lib/retry-utils'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { MediaAttachment } from '@/types/communication'

// =====================================================
// COMPRESSION UTILITIES
// =====================================================

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeKB?: number
}

class MediaCompressor {
  // Compress image using canvas
  static async compressImage(
    file: File, 
    options: CompressionOptions = {}
  ): Promise<{ file: File; compressionRatio: number }> {
    
    const {
      maxWidth = 1920,
      maxHeight = 1080, 
      quality = 0.8,
      maxSizeKB = 2048
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = this.calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        )

        canvas.width = width
        canvas.height = height

        // Draw compressed image
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'))
              return
            }

            const originalSize = file.size
            const compressionRatio = (originalSize - blob.size) / originalSize

            // Check if we need further compression
            if (blob.size > maxSizeKB * 1024 && quality > 0.3) {
              // Recursively compress with lower quality
              const newFile = new File([blob], file.name, { type: file.type })
              this.compressImage(newFile, { ...options, quality: quality * 0.8 })
                .then(resolve)
                .catch(reject)
            } else {
              const compressedFile = new File([blob], file.name, { 
                type: file.type,
                lastModified: Date.now()
              })

              resolve({ file: compressedFile, compressionRatio })
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Calculate optimal dimensions while maintaining aspect ratio
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    
    let { width, height } = { width: originalWidth, height: originalHeight }

    // Scale down if larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }

    return { width, height }
  }

  // Compress video (basic compression by reducing quality)
  static async compressVideo(
    file: File,
    options: CompressionOptions = {}
  ): Promise<{ file: File; compressionRatio: number }> {
    
    const { maxSizeKB = 10240 } = options // 10MB default for videos

    // For now, return original if under size limit
    if (file.size <= maxSizeKB * 1024) {
      return { file, compressionRatio: 0 }
    }

    // TODO: Implement actual video compression using FFmpeg.js or similar
    // For now, reject oversized videos with helpful message
    throw new Error(`حجم الفيديو كبير جداً. الحد الأقصى: ${maxSizeKB / 1024}MB`)
  }
}

// =====================================================
// FILE VALIDATION
// =====================================================

interface FileValidationResult {
  isValid: boolean
  error?: string
  fileType: 'image' | 'video' | 'document' | 'other'
}

const validateFile = (file: File): FileValidationResult => {
  // Check file size (50MB max)
  const maxSizeBytes = 50 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى: 50MB',
      fileType: 'other'
    }
  }

  // Determine file type
  let fileType: 'image' | 'video' | 'document' | 'other' = 'other'
  
  if (file.type.startsWith('image/')) {
    fileType = 'image'
    // Supported image types
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!supportedImageTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'نوع الصورة غير مدعوم. الأنواع المدعومة: JPEG, PNG, GIF, WebP',
        fileType
      }
    }
  } 
  else if (file.type.startsWith('video/')) {
    fileType = 'video'
    // Supported video types
    const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    if (!supportedVideoTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'نوع الفيديو غير مدعوم. الأنواع المدعومة: MP4, WebM, OGG',
        fileType
      }
    }
  }
  else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) {
    fileType = 'document'
    // Supported document types
    const supportedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    if (!supportedDocTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'نوع المستند غير مدعوم. الأنواع المدعومة: PDF, Word, نص',
        fileType
      }
    }
  }

  // Check filename for security (basic)
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs']
  if (dangerousExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return {
      isValid: false,
      error: 'نوع الملف غير مسموح لأسباب أمنية',
      fileType
    }
  }

  return {
    isValid: true,
    fileType
  }
}

// =====================================================
// UPLOAD PROGRESS INTERFACE
// =====================================================

interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'error'
  error?: string
  result?: MediaAttachment
}

// =====================================================
// MEDIA UPLOAD HOOK
// =====================================================

export const useMediaUpload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (files: FileList | File[]): Promise<MediaAttachment[]> => {
      return retryApiCall(async () => {
        console.log('🔍 Starting media upload process...')
        
        // Use centralized auth checking
        const user = await requireAuth()
        
        const fileArray = Array.from(files)
        const results: MediaAttachment[] = []

        for (const file of fileArray) {
          try {
            // Validate file
            const validation = validateFile(file)
            if (!validation.isValid) {
              throw new Error(validation.error)
            }

            console.log('📝 Processing file:', file.name, 'Type:', validation.fileType)

            // Compress if needed
            let processedFile = file
            let compressionRatio = 0

            if (validation.fileType === 'image') {
              const compressed = await MediaCompressor.compressImage(file, {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.8,
                maxSizeKB: 2048
              })
              processedFile = compressed.file
              compressionRatio = compressed.compressionRatio
              
              console.log('🗜️ Image compressed:', Math.round(compressionRatio * 100) + '%')
            } 
            else if (validation.fileType === 'video') {
              const compressed = await MediaCompressor.compressVideo(file, {
                maxSizeKB: 10240 // 10MB
              })
              processedFile = compressed.file
              compressionRatio = compressed.compressionRatio
              
              console.log('🎥 Video processed:', Math.round(compressionRatio * 100) + '%')
            }

            // Generate unique filename
            const fileExtension = file.name.split('.').pop()
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
            const storagePath = `conversation-media/${uniqueFileName}`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('conversation-media')
              .upload(storagePath, processedFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
              })

            if (uploadError) {
              console.error('❌ Upload error:', uploadError)
              throw uploadError
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('conversation-media')
              .getPublicUrl(storagePath)

            // Create thumbnail for videos and large images
            let thumbnailPath: string | undefined
            if (validation.fileType === 'video' || (validation.fileType === 'image' && file.size > 1024 * 1024)) {
              thumbnailPath = await generateThumbnail(processedFile, storagePath)
            }

            // Create media attachment record
            const mediaAttachment: Omit<MediaAttachment, 'id'> = {
              filename: file.name,
              file_path: urlData.publicUrl,
              file_size: processedFile.size,
              mime_type: file.type,
              thumbnail_path: thumbnailPath,
              compressed: compressionRatio > 0,
              compression_ratio: compressionRatio,
              // For images
              width: validation.fileType === 'image' ? await getImageDimensions(processedFile).then(d => d.width) : undefined,
              height: validation.fileType === 'image' ? await getImageDimensions(processedFile).then(d => d.height) : undefined,
              // For videos  
              duration: validation.fileType === 'video' ? await getVideoDuration(processedFile) : undefined
            }

            // Save to database
            const { data: savedAttachment, error: saveError } = await supabase
              .from('media_attachments')
              .insert({
                ...mediaAttachment,
                uploaded_by: user.id,
                uploaded_at: new Date().toISOString()
              })
              .select()
              .single()

            if (saveError) {
              console.error('❌ Error saving attachment:', saveError)
              // Clean up uploaded file
              await supabase.storage.from('conversation-media').remove([storagePath])
              throw saveError
            }

            results.push(savedAttachment)
            console.log('✅ Media uploaded successfully:', savedAttachment)

          } catch (error) {
            console.error('❌ Error processing file:', file.name, error)
            errorMonitoring.reportError(error as Error, {
              component: 'useMediaUpload',
              action: 'process_file',
              fileName: file.name,
              userId: user.id
            })
            throw error
          }
        }

        return results
      }, {
        context: 'Uploading media files',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (attachments) => {
      console.log('✅ All media uploaded successfully:', attachments.length, 'files')
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (error) => {
      console.error('❌ Media upload failed:', error)
    }
  })

// Helper function for thumbnail generation
const generateThumbnail = async (file: File, originalPath: string): Promise<string> => {
    try {
      if (file.type.startsWith('image/')) {
        // Generate smaller thumbnail for images
        const thumbnail = await MediaCompressor.compressImage(file, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.6
        })

        const thumbnailPath = `thumbnails/${originalPath}`
        const { error } = await supabase.storage
          .from('conversation-media')
          .upload(thumbnailPath, thumbnail.file)

        if (error) throw error

        const { data } = supabase.storage
          .from('conversation-media')
          .getPublicUrl(thumbnailPath)

        return data.publicUrl
      }

      // For videos, extract first frame (simplified version)
      // TODO: Implement actual video thumbnail extraction
      return ''

    } catch (error) {
      console.error('Thumbnail generation error:', error)
      return ''
    }
  }
}

// Get image dimensions
const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => reject(new Error('Cannot read image dimensions'))
      img.src = URL.createObjectURL(file)
    })
}

// Get video duration
const getVideoDuration = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => resolve(Math.floor(video.duration))
      video.onerror = () => reject(new Error('Cannot read video duration'))
      video.src = URL.createObjectURL(file)
    })
}

// =====================================================
// BATCH UPLOAD WITH PROGRESS
// =====================================================

export const useMediaUploadWithProgress = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      files, 
      onProgress 
    }: { 
      files: FileList | File[]
      onProgress?: (progress: UploadProgress[]) => void 
    }): Promise<MediaAttachment[]> => {
      
      return retryApiCall(async () => {
        console.log('🔍 Starting batch upload with progress tracking...')
        
        const user = await requireAuth()
        const fileArray = Array.from(files)
        const progressState: UploadProgress[] = fileArray.map(file => ({
          file,
          progress: 0,
          status: 'pending'
        }))

        const results: MediaAttachment[] = []

        // Process files sequentially to avoid overwhelming the browser
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i]
          
          try {
            // Update progress: starting compression
            progressState[i].status = 'compressing'
            progressState[i].progress = 10
            onProgress?.(progressState)

            // Validate file
            const validation = validateFile(file)
            if (!validation.isValid) {
              throw new Error(validation.error)
            }

            // Compress file
            let processedFile = file
            let compressionRatio = 0

            if (validation.fileType === 'image') {
              const compressed = await MediaCompressor.compressImage(file)
              processedFile = compressed.file
              compressionRatio = compressed.compressionRatio
            } else if (validation.fileType === 'video') {
              const compressed = await MediaCompressor.compressVideo(file)
              processedFile = compressed.file
              compressionRatio = compressed.compressionRatio
            }

            // Update progress: starting upload
            progressState[i].status = 'uploading'
            progressState[i].progress = 30
            onProgress?.(progressState)

            // Generate filename and upload
            const fileExtension = file.name.split('.').pop()
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
            const storagePath = `conversation-media/${uniqueFileName}`

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('conversation-media')
              .upload(storagePath, processedFile, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
              })

            if (uploadError) throw uploadError

            // Update progress: finalizing
            progressState[i].progress = 80
            onProgress?.(progressState)

            // Get public URL and save to database
            const { data: urlData } = supabase.storage
              .from('conversation-media')
              .getPublicUrl(storagePath)

            // Get additional metadata
            let width: number | undefined
            let height: number | undefined
            let duration: number | undefined

            if (validation.fileType === 'image') {
              const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve({ width: img.width, height: img.height })
                img.onerror = () => reject(new Error('Cannot read dimensions'))
                img.src = URL.createObjectURL(processedFile)
              })
              width = dimensions.width
              height = dimensions.height
            }

            if (validation.fileType === 'video') {
              duration = await new Promise<number>((resolve, reject) => {
                const video = document.createElement('video')
                video.preload = 'metadata'
                video.onloadedmetadata = () => resolve(Math.floor(video.duration))
                video.onerror = () => reject(new Error('Cannot read duration'))
                video.src = URL.createObjectURL(processedFile)
              })
            }

            // Create media attachment
            const attachment: Omit<MediaAttachment, 'id'> = {
              filename: file.name,
              file_path: urlData.publicUrl,
              file_size: processedFile.size,
              mime_type: file.type,
              width,
              height,
              duration,
              compressed: compressionRatio > 0,
              compression_ratio: compressionRatio
            }

            const { data: savedAttachment, error: saveError } = await supabase
              .from('media_attachments')
              .insert({
                ...attachment,
                uploaded_by: user.id,
                uploaded_at: new Date().toISOString()
              })
              .select()
              .single()

            if (saveError) {
              // Clean up uploaded file
              await supabase.storage.from('conversation-media').remove([storagePath])
              throw saveError
            }

            // Update progress: completed
            progressState[i].status = 'completed'
            progressState[i].progress = 100
            progressState[i].result = savedAttachment
            onProgress?.(progressState)

            results.push(savedAttachment)

          } catch (error) {
            console.error('❌ Error uploading file:', file.name, error)
            
            progressState[i].status = 'error'
            progressState[i].error = error instanceof Error ? error.message : 'خطأ في الرفع'
            onProgress?.(progressState)

            errorMonitoring.reportError(error as Error, {
              component: 'useMediaUploadWithProgress',
              action: 'upload_file',
              fileName: file.name,
              userId: user.id
            })

            // Continue with other files instead of failing entire batch
            continue
          }
        }

        return results
      }, {
        context: 'Batch uploading media with progress',
        maxAttempts: 2,
        logErrors: true
      })
    },
    onSuccess: (attachments) => {
      console.log('✅ Batch upload completed:', attachments.length, 'files')
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })
}

// =====================================================
// SIMPLE SINGLE FILE UPLOAD
// =====================================================

export const useSingleMediaUpload = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<MediaAttachment> => {
      console.log('🔍 Uploading single file:', file.name)
      
      const user = await requireAuth()

      // Validate file
      const validation = validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      // Compress if needed
      let processedFile = file
      let compressionRatio = 0

      if (validation.fileType === 'image') {
        const compressed = await MediaCompressor.compressImage(file)
        processedFile = compressed.file
        compressionRatio = compressed.compressionRatio
      } else if (validation.fileType === 'video') {
        const compressed = await MediaCompressor.compressVideo(file)
        processedFile = compressed.file
        compressionRatio = compressed.compressionRatio
      }

      // Upload to storage
      const fileExtension = file.name.split('.').pop()
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
      const storagePath = `conversation-media/${uniqueFileName}`

      const { error: uploadError } = await supabase.storage
        .from('conversation-media')
        .upload(storagePath, processedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('conversation-media')
        .getPublicUrl(storagePath)

      // Create attachment record
      const attachment: Omit<MediaAttachment, 'id'> = {
        filename: file.name,
        file_path: urlData.publicUrl,
        file_size: processedFile.size,
        mime_type: file.type,
        compressed: compressionRatio > 0,
        compression_ratio: compressionRatio
      }

      const { data: savedAttachment, error: saveError } = await supabase
        .from('media_attachments')
        .insert({
          ...attachment,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (saveError) {
        await supabase.storage.from('conversation-media').remove([storagePath])
        throw saveError
      }

      console.log('✅ Single file uploaded successfully:', savedAttachment)
      return savedAttachment

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })
}

// =====================================================
// MEDIA MANAGEMENT HOOKS
// =====================================================

// Delete media attachment
export const useDeleteMediaAttachment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      console.log('🔍 Deleting media attachment:', attachmentId)
      
      const user = await requireAuth()

      // Get attachment details first
      const { data: attachment, error: fetchError } = await supabase
        .from('media_attachments')
        .select('file_path, thumbnail_path')
        .eq('id', attachmentId)
        .single()

      if (fetchError) throw fetchError

      // Extract file path from URL
      const filePath = attachment.file_path.split('/').pop()
      if (filePath) {
        // Delete from storage
        await supabase.storage
          .from('conversation-media')
          .remove([`conversation-media/${filePath}`])

        // Delete thumbnail if exists
        if (attachment.thumbnail_path) {
          const thumbnailPath = attachment.thumbnail_path.split('/').pop()
          if (thumbnailPath) {
            await supabase.storage
              .from('conversation-media')
              .remove([`thumbnails/${thumbnailPath}`])
          }
        }
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('media_attachments')
        .delete()
        .eq('id', attachmentId)

      if (deleteError) throw deleteError

      console.log('✅ Media attachment deleted successfully')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
  })
}

// Get file type validation info
export const getFileValidationInfo = () => {
  return {
    supportedTypes: {
      images: ['JPEG', 'PNG', 'GIF', 'WebP'],
      videos: ['MP4', 'WebM', 'OGG'],
      documents: ['PDF', 'Word', 'نص عادي']
    },
    maxFileSize: '50MB',
    maxImageSize: '2MB (سيتم ضغطها تلقائياً)',
    maxVideoSize: '10MB',
    compressionEnabled: true
  }
}

// =====================================================
// UTILITY EXPORTS  
// =====================================================

export { MediaCompressor, validateFile }
export type { UploadProgress, CompressionOptions, FileValidationResult }