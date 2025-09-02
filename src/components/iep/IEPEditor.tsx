/**
 * IEP Editor Interface with Collaborative Editing
 * Real-time multi-user editing with conflict resolution and version control
 * IDEA 2024 Compliant - Bilingual Support
 */

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Edit3,
  History,
  UserCheck,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEP, useUpdateIEP, useIEPValidation } from '@/hooks/useIEPs'
import type { IEP, UpdateIEPData } from '@/types/iep'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-utils'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface CollaborativeUser {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'active' | 'idle' | 'offline'
  lastSeen: Date
  currentField?: string
  isTyping?: boolean
}

interface VersionInfo {
  version: number
  timestamp: Date
  author: string
  changes: string[]
  isConflict?: boolean
}

interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved?: Date
  error?: string
}

interface CollaborativeChange {
  field: string
  value: any
  author: string
  timestamp: Date
  version: number
}

// =============================================================================
// VALIDATION SCHEMA - MINIMAL FOR REAL-TIME EDITING
// =============================================================================

const quickEditSchema = z.object({
  present_levels_academic_ar: z.string(),
  present_levels_academic_en: z.string().optional(),
  present_levels_functional_ar: z.string(),
  present_levels_functional_en: z.string().optional(),
  lre_justification_ar: z.string(),
  lre_justification_en: z.string().optional(),
  mainstreaming_percentage: z.number().min(0).max(100),
  special_education_setting: z.string(),
  academic_year: z.string(),
  effective_date: z.string(),
  annual_review_date: z.string(),
  triennial_evaluation_due: z.string().optional(),
  accommodations_ar: z.array(z.string()).optional(),
  accommodations_en: z.array(z.string()).optional(),
  modifications_ar: z.array(z.string()).optional(),
  modifications_en: z.array(z.string()).optional(),
  state_assessment_accommodations_ar: z.array(z.string()).optional(),
  state_assessment_accommodations_en: z.array(z.string()).optional(),
  alternate_assessment_justification_ar: z.string().optional(),
  alternate_assessment_justification_en: z.string().optional(),
  transition_services_needed: z.boolean().optional(),
  behavior_plan_needed: z.boolean().optional(),
  esy_services_needed: z.boolean().optional(),
  post_secondary_goals_ar: z.string().optional(),
  post_secondary_goals_en: z.string().optional(),
  behavior_goals_ar: z.string().optional(),
  behavior_goals_en: z.string().optional(),
  esy_justification_ar: z.string().optional(),
  esy_justification_en: z.string().optional()
})

type QuickEditData = z.infer<typeof quickEditSchema>

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface IEPEditorProps {
  iepId: string
  mode?: 'view' | 'edit' | 'collaborative'
  onSave?: (data: UpdateIEPData) => void
  onClose?: () => void
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPEditor = ({ 
  iepId, 
  mode = 'collaborative', 
  onSave, 
  onClose 
}: IEPEditorProps) => {
  const { language, isRTL } = useLanguage()
  
  // Hooks
  const { data: iep, isLoading, error } = useIEP(iepId)
  const updateIEPMutation = useUpdateIEP()
  
  // State management
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [collaborativeUsers, setCollaborativeUsers] = useState<CollaborativeUser[]>([])
  const [currentUser, setCurrentUser] = useState<CollaborativeUser | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>({ status: 'idle' })
  const [versionInfo, setVersionInfo] = useState<VersionInfo[]>([])
  const [pendingChanges, setPendingChanges] = useState<CollaborativeChange[]>([])
  const [conflictResolution, setConflictResolution] = useState<string | null>(null)
  
  // Refs for real-time collaboration
  const realtimeChannel = useRef<any>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastEditTime = useRef<Date>(new Date())
  
  // Form setup with default values from IEP
  const form = useForm<QuickEditData>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      present_levels_academic_ar: iep?.present_levels_academic_ar || '',
      present_levels_academic_en: iep?.present_levels_academic_en || '',
      present_levels_functional_ar: iep?.present_levels_functional_ar || '',
      present_levels_functional_en: iep?.present_levels_functional_en || '',
      lre_justification_ar: iep?.lre_justification_ar || '',
      lre_justification_en: iep?.lre_justification_en || '',
      mainstreaming_percentage: iep?.mainstreaming_percentage || 0,
      special_education_setting: iep?.special_education_setting || '',
      academic_year: iep?.academic_year || '',
      effective_date: iep?.effective_date || '',
      annual_review_date: iep?.annual_review_date || '',
      triennial_evaluation_due: iep?.triennial_evaluation_due || '',
      accommodations_ar: iep?.accommodations_ar || [],
      accommodations_en: iep?.accommodations_en || [],
      modifications_ar: iep?.modifications_ar || [],
      modifications_en: iep?.modifications_en || [],
      state_assessment_accommodations_ar: iep?.state_assessment_accommodations_ar || [],
      state_assessment_accommodations_en: iep?.state_assessment_accommodations_en || [],
      alternate_assessment_justification_ar: iep?.alternate_assessment_justification_ar || '',
      alternate_assessment_justification_en: iep?.alternate_assessment_justification_en || '',
      transition_services_needed: iep?.transition_services_needed || false,
      behavior_plan_needed: iep?.behavior_plan_needed || false,
      esy_services_needed: iep?.esy_services_needed || false,
      post_secondary_goals_ar: iep?.post_secondary_goals_ar || '',
      post_secondary_goals_en: iep?.post_secondary_goals_en || '',
      behavior_goals_ar: iep?.behavior_goals_ar || '',
      behavior_goals_en: iep?.behavior_goals_en || '',
      esy_justification_ar: iep?.esy_justification_ar || '',
      esy_justification_en: iep?.esy_justification_en || ''
    }
  })
  
  // Real-time validation
  const formData = form.watch()
  const { data: validationResult } = useIEPValidation(formData as any)

  // =============================================================================
  // COLLABORATIVE EDITING SETUP
  // =============================================================================

  useEffect(() => {
    if (!iep || mode === 'view') return

    const setupCollaborativeEditing = async () => {
      try {
        const user = await requireAuth()
        
        // Set current user
        setCurrentUser({
          id: user.id,
          name: user.email || 'Unknown User',
          email: user.email || '',
          status: 'active',
          lastSeen: new Date()
        })

        // Setup Supabase real-time channel
        realtimeChannel.current = supabase
          .channel(`iep-editing-${iepId}`)
          .on(
            'presence',
            { event: 'sync' },
            () => {
              const newState = realtimeChannel.current.presenceState()
              const users = Object.keys(newState).map(userId => ({
                id: userId,
                ...newState[userId][0]
              }))
              setCollaborativeUsers(users)
            }
          )
          .on(
            'presence',
            { event: 'join' },
            ({ key, newPresences }) => {
              console.log('🔍 IEPEditor: User joined collaborative session:', key)
            }
          )
          .on(
            'presence',
            { event: 'leave' },
            ({ key, leftPresences }) => {
              console.log('🔍 IEPEditor: User left collaborative session:', key)
            }
          )
          .on(
            'broadcast',
            { event: 'field-change' },
            (payload) => {
              handleRemoteFieldChange(payload.payload)
            }
          )
          .on(
            'broadcast',
            { event: 'user-typing' },
            (payload) => {
              handleRemoteTyping(payload.payload)
            }
          )

        // Join the presence channel
        await realtimeChannel.current.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await realtimeChannel.current.track({
              id: user.id,
              name: user.email || 'Unknown User',
              email: user.email || '',
              status: 'active',
              lastSeen: new Date().toISOString(),
              iepId: iepId
            })
          }
        })

        console.log('✅ IEPEditor: Collaborative editing setup complete')
        
      } catch (error) {
        console.error('❌ IEPEditor: Failed to setup collaborative editing:', error)
      }
    }

    setupCollaborativeEditing()

    // Cleanup on unmount
    return () => {
      if (realtimeChannel.current) {
        realtimeChannel.current.unsubscribe()
      }
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [iep, iepId, mode])

  // =============================================================================
  // ONLINE/OFFLINE STATUS MONITORING
  // =============================================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('✅ IEPEditor: Connection restored')
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      console.log('⚠️ IEPEditor: Connection lost - offline mode')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // =============================================================================
  // COLLABORATIVE EDITING HANDLERS
  // =============================================================================

  const handleRemoteFieldChange = (change: CollaborativeChange) => {
    if (change.author === currentUser?.id) return // Ignore own changes
    
    console.log('🔍 IEPEditor: Received remote change:', change)
    
    // Check for conflicts
    const currentValue = form.getValues(change.field as keyof QuickEditData)
    const currentTime = new Date()
    const timeDiff = currentTime.getTime() - lastEditTime.current.getTime()
    
    if (timeDiff < 5000 && currentValue !== change.value) { // 5 second conflict window
      console.log('⚠️ IEPEditor: Conflict detected for field:', change.field)
      setConflictResolution(change.field)
      setPendingChanges(prev => [...prev, change])
    } else {
      // Apply change directly
      form.setValue(change.field as keyof QuickEditData, change.value)
    }
  }

  const handleRemoteTyping = (typingInfo: { userId: string, field: string, isTyping: boolean }) => {
    setCollaborativeUsers(prev => prev.map(user => 
      user.id === typingInfo.userId 
        ? { 
            ...user, 
            currentField: typingInfo.isTyping ? typingInfo.field : undefined,
            isTyping: typingInfo.isTyping 
          }
        : user
    ))
  }

  const broadcastFieldChange = (fieldName: string, value: any) => {
    if (!realtimeChannel.current || !currentUser) return
    
    const change: CollaborativeChange = {
      field: fieldName,
      value: value,
      author: currentUser.id,
      timestamp: new Date(),
      version: versionInfo.length + 1
    }
    
    realtimeChannel.current.send({
      type: 'broadcast',
      event: 'field-change',
      payload: change
    })
    
    lastEditTime.current = new Date()
  }

  const broadcastTypingStatus = (fieldName: string, isTyping: boolean) => {
    if (!realtimeChannel.current || !currentUser) return
    
    realtimeChannel.current.send({
      type: 'broadcast',
      event: 'user-typing',
      payload: {
        userId: currentUser.id,
        field: fieldName,
        isTyping: isTyping
      }
    })
  }

  // =============================================================================
  // AUTO-SAVE FUNCTIONALITY
  // =============================================================================

  const triggerAutoSave = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }
    
    autoSaveTimer.current = setTimeout(async () => {
      await performAutoSave()
    }, 2000) // Auto-save after 2 seconds of inactivity
  }

  const performAutoSave = async () => {
    if (!isOnline || mode === 'view') return
    
    try {
      setAutoSaveStatus({ status: 'saving' })
      
      const formData = form.getValues()
      const updateData: UpdateIEPData = {
        ...formData,
        updated_at: new Date().toISOString()
      }
      
      await updateIEPMutation.mutateAsync({ id: iepId, data: updateData })
      
      setAutoSaveStatus({ 
        status: 'saved', 
        lastSaved: new Date() 
      })
      
      // Clear saved status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, status: 'idle' }))
      }, 3000)
      
      console.log('✅ IEPEditor: Auto-save completed')
      
    } catch (error) {
      console.error('❌ IEPEditor: Auto-save failed:', error)
      setAutoSaveStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Auto-save failed' 
      })
    }
  }

  // =============================================================================
  // FIELD CHANGE HANDLERS
  // =============================================================================

  const handleFieldChange = (fieldName: string, value: any) => {
    // Update form
    form.setValue(fieldName as keyof QuickEditData, value)
    
    // Broadcast change to other users
    if (mode === 'collaborative') {
      broadcastFieldChange(fieldName, value)
      triggerAutoSave()
    }
  }

  const handleFieldFocus = (fieldName: string) => {
    if (mode === 'collaborative') {
      broadcastTypingStatus(fieldName, true)
    }
  }

  const handleFieldBlur = (fieldName: string) => {
    if (mode === 'collaborative') {
      broadcastTypingStatus(fieldName, false)
    }
  }

  // =============================================================================
  // CONFLICT RESOLUTION
  // =============================================================================

  const resolveConflict = (field: string, acceptRemote: boolean) => {
    const pendingChange = pendingChanges.find(change => change.field === field)
    
    if (pendingChange && acceptRemote) {
      form.setValue(field as keyof QuickEditData, pendingChange.value)
    }
    
    setPendingChanges(prev => prev.filter(change => change.field !== field))
    setConflictResolution(null)
  }

  // =============================================================================
  // MANUAL SAVE
  // =============================================================================

  const handleManualSave = async () => {
    try {
      const formData = form.getValues()
      const updateData: UpdateIEPData = formData

      await updateIEPMutation.mutateAsync({ id: iepId, data: updateData })
      
      if (onSave) {
        onSave(updateData)
      }
      
      console.log('✅ IEPEditor: Manual save completed')
      
    } catch (error) {
      console.error('❌ IEPEditor: Manual save failed:', error)
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getFieldCollaborator = (fieldName: string) => {
    return collaborativeUsers.find(user => 
      user.currentField === fieldName && user.isTyping && user.id !== currentUser?.id
    )
  }

  const formatLastSaved = (date?: Date) => {
    if (!date) return ''
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    
    if (diffSecs < 60) {
      return language === 'ar' ? 'منذ ثوانٍ قليلة' : 'just now'
    } else if (diffMins < 60) {
      return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
    } else {
      return date.toLocaleTimeString()
    }
  }

  // =============================================================================
  // LOADING AND ERROR STATES
  // =============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className={`text-center ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !iep) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className={`text-center text-red-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'خطأ في تحميل الخطة التعليمية' : 'Error loading IEP'}
          </div>
        </CardContent>
      </Card>
    )
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header with Collaboration Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Edit3 className="w-5 h-5" />
              {language === 'ar' ? 'محرر الخطة التعليمية' : 'IEP Editor'}
              
              {/* Online Status Indicator */}
              <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {language === 'ar' ? (isOnline ? 'متصل' : 'غير متصل') : (isOnline ? 'Online' : 'Offline')}
              </Badge>
              
              {/* Validation Status */}
              {validationResult && (
                <Badge variant={validationResult.isValid ? 'default' : 'destructive'} className="gap-1">
                  {validationResult.isValid ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {validationResult.isValid 
                    ? (language === 'ar' ? 'صالح' : 'Valid')
                    : `${validationResult.issues.length} ${language === 'ar' ? 'مشاكل' : 'Issues'}`
                  }
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Auto-save Status */}
              <div className="flex items-center gap-1 text-sm text-gray-500">
                {autoSaveStatus.status === 'saving' && (
                  <>
                    <Save className="w-4 h-4 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                )}
                {autoSaveStatus.status === 'saved' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {language === 'ar' ? 'تم الحفظ' : 'Saved'} {formatLastSaved(autoSaveStatus.lastSaved)}
                  </>
                )}
                {autoSaveStatus.status === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {language === 'ar' ? 'خطأ في الحفظ' : 'Save Error'}
                  </>
                )}
              </div>
              
              {/* Manual Save Button */}
              <Button
                onClick={handleManualSave}
                disabled={updateIEPMutation.isPending || !isOnline}
                size="sm"
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'حفظ' : 'Save'}
              </Button>
              
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Collaborative Users */}
          {mode === 'collaborative' && collaborativeUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex items-center gap-1">
                {collaborativeUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-600">
                      {user.name}
                      {user.isTyping && (
                        <span className="ml-1 text-blue-600">
                          {language === 'ar' ? 'يكتب...' : 'typing...'}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Conflict Resolution Banner */}
      {conflictResolution && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${language === 'ar' ? 'font-arabic' : ''}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span>
                  {language === 'ar' 
                    ? `تم اكتشاف تعديل متضارب في حقل: ${conflictResolution}` 
                    : `Conflict detected in field: ${conflictResolution}`
                  }
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveConflict(conflictResolution, false)}
                >
                  {language === 'ar' ? 'الاحتفاظ بتعديلي' : 'Keep Mine'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => resolveConflict(conflictResolution, true)}
                >
                  {language === 'ar' ? 'قبول التعديل الآخر' : 'Accept Theirs'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Editing Interface */}
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <div className="space-y-6">
              
              {/* Present Levels - Academic */}
              <FormField
                control={form.control}
                name="present_levels_academic_ar"
                render={({ field }) => {
                  const collaborator = getFieldCollaborator('present_levels_academic_ar')
                  return (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الوضع الحالي للأداء الأكاديمي *' : 'Present Levels of Academic Performance *'}
                        {collaborator && (
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            {collaborator.name} {language === 'ar' ? 'يكتب...' : 'typing...'}
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          className={cn(
                            'min-h-24 transition-all duration-200',
                            language === 'ar' ? 'font-arabic text-right' : '',
                            collaborator && 'border-blue-300 bg-blue-50/30'
                          )}
                          placeholder={language === 'ar' ? 'اكتب وصفاً مفصلاً للوضع الحالي للطالب في الأداء الأكاديمي...' : 'Describe the student\'s current academic performance...'}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('present_levels_academic_ar', e.target.value)
                          }}
                          onFocus={() => handleFieldFocus('present_levels_academic_ar')}
                          onBlur={() => handleFieldBlur('present_levels_academic_ar')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {/* Present Levels - Functional */}
              <FormField
                control={form.control}
                name="present_levels_functional_ar"
                render={({ field }) => {
                  const collaborator = getFieldCollaborator('present_levels_functional_ar')
                  return (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الوضع الحالي للأداء الوظيفي *' : 'Present Levels of Functional Performance *'}
                        {collaborator && (
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            {collaborator.name} {language === 'ar' ? 'يكتب...' : 'typing...'}
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          className={cn(
                            'min-h-24 transition-all duration-200',
                            language === 'ar' ? 'font-arabic text-right' : '',
                            collaborator && 'border-blue-300 bg-blue-50/30'
                          )}
                          placeholder={language === 'ar' ? 'اكتب وصفاً مفصلاً للوضع الحالي للطالب في الأداء الوظيفي...' : 'Describe the student\'s current functional performance...'}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('present_levels_functional_ar', e.target.value)
                          }}
                          onFocus={() => handleFieldFocus('present_levels_functional_ar')}
                          onBlur={() => handleFieldBlur('present_levels_functional_ar')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {/* LRE Justification */}
              <FormField
                control={form.control}
                name="lre_justification_ar"
                render={({ field }) => {
                  const collaborator = getFieldCollaborator('lre_justification_ar')
                  return (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'مبرر البيئة الأقل تقييداً *' : 'LRE Justification *'}
                        {collaborator && (
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            {collaborator.name} {language === 'ar' ? 'يكتب...' : 'typing...'}
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          className={cn(
                            'min-h-20 transition-all duration-200',
                            language === 'ar' ? 'font-arabic text-right' : '',
                            collaborator && 'border-blue-300 bg-blue-50/30'
                          )}
                          placeholder={language === 'ar' ? 'اكتب مبرراً لاختيار البيئة الأقل تقييداً للطالب...' : 'Provide justification for the least restrictive environment...'}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('lre_justification_ar', e.target.value)
                          }}
                          onFocus={() => handleFieldFocus('lre_justification_ar')}
                          onBlur={() => handleFieldBlur('lre_justification_ar')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <Separator />

              {/* Basic Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mainstreaming_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'نسبة الدمج (%)' : 'Mainstreaming Percentage (%)'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            field.onChange(value)
                            handleFieldChange('mainstreaming_percentage', value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="special_education_setting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'بيئة التربية الخاصة' : 'Special Education Setting'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          className={language === 'ar' ? 'font-arabic text-right' : ''}
                          onChange={(e) => {
                            field.onChange(e)
                            handleFieldChange('special_education_setting', e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>
          </Form>
        </CardContent>
      </Card>
      
    </div>
  )
}