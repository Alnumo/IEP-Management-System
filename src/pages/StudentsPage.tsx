import { useState } from 'react'
import { Plus, Search, Filter, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'

export const StudentsPage = () => {
  const { language, isRTL } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - will be replaced with real data later
  const mockStudents = [
    {
      id: '1',
      student_id: 'STU2024001',
      first_name: 'أحمد',
      last_name: 'محمد',
      birth_date: '2010-05-15',
      gender: 'male' as const,
      status: 'active' as const,
      enrollment_date: '2024-01-15',
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    },
    {
      id: '2',
      student_id: 'STU2024002',
      first_name: 'فاطمة',
      last_name: 'عبدالله',
      birth_date: '2011-08-22',
      gender: 'female' as const,
      status: 'active' as const,
      enrollment_date: '2024-02-01',
      created_at: '2024-02-01',
      updated_at: '2024-02-01'
    },
    {
      id: '3',
      student_id: 'STU2024003',
      first_name: 'عمر',
      last_name: 'خالد',
      birth_date: '2009-12-03',
      gender: 'male' as const,
      status: 'inactive' as const,
      enrollment_date: '2024-01-10',
      created_at: '2024-01-10',
      updated_at: '2024-01-10'
    }
  ]

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
        <Button>
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
            <div className="text-2xl font-bold">3</div>
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
            <div className="text-2xl font-bold text-green-600">2</div>
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
            <div className="text-2xl font-bold text-blue-600">2</div>
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
            <div className="text-2xl font-bold text-pink-600">1</div>
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
          <div className="space-y-4">
            {mockStudents.map((student) => (
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
                      {student.first_name} {student.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {student.student_id} • {language === 'ar' ? 'العمر:' : 'Age:'} {calculateAge(student.birth_date)} {language === 'ar' ? 'سنة' : 'years'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(student.status)}>
                    {getStatusLabel(student.status)}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {language === 'ar' ? 'عرض' : 'View'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}