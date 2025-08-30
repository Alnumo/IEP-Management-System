import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, Eye, Edit, User, FileText, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'

// Mock data - replace with actual API calls
const mockTherapyPlanEnrollments = [
  {
    id: '1',
    student_name_ar: 'أحمد محمد السالم',
    student_name_en: 'Ahmed Mohammed Al-Salem',
    child_id: 'STU20240001',
    therapy_plan_name_ar: 'خطة علاج طيف التوحد المكثفة',
    therapy_plan_name_en: 'Intensive Autism Spectrum Treatment Plan',
    therapist_name_ar: 'د. فاطمة أحمد',
    therapist_name_en: 'Dr. Fatima Ahmed',
    enrollment_date: '2024-01-15',
    target_start_date: '2024-01-22',
    expected_duration_months: 12,
    priority_level: 'high',
    parent_consent: 'obtained',
    medical_clearance: 'obtained',
    status: 'active',
    progress_percentage: 65
  },
  {
    id: '2',
    student_name_ar: 'سارة عبدالله الراشد',
    student_name_en: 'Sara Abdullah Al-Rashid',
    child_id: 'STU20240002',
    therapy_plan_name_ar: 'خطة علاج صعوبات النطق',
    therapy_plan_name_en: 'Speech Therapy Treatment Plan',
    therapist_name_ar: 'أ. مريم خالد',
    therapist_name_en: 'Ms. Mariam Khalid',
    enrollment_date: '2024-02-01',
    target_start_date: '2024-02-05',
    expected_duration_months: 6,
    priority_level: 'medium',
    parent_consent: 'obtained',
    medical_clearance: 'not_required',
    status: 'active',
    progress_percentage: 40
  },
  {
    id: '3',
    student_name_ar: 'خالد سعد المطيري',
    student_name_en: 'Khalid Saad Al-Mutairi',
    child_id: 'STU20240003',
    therapy_plan_name_ar: 'خطة العلاج الوظيفي',
    therapy_plan_name_en: 'Occupational Therapy Plan',
    therapist_name_ar: 'أ. نورا عبدالعزيز',
    therapist_name_en: 'Ms. Nora Abdul-Aziz',
    enrollment_date: '2024-01-28',
    target_start_date: '2024-02-01',
    expected_duration_months: 9,
    priority_level: 'medium',
    parent_consent: 'pending',
    medical_clearance: 'required',
    status: 'pending',
    progress_percentage: 0
  }
]

export const TherapyPlanEnrollmentsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'completed': return 'outline'
      case 'pending': return 'secondary'
      case 'suspended': return 'destructive'
      default: return 'secondary'
    }
  }

  const filteredEnrollments = mockTherapyPlanEnrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.student_name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.student_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.child_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.therapy_plan_name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.therapy_plan_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || enrollment.priority_level === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleViewDetails = (enrollmentId: string) => {
    navigate(`/therapy-plan-enrollments/${enrollmentId}`)
  }

  const handleEditEnrollment = (enrollmentId: string) => {
    navigate(`/therapy-plan-enrollments/edit/${enrollmentId}`)
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تسجيلات الخطط العلاجية' : 'Therapy Plan Enrollments'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة تسجيلات الطلاب في الخطط العلاجية المخصصة' : 'Manage student enrollments in personalized therapy plans'}
          </p>
        </div>
        <Button onClick={() => navigate('/therapy-plan-enrollments/add')}>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'تسجيل جديد' : 'New Enrollment'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي التسجيلات' : 'Total Enrollments'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTherapyPlanEnrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? '+2 من الشهر الماضي' : '+2 from last month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'التسجيلات النشطة' : 'Active Enrollments'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockTherapyPlanEnrollments.filter(e => e.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'قيد التنفيذ' : 'Currently running'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الأولوية العالية' : 'High Priority'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockTherapyPlanEnrollments.filter(e => e.priority_level === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'تحتاج متابعة عاجلة' : 'Need urgent attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'متوسط التقدم' : 'Average Progress'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(mockTherapyPlanEnrollments.reduce((acc, e) => acc + e.progress_percentage, 0) / mockTherapyPlanEnrollments.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'عبر جميع الخطط' : 'Across all plans'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  placeholder={language === 'ar' ? 'البحث في التسجيلات...' : 'Search enrollments...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                <SelectItem value="suspended">{language === 'ar' ? 'معلق' : 'Suspended'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder={language === 'ar' ? 'الأولوية' : 'Priority'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الأولويات' : 'All Priorities'}</SelectItem>
                <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Button */}
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments List */}
      <div className="grid gap-6">
        {filteredEnrollments.map((enrollment) => (
          <Card key={enrollment.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? enrollment.student_name_ar : enrollment.student_name_en || enrollment.student_name_ar}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {enrollment.child_id}
                    </Badge>
                  </div>
                  <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? enrollment.therapy_plan_name_ar : enrollment.therapy_plan_name_en || enrollment.therapy_plan_name_ar}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(enrollment.priority_level)}>
                    {language === 'ar' 
                      ? (enrollment.priority_level === 'high' ? 'عالية' : 
                         enrollment.priority_level === 'medium' ? 'متوسطة' : 'منخفضة')
                      : enrollment.priority_level
                    }
                  </Badge>
                  <Badge variant={getStatusColor(enrollment.status)}>
                    {language === 'ar' 
                      ? (enrollment.status === 'active' ? 'نشط' : 
                         enrollment.status === 'pending' ? 'معلق' : 
                         enrollment.status === 'completed' ? 'مكتمل' : 'معلق')
                      : enrollment.status
                    }
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                
                {/* Therapist */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المعالج المسؤول' : 'Assigned Therapist'}
                  </p>
                  <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? enrollment.therapist_name_ar : enrollment.therapist_name_en || enrollment.therapist_name_ar}
                  </p>
                </div>

                {/* Enrollment Date */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تاريخ التسجيل' : 'Enrollment Date'}
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(enrollment.enrollment_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المدة المتوقعة' : 'Expected Duration'}
                  </p>
                  <p className="text-sm font-medium">
                    {enrollment.expected_duration_months} {language === 'ar' ? 'شهور' : 'months'}
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'نسبة التقدم' : 'Progress'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${enrollment.progress_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{enrollment.progress_percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Consent Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'موافقة ولي الأمر:' : 'Parent Consent:'}
                    </span>
                    <Badge variant={enrollment.parent_consent === 'obtained' ? 'default' : 'secondary'}>
                      {language === 'ar' 
                        ? (enrollment.parent_consent === 'obtained' ? 'تم الحصول' : 'معلق')
                        : enrollment.parent_consent
                      }
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'التصريح الطبي:' : 'Medical Clearance:'}
                    </span>
                    <Badge variant={
                      enrollment.medical_clearance === 'obtained' ? 'default' : 
                      enrollment.medical_clearance === 'required' ? 'destructive' : 'outline'
                    }>
                      {language === 'ar' 
                        ? (enrollment.medical_clearance === 'obtained' ? 'تم الحصول' : 
                           enrollment.medical_clearance === 'required' ? 'مطلوب' : 'غير مطلوب')
                        : enrollment.medical_clearance.replace('_', ' ')
                      }
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => handleViewDetails(enrollment.id)}
                >
                  <Eye className="h-4 w-4" />
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => handleEditEnrollment(enrollment.id)}
                >
                  <Edit className="h-4 w-4" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEnrollments.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد تسجيلات' : 'No Enrollments Found'}
            </h3>
            <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لم يتم العثور على تسجيلات تطابق معايير البحث' : 'No enrollments match your search criteria'}
            </p>
            <Button onClick={() => navigate('/therapy-plan-enrollments/add')}>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إضافة تسجيل جديد' : 'Add New Enrollment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TherapyPlanEnrollmentsPage