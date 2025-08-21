import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Users, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useStudents } from '@/hooks/useStudents'
import type { Student } from '@/types/student'

export const StudentsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch students data
  const { data: students = [], isLoading, error } = useStudents()
  
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
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">{language === 'ar' ? 'خطأ في تحميل الطلاب' : 'Error loading students'}</p>
          <Button onClick={() => window.location.reload()}>
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
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
            {language === 'ar' ? 'الطلاب' : 'Students'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة الطلاب المسجلين' : 'Manage registered students'}
          </p>
        </div>
        <Button onClick={() => navigate('/students/add')}>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'إضافة طالب' : 'Add Student'}
        </Button>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالب مسجل' : 'registered students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الطلاب النشطون' : 'Active Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالب نشط' : 'active students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الذكور' : 'Male Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.male}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالب ذكر' : 'male students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الإناث' : 'Female Students'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.female}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالبة أنثى' : 'female students'}
            </p>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
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
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {getStatusLabel(student.status)}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/students/${student.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">{language === 'ar' ? 'عرض' : 'View'}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/students/edit/${student.id}`)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </Button>
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