import { useState } from 'react'
import { Plus, Search, Filter, UserCheck, Clock, GraduationCap, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTherapists, useTherapistStats } from '@/hooks/useTherapists'
import type { TherapistFilters } from '@/types/therapist'

export const TherapistsPage = () => {
  const { language, isRTL } = useLanguage()
  const [filters, setFilters] = useState<TherapistFilters>({})
  const [searchTerm, setSearchTerm] = useState('')

  const { data: therapists = [], isLoading, error } = useTherapists({
    ...filters,
    search: searchTerm.trim() || undefined
  })

  const { data: stats } = useTherapistStats()

  const handleFilterChange = (key: keyof TherapistFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'terminated': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'full_time': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'part_time': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'contract': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'volunteer': return 'bg-pink-100 text-pink-800 border-pink-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'active': return 'نشطة'
        case 'inactive': return 'غير نشطة'
        case 'on_leave': return 'في إجازة'
        case 'terminated': return 'منتهية الخدمة'
        default: return status
      }
    }
    return status
  }

  const getEmploymentTypeText = (type: string) => {
    if (language === 'ar') {
      switch (type) {
        case 'full_time': return 'دوام كامل'
        case 'part_time': return 'دوام جزئي'
        case 'contract': return 'تعاقد'
        case 'volunteer': return 'تطوع'
        default: return type
      }
    }
    return type
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
            {language === 'ar' ? 'إدارة الاخصائيات' : 'Therapists Management'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'عرض وإدارة الاخصائيات العلاجية' : 'View and manage therapy specialists'}
          </p>
        </div>
        <Button onClick={() => window.location.href = '/therapists/add'}>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'إضافة أخصائية' : 'Add Therapist'}
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي الاخصائيات' : 'Total Therapists'}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'نشطة' : 'Active'}: {stats.active}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'متوسط الخبرة' : 'Average Experience'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average_experience.toFixed(1)}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'سنوات خبرة' : 'years experience'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الدورات المسندة' : 'Assigned Courses'}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_courses_assigned}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'دورة نشطة' : 'active courses'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'دوام كامل' : 'Full Time'}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.full_time}</div>
              <p className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'من إجمالي' : 'of total'} {stats.total}
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
                placeholder={language === 'ar' ? 'البحث في الاخصائيات...' : 'Search therapists...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="active">{language === 'ar' ? 'نشطة' : 'Active'}</SelectItem>
                <SelectItem value="inactive">{language === 'ar' ? 'غير نشطة' : 'Inactive'}</SelectItem>
                <SelectItem value="on_leave">{language === 'ar' ? 'في إجازة' : 'On Leave'}</SelectItem>
                <SelectItem value="terminated">{language === 'ar' ? 'منتهية الخدمة' : 'Terminated'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Employment Type Filter */}
            <Select value={filters.employment_type || 'all'} onValueChange={(value) => handleFilterChange('employment_type', value)}>
              <SelectTrigger className={language === 'ar' ? 'font-arabic' : ''}>
                <SelectValue placeholder={language === 'ar' ? 'نوع العمل' : 'Employment Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                <SelectItem value="full_time">{language === 'ar' ? 'دوام كامل' : 'Full Time'}</SelectItem>
                <SelectItem value="part_time">{language === 'ar' ? 'دوام جزئي' : 'Part Time'}</SelectItem>
                <SelectItem value="contract">{language === 'ar' ? 'تعاقد' : 'Contract'}</SelectItem>
                <SelectItem value="volunteer">{language === 'ar' ? 'تطوع' : 'Volunteer'}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setFilters({})}>
              <Filter className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Therapists List */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'قائمة الاخصائيات' : 'Therapists List'}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({therapists.length} {language === 'ar' ? 'أخصائية' : 'therapists'})
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
          ) : therapists.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className={`text-lg font-medium text-muted-foreground mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد اخصائيات' : 'No therapists found'}
              </h3>
              <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لم يتم العثور على اخصائيات مطابقة للبحث' : 'No therapists match your search criteria'}
              </p>
              <Button onClick={() => window.location.href = '/therapists/add'}>
                <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'ar' ? 'إضافة أخصائية جديدة' : 'Add New Therapist'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {therapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/therapists/${therapist.id}`}
                >
                  <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <h3 className={`font-medium text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' 
                          ? `${therapist.first_name_ar} ${therapist.last_name_ar}`
                          : `${therapist.first_name_en || therapist.first_name_ar} ${therapist.last_name_en || therapist.last_name_ar}`
                        }
                      </h3>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? therapist.specialization_ar : (therapist.specialization_en || therapist.specialization_ar)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={getStatusColor(therapist.status)}>
                        {getStatusText(therapist.status)}
                      </Badge>
                      <Badge variant="outline" className={getEmploymentTypeColor(therapist.employment_type)}>
                        {getEmploymentTypeText(therapist.employment_type)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className={`space-y-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Clock className="h-4 w-4" />
                      <span className={language === 'ar' ? 'font-arabic' : ''}>
                        {therapist.experience_years} {language === 'ar' ? 'سنوات خبرة' : 'years experience'}
                      </span>
                    </div>
                    
                    {therapist.phone && (
                      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Phone className="h-4 w-4" />
                        <span>{therapist.phone}</span>
                      </div>
                    )}
                    
                    {therapist.qualifications && therapist.qualifications.length > 0 && (
                      <div className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <span className="font-medium">
                          {language === 'ar' ? 'المؤهلات:' : 'Qualifications:'} 
                        </span>
                        <span className="ml-1">
                          {therapist.qualifications.slice(0, 2).join(', ')}
                          {therapist.qualifications.length > 2 && ` +${therapist.qualifications.length - 2} ${language === 'ar' ? 'أخرى' : 'more'}`}
                        </span>
                      </div>
                    )}
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