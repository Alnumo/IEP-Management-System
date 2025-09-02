// Media Upload Component for Session Documentation
// Story 1.3: Media-Rich Progress Documentation Workflow

import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, Image, Video, FileText, Mic, Camera, Plus, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { mediaUploadService } from '@/lib/services/mediaUploadService'
import { useCreateSessionMedia } from '@/hooks/useSessionMedia'
import type { 
  MediaUploadProgress, 
  UploadType, 
  SessionMedia, 
  CreateSessionMediaDto 
} from '@/types/media'

interface MediaUploadProps {
  studentId: string
  sessionId?: string
  language: 'ar' | 'en'
  onUploadComplete?: (media: SessionMedia[]) => void
  onUploadError?: (error: string) => void
  className?: string
}

interface FileWithPreview extends File {
  preview?: string
}

const UPLOAD_TYPE_OPTIONS: { value: UploadType; labelKey: string; iconKey: string }[] = [
  { value: 'session_documentation', labelKey: 'media.uploadTypes.sessionDocumentation', iconKey: 'camera' },
  { value: 'home_practice', labelKey: 'media.uploadTypes.homePractice', iconKey: 'video' },
  { value: 'progress_update', labelKey: 'media.uploadTypes.progressUpdate', iconKey: 'chart' },
  { value: 'milestone_celebration', labelKey: 'media.uploadTypes.milestoneCelebration', iconKey: 'celebration' }
]

export const MediaUpload: React.FC<MediaUploadProps> = ({
  studentId,
  sessionId,
  language,
  onUploadComplete,
  onUploadError,
  className
}) => {
  const { t } = useTranslation()
  const isRTL = language === 'ar'
  
  // State
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, MediaUploadProgress>>({})
  const [uploadType, setUploadType] = useState<UploadType>('session_documentation')
  const [captionAr, setCaptionAr] = useState('')
  const [captionEn, setCaptionEn] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle accepted files
    const filesWithPreview = acceptedFiles.map(file => Object.assign(file, {
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    
    setSelectedFiles(prev => [...prev, ...filesWithPreview])

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectionErrors = rejectedFiles.map(rejected => 
        `${rejected.file.name}: ${rejected.errors.map((e: any) => e.message).join(', ')}`
      )
      setErrors(prev => [...prev, ...rejectionErrors])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
      'video/*': ['.mp4', '.avi', '.mov', '.quicktime'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  })

  // Helper functions
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />
    if (file.type.startsWith('audio/')) return <Mic className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      // Revoke object URL to prevent memory leaks
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const clearErrors = () => setErrors([])

  // Upload handling
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setErrors([])

    try {
      const uploadResults = await mediaUploadService.uploadFiles(
        selectedFiles,
        {
          studentId,
          sessionId,
          uploadType,
          defaultCaptionAr: captionAr || undefined,
          defaultCaptionEn: captionEn || undefined,
          tags: tags.length > 0 ? tags : undefined,
          isPrivate
        },
        (results) => {
          // Update progress state with in-progress uploads
          const progressMap: Record<string, MediaUploadProgress> = {}
          results.inProgress.forEach(progress => {
            progressMap[progress.id] = progress
          })
          setUploadProgress(progressMap)
        }
      )

      if (uploadResults.failed.length > 0) {
        const failureMessages = uploadResults.failed.map(f => 
          `${f.file.name}: ${f.error}`
        )
        setErrors(failureMessages)
      }

      if (uploadResults.completed.length > 0) {
        onUploadComplete?.(uploadResults.completed)
        
        // Clear form on successful upload
        setSelectedFiles([])
        setCaptionAr('')
        setCaptionEn('')
        setDescriptionAr('')
        setDescriptionEn('')
        setTags([])
        setIsPrivate(false)
        setIsFeatured(false)
        setUploadProgress({})
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('media.errors.uploadFailed')
      setErrors([errorMessage])
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [selectedFiles])

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <Upload className="h-5 w-5" />
            {t('media.upload.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Type Selection */}
          <div>
            <Label className={isRTL ? 'text-right' : ''}>{t('media.upload.uploadType')}</Label>
            <Select value={uploadType} onValueChange={(value: UploadType) => setUploadType(value)}>
              <SelectTrigger className={isRTL ? 'text-right' : ''}>
                <SelectValue placeholder={t('media.upload.selectUploadType')} />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {getFileIcon({ type: option.iconKey } as File)}
                      {t(option.labelKey)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium">
                  {isDragActive ? t('media.upload.dropFiles') : t('media.upload.dragDropFiles')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('media.upload.supportedFormats')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('media.upload.maxFileSize')}
                </p>
              </div>
              <Button variant="outline" type="button">
                <Plus className="h-4 w-4 mr-2" />
                {t('media.upload.selectFiles')}
              </Button>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <Label className={isRTL ? 'text-right' : ''}>{t('media.upload.selectedFiles')}</Label>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {file.preview ? (
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                        {getFileIcon(file)}
                      </div>
                    )}
                    
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>

                    {uploadProgress[`file_${index}`] && (
                      <div className="w-24">
                        <Progress value={uploadProgress[`file_${index}`].progress_percentage} className="h-2" />
                        <p className="text-xs text-center mt-1">
                          {uploadProgress[`file_${index}`].progress_percentage}%
                        </p>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={isRTL ? 'text-right' : ''}>{t('media.upload.captionArabic')}</Label>
              <Textarea
                value={captionAr}
                onChange={(e) => setCaptionAr(e.target.value)}
                placeholder={t('media.upload.captionArabicPlaceholder')}
                className={isRTL ? 'text-right' : ''}
                dir="rtl"
              />
            </div>
            <div>
              <Label className={isRTL ? 'text-right' : ''}>{t('media.upload.captionEnglish')}</Label>
              <Textarea
                value={captionEn}
                onChange={(e) => setCaptionEn(e.target.value)}
                placeholder={t('media.upload.captionEnglishPlaceholder')}
                dir="ltr"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className={isRTL ? 'text-right' : ''}>{t('media.upload.tags')}</Label>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t('media.upload.addTag')}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className={isRTL ? 'text-right' : ''}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className={`flex flex-wrap gap-2 mt-2 ${isRTL ? 'justify-end' : ''}`}>
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Label htmlFor="private-switch" className={isRTL ? 'text-right' : ''}>
                {t('media.upload.markAsPrivate')}
              </Label>
              <Switch
                id="private-switch"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
            
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Label htmlFor="featured-switch" className={isRTL ? 'text-right' : ''}>
                {t('media.upload.markAsFeatured')}
              </Label>
              <Switch
                id="featured-switch"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearErrors}
                  className="mt-2"
                >
                  {t('common.dismiss')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('media.upload.uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('media.upload.uploadFiles')}
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([])
                setCaptionAr('')
                setCaptionEn('')
                setTags([])
                setErrors([])
              }}
              disabled={isUploading}
            >
              {t('common.clear')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}