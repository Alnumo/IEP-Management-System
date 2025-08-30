import { useState } from 'react'
import { Plus, Search, Filter, User, GraduationCap, CreditCard, CalendarDays, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEnrollments, useEnrollmentStats } from '@/hooks/useEnrollments'
import { testStudentEnrollmentWebhook, getWebhookStatus } from '@/services/n8n-webhook-config'
import { toast } from 'sonner'
import type { EnrollmentFilters } from '@/hooks/useEnrollments'

export const EnrollmentsPage = () => {
  const { language, isRTL } = useLanguage()
  const [filters, setFilters] = useState<EnrollmentFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  const { data: enrollments = [], isLoading, error } = useEnrollments({
    ...filters,
    search: searchTerm.trim() || undefined
  })

  const { data: stats } = useEnrollmentStats()

  const handleFilterChange = (key: keyof EnrollmentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value && value !== 'all' ? value : undefined
    }))
  }

  const handleTestWebhook = async () => {
    try {
      toast.loading(language === 'ar' ? 'جاري اختبار الـ webhook...' : 'Testing webhook...', { id: 'webhook-test' })
      
      // Check webhook status first
      const status = getWebhookStatus()
      console.log('🔍 Webhook status:', status)
      
      // Test the webhook
      const result = await testStudentEnrollmentWebhook()
      
      toast.success(
        language === 'ar' 
          ? 'تم إرسال الـ webhook بنجاح إلى n8n!' 
          : 'Webhook successfully sent to n8n!', 
        { 
          id: 'webhook-test',
          description: language === 'ar' 
            ? 'تحقق من n8n لرؤية البيانات المستلمة' 
            : 'Check n8n to see the received data'
        }
      )
      
      console.log('✅ Webhook test result:', result)
      
    } catch (error) {
      console.error('❌ Webhook test failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشل في اختبار الـ webhook' 
          : 'Webhook test failed', 
        { 
          id: 'webhook-test',
          description: error instanceof Error ? error.message : 'Unknown error'
        }
      )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enrolled': return 'bg-green-100 text-green-800 border-green-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'dropped': return 'bg-red-100 text-red-800 border-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'refunded': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'enrolled': return 'مسجل'
        case 'completed': return 'مكتمل'
        case 'dropped': return 'منسحب'
        case 'pending': return 'معلق'
        default: return status
      }
    }
    return status
  }

  const getPaymentStatusText = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'paid': return 'مدفوع'
        case 'partial': return 'جزئي'
        case 'pending': return 'معلق'
        case 'refunded': return 'مسترد'
        default: return status
      }
    }
    return status
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            {language === 'ar' ? 'خطأ في تحميل البيانات' : 'Error loading data'}
          </p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة التسجيلات' : 'Enrollments Management'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'عرض وإدارة تسجيل الطلاب في الدورات' : 'View and manage student course enrollments'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestWebhook}>
            <Webhook className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'اختبار n8n' : 'Test n8n'}
          </Button>
          <Button onClick={() => window.location.href = '/enrollments/add'}>
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'تسجيل جديد' : 'New Enrollment'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي التسجيلات' : 'Total Enrollments'}
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'مسجل حالياً' : 'Currently enrolled'}: {stats.enrolled}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'معدل الإكمال' : 'Completion Rate'}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.completed} {language === 'ar' ? 'مكتمل' : 'completed'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'معدل الدفع' : 'Payment Rate'}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">{stats.paymentCompletionRate.toFixed(1)}%</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {stats.paidFull} {language === 'ar' ? 'مدفوع كاملاً' : 'fully paid'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'من جميع التسجيلات' : 'from all enrollments'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder={language === 'ar' ? 'البحث...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                <SelectValue placeholder={language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status'} />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="enrolled">{language === 'ar' ? 'مسجل' : 'Enrolled'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                <SelectItem value="dropped">{language === 'ar' ? 'منسحب' : 'Dropped'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select value={filters.payment_status || 'all'} onValueChange={(value) => handleFilterChange('payment_status', value)}>
              <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                <SelectValue placeholder={language === 'ar' ? 'حالة الدفع' : 'Payment Status'} />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                <SelectItem value="all">{language === 'ar' ? 'جميع حالات الدفع' : 'All Payment Statuses'}</SelectItem>
                <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="refunded">{language === 'ar' ? 'مسترد' : 'Refunded'}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setFilters({})}>
              <Filter className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments List */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'قائمة التسجيلات' : 'Enrollments List'}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({enrollments.length} {language === 'ar' ? 'تسجيل' : 'enrollments'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className={`text-lg font-medium text-muted-foreground mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد تسجيلات' : 'No enrollments found'}
              </h3>
              <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لم يتم العثور على تسجيلات مطابقة للبحث' : 'No enrollments match your search criteria'}
              </p>
              <Button onClick={() => window.location.href = '/enrollments/add'}>
                <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'ar' ? 'إضافة تسجيل جديد' : 'Add New Enrollment'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/enrollments/${enrollment.id}`}
                >
                  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="flex-1">
                      <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' 
                            ? `${enrollment.student?.first_name_ar} ${enrollment.student?.last_name_ar}`
                            : `${enrollment.student?.first_name_en || enrollment.student?.first_name_ar} ${enrollment.student?.last_name_en || enrollment.student?.last_name_ar}`
                          }
                        </h3>
                        <Badge variant="outline" className={getStatusColor(enrollment.status)}>
                          {getStatusText(enrollment.status)}
                        </Badge>
                        <Badge variant="outline" className={getPaymentStatusColor(enrollment.payment_status)}>
                          {getPaymentStatusText(enrollment.payment_status)}
                        </Badge>
                      </div>
                      
                      <div className={`text-sm text-muted-foreground space-y-1 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                        <p>
                          <span className="font-medium">{language === 'ar' ? 'الدورة:' : 'Course:'}</span>{' '}
                          {enrollment.course?.course_code} - {language === 'ar' ? enrollment.course?.name_ar : (enrollment.course?.name_en || enrollment.course?.name_ar)}
                        </p>
                        <p>
                          <span className="font-medium">{language === 'ar' ? 'رقم الطالب:' : 'Student ID:'}</span>{' '}
                          {enrollment.student?.registration_number}
                        </p>
                        <p>
                          <span className="font-medium">{language === 'ar' ? 'تاريخ التسجيل:' : 'Enrollment Date:'}</span>{' '}
                          {new Date(enrollment.enrollment_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
                      <div className={`text-lg font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {enrollment.amount_paid.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </div>
                      <div className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'المبلغ المدفوع' : 'Amount Paid'}
                      </div>
                    </div>
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