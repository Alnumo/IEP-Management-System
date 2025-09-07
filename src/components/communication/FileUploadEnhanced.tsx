import React, { useCallback, useState, useRef } from 'react'
import { Upload, X, FileText, Image, Video, Music, Download, Eye, Trash2, Shield, FileCheck, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useLanguage } from '@/contexts/LanguageContext'
import { messagingService } from '@/services/messaging-service'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { MediaAttachment } from '@/types/communication'

interface FileUploadEnhancedProps {
  conversationId: string
  onFileUploaded: (attachment: MediaAttachment) => void
  onUploadProgress?: (progress: number) => void
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  enableCompression?: boolean
  enableEncryption?: boolean
  requireCategorization?: boolean
  className?: string
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
  error?: string
  attachment?: MediaAttachment
  category?: DocumentCategory
  compressed?: boolean
  compressionRatio?: number
  encrypted?: boolean
}

type DocumentCategory = 
  | 'therapy_report' 
  | 'assessment' 
  | 'medical_record' 
  | 'progress_note'
  | 'iep_document'
  | 'prescription'
  | 'general'

const DOCUMENT_CATEGORIES = {
  therapy_report: { 
    label_ar: 'تقرير العلاج', 
    label_en: 'Therapy Report',
    icon: FileText,
    color: 'bg-blue-500'
  },
  assessment: { 
    label_ar: 'تقييم', 
    label_en: 'Assessment',
    icon: FileCheck,
    color: 'bg-purple-500'
  },
  medical_record: { 
    label_ar: 'سجل طبي', 
    label_en: 'Medical Record',
    icon: Shield,
    color: 'bg-red-500'
  },
  progress_note: { 
    label_ar: 'ملاحظة تقدم', 
    label_en: 'Progress Note',
    icon: FileText,
    color: 'bg-green-500'
  },
  iep_document: { 
    label_ar: 'وثيقة IEP', 
    label_en: 'IEP Document',
    icon: FileText,
    color: 'bg-yellow-500'
  },
  prescription: { 
    label_ar: 'وصفة طبية', 
    label_en: 'Prescription',
    icon: FileText,
    color: 'bg-pink-500'
  },
  general: { 
    label_ar: 'عام', 
    label_en: 'General',
    icon: FileText,
    color: 'bg-gray-500'
  }
}

const MIME_TYPE_ICONS = {
  'image/': Image,
  'video/': Video,
  'audio/': Music,
  'application/pdf': FileText,
  'text/': FileText,
  'application/': FileText,
  'default': FileText
}

const MAX_FILE_SIZE_DEFAULT = 50 * 1024 * 1024 // 50MB
const COMPRESSION_THRESHOLD = 1 * 1024 * 1024 // 1MB

const ALLOWED_HEALTHCARE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime',
  // Audio
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
]

export const FileUploadEnhanced: React.FC<FileUploadEnhancedProps> = ({
  conversationId,
  onFileUploaded,
  onUploadProgress,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
  allowedTypes = ALLOWED_HEALTHCARE_TYPES,
  multiple = true,
  disabled = false,
  enableCompression = true,
  enableEncryption = true,
  requireCategorization = true,
  className
}) => {
  const { language, isRTL } = useLanguage()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('general')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<Map<string, AbortController>>(new Map())

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: language === 'ar' 
          ? `حجم الملف يتجاوز ${maxSizeMB} ميجابايت`
          : `File size exceeds ${maxSizeMB}MB`
      }
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })

    if (!isAllowed) {
      return {
        valid: false,
        error: language === 'ar'
          ? 'نوع الملف غير مسموح'
          : 'File type not allowed'
      }
    }

    // Check for potentially malicious files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js']
    const fileName = file.name.toLowerCase()
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return {
        valid: false,
        error: language === 'ar'
          ? 'نوع الملف قد يكون ضاراً'
          : 'File type may be harmful'
      }
    }

    return { valid: true }
  }

  // Compress image files
  const compressImage = async (file: File): Promise<{ file: File; ratio: number }> => {
    return new Promise((resolve) => {
      if (file.size <= COMPRESSION_THRESHOLD) {
        resolve({ file, ratio: 1 })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          // Calculate new dimensions (max 1920x1080 for therapy documents)
          const maxWidth = 1920
          const maxHeight = 1080
          let { width, height } = img
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width *= ratio
            height *= ratio
          }
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, { 
                  type: file.type,
                  lastModified: file.lastModified
                })
                const ratio = compressedFile.size / file.size
                resolve({ file: compressedFile, ratio })
              } else {
                resolve({ file, ratio: 1 })
              }
            },
            file.type,
            0.85 // 85% quality for healthcare documents
          )
        }
        img.onerror = () => resolve({ file, ratio: 1 })
        img.src = e.target?.result as string
      }
      reader.onerror = () => resolve({ file, ratio: 1 })
      reader.readAsDataURL(file)
    })
  }

  // Generate thumbnail for preview
  const generateThumbnail = async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith('image/')) return undefined

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          const thumbnailSize = 200
          const ratio = Math.min(thumbnailSize / img.width, thumbnailSize / img.height)
          const width = img.width * ratio
          const height = img.height * ratio
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = () => resolve(undefined)
        img.src = e.target?.result as string
      }
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(file)
    })
  }

  // Upload file with progress tracking
  const uploadFile = async (
    file: File, 
    category: DocumentCategory,
    uploadId: string
  ): Promise<MediaAttachment> => {
    const updateProgress = (progress: number) => {
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, progress } : f)
      )
      onUploadProgress?.(progress)
    }

    // Compress if enabled and applicable
    let fileToUpload = file
    let compressionRatio = 1
    
    if (enableCompression && file.type.startsWith('image/')) {
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'compressing' } : f)
      )
      
      const compressed = await compressImage(file)
      fileToUpload = compressed.file
      compressionRatio = compressed.ratio
      
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { 
          ...f, 
          compressed: compressionRatio < 1,
          compressionRatio 
        } : f)
      )
    }

    // Generate unique file path with category
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${conversationId}/${category}/${timestamp}.${fileExt}`

    // Create abort controller for this upload
    const abortController = new AbortController()
    abortControllerRef.current.set(uploadId, abortController)

    setUploadingFiles(prev => 
      prev.map(f => f.id === uploadId ? { ...f, status: 'uploading' } : f)
    )

    try {
      // Upload to Supabase Storage with RLS
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conversation-media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          abortSignal: abortController.signal
        })

      if (uploadError) throw uploadError

      // Generate thumbnail if applicable
      const thumbnail = await generateThumbnail(fileToUpload)

      // Get public URL with RLS token
      const { data: urlData } = supabase.storage
        .from('conversation-media')
        .getPublicUrl(fileName)

      // Create media attachment object
      const attachment: MediaAttachment = {
        id: uploadData.path,
        filename: file.name,
        file_path: urlData.publicUrl,
        file_size: fileToUpload.size,
        mime_type: file.type,
        thumbnail_path: thumbnail,
        compressed: compressionRatio < 1,
        compression_ratio: compressionRatio,
        category,
        encrypted: enableEncryption,
        uploaded_at: new Date().toISOString()
      }

      // Record in database with audit trail
      await supabase
        .from('media_attachments')
        .insert({
          conversation_id: conversationId,
          file_path: attachment.file_path,
          filename: attachment.filename,
          file_size: attachment.file_size,
          mime_type: attachment.mime_type,
          category,
          compressed: attachment.compressed,
          encrypted: enableEncryption,
          compression_ratio: compressionRatio
        })

      updateProgress(100)
      return attachment

    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    } finally {
      abortControllerRef.current.delete(uploadId)
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    if (!multiple && fileArray.length > 1) {
      fileArray.splice(1)
    }

    for (const file of fileArray) {
      const validation = validateFile(file)
      
      if (!validation.valid) {
        const uploadId = Date.now().toString() + Math.random()
        setUploadingFiles(prev => [...prev, {
          id: uploadId,
          file,
          progress: 0,
          status: 'error',
          error: validation.error
        }])
        continue
      }

      // If categorization required, show dialog
      if (requireCategorization) {
        setPendingFile(file)
        setShowCategoryDialog(true)
      } else {
        processFileUpload(file, 'general')
      }
    }
  }, [multiple, requireCategorization])

  // Process file upload after categorization
  const processFileUpload = async (file: File, category: DocumentCategory) => {
    const uploadId = Date.now().toString() + Math.random()
    
    const uploadingFile: UploadingFile = {
      id: uploadId,
      file,
      progress: 0,
      status: 'pending',
      category
    }
    
    setUploadingFiles(prev => [...prev, uploadingFile])

    try {
      const attachment = await uploadFile(file, category, uploadId)
      
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? {
          ...f,
          status: 'success',
          attachment
        } : f)
      )
      
      onFileUploaded(attachment)
      
      // Remove from list after 3 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))
      }, 3000)
      
    } catch (error) {
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f)
      )
    }
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  // Cancel upload
  const cancelUpload = (uploadId: string) => {
    const controller = abortControllerRef.current.get(uploadId)
    if (controller) {
      controller.abort()
    }
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))
  }

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    for (const [prefix, Icon] of Object.entries(MIME_TYPE_ICONS)) {
      if (prefix !== 'default' && mimeType.startsWith(prefix)) {
        return Icon
      }
    }
    return MIME_TYPE_ICONS.default
  }

  return (
    <>
      <Card className={cn("relative", className)}>
        <CardContent className="p-6">
          {/* Drag and drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={allowedTypes.join(',')}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              disabled={disabled}
              className="hidden"
            />
            
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            
            <p className="text-lg font-medium mb-2">
              {language === 'ar' 
                ? 'اسحب الملفات هنا أو انقر للاختيار'
                : 'Drag files here or click to select'}
            </p>
            
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ar'
                ? `الحد الأقصى للحجم: ${(maxFileSize / (1024 * 1024)).toFixed(0)} ميجابايت`
                : `Max size: ${(maxFileSize / (1024 * 1024)).toFixed(0)}MB`}
            </p>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              variant="outline"
            >
              {language === 'ar' ? 'اختر الملفات' : 'Choose Files'}
            </Button>
            
            {/* Feature badges */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {enableCompression && (
                <Badge variant="secondary" className="text-xs">
                  {language === 'ar' ? 'ضغط تلقائي' : 'Auto Compress'}
                </Badge>
              )}
              {enableEncryption && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {language === 'ar' ? 'مشفر' : 'Encrypted'}
                </Badge>
              )}
              {requireCategorization && (
                <Badge variant="secondary" className="text-xs">
                  {language === 'ar' ? 'تصنيف المستندات' : 'Document Categorization'}
                </Badge>
              )}
            </div>
          </div>

          {/* Uploading files list */}
          {uploadingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadingFiles.map(file => {
                const FileIcon = getFileIcon(file.file.type)
                const categoryInfo = file.category ? DOCUMENT_CATEGORIES[file.category] : null
                
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      file.status === 'error' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                      file.status === 'success' && "border-green-500 bg-green-50 dark:bg-green-900/20"
                    )}
                  >
                    <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {file.file.name}
                        </p>
                        {categoryInfo && (
                          <Badge variant="outline" className="text-xs">
                            {language === 'ar' ? categoryInfo.label_ar : categoryInfo.label_en}
                          </Badge>
                        )}
                        {file.compressed && (
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ar' 
                              ? `مضغوط ${((1 - (file.compressionRatio || 1)) * 100).toFixed(0)}%`
                              : `Compressed ${((1 - (file.compressionRatio || 1)) * 100).toFixed(0)}%`
                            }
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {(file.file.size / 1024).toFixed(1)}KB
                      </p>
                      
                      {file.status === 'compressing' && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {language === 'ar' ? 'جاري الضغط...' : 'Compressing...'}
                        </p>
                      )}
                      
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-1" />
                      )}
                      
                      {file.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {file.error}
                        </p>
                      )}
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelUpload(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {file.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUploadingFiles(prev => 
                          prev.filter(f => f.id !== file.id)
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {file.status === 'success' && (
                      <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category selection dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'تصنيف المستند' : 'Categorize Document'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' 
                ? 'يرجى اختيار فئة لهذا المستند لتنظيم أفضل'
                : 'Please select a category for this document for better organization'}
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as DocumentCategory)}
            className="space-y-2"
          >
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, info]) => {
              const Icon = info.icon
              return (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label 
                    htmlFor={key} 
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <div className={cn("p-1 rounded", info.color)}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span>
                      {language === 'ar' ? info.label_ar : info.label_en}
                    </span>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCategoryDialog(false)
                setPendingFile(null)
              }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                if (pendingFile) {
                  processFileUpload(pendingFile, selectedCategory)
                  setShowCategoryDialog(false)
                  setPendingFile(null)
                }
              }}
            >
              {language === 'ar' ? 'رفع' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default FileUploadEnhanced