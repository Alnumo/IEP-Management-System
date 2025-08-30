import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Users, Eye, Edit, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useStudents } from '@/hooks/useStudents'
import { testStudentCreationWebhook, getWebhookStatus } from '@/services/n8n-webhook-config'
import { toast } from 'sonner'
import type { Student } from '@/types/student'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import QueryErrorFallback from '@/components/error/QueryErrorFallback'
import { SmartLoading } from '@/components/ui/loading-states'

export const StudentsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch students data
  const { data: students = [], isLoading, error, refetch } = useStudents()
  
  // Filter students based on search term
  const filteredStudents = students.filter((student: Student) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      student.first_name_ar?.toLowerCase().includes(searchLower) ||
      student.last_name_ar?.toLowerCase().includes(searchLower) ||
      student.first_name_en?.toLowerCase().includes(searchLower) ||
      student.last_name_en?.toLowerCase().includes(searchLower) ||
      student.registration_number?.toLowerCase().includes(searchLower)
    )
  })
  
  // Calculate statistics
  const stats = {
    total: students.length,
    active: students.filter((s: Student) => s.status === 'active').length,
    male: students.filter((s: Student) => s.gender === 'male').length,
    female: students.filter((s: Student) => s.gender === 'female').length
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'graduated': return 'outline'
      case 'suspended': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
      graduated: language === 'ar' ? 'متخرج' : 'Graduated',
      suspended: language === 'ar' ? 'موقوف' : 'Suspended'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }
  
  const getDisplayName = (student: Student) => {
    return language === 'ar' 
      ? `${student.first_name_ar} ${student.last_name_ar}`
      : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
  }

  const handleTestStudentWebhook = async () => {
    try {
      toast.loading(language === 'ar' ? 'جاري اختبار webhook الطلاب...' : 'Testing student webhook...', { id: 'student-webhook-test' })
      
      // Check webhook status first
      const status = getWebhookStatus()
      console.log('🔍 Student webhook status:', status.studentCreation)
      
      // Test the webhook
      const result = await testStudentCreationWebhook()
      
      toast.success(
        language === 'ar' 
          ? 'تم إرسال webhook الطلاب بنجاح إلى n8n!' 
          : 'Student webhook successfully sent to n8n!', 
        { 
          id: 'student-webhook-test',
          description: language === 'ar' 
            ? 'تحقق من n8n لرؤية بيانات الطالب المستلمة' 
            : 'Check n8n to see the received student data'
        }
      )
      
      console.log('✅ Student webhook test result:', result)
      
    } catch (error) {
      console.error('❌ Student webhook test failed:', error)
      toast.error(
        language === 'ar' 
          ? 'فشل في اختبار webhook الطلاب' 
          : 'Student webhook test failed', 
        { 
          id: 'student-webhook-test',
          description: error instanceof Error ? error.message : 'Unknown error'
        }
      )
    }
  }
  
  // Handle loading state
  if (isLoading) {
    return <SmartLoading context="students" className="py-8" />
  }

  // Handle error state
  if (error) {
    return (
      <QueryErrorFallback
        error={error as Error}
        refetch={refetch}
        isNetworkError={!navigator.onLine}
      />
    )
  }

  return (
    <ErrorBoundary level="component">
      <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الطلاب' : 'Students'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة الطلاب المسجلين' : 'Manage registered students'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestStudentWebhook}>
            <Webhook className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'اختبار n8n' : 'Test n8n'}
          </Button>
          <Button onClick={() => navigate('/students/add')}>
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'إضافة طالب' : 'Add Student'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في الطلاب...' : 'Search students...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
          />
        </div>
        <Button variant="outline">
          <Filter className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'تصفية' : 'Filter'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="w-full">
              <div className="text-2xl font-bold block w-full">{stats.total}</div>
              <br />
              <div className="text-xs text-muted-foreground block w-full">
                {language === 'ar' ? 'طالب مسجل' : 'registered students'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الطلاب النشطون' : 'Active Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="w-full">
              <div className="text-2xl font-bold text-green-600 block w-full">{stats.active}</div>
              <br />
              <div className="text-xs text-muted-foreground block w-full">
                {language === 'ar' ? 'طالب نشط' : 'active students'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الذكور' : 'Male Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="w-full">
              <div className="text-2xl font-bold text-green-600 block w-full">{stats.male}</div>
              <br />
              <div className="text-xs text-muted-foreground block w-full">
                {language === 'ar' ? 'طالب ذكر' : 'male students'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2 gap-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الإناث' : 'Female Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="w-full">
              <div className="text-2xl font-bold text-pink-600 block w-full">{stats.female}</div>
              <br />
              <div className="text-xs text-muted-foreground block w-full">
                {language === 'ar' ? 'طالبة أنثى' : 'female students'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قائمة الطلاب' : 'Students List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'جاري تحميل الطلاب...' : 'Loading students...'}
                </p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا يوجد طلاب' : 'No Students Found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? (language === 'ar' ? 'لم يتم العثور على طلاب تطابق بحثك' : 'No students match your search')
                  : (language === 'ar' ? 'ابدأ بإضافة طلاب جدد' : 'Start by adding new students')
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/students/add')}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'إضافة طالب' : 'Add Student'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student: Student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-custom-accent transition-colors"
                >
                  {/* Right side: Action buttons and Status badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/students/edit/${student.id}`)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/students/${student.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">{language === 'ar' ? 'عرض' : 'View'}</span>
                      </Button>
                    </div>
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {getStatusLabel(student.status)}
                    </Badge>
                  </div>
                  {/* Left side: Text and Icon */}
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {getDisplayName(student)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {student.registration_number} • {language === 'ar' ? 'العمر:' : 'Age:'} {calculateAge(student.date_of_birth)} {language === 'ar' ? 'سنة' : 'years'}
                      </p>
                      {student.diagnosis_ar && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? student.diagnosis_ar : student.diagnosis_en}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </ErrorBoundary>
  )
}