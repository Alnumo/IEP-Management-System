import React, { useCallback, useState, useRef } from 'react'
import { Upload, X, FileText, Image, Video, Music, Download, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import type { MediaAttachment } from '@/types/communication'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  conversationId: string
  onFileUploaded: (attachment: MediaAttachment) => void
  onUploadProgress?: (progress: number) => void
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  className?: string
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  attachment?: MediaAttachment
}

const MIME_TYPE_ICONS = {
  'image/': Image,
  'video/': Video,
  'audio/': Music,
  'application/pdf': FileText,
  'text/': FileText,
  'default': FileText
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

export const FileUpload: React.FC<FileUploadProps> = ({
  conversationId,
  onFileUploaded,
  onUploadProgress,
  maxFileSize = MAX_FILE_SIZE,
  allowedTypes = ALLOWED_TYPES,
  multiple = true,
  disabled = false,
  className
}) => {
  const { language, isRTL } = useLanguage()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (mimeType: string) => {
    const iconKey = Object.keys(MIME_TYPE_ICONS).find(key => 
      mimeType.startsWith(key)
    ) || 'default'
    return MIME_TYPE_ICONS[iconKey as keyof typeof MIME_TYPE_ICONS]
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (file.size > maxFileSize) {
      return {
        isValid: false,
        error: language === 'ar' 
          ? `حجم الملف كبير جداً. الحد الأقصى ${formatFileSize(maxFileSize)}`
          : `File too large. Maximum size is ${formatFileSize(maxFileSize)}`
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: language === 'ar'
          ? 'نوع الملف غير مدعوم'
          : 'File type not supported'
      }
    }

    return { isValid: true }
  }

  const uploadFile = async (file: File): Promise<MediaAttachment> => {
    const fileId = Math.random().toString(36).substring(2)
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `conversations/${conversationId}/files/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('communication-files')
      .upload(filePath, file, {
        onUploadProgress: (progress) => {
          const percentage = (progress.loaded / progress.total) * 100
          setUploadingFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, progress: percentage }
                : f
            )
          )
          onUploadProgress?.(percentage)
        }
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('communication-files')
      .getPublicUrl(filePath)

    // Generate thumbnail for images
    let thumbnailUrl: string | undefined
    if (file.type.startsWith('image/')) {
      try {
        const thumbnailPath = `conversations/${conversationId}/thumbnails/${fileName}`
        const thumbnailFile = await createThumbnail(file)
        
        const { data: thumbnailData } = await supabase.storage
          .from('communication-files')
          .upload(thumbnailPath, thumbnailFile)

        if (thumbnailData) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('communication-files')
            .getPublicUrl(thumbnailPath)
          thumbnailUrl = thumbUrl
        }
      } catch (thumbError) {
        console.warn('Failed to generate thumbnail:', thumbError)
      }
    }

    // Get file dimensions for images/videos
    let dimensions: { width: number; height: number } | undefined
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      dimensions = await getFileDimensions(file)
    }

    // Get duration for audio/video
    let duration: number | undefined
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      duration = await getMediaDuration(file)
    }

    return {
      id: fileId,
      filename: file.name,
      file_path: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
      thumbnail_url: thumbnailUrl,
      duration,
      dimensions
    }
  }

  const createThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        const maxSize = 200
        let { width, height } = img

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create thumbnail'))
          }
        }, 'image/jpeg', 0.8)
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const getFileDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight })
        }
        video.onerror = reject
        video.src = URL.createObjectURL(file)
      }
    })
  }

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('audio/')) {
        const audio = new Audio()
        audio.onloadedmetadata = () => resolve(audio.duration)
        audio.onerror = reject
        audio.src = URL.createObjectURL(file)
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.onloadedmetadata = () => resolve(video.duration)
        video.onerror = reject
        video.src = URL.createObjectURL(file)
      }
    })
  }

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      const validation = validateFile(file)
      
      if (!validation.isValid) {
        // Add error to uploading files list
        const errorFile: UploadingFile = {
          id: Math.random().toString(36).substring(2),
          file,
          progress: 0,
          status: 'error',
          error: validation.error
        }
        setUploadingFiles(prev => [...prev, errorFile])
        continue
      }

      const uploadingFile: UploadingFile = {
        id: Math.random().toString(36).substring(2),
        file,
        progress: 0,
        status: 'uploading'
      }

      setUploadingFiles(prev => [...prev, uploadingFile])

      try {
        const attachment = await uploadFile(file)
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, status: 'success' as const, attachment, progress: 100 }
              : f
          )
        )

        onFileUploaded(attachment)

        // Remove successful upload after 3 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id))
        }, 3000)

      } catch (error) {
        console.error('Upload error:', error)
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { 
                  ...f, 
                  status: 'error' as const, 
                  error: language === 'ar' 
                    ? 'فشل في رفع الملف'
                    : 'Upload failed'
                }
              : f
          )
        )
      }
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className={cn("w-full", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={allowedTypes.join(',')}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive 
            ? "border-teal-500 bg-teal-50" 
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          <div className="space-y-2">
            <h3 className={cn(
              "text-lg font-medium text-gray-900",
              language === 'ar' ? 'font-arabic' : ''
            )}>
              {language === 'ar' 
                ? 'اسحب الملفات هنا أو انقر للاختيار'
                : 'Drag files here or click to select'
              }
            </h3>
            
            <p className={cn(
              "text-sm text-gray-500",
              language === 'ar' ? 'font-arabic' : ''
            )}>
              {language === 'ar'
                ? `الحد الأقصى ${formatFileSize(maxFileSize)} لكل ملف`
                : `Maximum ${formatFileSize(maxFileSize)} per file`
              }
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="mt-4"
            variant="outline"
          >
            <Upload className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {language === 'ar' ? 'اختر الملفات' : 'Choose Files'}
          </Button>
        </div>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile) => {
            const Icon = getFileIcon(uploadingFile.file.type)
            
            return (
              <Card key={uploadingFile.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-8 h-8 text-gray-500" />
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium text-gray-900 truncate",
                        language === 'ar' ? 'font-arabic' : ''
                      )}>
                        {uploadingFile.file.name}
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadingFile.file.size)}
                        {uploadingFile.status === 'uploading' && 
                          ` • ${Math.round(uploadingFile.progress)}%`
                        }
                      </p>

                      {uploadingFile.error && (
                        <p className={cn(
                          "text-xs text-red-600 mt-1",
                          language === 'ar' ? 'font-arabic' : ''
                        )}>
                          {uploadingFile.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadingFile.status === 'success' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {language === 'ar' ? 'تم' : 'Done'}
                      </Badge>
                    )}
                    
                    {uploadingFile.status === 'error' && (
                      <Badge variant="destructive">
                        {language === 'ar' ? 'خطأ' : 'Error'}
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeUploadingFile(uploadingFile.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {uploadingFile.status === 'uploading' && (
                  <div className="mt-2">
                    <Progress value={uploadingFile.progress} className="w-full" />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FileUpload