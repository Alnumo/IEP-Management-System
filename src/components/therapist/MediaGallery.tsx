// Media Gallery Component for Session Documentation
// Story 1.3: Media-Rich Progress Documentation Workflow

import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Eye, Download, Edit3, Trash2, Tag, Star, StarOff, 
  Image, Video, FileText, Mic, Filter, Search, Grid3X3, List,
  Calendar, User, MessageSquare, ChevronLeft, ChevronRight
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useSessionMedia, useUpdateSessionMedia, useDeleteSessionMedia } from '@/hooks/useSessionMedia'
import type { 
  SessionMediaWithReviews, 
  MediaSearchParams, 
  MediaType, 
  UploadType,
  UpdateSessionMediaDto 
} from '@/types/media'

interface MediaGalleryProps {
  studentId?: string
  sessionId?: string
  language: 'ar' | 'en'
  viewMode?: 'grid' | 'list'
  showFilters?: boolean
  onMediaSelect?: (media: SessionMediaWithReviews) => void
  className?: string
}

interface MediaEditData {
  captionAr: string
  captionEn: string
  descriptionAr: string
  descriptionEn: string
  tags: string[]
  isPrivate: boolean
  isFeatured: boolean
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  studentId,
  sessionId,
  language,
  viewMode: initialViewMode = 'grid',
  showFilters = true,
  onMediaSelect,
  className
}) => {
  const { t } = useTranslation()
  const isRTL = language === 'ar'
  
  // State
  const [searchParams, setSearchParams] = useState<MediaSearchParams>({
    student_id: studentId,
    session_id: sessionId,
    limit: 20,
    page: 1
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<SessionMediaWithReviews | null>(null)
  const [editingMedia, setEditingMedia] = useState<SessionMediaWithReviews | null>(null)
  const [editData, setEditData] = useState<MediaEditData>({
    captionAr: '',
    captionEn: '',
    descriptionAr: '',
    descriptionEn: '',
    tags: [],
    isPrivate: false,
    isFeatured: false
  })

  // Hooks
  const { data: mediaResponse, isLoading, error } = useSessionMedia(searchParams)
  const updateMediaMutation = useUpdateSessionMedia()
  const deleteMediaMutation = useDeleteSessionMedia()

  // Computed values
  const mediaList = mediaResponse?.media || []
  const totalPages = mediaResponse?.total_pages || 1
  const currentPage = mediaResponse?.page || 1

  // Helper functions
  const getMediaIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'photo':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'audio':
        return <Mic className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getUploadTypeColor = (uploadType: UploadType): string => {
    switch (uploadType) {
      case 'session_documentation':
        return 'bg-blue-100 text-blue-800'
      case 'home_practice':
        return 'bg-green-100 text-green-800'
      case 'progress_update':
        return 'bg-purple-100 text-purple-800'
      case 'milestone_celebration':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return isRTL 
      ? date.toLocaleDateString('ar-SA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
  }

  // Event handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSearchParams(prev => ({
      ...prev,
      search_query: query || undefined,
      page: 1
    }))
  }

  const handleFilterChange = (filters: Partial<MediaSearchParams>) => {
    setSearchParams(prev => ({
      ...prev,
      ...filters,
      page: 1
    }))
  }

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({
      ...prev,
      page
    }))
  }

  const handleViewMedia = (media: SessionMediaWithReviews) => {
    setSelectedMedia(media)
    onMediaSelect?.(media)
  }

  const handleEditMedia = (media: SessionMediaWithReviews) => {
    setEditingMedia(media)
    setEditData({
      captionAr: media.caption_ar || '',
      captionEn: media.caption_en || '',
      descriptionAr: media.description_ar || '',
      descriptionEn: media.description_en || '',
      tags: media.tags || [],
      isPrivate: media.is_private,
      isFeatured: media.is_featured
    })
  }

  const handleSaveEdit = async () => {
    if (!editingMedia) return

    try {
      const updateData: UpdateSessionMediaDto = {
        caption_ar: editData.captionAr || undefined,
        caption_en: editData.captionEn || undefined,
        description_ar: editData.descriptionAr || undefined,
        description_en: editData.descriptionEn || undefined,
        tags: editData.tags.length > 0 ? editData.tags : undefined,
        is_private: editData.isPrivate,
        is_featured: editData.isFeatured
      }

      await updateMediaMutation.mutateAsync({
        id: editingMedia.id,
        data: updateData
      })

      setEditingMedia(null)
    } catch (error) {
      console.error('Failed to update media:', error)
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    if (window.confirm(t('media.gallery.confirmDelete'))) {
      try {
        await deleteMediaMutation.mutateAsync(mediaId)
      } catch (error) {
        console.error('Failed to delete media:', error)
      }
    }
  }

  const handleToggleFeatured = async (media: SessionMediaWithReviews) => {
    try {
      await updateMediaMutation.mutateAsync({
        id: media.id,
        data: { is_featured: !media.is_featured }
      })
    } catch (error) {
      console.error('Failed to toggle featured status:', error)
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !editData.tags.includes(tag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Render functions
  const renderMediaCard = (media: SessionMediaWithReviews) => (
    <Card key={media.id} className="group hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* Media Preview */}
        <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
          {media.media_type === 'photo' ? (
            <img
              src={media.thumbnail_url || media.file_url}
              alt={media.caption_ar || media.caption_en || media.file_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
              onClick={() => handleViewMedia(media)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                {getMediaIcon(media.media_type)}
                <p className="text-sm mt-2">{media.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(media.file_size)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={() => handleToggleFeatured(media)}
          >
            {media.is_featured ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                <Edit3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleViewMedia(media)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('media.gallery.view')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditMedia(media)}>
                <Edit3 className="h-4 w-4 mr-2" />
                {t('media.gallery.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteMedia(media.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('media.gallery.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className={getUploadTypeColor(media.upload_type)} variant="secondary">
            {t(`media.uploadTypes.${media.upload_type}`)}
          </Badge>
          {media.is_private && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {t('media.gallery.private')}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium line-clamp-1">
            {(isRTL ? media.caption_ar : media.caption_en) || media.file_name}
          </h4>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(media.created_at)}
          </div>

          {media.therapist_name_ar && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {isRTL ? media.therapist_name_ar : media.therapist_name_en}
            </div>
          )}

          {media.tags && media.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {media.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{media.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {media.review_status && (
            <div className="flex items-center gap-2 text-xs">
              <MessageSquare className="h-3 w-3" />
              <Badge 
                variant={media.review_status === 'excellent' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {t(`media.reviewStatus.${media.review_status}`)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderListItem = (media: SessionMediaWithReviews) => (
    <Card key={media.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {media.media_type === 'photo' ? (
              <img
                src={media.thumbnail_url || media.file_url}
                alt={media.file_name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => handleViewMedia(media)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {getMediaIcon(media.media_type)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium truncate">
                  {(isRTL ? media.caption_ar : media.caption_en) || media.file_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(media.file_size)} • {formatDate(media.created_at)}
                </p>
                {media.description_ar && isRTL && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {media.description_ar}
                  </p>
                )}
                {media.description_en && !isRTL && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {media.description_en}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => handleToggleFeatured(media)}
                >
                  {media.is_featured ? (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="h-4 w-4" />
                  )}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleViewMedia(media)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('media.gallery.view')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditMedia(media)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      {t('media.gallery.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteMedia(media.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('media.gallery.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge className={getUploadTypeColor(media.upload_type)} variant="secondary">
                {t(`media.uploadTypes.${media.upload_type}`)}
              </Badge>
              {media.is_private && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {t('media.gallery.private')}
                </Badge>
              )}
              {media.review_status && (
                <Badge 
                  variant={media.review_status === 'excellent' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {t(`media.reviewStatus.${media.review_status}`)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t('media.gallery.loadError')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 className="text-2xl font-bold">{t('media.gallery.title')}</h2>
        
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder={t('media.gallery.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={isRTL ? 'text-right' : ''}
                />
              </div>
              
              <Select 
                value={searchParams.media_type || 'all'} 
                onValueChange={(value) => handleFilterChange({ 
                  media_type: value === 'all' ? undefined : value as MediaType 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('media.gallery.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('media.gallery.allTypes')}</SelectItem>
                  <SelectItem value="photo">{t('media.types.photo')}</SelectItem>
                  <SelectItem value="video">{t('media.types.video')}</SelectItem>
                  <SelectItem value="audio">{t('media.types.audio')}</SelectItem>
                  <SelectItem value="document">{t('media.types.document')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={searchParams.upload_type || 'all'} 
                onValueChange={(value) => handleFilterChange({ 
                  upload_type: value === 'all' ? undefined : value as UploadType 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('media.gallery.allUploadTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('media.gallery.allUploadTypes')}</SelectItem>
                  <SelectItem value="session_documentation">{t('media.uploadTypes.session_documentation')}</SelectItem>
                  <SelectItem value="home_practice">{t('media.uploadTypes.home_practice')}</SelectItem>
                  <SelectItem value="progress_update">{t('media.uploadTypes.progress_update')}</SelectItem>
                  <SelectItem value="milestone_celebration">{t('media.uploadTypes.milestone_celebration')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={searchParams.is_featured?.toString() || 'all'} 
                onValueChange={(value) => handleFilterChange({ 
                  is_featured: value === 'all' ? undefined : value === 'true' 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('media.gallery.allMedia')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('media.gallery.allMedia')}</SelectItem>
                  <SelectItem value="true">{t('media.gallery.featuredOnly')}</SelectItem>
                  <SelectItem value="false">{t('media.gallery.regularOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <div className="text-center py-12">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t('media.gallery.noMedia')}</p>
          <p className="text-muted-foreground">{t('media.gallery.noMediaDescription')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mediaList.map(renderMediaCard)}
        </div>
      ) : (
        <div className="space-y-3">
          {mediaList.map(renderListItem)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center gap-2 mt-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.previous')}
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + Math.max(1, currentPage - 2)
              if (pageNum > totalPages) return null
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {t('common.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Media Detail Dialog */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {(isRTL ? selectedMedia.caption_ar : selectedMedia.caption_en) || selectedMedia.file_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="flex justify-center">
                {selectedMedia.media_type === 'photo' ? (
                  <img
                    src={selectedMedia.file_url}
                    alt={selectedMedia.file_name}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                ) : selectedMedia.media_type === 'video' ? (
                  <video
                    src={selectedMedia.file_url}
                    controls
                    className="max-w-full max-h-96 rounded-lg"
                  />
                ) : selectedMedia.media_type === 'audio' ? (
                  <audio src={selectedMedia.file_url} controls className="w-full" />
                ) : (
                  <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm">{selectedMedia.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedMedia.file_size)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Media Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">{t('media.gallery.details')}</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>{t('media.gallery.fileName')}:</strong> {selectedMedia.file_name}
                    </div>
                    <div>
                      <strong>{t('media.gallery.fileSize')}:</strong> {formatFileSize(selectedMedia.file_size)}
                    </div>
                    <div>
                      <strong>{t('media.gallery.uploadedOn')}:</strong> {formatDate(selectedMedia.created_at)}
                    </div>
                    <div>
                      <strong>{t('media.gallery.uploadType')}:</strong> {t(`media.uploadTypes.${selectedMedia.upload_type}`)}
                    </div>
                    {selectedMedia.therapist_name_ar && (
                      <div>
                        <strong>{t('media.gallery.uploadedBy')}:</strong> {isRTL ? selectedMedia.therapist_name_ar : selectedMedia.therapist_name_en}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">{t('media.gallery.captions')}</h4>
                  <div className="space-y-2 text-sm">
                    {selectedMedia.caption_ar && (
                      <div>
                        <strong>{t('media.gallery.captionArabic')}:</strong>
                        <p className="mt-1 text-right">{selectedMedia.caption_ar}</p>
                      </div>
                    )}
                    {selectedMedia.caption_en && (
                      <div>
                        <strong>{t('media.gallery.captionEnglish')}:</strong>
                        <p className="mt-1">{selectedMedia.caption_en}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{t('media.gallery.tags')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMedia.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Review */}
              {selectedMedia.review_status && (
                <div>
                  <h4 className="font-medium mb-2">{t('media.gallery.review')}</h4>
                  <div className="space-y-2">
                    <Badge 
                      variant={selectedMedia.review_status === 'excellent' ? 'default' : 'secondary'}
                    >
                      {t(`media.reviewStatus.${selectedMedia.review_status}`)}
                    </Badge>
                    {selectedMedia.feedback_ar && isRTL && (
                      <p className="text-sm text-right">{selectedMedia.feedback_ar}</p>
                    )}
                    {selectedMedia.feedback_en && !isRTL && (
                      <p className="text-sm">{selectedMedia.feedback_en}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingMedia && (
        <Dialog open={!!editingMedia} onOpenChange={() => setEditingMedia(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('media.gallery.editMedia')}</DialogTitle>
              <DialogDescription>
                {t('media.gallery.editMediaDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('media.upload.captionArabic')}</Label>
                  <Textarea
                    value={editData.captionAr}
                    onChange={(e) => setEditData(prev => ({ ...prev, captionAr: e.target.value }))}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label>{t('media.upload.captionEnglish')}</Label>
                  <Textarea
                    value={editData.captionEn}
                    onChange={(e) => setEditData(prev => ({ ...prev, captionEn: e.target.value }))}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('media.upload.descriptionArabic')}</Label>
                  <Textarea
                    value={editData.descriptionAr}
                    onChange={(e) => setEditData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label>{t('media.upload.descriptionEnglish')}</Label>
                  <Textarea
                    value={editData.descriptionEn}
                    onChange={(e) => setEditData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <Label>{t('media.upload.tags')}</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder={t('media.upload.addTag')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t('media.upload.markAsPrivate')}</Label>
                  <Switch
                    checked={editData.isPrivate}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isPrivate: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('media.upload.markAsFeatured')}</Label>
                  <Switch
                    checked={editData.isFeatured}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isFeatured: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingMedia(null)}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={updateMediaMutation.isPending}
                >
                  {updateMediaMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('common.saving')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}