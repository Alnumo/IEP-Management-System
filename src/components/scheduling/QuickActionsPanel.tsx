import React, { useState } from 'react'
import { 
  Plus, Users, Calendar, Zap, RotateCcw, Settings,
  Clock, MapPin, FileText, Download, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

/**
 * Quick Actions Panel Component
 * 
 * Provides quick access to common scheduling actions and operations
 * with intuitive icons and bilingual labels.
 */

interface QuickActionsPanelProps {
  onCreateSession?: () => void
  onBulkOperations?: () => void
  onOptimizeSchedule?: () => void
  onManageAvailability?: () => void
  onGenerateReport?: () => void
  onResolveConflicts?: () => void
  editMode?: boolean
  readOnly?: boolean
  pendingOperations?: number
  conflictsCount?: number
}

interface QuickAction {
  id: string
  label_ar: string
  label_en: string
  description_ar: string
  description_en: string
  icon: React.ReactNode
  action: () => void
  variant: 'primary' | 'secondary' | 'outline'
  requiresEditMode?: boolean
  showBadge?: boolean
  badgeCount?: number
  disabled?: boolean
}

export function QuickActionsPanel({
  onCreateSession = () => {},
  onBulkOperations = () => {},
  onOptimizeSchedule = () => {},
  onManageAvailability = () => {},
  onGenerateReport = () => {},
  onResolveConflicts = () => {},
  editMode = false,
  readOnly = false,
  pendingOperations = 0,
  conflictsCount = 0
}: QuickActionsPanelProps) {
  const { language } = useLanguage()
  const [isOptimizing, setIsOptimizing] = useState(false)

  const handleOptimizeSchedule = async () => {
    setIsOptimizing(true)
    try {
      await onOptimizeSchedule()
    } finally {
      setIsOptimizing(false)
    }
  }

  // Define quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'create_session',
      label_ar: 'إضافة جلسة',
      label_en: 'Add Session',
      description_ar: 'إنشاء جلسة علاج جديدة',
      description_en: 'Create a new therapy session',
      icon: <Plus className="w-4 h-4" />,
      action: onCreateSession,
      variant: 'primary',
      requiresEditMode: true,
      disabled: readOnly
    },
    {
      id: 'bulk_operations',
      label_ar: 'العمليات الجماعية',
      label_en: 'Bulk Operations',
      description_ar: 'تنفيذ عمليات على عدة جلسات',
      description_en: 'Perform operations on multiple sessions',
      icon: <Users className="w-4 h-4" />,
      action: onBulkOperations,
      variant: 'outline',
      requiresEditMode: true,
      showBadge: pendingOperations > 0,
      badgeCount: pendingOperations,
      disabled: readOnly
    },
    {
      id: 'optimize_schedule',
      label_ar: 'تحسين الجدولة',
      label_en: 'Optimize Schedule',
      description_ar: 'تحسين الجدولة تلقائياً للكفاءة',
      description_en: 'Automatically optimize schedule for efficiency',
      icon: <Zap className="w-4 h-4" />,
      action: handleOptimizeSchedule,
      variant: 'outline',
      requiresEditMode: true,
      disabled: readOnly || isOptimizing
    },
    {
      id: 'manage_availability',
      label_ar: 'إدارة التوفر',
      label_en: 'Manage Availability',
      description_ar: 'تعديل توفر المعالجين والموارد',
      description_en: 'Edit therapist and resource availability',
      icon: <Calendar className="w-4 h-4" />,
      action: onManageAvailability,
      variant: 'outline',
      disabled: readOnly
    },
    {
      id: 'resolve_conflicts',
      label_ar: 'حل التضارب',
      label_en: 'Resolve Conflicts',
      description_ar: 'حل تضارب الجدولة',
      description_en: 'Resolve scheduling conflicts',
      icon: <AlertCircle className="w-4 h-4" />,
      action: onResolveConflicts,
      variant: 'outline',
      showBadge: conflictsCount > 0,
      badgeCount: conflictsCount,
      disabled: conflictsCount === 0
    },
    {
      id: 'generate_report',
      label_ar: 'إنشاء تقرير',
      label_en: 'Generate Report',
      description_ar: 'إنشاء تقرير عن الجدولة',
      description_en: 'Generate scheduling report',
      icon: <FileText className="w-4 h-4" />,
      action: onGenerateReport,
      variant: 'secondary'
    }
  ]

  // Filter actions based on current mode and permissions
  const availableActions = quickActions.filter(action => {
    if (action.requiresEditMode && !editMode) return false
    if (action.disabled) return false
    return true
  })

  const unavailableActions = quickActions.filter(action => {
    if (action.requiresEditMode && !editMode) return true
    if (action.disabled) return true
    return false
  })

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {availableActions.map(action => (
            <TooltipProvider key={action.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant}
                    size="sm"
                    onClick={action.action}
                    className={cn(
                      'w-full justify-start',
                      action.variant === 'primary' && 'font-medium'
                    )}
                    disabled={action.disabled || (action.id === 'optimize_schedule' && isOptimizing)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {action.id === 'optimize_schedule' && isOptimizing ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          action.icon
                        )}
                        <span className="text-sm">
                          {language === 'ar' ? action.label_ar : action.label_en}
                        </span>
                      </div>
                      
                      {action.showBadge && action.badgeCount && action.badgeCount > 0 && (
                        <Badge 
                          variant={action.id === 'resolve_conflicts' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {action.badgeCount}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{language === 'ar' ? action.description_ar : action.description_en}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}

          {/* Show unavailable actions in disabled state if in read-only mode */}
          {readOnly && unavailableActions.length > 0 && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground mb-2">
                {language === 'ar' ? 'غير متاح في وضع القراءة فقط:' : 'Unavailable in read-only mode:'}
              </div>
              {unavailableActions.slice(0, 3).map(action => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start opacity-50"
                  disabled
                >
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span className="text-sm">
                      {language === 'ar' ? action.label_ar : action.label_en}
                    </span>
                  </div>
                </Button>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {language === 'ar' ? 'أدوات الجدولة' : 'Schedule Tools'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Handle quick time slot finder
            }}
            disabled={readOnly}
          >
            <Clock className="w-4 h-4 mr-2" />
            <span className="text-sm">
              {language === 'ar' ? 'البحث عن فترة متاحة' : 'Find Available Slot'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Handle room availability check
            }}
            disabled={readOnly}
          >
            <MapPin className="w-4 h-4 mr-2" />
            <span className="text-sm">
              {language === 'ar' ? 'فحص توفر الغرف' : 'Check Room Availability'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Handle therapist workload view
            }}
          >
            <Users className="w-4 h-4 mr-2" />
            <span className="text-sm">
              {language === 'ar' ? 'عبء عمل المعالجين' : 'Therapist Workload'}
            </span>
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      {(conflictsCount > 0 || pendingOperations > 0) && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-4 h-4" />
              {language === 'ar' ? 'يتطلب انتباه' : 'Requires Attention'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflictsCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {language === 'ar' ? 'تضارب في الجدولة' : 'Schedule Conflicts'}
                  </span>
                </div>
                <Badge variant="destructive">
                  {conflictsCount}
                </Badge>
              </div>
            )}

            {pendingOperations > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    {language === 'ar' ? 'عمليات معلقة' : 'Pending Operations'}
                  </span>
                </div>
                <Badge variant="outline" className="text-orange-700">
                  {pendingOperations}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help & Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {language === 'ar' ? 'نصائح سريعة' : 'Quick Tips'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              {language === 'ar' 
                ? '💡 استخدم وضع التحرير لسحب وإفلات الجلسات'
                : '💡 Use edit mode to drag and drop sessions'
              }
            </p>
            <p>
              {language === 'ar'
                ? '⚡ تحسين الجدولة يوفر ترتيباً أفضل تلقائياً'
                : '⚡ Schedule optimization automatically arranges for better efficiency'
              }
            </p>
            <p>
              {language === 'ar'
                ? '📊 راجع الإحصائيات لمراقبة الأداء'
                : '📊 Check stats to monitor performance'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}