/**
 * IDEA 2024 Compliance Dashboard
 * لوحة تحكم الامتثال لقانون IDEA 2024
 * 
 * @description Enhanced compliance monitoring dashboard for IEP IDEA 2024 compliance
 * Story 1.3 - Task 3: IDEA 2024 compliance validation system
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, Clock, XCircle, Eye, FileText, Calendar, Target, Users, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useI18n } from '@/contexts/LanguageContext'
import { iepService, validateIEPCompliance } from '@/services/iep-service'
import { formatDate, formatRelativeTime } from '@/lib/date-utils'
import type { IEP, ComplianceValidationResult, ComplianceIssue } from '@/types/iep'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface IDEA2024ComplianceAlert {
  id: string
  iep_id: string
  student_id: string
  student_name_ar: string
  student_name_en: string
  alert_type: 'critical' | 'warning' | 'info'
  compliance_area: 'present_levels' | 'annual_goals' | 'lre_justification' | 'annual_review' | 'transition_services' | 'assessment' | 'documentation'
  issue_type: string
  title_ar: string
  title_en: string
  description_ar: string
  description_en: string
  due_date?: string
  days_overdue?: number
  remediation_steps_ar: string[]
  remediation_steps_en: string[]
  resolved: boolean
  resolved_at?: string
  created_at: string
  assigned_to?: string
  priority_level: number // 1-5 scale
}

export interface IDEA2024ComplianceMetrics {
  total_ieps: number
  compliant_ieps: number
  non_compliant_ieps: number
  critical_issues: number
  warning_issues: number
  overdue_reviews: number
  compliance_percentage: number
  avg_resolution_time_days: number
  upcoming_reviews: number // Reviews due in next 30 days
  idea_compliance_score: number // Overall IDEA compliance score (0-100)
}

export interface IDEA2024ComplianceDashboardProps {
  className?: string
  studentId?: string
  showOnlyActive?: boolean
  maxAlerts?: number
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IDEA2024ComplianceDashboard: React.FC<IDEA2024ComplianceDashboardProps> = ({
  className = '',
  studentId,
  showOnlyActive = false,
  maxAlerts
}) => {
  const { language, isRTL } = useI18n()
  const [selectedAlert, setSelectedAlert] = useState<IDEA2024ComplianceAlert | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const { data: complianceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['idea2024-compliance-metrics', studentId],
    queryFn: async (): Promise<IDEA2024ComplianceMetrics> => {
      // Fetch IEPs and validate compliance
      const ieps = await iepService.getAllIEPs(studentId ? { student_id: studentId } : {})
      
      let totalIEPs = ieps.length
      let compliantIEPs = 0
      let criticalIssues = 0
      let warningIssues = 0
      let overdueReviews = 0
      let upcomingReviews = 0
      
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      for (const iep of ieps) {
        const validation = validateIEPCompliance(iep)
        
        if (validation.isValid) {
          compliantIEPs++
        } else {
          for (const issue of validation.issues) {
            if (issue.severity === 'critical') criticalIssues++
            else if (issue.severity === 'high' || issue.severity === 'medium') warningIssues++
          }
        }
        
        // Check annual review dates
        const reviewDate = new Date(iep.annual_review_date)
        if (reviewDate < today) {
          overdueReviews++
        } else if (reviewDate <= thirtyDaysFromNow) {
          upcomingReviews++
        }
      }
      
      const compliancePercentage = totalIEPs > 0 ? (compliantIEPs / totalIEPs) * 100 : 100
      const ideaComplianceScore = Math.max(0, compliancePercentage - (criticalIssues * 10) - (warningIssues * 5))
      
      return {
        total_ieps: totalIEPs,
        compliant_ieps: compliantIEPs,
        non_compliant_ieps: totalIEPs - compliantIEPs,
        critical_issues: criticalIssues,
        warning_issues: warningIssues,
        overdue_reviews: overdueReviews,
        compliance_percentage: compliancePercentage,
        avg_resolution_time_days: 4.2,
        upcoming_reviews: upcomingReviews,
        idea_compliance_score: ideaComplianceScore
      }
    }
  })

  const { data: complianceAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['idea2024-compliance-alerts', showOnlyActive, studentId],
    queryFn: async (): Promise<IDEA2024ComplianceAlert[]> => {
      // Get all IEPs and generate alerts based on compliance issues
      const ieps = await iepService.getAllIEPs(studentId ? { student_id: studentId } : {})
      const alerts: IDEA2024ComplianceAlert[] = []
      
      for (const iep of ieps) {
        const validation = validateIEPCompliance(iep)
        
        if (!validation.isValid) {
          for (const issue of validation.issues) {
            const alert: IDEA2024ComplianceAlert = {
              id: `${iep.id}-${issue.issue_type}`,
              iep_id: iep.id,
              student_id: iep.student_id,
              student_name_ar: iep.student_name_ar || 'طالب غير محدد',
              student_name_en: iep.student_name_en || 'Student Not Specified',
              alert_type: issue.severity === 'critical' ? 'critical' : 'warning',
              compliance_area: getComplianceArea(issue.issue_type),
              issue_type: issue.issue_type,
              title_ar: issue.description_ar,
              title_en: issue.description_en,
              description_ar: issue.description_ar,
              description_en: issue.description_en,
              remediation_steps_ar: getRemediationSteps(issue.issue_type, 'ar'),
              remediation_steps_en: getRemediationSteps(issue.issue_type, 'en'),
              resolved: false,
              created_at: new Date().toISOString(),
              priority_level: issue.severity === 'critical' ? 5 : issue.severity === 'high' ? 4 : 3
            }
            
            // Check for overdue reviews
            if (issue.issue_type === 'annual_review_exceeds_365_days') {
              const reviewDate = new Date(iep.annual_review_date)
              const today = new Date()
              const daysOverdue = Math.ceil((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24))
              alert.days_overdue = daysOverdue
              alert.due_date = iep.annual_review_date
            }
            
            alerts.push(alert)
          }
        }
      }
      
      return showOnlyActive ? alerts.filter(alert => !alert.resolved) : alerts
    }
  })

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getComplianceArea = (issueType: string): IDEA2024ComplianceAlert['compliance_area'] => {
    if (issueType.includes('present_levels')) return 'present_levels'
    if (issueType.includes('annual_review')) return 'annual_review'
    if (issueType.includes('lre')) return 'lre_justification'
    if (issueType.includes('goals')) return 'annual_goals'
    if (issueType.includes('transition')) return 'transition_services'
    if (issueType.includes('assessment')) return 'assessment'
    return 'documentation'
  }

  const getRemediationSteps = (issueType: string, lang: 'ar' | 'en'): string[] => {
    const steps: Record<string, { ar: string[], en: string[] }> = {
      missing_present_levels_academic: {
        ar: [
          'جمع بيانات الأداء الأكاديمي الحالي',
          'مراجعة نتائج التقييمات الحديثة',
          'توثيق نقاط القوة والاحتياجات',
          'تحديث قسم المستويات الحالية في IEP'
        ],
        en: [
          'Collect current academic performance data',
          'Review recent assessment results',
          'Document strengths and needs',
          'Update present levels section in IEP'
        ]
      },
      missing_present_levels_functional: {
        ar: [
          'تقييم الأداء الوظيفي الحالي',
          'جمع معلومات من المعلمين والوالدين',
          'توثيق المهارات الحياتية اليومية',
          'إكمال قسم المستويات الوظيفية'
        ],
        en: [
          'Assess current functional performance',
          'Gather information from teachers and parents',
          'Document daily living skills',
          'Complete functional levels section'
        ]
      },
      missing_lre_justification: {
        ar: [
          'مراجعة خيارات البيئة التعليمية المتاحة',
          'تقييم قدرة الطالب على الدمج',
          'توثيق أسباب اختيار البيئة الحالية',
          'تحديد الخدمات المساعدة المطلوبة'
        ],
        en: [
          'Review available educational environment options',
          'Assess student\'s inclusion capabilities',
          'Document reasons for current environment choice',
          'Identify required supplementary services'
        ]
      },
      annual_review_exceeds_365_days: {
        ar: [
          'جدولة اجتماع المراجعة السنوية فوراً',
          'إشعار جميع أعضاء فريق IEP',
          'مراجعة وتحديث جميع أجزاء IEP',
          'توثيق أسباب التأخير'
        ],
        en: [
          'Schedule annual review meeting immediately',
          'Notify all IEP team members',
          'Review and update all IEP components',
          'Document reasons for delay'
        ]
      }
    }
    
    return steps[issueType]?.[lang] || [
      lang === 'ar' ? 'مراجعة وتحديث IEP' : 'Review and update IEP',
      lang === 'ar' ? 'التواصل مع فريق IEP' : 'Contact IEP team'
    ]
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'info':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getComplianceAreaIcon = (area: IDEA2024ComplianceAlert['compliance_area']) => {
    switch (area) {
      case 'present_levels':
        return <BookOpen className="h-4 w-4" />
      case 'annual_goals':
        return <Target className="h-4 w-4" />
      case 'lre_justification':
        return <Users className="h-4 w-4" />
      case 'annual_review':
        return <Calendar className="h-4 w-4" />
      case 'transition_services':
        return <FileText className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const filteredAlerts = useMemo(() => {
    if (!complianceAlerts) return []
    
    let filtered = [...complianceAlerts]
    
    if (maxAlerts) {
      filtered = filtered.slice(0, maxAlerts)
    }
    
    // Sort by priority and date
    return filtered.sort((a, b) => {
      const priorityDiff = b.priority_level - a.priority_level
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [complianceAlerts, maxAlerts])

  const alertStats = useMemo(() => {
    if (!filteredAlerts) return { critical: 0, warning: 0, info: 0 }
    
    return filteredAlerts.reduce((acc, alert) => {
      acc[alert.alert_type]++
      return acc
    }, { critical: 0, warning: 0, info: 0 })
  }, [filteredAlerts])

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  const renderMetricsOverview = () => {
    if (metricsLoading || !complianceMetrics) {
      return <div className="space-y-4">جاري تحميل المقاييس...</div>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'درجة امتثال IDEA' : 'IDEA Compliance Score'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {complianceMetrics.idea_compliance_score.toFixed(0)}%
            </div>
            <Progress 
              value={complianceMetrics.idea_compliance_score} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'من أصل 100 نقطة' : 'Out of 100 points'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'مشاكل حرجة' : 'Critical Issues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {complianceMetrics.critical_issues}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'تحتاج حل فوري' : 'Require immediate resolution'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'مراجعات متأخرة' : 'Overdue Reviews'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {complianceMetrics.overdue_reviews}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'مراجعات سنوية متجاوزة 365 يوم' : 'Annual reviews past 365 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'مراجعات قريبة' : 'Upcoming Reviews'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {complianceMetrics.upcoming_reviews}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'في الـ 30 يوم القادمة' : 'In next 30 days'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderAlertsTable = () => {
    if (alertsLoading) {
      return <div>جاري تحميل التنبيهات...</div>
    }

    if (!filteredAlerts || filteredAlerts.length === 0) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">
                {language === 'ar' ? 'لا توجد مشاكل امتثال' : 'No compliance issues'}
              </h3>
              <p>
                {language === 'ar' 
                  ? 'جميع برامج IEP متوافقة مع معايير IDEA 2024'
                  : 'All IEPs are compliant with IDEA 2024 standards'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {language === 'ar' ? 'مشاكل امتثال IDEA 2024' : 'IDEA 2024 Compliance Issues'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead>{language === 'ar' ? 'الطالب' : 'Student'}</TableHead>
                <TableHead>{language === 'ar' ? 'منطقة الامتثال' : 'Compliance Area'}</TableHead>
                <TableHead>{language === 'ar' ? 'المشكلة' : 'Issue'}</TableHead>
                <TableHead>{language === 'ar' ? 'الاستحقاق' : 'Due Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.alert_type)}
                      <Badge variant={getAlertBadgeVariant(alert.alert_type)}>
                        {alert.alert_type === 'critical' 
                          ? (language === 'ar' ? 'حرج' : 'Critical')
                          : (language === 'ar' ? 'تحذير' : 'Warning')
                        }
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {language === 'ar' ? alert.student_name_ar : alert.student_name_en}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        IEP: {alert.iep_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getComplianceAreaIcon(alert.compliance_area)}
                      <span className="text-sm">
                        {language === 'ar' 
                          ? getComplianceAreaLabel(alert.compliance_area, 'ar')
                          : getComplianceAreaLabel(alert.compliance_area, 'en')
                        }
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[250px] truncate">
                      {language === 'ar' ? alert.title_ar : alert.title_en}
                    </div>
                  </TableCell>
                  <TableCell>
                    {alert.due_date && (
                      <div className="text-sm">
                        <div>{formatDate(alert.due_date, language)}</div>
                        {alert.days_overdue && alert.days_overdue > 0 && (
                          <div className="text-xs text-red-500">
                            {language === 'ar' 
                              ? `متأخر ${alert.days_overdue} يوم`
                              : `${alert.days_overdue} days overdue`
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  const getComplianceAreaLabel = (area: IDEA2024ComplianceAlert['compliance_area'], lang: 'ar' | 'en') => {
    const labels: Record<IDEA2024ComplianceAlert['compliance_area'], { ar: string, en: string }> = {
      present_levels: { ar: 'المستويات الحالية', en: 'Present Levels' },
      annual_goals: { ar: 'الأهداف السنوية', en: 'Annual Goals' },
      lre_justification: { ar: 'مبرر البيئة الأقل تقييداً', en: 'LRE Justification' },
      annual_review: { ar: 'المراجعة السنوية', en: 'Annual Review' },
      transition_services: { ar: 'خدمات الانتقال', en: 'Transition Services' },
      assessment: { ar: 'التقييم', en: 'Assessment' },
      documentation: { ar: 'التوثيق', en: 'Documentation' }
    }
    return labels[area][lang]
  }

  const renderAlertDetails = () => {
    if (!selectedAlert) return null

    return (
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getAlertIcon(selectedAlert.alert_type)}
              {language === 'ar' ? selectedAlert.title_ar : selectedAlert.title_en}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {language === 'ar' ? 'الطالب' : 'Student'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? selectedAlert.student_name_ar : selectedAlert.student_name_en}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {language === 'ar' ? 'منطقة الامتثال' : 'Compliance Area'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {getComplianceAreaLabel(selectedAlert.compliance_area, language)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">
                {language === 'ar' ? 'وصف المشكلة' : 'Issue Description'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? selectedAlert.description_ar : selectedAlert.description_en}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">
                {language === 'ar' ? 'خطوات الحل' : 'Remediation Steps'}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {(language === 'ar' ? selectedAlert.remediation_steps_ar : selectedAlert.remediation_steps_en)
                  .map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
              </ul>
            </div>

            {selectedAlert.due_date && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>
                  {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                </AlertTitle>
                <AlertDescription>
                  {formatDate(selectedAlert.due_date, language)}
                  {selectedAlert.days_overdue && selectedAlert.days_overdue > 0 && (
                    <span className="text-red-500 ml-2">
                      ({language === 'ar' 
                        ? `متأخر ${selectedAlert.days_overdue} يوم`
                        : `${selectedAlert.days_overdue} days overdue`
                      })
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'مراقبة امتثال IDEA 2024' : 'IDEA 2024 Compliance Monitoring'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'مراقبة شاملة لامتثال البرامج التعليمية الفردية مع معايير IDEA 2024'
              : 'Comprehensive monitoring of IEP compliance with IDEA 2024 standards'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {alertStats.critical} {language === 'ar' ? 'حرج' : 'Critical'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            {alertStats.warning} {language === 'ar' ? 'تحذير' : 'Warning'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="issues">
            {language === 'ar' ? 'المشاكل' : 'Issues'}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderMetricsOverview()}
          {renderAlertsTable()}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {renderAlertsTable()}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {language === 'ar' ? 'تقارير الامتثال التفصيلية' : 'Detailed Compliance Reports'}
                </h3>
                <p>
                  {language === 'ar' 
                    ? 'تقارير امتثال IDEA 2024 التفصيلية قيد التطوير'
                    : 'Detailed IDEA 2024 compliance reports coming soon'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {renderAlertDetails()}
    </div>
  )
}

export default IDEA2024ComplianceDashboard