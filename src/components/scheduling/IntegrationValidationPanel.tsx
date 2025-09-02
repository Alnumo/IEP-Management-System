import React, { useEffect, useState } from 'react'
import { 
  CheckCircle2, XCircle, AlertCircle, Clock, User, 
  MapPin, CreditCard, FileText, RefreshCw, Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSchedulingIntegration } from '@/hooks/useSchedulingIntegration'
import { cn } from '@/lib/utils'
import type { ScheduledSession } from '@/types/scheduling'

/**
 * Integration Validation Panel Component
 * 
 * Displays real-time validation status and integration results
 * across all core systems (enrollment, therapist, room, billing).
 */

interface IntegrationValidationPanelProps {
  sessionData: Partial<ScheduledSession>
  onValidationComplete?: (isValid: boolean, result: any) => void
  onRetry?: () => void
  autoValidate?: boolean
  compact?: boolean
  showDetails?: boolean
}

interface SystemStatus {
  id: string
  name_ar: string
  name_en: string
  status: 'pending' | 'validating' | 'success' | 'error' | 'warning'
  icon: React.ReactNode
  message?: string
  details?: any
  progress?: number
}

export function IntegrationValidationPanel({
  sessionData,
  onValidationComplete,
  onRetry,
  autoValidate = true,
  compact = false,
  showDetails = true
}: IntegrationValidationPanelProps) {
  const { language } = useLanguage()
  const {
    validation,
    conflicts,
    isValidating,
    isLoading,
    validateSession,
    clearValidation,
    clearConflicts
  } = useSchedulingIntegration({
    onSuccess: (result) => {
      onValidationComplete?.(true, result)
    },
    onError: (error) => {
      onValidationComplete?.(false, { error })
    }
  })

  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([
    {
      id: 'enrollment',
      name_ar: 'نظام التسجيل',
      name_en: 'Enrollment System',
      status: 'pending',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'therapist',
      name_ar: 'نظام المعالجين',
      name_en: 'Therapist System',
      status: 'pending',
      icon: <Clock className="w-4 h-4" />
    },
    {
      id: 'room',
      name_ar: 'نظام الغرف',
      name_en: 'Room System',
      status: 'pending',
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: 'billing',
      name_ar: 'نظام الفوترة',
      name_en: 'Billing System',
      status: 'pending',
      icon: <CreditCard className="w-4 h-4" />
    }
  ])

  const [validationProgress, setValidationProgress] = useState(0)

  // Auto-validate when session data changes
  useEffect(() => {
    if (autoValidate && sessionData && Object.keys(sessionData).length > 0) {
      handleValidation()
    }
  }, [sessionData, autoValidate])

  // Update system statuses based on validation results
  useEffect(() => {
    if (!isValidating && validation) {
      updateSystemStatuses(validation)
    }
  }, [validation, isValidating])

  // Update progress during validation
  useEffect(() => {
    if (isValidating) {
      const interval = setInterval(() => {
        setValidationProgress(prev => (prev >= 90 ? 90 : prev + 10))
      }, 200)

      return () => clearInterval(interval)
    } else {
      setValidationProgress(validation.isValid ? 100 : 0)
    }
  }, [isValidating, validation.isValid])

  const handleValidation = () => {
    clearValidation()
    clearConflicts()
    setValidationProgress(0)
    setSystemStatuses(prev => 
      prev.map(system => ({ 
        ...system, 
        status: 'validating',
        message: undefined,
        details: undefined
      }))
    )
    validateSession(sessionData)
  }

  const updateSystemStatuses = (validationResult: any) => {
    setSystemStatuses(prev => 
      prev.map(system => {
        const systemData = validationResult.data?.[system.id]
        
        if (validationResult.errors.length > 0) {
          return {
            ...system,
            status: 'error',
            message: validationResult.errors[0],
            details: systemData
          }
        }

        if (validationResult.warnings.some((w: string) => 
          w.toLowerCase().includes(system.id)
        )) {
          return {
            ...system,
            status: 'warning',
            message: validationResult.warnings.find((w: string) => 
              w.toLowerCase().includes(system.id)
            ),
            details: systemData
          }
        }

        return {
          ...system,
          status: 'success',
          message: language === 'ar' 
            ? 'تم التحقق بنجاح' 
            : 'Validation successful',
          details: systemData
        }
      })
    )
  }

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'validating': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'validating': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const overallStatus = validation.isValid ? 'success' : 
                      validation.errors.length > 0 ? 'error' : 
                      validation.warnings.length > 0 ? 'warning' : 'pending'

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <div className="font-medium text-sm">
                  {language === 'ar' ? 'حالة التكامل' : 'Integration Status'}
                </div>
                {isValidating && (
                  <div className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'جاري التحقق...' : 'Validating...'}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={
                overallStatus === 'success' ? 'default' :
                overallStatus === 'error' ? 'destructive' :
                overallStatus === 'warning' ? 'secondary' : 'outline'
              }>
                {validation.isValid 
                  ? (language === 'ar' ? 'صالح' : 'Valid')
                  : (language === 'ar' ? 'غير صالح' : 'Invalid')
                }
              </Badge>
              
              {!isValidating && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleValidation}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {isValidating && (
            <Progress value={validationProgress} className="mt-3 h-1" />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {language === 'ar' ? 'التحقق من التكامل' : 'Integration Validation'}
          </div>
          
          <div className="flex items-center gap-2">
            {!isValidating && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidation}
                disabled={!sessionData || Object.keys(sessionData).length === 0}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {language === 'ar' ? 'إعادة التحقق' : 'Re-validate'}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            {getStatusIcon(overallStatus)}
            <div>
              <div className="font-medium">
                {language === 'ar' ? 'الحالة العامة' : 'Overall Status'}
              </div>
              <div className="text-sm text-muted-foreground">
                {isValidating 
                  ? (language === 'ar' ? 'جاري التحقق من جميع الأنظمة...' : 'Validating all systems...')
                  : validation.isValid
                  ? (language === 'ar' ? 'جميع الأنظمة متوافقة' : 'All systems compatible')
                  : (language === 'ar' ? 'يوجد مشاكل تحتاج حل' : 'Issues require resolution')
                }
              </div>
            </div>
          </div>
          
          <Badge 
            className={cn('text-sm', getStatusColor(overallStatus))}
            variant={
              overallStatus === 'success' ? 'default' :
              overallStatus === 'error' ? 'destructive' :
              overallStatus === 'warning' ? 'secondary' : 'outline'
            }
          >
            {validation.isValid 
              ? (language === 'ar' ? 'صالح' : 'Valid')
              : (language === 'ar' ? 'غير صالح' : 'Invalid')
            }
          </Badge>
        </div>

        {/* Validation Progress */}
        {isValidating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{language === 'ar' ? 'تقدم التحقق' : 'Validation Progress'}</span>
              <span>{validationProgress}%</span>
            </div>
            <Progress value={validationProgress} className="h-2" />
          </div>
        )}

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemStatuses.map((system) => (
            <div
              key={system.id}
              className={cn(
                'p-3 rounded-lg border transition-all',
                getStatusColor(system.status)
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {system.icon}
                  <span className="font-medium text-sm">
                    {language === 'ar' ? system.name_ar : system.name_en}
                  </span>
                </div>
                {getStatusIcon(system.status)}
              </div>

              {system.message && (
                <div className="text-xs text-muted-foreground">
                  {system.message}
                </div>
              )}

              {showDetails && system.details && system.status === 'success' && (
                <div className="mt-2 text-xs space-y-1">
                  {system.id === 'enrollment' && system.details.enrollment && (
                    <div>
                      {language === 'ar' ? 'الخطة:' : 'Plan:'} {system.details.therapyPlan?.name_ar || system.details.therapyPlan?.name_en}
                    </div>
                  )}
                  {system.id === 'therapist' && system.details.therapist && (
                    <div>
                      {language === 'ar' ? 'المعالج:' : 'Therapist:'} {system.details.therapist.name_ar || system.details.therapist.name_en}
                    </div>
                  )}
                  {system.id === 'room' && system.details.room && (
                    <div>
                      {language === 'ar' ? 'الغرفة:' : 'Room:'} {system.details.room.name_ar || system.details.room.name_en}
                    </div>
                  )}
                  {system.id === 'billing' && system.details.amount && (
                    <div>
                      {language === 'ar' ? 'المبلغ:' : 'Amount:'} {system.details.amount} {language === 'ar' ? 'ريال' : 'SAR'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Errors and Warnings */}
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="space-y-3">
            <Separator />

            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>
                  {language === 'ar' ? 'أخطاء التحقق' : 'Validation Errors'}
                </AlertTitle>
                <AlertDescription className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                </AlertTitle>
                <AlertDescription className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="text-sm">• {warning}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Conflict Information */}
        {conflicts.hasConflicts && (
          <div className="space-y-3">
            <Separator />
            
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {language === 'ar' ? 'تضارب في الجدولة' : 'Scheduling Conflicts'}
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  {conflicts.conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm">
                      • {conflict.description || conflict.message}
                    </div>
                  ))}
                  
                  {conflicts.resolutionSuggestions.length > 0 && (
                    <div className="mt-3">
                      <div className="font-medium text-sm mb-1">
                        {language === 'ar' ? 'اقتراحات الحل:' : 'Resolution Suggestions:'}
                      </div>
                      {conflicts.resolutionSuggestions.map((suggestion, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {suggestion.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Action Buttons */}
        {!isValidating && !validation.isValid && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={!onRetry}
            >
              {language === 'ar' ? 'المحاولة مرة أخرى' : 'Try Again'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearValidation()
                clearConflicts()
              }}
            >
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>
        )}

        {/* Loading Skeleton for Initial Load */}
        {isLoading && !systemStatuses.some(s => s.status !== 'pending') && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}