// Clinical Documentation Management Page
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, FileText, Eye, Edit, MoreHorizontal, Trash2, Calendar, CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useClinicalDocumentation, useDeleteClinicalDocumentation } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'
import type { ClinicalDocumentationFilters } from '@/types/medical'

export const ClinicalDocumentationPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters] = useState<ClinicalDocumentationFilters>({})
  
  // Fetch clinical documentation data
  const { data: documentation = [], isLoading, error } = useClinicalDocumentation(filters)
  const deleteDocumentation = useDeleteClinicalDocumentation()

  const handleDelete = async (id: string) => {
    try {
      await deleteDocumentation.mutateAsync(id)
      console.log('✅ Clinical documentation deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete clinical documentation:', error)
    }
  }
  
  // Filter documentation based on search term
  const filteredDocumentation = documentation.filter((doc) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      doc.documentation_type?.toLowerCase().includes(searchLower) ||
      doc.subjective_ar?.toLowerCase().includes(searchLower) ||
      doc.subjective_en?.toLowerCase().includes(searchLower) ||
      doc.assessment_ar?.toLowerCase().includes(searchLower) ||
      doc.assessment_en?.toLowerCase().includes(searchLower) ||
      doc.plan_ar?.toLowerCase().includes(searchLower) ||
      doc.plan_en?.toLowerCase().includes(searchLower)
    )
  })
  
  // Calculate statistics
  const stats = {
    total: documentation.length,
    draft: documentation.filter(d => d.status === 'draft').length,
    pending: documentation.filter(d => d.status === 'pending_review').length,
    approved: documentation.filter(d => d.status === 'approved').length,
    urgent: documentation.filter(d => d.urgency_level === 'urgent' || d.urgency_level === 'immediate').length
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'outline'
      case 'pending_review': return 'secondary'
      case 'reviewed': return 'default'
      case 'approved': return 'default'
      case 'finalized': return 'default'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="h-3 w-3" />
      case 'pending_review': return <Clock className="h-3 w-3" />
      case 'reviewed': return <Eye className="h-3 w-3" />
      case 'approved': return <CheckCircle className="h-3 w-3" />
      case 'finalized': return <Shield className="h-3 w-3" />
      default: return <FileText className="h-3 w-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      draft: { ar: 'مسودة', en: 'Draft' },
      pending_review: { ar: 'في انتظار المراجعة', en: 'Pending Review' },
      reviewed: { ar: 'تم المراجعة', en: 'Reviewed' },
      approved: { ar: 'معتمد', en: 'Approved' },
      finalized: { ar: 'نهائي', en: 'Finalized' }
    }
    return language === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status
  }

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'destructive'
      case 'urgent': return 'destructive'
      case 'scheduled': return 'default'
      case 'routine': return 'secondary'
      default: return 'secondary'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      routine: { ar: 'روتيني', en: 'Routine' },
      urgent: { ar: 'عاجل', en: 'Urgent' },
      immediate: { ar: 'فوري', en: 'Immediate' },
      scheduled: { ar: 'مجدول', en: 'Scheduled' }
    }
    return language === 'ar' ? labels[urgency]?.ar || urgency : labels[urgency]?.en || urgency
  }

  const getDocumentationTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      soap_note: { ar: 'ملاحظة SOAP', en: 'SOAP Note' },
      progress_note: { ar: 'ملاحظة تقدم', en: 'Progress Note' },
      assessment_note: { ar: 'ملاحظة تقييم', en: 'Assessment Note' },
      consultation_note: { ar: 'ملاحظة استشارة', en: 'Consultation Note' },
      incident_report: { ar: 'تقرير حادث', en: 'Incident Report' },
      medical_review: { ar: 'مراجعة طبية', en: 'Medical Review' },
      discharge_summary: { ar: 'ملخص خروج', en: 'Discharge Summary' }
    }
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل التوثيق الإكلينيكي' : 'Error loading clinical documentation'}
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
            {language === 'ar' ? 'التوثيق الإكلينيكي' : 'Clinical Documentation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة وتتبع التوثيق الطبي والإكلينيكي' : 'Manage and track medical and clinical documentation'}
          </p>
        </div>
        <Button onClick={() => navigate('/clinical-documentation/add')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة توثيق إكلينيكي' : 'Add Clinical Documentation'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي التوثيق' : 'Total Documentation'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'مسودات' : 'Drafts'}
            </CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'في انتظار المراجعة' : 'Pending Review'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معتمد' : 'Approved'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'عاجل' : 'Urgent'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في التوثيق...' : 'Search documentation...'}
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

      {/* Documentation List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'قائمة التوثيق الإكلينيكي' : 'Clinical Documentation List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filteredDocumentation.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد وثائق إكلينيكية' : 'No clinical documentation found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocumentation.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">
                          {getDocumentationTypeLabel(doc.documentation_type)}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(doc.status)} className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          {getStatusLabel(doc.status)}
                        </Badge>
                        <Badge variant={getUrgencyBadgeVariant(doc.urgency_level)}>
                          {getUrgencyLabel(doc.urgency_level)}
                        </Badge>
                        {doc.requires_medical_review && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            {language === 'ar' ? 'يحتاج مراجعة طبية' : 'Medical Review Required'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'ar' ? 'التاريخ:' : 'Date:'}
                          </span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(doc.session_date)}
                          </div>
                        </div>
                        {doc.session_duration_minutes && (
                          <div>
                            <span className="text-muted-foreground">
                              {language === 'ar' ? 'المدة:' : 'Duration:'}
                            </span>
                            <div>{doc.session_duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}</div>
                          </div>
                        )}
                        {doc.goal_achievement_percentage && (
                          <div>
                            <span className="text-muted-foreground">
                              {language === 'ar' ? 'تحقيق الأهداف:' : 'Goal Achievement:'}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className="text-green-600 font-medium">{doc.goal_achievement_percentage}%</div>
                            </div>
                          </div>
                        )}
                        {doc.session_effectiveness_rating && (
                          <div>
                            <span className="text-muted-foreground">
                              {language === 'ar' ? 'فعالية الجلسة:' : 'Session Effectiveness:'}
                            </span>
                            <div className="text-blue-600 font-medium">{doc.session_effectiveness_rating}/10</div>
                          </div>
                        )}
                      </div>

                      {/* Quick Preview of Content */}
                      {(doc.assessment_ar || doc.assessment_en) && (
                        <div className="bg-muted/30 p-3 rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'ar' ? 'التقييم:' : 'Assessment:'}
                          </p>
                          <p className="text-sm line-clamp-2">
                            {language === 'ar' ? doc.assessment_ar : doc.assessment_en || doc.assessment_ar}
                          </p>
                        </div>
                      )}

                      {/* Interventions and Concerns Tags */}
                      <div className="flex flex-wrap gap-2">
                        {doc.interventions_used?.slice(0, 3).map((intervention, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {intervention}
                          </Badge>
                        ))}
                        {doc.concerns_identified?.slice(0, 2).map((concern, index) => (
                          <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-600">
                            ⚠ {concern}
                          </Badge>
                        ))}
                        {(doc.interventions_used?.length || 0) > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(doc.interventions_used?.length || 0) - 3} {language === 'ar' ? 'المزيد' : 'more'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => navigate(`/clinical-documentation/${doc.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => navigate(`/clinical-documentation/edit/${doc.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/clinical-documentation/${doc.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/clinical-documentation/edit/${doc.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </DropdownMenuItem>
                        {doc.status === 'draft' && (
                          <DropdownMenuItem onClick={() => {/* Submit for review */}}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {language === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
                              </AlertDialogTitle>
                              <AlertDialogDescription className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' 
                                  ? 'هل أنت متأكد من حذف هذا التوثيق الإكلينيكي؟ لا يمكن التراجع عن هذا الإجراء.'
                                  : 'Are you sure you want to delete this clinical documentation? This action cannot be undone.'
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteDocumentation.isPending}
                              >
                                {deleteDocumentation.isPending 
                                  ? (language === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                                  : (language === 'ar' ? 'حذف' : 'Delete')
                                }
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

export default ClinicalDocumentationPage