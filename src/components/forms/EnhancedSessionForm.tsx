// Enhanced Session Form with Media Documentation Integration
// Story 1.3: Media-Rich Progress Documentation Workflow

import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { 
  CalendarIcon, Save, ArrowLeft, Plus, X, Clock, BookOpen, Target, 
  Camera, Upload, FileText, CheckCircle, AlertCircle 
} from 'lucide-react'
import { format } from 'date-fns'

import { MediaUpload, MediaGallery } from '@/components/therapist'
import { useSessionMedia } from '@/hooks/useSessionMedia'
import type { SessionMedia, CreateSessionData } from '@/types'

const sessionSchema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  student_id: z.string().min(1, 'Student is required'),
  session_number: z.number().min(1, 'Session number must be at least 1'),
  session_date: z.date(),
  session_time: z.string().min(1, 'Session time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  topic_ar: z.string().optional(),
  topic_en: z.string().optional(),
  objectives: z.array(z.string()).min(1, 'At least one objective is required'),
  materials_needed: z.array(z.string()).optional().default([]),
  homework_assigned: z.string().optional(),
  session_notes: z.string().optional(),
  progress_summary: z.string().optional(),
  next_session_plan: z.string().optional(),
  enable_media_documentation: z.boolean().default(true),
})

type SessionFormData = z.infer<typeof sessionSchema>

interface EnhancedSessionFormProps {
  onSubmit: (data: CreateSessionData & { media?: SessionMedia[] }) => void
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<CreateSessionData>
  studentId: string
  language: 'ar' | 'en'
  className?: string
}

export const EnhancedSessionForm: React.FC<EnhancedSessionFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  studentId,
  language,
  className
}) => {
  const { t } = useTranslation()
  const isRTL = language === 'ar'

  // State
  const [activeTab, setActiveTab] = useState('details')
  const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([])
  const [sessionId, setSessionId] = useState<string>()
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  
  // Form setup
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      student_id: studentId,
      session_date: new Date(),
      session_time: '09:00',
      duration_minutes: 60,
      objectives: [''],
      materials_needed: [],
      enable_media_documentation: true,
      ...initialData
    }
  })

  const { 
    fields: objectiveFields, 
    append: appendObjective, 
    remove: removeObjective 
  } = useFieldArray({
    control: form.control,
    name: 'objectives'
  })

  const { 
    fields: materialFields, 
    append: appendMaterial, 
    remove: removeMaterial 
  } = useFieldArray({
    control: form.control,
    name: 'materials_needed'
  })

  // Watch for media documentation toggle
  const enableMediaDocumentation = form.watch('enable_media_documentation')

  // Media queries (only if sessionId exists)
  const { data: existingMediaResponse } = useSessionMedia(
    sessionId ? { session_id: sessionId } : {},
    { enabled: !!sessionId }
  )

  // Effect to update session media when query data changes
  useEffect(() => {
    if (existingMediaResponse?.media) {
      setSessionMedia(existingMediaResponse.media)
    }
  }, [existingMediaResponse])

  // Helper functions
  const getTabIcon = (tab: string, isActive: boolean) => {
    const iconClass = `h-4 w-4 ${isActive ? '' : 'opacity-60'}`
    switch (tab) {
      case 'details':
        return <BookOpen className={iconClass} />
      case 'media':
        return <Camera className={iconClass} />
      case 'summary':
        return <FileText className={iconClass} />
      default:
        return null
    }
  }

  const validateForm = (): boolean => {
    const isValid = form.formState.isValid
    if (!isValid) {
      const errors = form.formState.errors
      console.log('Form validation errors:', errors)
    }
    return isValid
  }

  // Event handlers
  const handleSubmit = async (data: SessionFormData) => {
    try {
      const formData = form.getValues()
      const sessionData: CreateSessionData = {
        course_id: formData.course_id,
        student_id: formData.student_id,
        session_number: formData.session_number,
        session_date: formData.session_date,
        session_time: formData.session_time,
        duration_minutes: formData.duration_minutes,
        topic_ar: formData.topic_ar,
        topic_en: formData.topic_en,
        objectives: formData.objectives.filter(obj => obj.trim()),
        materials_needed: formData.materials_needed?.filter(mat => mat.trim()) || [],
        homework_assigned: formData.homework_assigned,
        session_notes: formData.session_notes,
        progress_summary: formData.progress_summary,
        next_session_plan: formData.next_session_plan,
      }

      // Include media if available
      onSubmit({
        ...sessionData,
        media: sessionMedia.length > 0 ? sessionMedia : undefined
      })
    } catch (error) {
      console.error('Error submitting session form:', error)
    }
  }

  const handleMediaUploadComplete = (newMedia: SessionMedia[]) => {
    setSessionMedia(prev => [...prev, ...newMedia])
    setShowMediaUpload(false)
  }

  const handleTabChange = (value: string) => {
    // Validate current tab before switching
    if (value !== 'details') {
      form.trigger() // Trigger validation
    }
    setActiveTab(value)
  }

  const addObjective = () => {
    appendObjective('')
  }

  const addMaterial = () => {
    appendMaterial('')
  }

  const canProceedToMedia = () => {
    return form.formState.isValid || form.getValues().course_id && form.getValues().session_number
  }

  const canProceedToSummary = () => {
    return canProceedToMedia()
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <BookOpen className="h-5 w-5" />
            {initialData ? t('sessions.editSession') : t('sessions.createSession')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger 
                    value="details" 
                    className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {getTabIcon('details', activeTab === 'details')}
                    {t('sessions.tabs.details')}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="media" 
                    className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    disabled={!canProceedToMedia()}
                  >
                    {getTabIcon('media', activeTab === 'media')}
                    {t('sessions.tabs.media')}
                    {sessionMedia.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {sessionMedia.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="summary" 
                    className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    disabled={!canProceedToSummary()}
                  >
                    {getTabIcon('summary', activeTab === 'summary')}
                    {t('sessions.tabs.summary')}
                  </TabsTrigger>
                </TabsList>

                {/* Session Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="course_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.course')} *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className={isRTL ? 'text-right' : ''}>
                                <SelectValue placeholder={t('sessions.selectCourse')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="course1">مقرر العلاج الطبيعي - Physical Therapy Course</SelectItem>
                              <SelectItem value="course2">مقرر علاج النطق - Speech Therapy Course</SelectItem>
                              <SelectItem value="course3">مقرر العلاج الوظيفي - Occupational Therapy Course</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="session_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.sessionNumber')} *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className={isRTL ? 'text-right' : ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="session_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.sessionDate')} *
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'} ${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <CalendarIcon className="h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    t('sessions.selectDate')
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date('1900-01-01')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="session_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.sessionTime')} *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              className={isRTL ? 'text-right' : ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.duration')} (دقيقة)
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type="number" 
                                min="15"
                                max="240"
                                step="15"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                                className={isRTL ? 'text-right pr-12' : 'pl-12'}
                              />
                              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Topics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="topic_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.topicArabic')}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder={t('sessions.topicArabicPlaceholder')}
                              className="text-right"
                              dir="rtl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="topic_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.topicEnglish')}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder={t('sessions.topicEnglishPlaceholder')}
                              dir="ltr"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Objectives */}
                  <div>
                    <Label className={`text-base font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t('sessions.objectives')} *
                    </Label>
                    <div className="space-y-2 mt-2">
                      {objectiveFields.map((field, index) => (
                        <div key={field.id} className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <FormField
                            control={form.control}
                            name={`objectives.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={`${t('sessions.objective')} ${index + 1}`}
                                    className={isRTL ? 'text-right' : ''}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {objectiveFields.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeObjective(index)}
                              className="px-3"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addObjective}
                        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Plus className="h-4 w-4" />
                        {t('sessions.addObjective')}
                      </Button>
                    </div>
                  </div>

                  {/* Materials */}
                  <div>
                    <Label className={`text-base font-medium ${isRTL ? 'text-right' : ''}`}>
                      {t('sessions.materialsNeeded')}
                    </Label>
                    <div className="space-y-2 mt-2">
                      {materialFields.map((field, index) => (
                        <div key={field.id} className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <FormField
                            control={form.control}
                            name={`materials_needed.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={`${t('sessions.material')} ${index + 1}`}
                                    className={isRTL ? 'text-right' : ''}
                                    dir={isRTL ? 'rtl' : 'ltr'}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeMaterial(index)}
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addMaterial}
                        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Plus className="h-4 w-4" />
                        {t('sessions.addMaterial')}
                      </Button>
                    </div>
                  </div>

                  {/* Media Documentation Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className={isRTL ? 'text-right' : ''}>
                      <Label htmlFor="media-toggle" className="text-base font-medium">
                        {t('sessions.enableMediaDocumentation')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('sessions.mediaDocumentationDescription')}
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="enable_media_documentation"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              id="media-toggle"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Media Documentation Tab */}
                <TabsContent value="media" className="space-y-6 mt-6">
                  {enableMediaDocumentation ? (
                    <div className="space-y-6">
                      {/* Media Upload Section */}
                      <div>
                        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className="text-lg font-medium">{t('media.upload.title')}</h3>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowMediaUpload(!showMediaUpload)}
                            className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Upload className="h-4 w-4" />
                            {showMediaUpload ? t('media.upload.hideUpload') : t('media.upload.showUpload')}
                          </Button>
                        </div>

                        {showMediaUpload && (
                          <MediaUpload
                            studentId={studentId}
                            sessionId={sessionId}
                            language={language}
                            onUploadComplete={handleMediaUploadComplete}
                            className="mb-6"
                          />
                        )}
                      </div>

                      {/* Session Media Gallery */}
                      {sessionMedia.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-4">
                            {t('sessions.sessionMedia')} ({sessionMedia.length})
                          </h3>
                          <MediaGallery
                            studentId={studentId}
                            sessionId={sessionId}
                            language={language}
                            viewMode="grid"
                            showFilters={false}
                            className="max-h-96 overflow-y-auto"
                          />
                        </div>
                      )}

                      {/* Media Instructions */}
                      {sessionMedia.length === 0 && !showMediaUpload && (
                        <div className="text-center py-12 bg-muted/20 rounded-lg">
                          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-lg font-medium mb-2">{t('media.noMedia')}</p>
                          <p className="text-muted-foreground mb-4">{t('media.noMediaDescription')}</p>
                          <Button
                            type="button"
                            onClick={() => setShowMediaUpload(true)}
                            className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Upload className="h-4 w-4" />
                            {t('media.upload.startUploading')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t('sessions.mediaDocumentationDisabled')}
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="session_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.sessionNotes')}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t('sessions.sessionNotesPlaceholder')}
                              className={`min-h-[120px] ${isRTL ? 'text-right' : ''}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="progress_summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.progressSummary')}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t('sessions.progressSummaryPlaceholder')}
                              className={`min-h-[100px] ${isRTL ? 'text-right' : ''}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="homework_assigned"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.homeworkAssigned')}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t('sessions.homeworkAssignedPlaceholder')}
                              className={`min-h-[100px] ${isRTL ? 'text-right' : ''}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_session_plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={isRTL ? 'text-right' : ''}>
                            {t('sessions.nextSessionPlan')}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t('sessions.nextSessionPlanPlaceholder')}
                              className={`min-h-[100px] ${isRTL ? 'text-right' : ''}`}
                              dir={isRTL ? 'rtl' : 'ltr'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Session Summary Card */}
                  <Card className="bg-muted/20">
                    <CardHeader>
                      <CardTitle className={`text-lg ${isRTL ? 'text-right' : ''}`}>
                        {t('sessions.sessionSummary')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-sm font-medium">{t('sessions.objectives')}</p>
                          <p className="text-sm text-muted-foreground">
                            {form.watch('objectives').filter(obj => obj.trim()).length} {t('sessions.objectivesCount')}
                          </p>
                        </div>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-sm font-medium">{t('sessions.duration')}</p>
                          <p className="text-sm text-muted-foreground">
                            {form.watch('duration_minutes')} {t('sessions.minutes')}
                          </p>
                        </div>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-sm font-medium">{t('sessions.materials')}</p>
                          <p className="text-sm text-muted-foreground">
                            {form.watch('materials_needed')?.filter(mat => mat.trim()).length || 0} {t('sessions.materialsCount')}
                          </p>
                        </div>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className="text-sm font-medium">{t('sessions.media')}</p>
                          <p className="text-sm text-muted-foreground">
                            {sessionMedia.length} {t('sessions.mediaCount')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className={`flex gap-3 pt-6 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {initialData ? t('sessions.updateSession') : t('sessions.createSession')}
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}