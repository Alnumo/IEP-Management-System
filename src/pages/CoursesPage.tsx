import { useState } from 'react'
import { Plus, Search, Filter, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'

export const CoursesPage = () => {
  const { language, isRTL } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - will be replaced with real data later
  const mockCourses = [
    {
      id: '1',
      course_code: 'CRS2024001',
      name_ar: 'العلاج النطقي المتقدم',
      name_en: 'Advanced Speech Therapy',
      description_ar: 'دورة متقدمة في العلاج النطقي للأطفال',
      description_en: 'Advanced speech therapy course for children',
      instructor_name: 'د. سارة أحمد',
      status: 'active' as const,
      enrolled_students: 12,
      max_students: 20,
      start_date: '2024-03-01',
      end_date: '2024-04-26',
      schedule_days: ['monday', 'wednesday'],
      schedule_time: '10:00-12:00',
      price: 1500,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: '2',
      course_code: 'CRS2024002',
      name_ar: 'العلاج الوظيفي الأساسي',
      name_en: 'Basic Occupational Therapy',
      description_ar: 'أساسيات العلاج الوظيفي',
      description_en: 'Fundamentals of occupational therapy',
      instructor_name: 'د. محمد عبدالله',
      status: 'planned' as const,
      enrolled_students: 8,
      max_students: 15,
      start_date: '2024-04-01',
      end_date: '2024-05-13',
      schedule_days: ['tuesday', 'thursday'],
      schedule_time: '14:00-16:00',
      price: 1200,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: '3',
      course_code: 'CRS2024003',
      name_ar: 'تطوير المهارات الحركية',
      name_en: 'Motor Skills Development',
      description_ar: 'تطوير وتعزيز المهارات الحركية للأطفال',
      description_en: 'Developing and enhancing motor skills for children',
      instructor_name: 'د. فاطمة خالد',
      status: 'completed' as const,
      enrolled_students: 15,
      max_students: 15,
      start_date: '2024-01-15',
      end_date: '2024-03-26',
      schedule_days: ['sunday', 'tuesday', 'thursday'],
      schedule_time: '09:00-11:00',
      price: 1800,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
  ]

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'planned': return 'outline' 
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      active: language === 'ar' ? 'نشط' : 'Active',
      planned: language === 'ar' ? 'مخطط' : 'Planned',
      completed: language === 'ar' ? 'مكتمل' : 'Completed',
      cancelled: language === 'ar' ? 'ملغي' : 'Cancelled'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الدورات' : 'Courses'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة الدورات التدريبية' : 'Manage training courses'}
          </p>
        </div>
        <Button>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'إضافة دورة' : 'Add Course'}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في الدورات...' : 'Search courses...'}
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
              {language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'دورة متاحة' : 'available courses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الدورات النشطة' : 'Active Courses'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'دورة نشطة' : 'active courses'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الطلاب' : 'Total Enrolled'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">35</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'طالب مسجل' : 'enrolled students'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'معدل الإشغال' : 'Occupancy Rate'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">70%</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'معدل التسجيل' : 'enrollment rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قائمة الدورات' : 'Courses List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCourses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? course.name_ar : (course.name_en || course.name_ar)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {course.course_code} • {language === 'ar' ? 'المدرب:' : 'Instructor:'} {course.instructor_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(course.start_date)} - {formatDate(course.end_date)} • 
                      {' '}{course.enrolled_students}/{course.max_students} {language === 'ar' ? 'طلاب' : 'students'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(course.status)}>
                    {getStatusLabel(course.status)}
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