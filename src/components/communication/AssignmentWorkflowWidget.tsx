import React, { useState } from 'react'
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  BarChart3,
  RefreshCw,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useQuery } from '@tanstack/react-query'
import { assignmentWorkflowService } from '@/services/assignment-workflow-service'

interface AssignmentWorkflowWidgetProps {
  therapistId: string
  language: 'ar' | 'en'
  className?: string
}

export const AssignmentWorkflowWidget: React.FC<AssignmentWorkflowWidgetProps> = ({
  therapistId,
  language,
  className
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Get workload data
  const { data: workloadData, isLoading, refetch } = useQuery({
    queryKey: ['therapist-workload', therapistId, selectedDate],
    queryFn: () => assignmentWorkflowService.getTherapistWorkload(therapistId, selectedDate),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Get assignment rules
  const { data: rules } = useQuery({
    queryKey: ['assignment-rules'],
    queryFn: () => assignmentWorkflowService.getAssignmentRules(),
    staleTime: 30 * 60 * 1000 // 30 minutes
  })

  const getCapacityStatus = () => {
    if (!workloadData) return { status: 'unknown', color: 'bg-gray-500', text: 'غير محدد' }
    
    const utilization = workloadData.capacityUtilization
    
    if (utilization >= 90) {
      return { status: 'critical', color: 'bg-red-500', text: 'مكتمل' }
    } else if (utilization >= 75) {
      return { status: 'warning', color: 'bg-yellow-500', text: 'مرتفع' }
    } else if (utilization >= 50) {
      return { status: 'normal', color: 'bg-green-500', text: 'متوسط' }
    } else {
      return { status: 'low', color: 'bg-blue-500', text: 'منخفض' }
    }
  }

  const capacityStatus = getCapacityStatus()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Settings className="w-5 h-5" />
            {language === 'ar' ? 'سير العمل والتكليفات' : 'Assignment Workflow'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Workload Overview */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-right">
              <BarChart3 className="w-5 h-5" />
              {language === 'ar' ? 'نظرة عامة على عبء العمل' : 'Workload Overview'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Selector */}
          <div className="flex items-center gap-2 justify-end">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm text-right"
              dir="rtl"
            />
            <Calendar className="w-4 h-4 text-gray-500" />
          </div>

          {/* Capacity Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-right">الجلسات اليومية</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {workloadData?.totalSessions || 0}
              </p>
              <p className="text-xs text-gray-500 text-right">من أصل 8</p>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-right">ساعات العمل</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {workloadData ? Math.round(workloadData.totalDuration / 60) : 0}
              </p>
              <p className="text-xs text-gray-500 text-right">من أصل 8 ساعات</p>
            </div>
          </div>

          {/* Capacity Utilization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Badge 
                variant="secondary" 
                className={`${capacityStatus.color} text-white text-right`}
              >
                {capacityStatus.text}
              </Badge>
              <span className="text-right">نسبة الاستخدام</span>
            </div>
            <Progress 
              value={workloadData?.capacityUtilization || 0} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 text-right">
              {Math.round(workloadData?.capacityUtilization || 0)}% من الطاقة الاستيعابية
            </p>
          </div>

          {/* Recommendations */}
          {workloadData?.recommendations && workloadData.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-right mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                توصيات
              </h4>
              <div className="space-y-1">
                {workloadData.recommendations.map((recommendation, index) => (
                  <div key={index} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded text-right">
                    {recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Validation Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <CheckCircle className="w-5 h-5" />
            {language === 'ar' ? 'حالة قواعد التكليف' : 'Assignment Rules Status'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div 
                  key={rule.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {rule.rule_type === 'one_therapist_per_session_type' ? 'معالج واحد لكل نوع جلسة' :
                       rule.rule_type === 'capacity_limit' ? 'حدود الطاقة الاستيعابية' :
                       rule.rule_type === 'specialization_required' ? 'مطابقة التخصص المطلوبة' :
                       rule.rule_type}
                    </p>
                    <p className="text-xs text-gray-500">
                      أولوية: {rule.priority}
                    </p>
                  </div>
                  
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? (language === 'ar' ? 'مفعل' : 'Active') : (language === 'ar' ? 'معطل' : 'Disabled')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 text-right">لا توجد قواعد مكونة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Assignment Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Settings className="w-5 h-5" />
            {language === 'ar' ? 'أدوات التكليف السريع' : 'Quick Assignment Tools'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-end gap-2 text-right"
            onClick={() => {
              // TODO: Implement assignment validation dialog
              console.log('Opening assignment validation for therapist:', therapistId)
            }}
          >
            <CheckCircle className="w-4 h-4" />
            {language === 'ar' ? 'فحص التكليفات' : 'Validate Assignments'}
          </Button>

          <Button
            variant="outline"  
            className="w-full justify-end gap-2 text-right"
            onClick={() => {
              // TODO: Implement conflict detection
              console.log('Checking conflicts for therapist:', therapistId)
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            {language === 'ar' ? 'اكتشاف التعارضات' : 'Detect Conflicts'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-end gap-2 text-right"
            onClick={() => {
              // TODO: Implement optimal assignment suggestions
              console.log('Finding optimal assignments for therapist:', therapistId)
            }}
          >
            <BarChart3 className="w-4 h-4" />
            {language === 'ar' ? 'اقتراحات مثلى' : 'Optimal Suggestions'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// =====================================================
// ASSIGNMENT VALIDATION DIALOG
// =====================================================

interface AssignmentValidationDialogProps {
  therapistId: string
  isOpen: boolean
  onClose: () => void
  language: 'ar' | 'en'
}

export const AssignmentValidationDialog: React.FC<AssignmentValidationDialogProps> = ({
  therapistId,
  isOpen,
  onClose,
  language
}) => {
  const [validationDate, setValidationDate] = useState(new Date().toISOString().split('T')[0])
  const [validationResults, setValidationResults] = useState<any[]>([])
  const [isValidating, setIsValidating] = useState(false)

  const runValidation = async () => {
    setIsValidating(true)
    try {
      // Get all assignments for the date and validate each one
      // This would typically involve fetching course assignments and validating each
      console.log('Running assignment validation for:', therapistId, 'on:', validationDate)
      
      // Placeholder for actual validation logic
      const mockResults = [
        {
          sessionTime: '09:00',
          courseName: 'العلاج النطقي',
          status: 'valid',
          warnings: []
        },
        {
          sessionTime: '10:00', 
          courseName: 'العلاج الوظيفي',
          status: 'conflict',
          warnings: ['تعارض زمني محتمل مع جلسة أخرى']
        }
      ]
      
      setValidationResults(mockResults)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className={isOpen ? 'block' : 'hidden'}>
      {/* TODO: Implement full validation dialog using Dialog component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">
            {language === 'ar' ? 'فحص التكليفات المفصل' : 'Detailed Assignment Validation'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-end">
              <input
                type="date"
                value={validationDate}
                onChange={(e) => setValidationDate(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
                dir="rtl"
              />
              <Button onClick={runValidation} disabled={isValidating} size="sm">
                {isValidating ? 'جاري الفحص...' : 'فحص'}
              </Button>
            </div>

            {validationResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-right">نتائج الفحص:</h4>
                {validationResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={result.status === 'valid' ? 'default' : 'destructive'}
                      >
                        {result.status === 'valid' ? 'صالح' : 'تعارض'}
                      </Badge>
                      <div className="text-right">
                        <p className="text-sm font-medium">{result.courseName}</p>
                        <p className="text-xs text-gray-500">{result.sessionTime}</p>
                      </div>
                    </div>
                    {result.warnings.length > 0 && (
                      <div className="text-xs text-orange-600 text-right">
                        {result.warnings.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}