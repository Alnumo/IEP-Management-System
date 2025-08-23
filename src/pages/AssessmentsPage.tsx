import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, ClipboardList, Eye, Edit, FileText, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useAssessmentResults } from '@/hooks/useAssessments'
import { formatDate } from '@/lib/utils'

export const AssessmentsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch assessment results data
  const { data: assessments = [], isLoading, error } = useAssessmentResults()
  
  // Filter assessments based on search term
  const filteredAssessments = assessments.filter((assessment) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      assessment.interpretation_summary_ar?.toLowerCase().includes(searchLower) ||
      assessment.interpretation_summary_en?.toLowerCase().includes(searchLower)
    )
  })
  
  // Calculate statistics
  const stats = {
    total: assessments.length,
    completed: assessments.filter(a => a.status === 'finalized').length,
    inProgress: assessments.filter(a => a.status === 'draft' || a.status === 'pending_review').length,
    scheduled: assessments.filter(a => a.status === 'reviewed').length
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default'
      case 'in_progress': return 'secondary'
      case 'scheduled': return 'outline'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getPurposeBadgeColor = (purpose: string) => {
    switch (purpose?.toLowerCase()) {
      case 'initial': return 'bg-blue-100 text-blue-800'
      case 'progress': return 'bg-green-100 text-green-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'discharge': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل التقييمات' : 'Error loading assessments'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'التقييمات والتوثيق السريري' : 'Assessments & Clinical Documentation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة تقييمات الطلاب والتوثيق السريري' : 'Manage student assessments and clinical documentation'}
          </p>
        </div>
        <Button onClick={() => navigate('/assessments/add')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة تقييم جديد' : 'Add New Assessment'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي التقييمات' : 'Total Assessments'}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'التقييمات المكتملة' : 'Completed'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'المجدولة' : 'Scheduled'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في التقييمات...' : 'Search assessments...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          {language === 'ar' ? 'تصفية' : 'Filter'}
        </Button>
      </div>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {language === 'ar' ? 'قائمة التقييمات' : 'Assessments List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد تقييمات' : 'No assessments found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">
                        Student ID: {assessment.student_id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Assessment Tool ID: {assessment.assessment_tool_id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(assessment.status)}>
                        {assessment.status}
                      </Badge>
                      {assessment.assessment_purpose && (
                        <Badge className={getPurposeBadgeColor(assessment.assessment_purpose)}>
                          {assessment.assessment_purpose}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'تاريخ التقييم:' : 'Assessment Date:'}
                      </span>
                      <div>{formatDate(assessment.assessment_date)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'المقيم:' : 'Assessor:'}
                      </span>
                      <div>Assessor ID: {assessment.assessor_id || '-'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}
                      </span>
                      <div>{formatDate(assessment.created_at)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'آخر تحديث:' : 'Updated:'}
                      </span>
                      <div>{formatDate(assessment.updated_at)}</div>
                    </div>
                  </div>

                  {/* Assessment Summary */}
                  {assessment.interpretation_summary_ar && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">
                        {language === 'ar' ? 'ملخص التقييم:' : 'Assessment Summary:'}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {language === 'ar' ? assessment.interpretation_summary_ar : assessment.interpretation_summary_en}
                      </p>
                    </div>
                  )}

                  {/* Key Scores */}
                  {assessment.standard_scores && Object.keys(assessment.standard_scores).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(assessment.standard_scores).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="bg-blue-50 rounded p-2 text-center">
                          <div className="text-lg font-bold text-blue-700">{value as string}</div>
                          <div className="text-xs text-blue-600">{key}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      {language === 'ar' ? 'التقرير' : 'Report'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}