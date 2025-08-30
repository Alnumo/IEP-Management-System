import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, Eye, Edit, User, Brain, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'

// Mock data - replace with actual API calls
const mockTherapyProgramEnrollments = [
  {
    id: '1',
    student_name_ar: 'أحمد محمد السالم',
    student_name_en: 'Ahmed Mohammed Al-Salem',
    child_id: 'STU20240001',
    program_name_ar: 'برنامج التدخل المبكر المكثف',
    program_name_en: 'Intensive Early Intervention Program',
    therapist_name_ar: 'د. فاطمة أحمد',
    therapist_name_en: 'Dr. Fatima Ahmed',
    enrollment_date: '2024-01-15',
    program_start_date: '2024-01-22',
    intensity_level: 'high',
    sessions_per_week: 4,
    session_duration_minutes: 60,
    payment_status: 'paid',
    amount_paid: 2400,
    total_cost: 2400,
    parent_consent: 'obtained',
    medical_clearance: 'obtained',
    status: 'active',
    completion_percentage: 45
  },
  {
    id: '2',
    student_name_ar: 'سارة عبدالله الراشد',
    student_name_en: 'Sara Abdullah Al-Rashid',
    child_id: 'STU20240002',
    program_name_ar: 'برنامج علاج النطق واللغة',
    program_name_en: 'Speech and Language Therapy Program',
    therapist_name_ar: 'أ. مريم خالد',
    therapist_name_en: 'Ms. Mariam Khalid',
    enrollment_date: '2024-02-01',
    program_start_date: '2024-02-05',
    intensity_level: 'moderate',
    sessions_per_week: 2,
    session_duration_minutes: 45,
    payment_status: 'partial',
    amount_paid: 800,
    total_cost: 1200,
    parent_consent: 'obtained',
    medical_clearance: 'not_required',
    status: 'active',
    completion_percentage: 30
  },
  {
    id: '3',
    student_name_ar: 'خالد سعد المطيري',
    student_name_en: 'Khalid Saad Al-Mutairi',
    child_id: 'STU20240003',
    program_name_ar: 'برنامج العلاج الوظيفي',
    program_name_en: 'Occupational Therapy Program',
    therapist_name_ar: 'أ. نورا عبدالعزيز',
    therapist_name_en: 'Ms. Nora Abdul-Aziz',
    enrollment_date: '2024-01-28',
    program_start_date: '2024-02-01',
    intensity_level: 'moderate',
    sessions_per_week: 3,
    session_duration_minutes: 60,
    payment_status: 'pending',
    amount_paid: 0,
    total_cost: 1800,
    parent_consent: 'pending',
    medical_clearance: 'required',
    status: 'pending',
    completion_percentage: 0
  },
  {
    id: '4',
    student_name_ar: 'لينا أحمد الزهراني',
    student_name_en: 'Lina Ahmed Al-Zahrani',
    child_id: 'STU20240004',
    program_name_ar: 'برنامج تطوير المهارات الاجتماعية',
    program_name_en: 'Social Skills Development Program',
    therapist_name_ar: 'أ. هند محمد',
    therapist_name_en: 'Ms. Hind Mohammed',
    enrollment_date: '2024-02-10',
    program_start_date: '2024-02-15',
    intensity_level: 'low',
    sessions_per_week: 1,
    session_duration_minutes: 90,
    payment_status: 'scholarship',
    amount_paid: 0,
    total_cost: 600,
    parent_consent: 'obtained',
    medical_clearance: 'not_required',
    status: 'active',
    completion_percentage: 15
  }
]

export const TherapyProgramEnrollmentsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [intensityFilter, setIntensityFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'intensive': return 'destructive'
      case 'high': return 'destructive'
      case 'moderate': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getPaymentColor = (payment: string) => {
    switch (payment) {
      case 'paid': return 'default'
      case 'partial': return 'outline'
      case 'pending': return 'secondary'
      case 'scholarship': return 'outline'
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

  const filteredEnrollments = mockTherapyProgramEnrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.student_name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.student_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.child_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.program_name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.program_name_en?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter
    const matchesIntensity = intensityFilter === 'all' || enrollment.intensity_level === intensityFilter
    const matchesPayment = paymentFilter === 'all' || enrollment.payment_status === paymentFilter

    return matchesSearch && matchesStatus && matchesIntensity && matchesPayment
  })

  const totalRevenue = mockTherapyProgramEnrollments.reduce((sum, e) => sum + e.amount_paid, 0)
  const averageCompletion = Math.round(
    mockTherapyProgramEnrollments.reduce((sum, e) => sum + e.completion_percentage, 0) / mockTherapyProgramEnrollments.length
  )

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تسجيلات البرامج العلاجية' : 'Therapy Program Enrollments'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة تسجيلات الطلاب في البرامج العلاجية المتخصصة' : 'Manage student enrollments in specialized therapy programs'}
          </p>
        </div>
        <Button onClick={() => navigate('/therapy-program-enrollments/add')}>
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
            <div className="text-2xl font-bold">{mockTherapyProgramEnrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? '+1 من الأسبوع الماضي' : '+1 from last week'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'البرامج النشطة' : 'Active Programs'}
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockTherapyProgramEnrollments.filter(e => e.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'قيد التنفيذ' : 'Currently running'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'من المدفوعات' : 'From payments'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'متوسط الإنجاز' : 'Average Completion'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'عبر جميع البرامج' : 'Across all programs'}
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
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All'}</SelectItem>
                <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Intensity Filter */}
            <Select value={intensityFilter} onValueChange={setIntensityFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder={language === 'ar' ? 'الكثافة' : 'Intensity'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع المستويات' : 'All'}</SelectItem>
                <SelectItem value="intensive">{language === 'ar' ? 'مكثف' : 'Intensive'}</SelectItem>
                <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                <SelectItem value="moderate">{language === 'ar' ? 'متوسط' : 'Moderate'}</SelectItem>
                <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Filter */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder={language === 'ar' ? 'الدفع' : 'Payment'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All'}</SelectItem>
                <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="scholarship">{language === 'ar' ? 'منحة' : 'Scholarship'}</SelectItem>
              </SelectContent>
            </Select>

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
                    {language === 'ar' ? enrollment.program_name_ar : enrollment.program_name_en || enrollment.program_name_ar}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getIntensityColor(enrollment.intensity_level)}>
                    {language === 'ar' 
                      ? (enrollment.intensity_level === 'intensive' ? 'مكثف' :
                         enrollment.intensity_level === 'high' ? 'عالي' : 
                         enrollment.intensity_level === 'moderate' ? 'متوسط' : 'منخفض')
                      : enrollment.intensity_level
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                
                {/* Therapist */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المعالج' : 'Therapist'}
                  </p>
                  <p className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? enrollment.therapist_name_ar : enrollment.therapist_name_en || enrollment.therapist_name_ar}
                  </p>
                </div>

                {/* Schedule */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الجدولة' : 'Schedule'}
                  </p>
                  <p className="text-sm font-medium">
                    {enrollment.sessions_per_week} × {enrollment.session_duration_minutes}{language === 'ar' ? 'د' : 'min'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'في الأسبوع' : 'per week'}
                  </p>
                </div>

                {/* Start Date */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(enrollment.program_start_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </p>
                </div>

                {/* Payment */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'الدفع' : 'Payment'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPaymentColor(enrollment.payment_status)}>
                      {language === 'ar' 
                        ? (enrollment.payment_status === 'paid' ? 'مدفوع' :
                           enrollment.payment_status === 'partial' ? 'جزئي' :
                           enrollment.payment_status === 'pending' ? 'معلق' : 'منحة')
                        : enrollment.payment_status
                      }
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {enrollment.amount_paid.toLocaleString()}/{enrollment.total_cost.toLocaleString()} SAR
                  </p>
                </div>

                {/* Progress */}
                <div>
                  <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'التقدم' : 'Progress'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${enrollment.completion_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{enrollment.completion_percentage}%</span>
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
                  onClick={() => navigate(`/therapy-program-enrollments/${enrollment.id}`)}
                >
                  <Eye className="h-4 w-4" />
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => navigate(`/therapy-program-enrollments/edit/${enrollment.id}`)}
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
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لا توجد تسجيلات' : 'No Enrollments Found'}
            </h3>
            <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'لم يتم العثور على تسجيلات تطابق معايير البحث' : 'No enrollments match your search criteria'}
            </p>
            <Button onClick={() => navigate('/therapy-program-enrollments/add')}>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إضافة تسجيل جديد' : 'Add New Enrollment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TherapyProgramEnrollmentsPage