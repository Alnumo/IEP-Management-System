import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, FileX, Users, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { IEP } from '@/types/iep'

interface ComplianceIssue {
  id: string
  iep_id: string
  type: 'missing_signature' | 'overdue_review' | 'incomplete_goals' | 'missing_services' | 'evaluation_expired'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description_en: string
  description_ar: string
  created_at: string
  due_date?: string
}

interface ComplianceAlertsWidgetProps {
  issues?: IEP[]
  isLoading?: boolean
}

export const ComplianceAlertsWidget = ({ issues = [], isLoading }: ComplianceAlertsWidgetProps) => {
  const { language, isRTL } = useLanguage()

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'medium': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'low': return <FileX className="w-4 h-4 text-blue-600" />
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />
    }
  }

  const getIssueTypeLabel = (type: string) => {
    const labels = {
      missing_signature: {
        en: 'Missing Signature',
        ar: 'توقيع مفقود'
      },
      overdue_review: {
        en: 'Overdue Review',
        ar: 'مراجعة متأخرة'
      },
      incomplete_goals: {
        en: 'Incomplete Goals',
        ar: 'أهداف غير مكتملة'
      },
      missing_services: {
        en: 'Missing Services',
        ar: 'خدمات مفقودة'
      },
      evaluation_expired: {
        en: 'Evaluation Expired',
        ar: 'انتهت صلاحية التقييم'
      }
    }
    return labels[type as keyof typeof labels]?.[language] || type
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (language === 'ar') {
      if (diffInDays > 0) {
        return diffInDays === 1 ? 'منذ يوم واحد' : `منذ ${diffInDays} أيام`
      } else {
        return diffInHours === 1 ? 'منذ ساعة واحدة' : `منذ ${diffInHours} ساعات`
      }
    } else {
      if (diffInDays > 0) {
        return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`
      } else {
        return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`
      }
    }
  }

  // Mock compliance issues for demonstration
  const mockComplianceIssues: ComplianceIssue[] = issues.slice(0, 5).map((iep, index) => ({
    id: `issue-${index}`,
    iep_id: iep.id,
    type: ['missing_signature', 'overdue_review', 'incomplete_goals', 'missing_services', 'evaluation_expired'][index % 5] as ComplianceIssue['type'],
    severity: ['critical', 'high', 'medium', 'low'][index % 4] as ComplianceIssue['severity'],
    description_en: `IEP for ${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar} requires attention`,
    description_ar: `الخطة التعليمية للطالب ${iep.student?.first_name_ar} ${iep.student?.last_name_ar} تحتاج انتباه`,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: iep.annual_review_date
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {language === 'ar' ? 'تنبيهات الامتثال' : 'Compliance Alerts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalIssues = mockComplianceIssues.filter(issue => issue.severity === 'critical')
  const highIssues = mockComplianceIssues.filter(issue => issue.severity === 'high')
  const otherIssues = mockComplianceIssues.filter(issue => !['critical', 'high'].includes(issue.severity))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <AlertTriangle className="h-5 w-5 text-red-600" />
            {language === 'ar' ? 'تنبيهات الامتثال' : 'Compliance Alerts'}
          </CardTitle>
          {mockComplianceIssues.length > 0 && (
            <Badge variant="destructive">
              {mockComplianceIssues.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mockComplianceIssues.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد مشاكل امتثال حالياً' : 'No compliance issues currently'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Critical Issues First */}
            {criticalIssues.map((issue) => (
              <div key={issue.id} className="border rounded-lg p-3 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(issue.severity)} variant="outline">
                        {language === 'ar' ? 'حرج' : 'CRITICAL'}
                      </Badge>
                      <span className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {formatTimeAgo(issue.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getIssueTypeLabel(issue.type)}
                    </p>
                    <p className={`text-xs text-gray-600 line-clamp-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? issue.description_ar : issue.description_en}
                    </p>
                    {issue.due_date && (
                      <p className={`text-xs text-red-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'مستحق:' : 'Due:'} {new Date(issue.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* High Priority Issues */}
            {highIssues.map((issue) => (
              <div key={issue.id} className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(issue.severity)} variant="outline">
                        {language === 'ar' ? 'عالي' : 'HIGH'}
                      </Badge>
                      <span className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {formatTimeAgo(issue.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getIssueTypeLabel(issue.type)}
                    </p>
                    <p className={`text-xs text-gray-600 line-clamp-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? issue.description_ar : issue.description_en}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Other Issues */}
            {otherIssues.map((issue) => (
              <div key={issue.id} className="border rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(issue.severity)} variant="outline">
                        {language === 'ar' && issue.severity === 'medium' && 'متوسط'}
                        {language === 'ar' && issue.severity === 'low' && 'منخفض'}
                        {language === 'en' && issue.severity.toUpperCase()}
                      </Badge>
                      <span className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {formatTimeAgo(issue.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {getIssueTypeLabel(issue.type)}
                    </p>
                    <p className={`text-xs text-gray-600 line-clamp-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? issue.description_ar : issue.description_en}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mockComplianceIssues.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full">
              <span className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'عرض جميع التنبيهات' : 'View All Alerts'}
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}