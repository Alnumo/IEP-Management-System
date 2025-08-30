import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  Users,
  AlertTriangle
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEPStats, useIEPsDueForReview, useIEPsWithComplianceIssues } from '@/hooks/useIEPs'
import { IEPStatsChart } from '@/components/iep/IEPStatsChart'
import { ComplianceAlertsWidget } from '@/components/iep/ComplianceAlertsWidget'
import { UpcomingDeadlinesWidget } from '@/components/iep/UpcomingDeadlinesWidget'
import { QuickActionsWidget } from '@/components/iep/QuickActionsWidget'
import type { IEP } from '@/types/iep'

export const IEPDashboard = () => {
  const { language, isRTL } = useLanguage()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month')

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useIEPStats()
  const { data: iepsDueForReview, isLoading: reviewLoading } = useIEPsDueForReview()
  const { data: iepsWithIssues, isLoading: issuesLoading } = useIEPsWithComplianceIssues()

  if (statsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'draft': return 'bg-blue-500'
      case 'review': return 'bg-yellow-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'لوحة تحكم الخطط التعليمية الفردية' : 'IEP Dashboard'}
          </h1>
          <p className={`text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'مراقبة وإدارة جميع الخطط التعليمية الفردية'
              : 'Monitor and manage all Individualized Education Programs'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'هذا الشهر' : 'This Month'}
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'خطة جديدة' : 'New IEP'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total IEPs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الخطط' : 'Total IEPs'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'جميع الخطط التعليمية' : 'All IEPs in system'}
            </p>
          </CardContent>
        </Card>

        {/* Active IEPs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الخطط النشطة' : 'Active IEPs'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
            <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'خطط نشطة حالياً' : 'Currently active'}
            </p>
          </CardContent>
        </Card>

        {/* Due for Review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تحتاج مراجعة' : 'Due for Review'}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.due_for_review || 0}</div>
            <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'خلال 30 يوم' : 'Within 30 days'}
            </p>
          </CardContent>
        </Card>

        {/* Compliance Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'مشاكل الامتثال' : 'Compliance Issues'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.compliance_issues || 0}</div>
            <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'تحتاج إصلاح' : 'Need attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* IEP Statistics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <TrendingUp className="h-5 w-5" />
                {language === 'ar' ? 'إحصائيات الخطط التعليمية' : 'IEP Statistics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <IEPStatsChart data={stats} timeframe={selectedTimeframe} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <Clock className="h-5 w-5" />
                {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {iepsDueForReview?.slice(0, 5).map((iep: IEP) => (
                  <div key={iep.id} className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(iep.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' 
                          ? `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`
                          : `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`
                        }
                      </p>
                      <p className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'مراجعة مطلوبة' : 'Review required'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {iep.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-6">
          {/* Compliance Alerts */}
          <ComplianceAlertsWidget 
            issues={iepsWithIssues} 
            isLoading={issuesLoading}
          />

          {/* Upcoming Deadlines */}
          <UpcomingDeadlinesWidget 
            ieps={iepsDueForReview} 
            isLoading={reviewLoading}
          />

          {/* Quick Actions */}
          <QuickActionsWidget />
        </div>
      </div>

      {/* Action Items Summary */}
      {(iepsWithIssues?.length > 0 || iepsDueForReview?.length > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? `لديك ${(iepsWithIssues?.length || 0) + (iepsDueForReview?.length || 0)} عنصر يحتاج انتباهك`
              : `You have ${(iepsWithIssues?.length || 0) + (iepsDueForReview?.length || 0)} items requiring your attention`
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}