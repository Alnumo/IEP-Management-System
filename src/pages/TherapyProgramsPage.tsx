import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Brain, Eye, Edit, Users, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useTherapyPrograms } from '@/hooks/useTherapyPrograms'

export const TherapyProgramsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch therapy programs data
  const { data: therapyPrograms = [], isLoading, error } = useTherapyPrograms()
  
  // Filter programs based on search term
  const filteredPrograms = therapyPrograms.filter((program) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      program.name_ar?.toLowerCase().includes(searchLower) ||
      program.name_en?.toLowerCase().includes(searchLower) ||
      program.program_code?.toLowerCase().includes(searchLower)
    )
  })
  
  // Calculate statistics
  const stats = {
    total: therapyPrograms.length,
    active: therapyPrograms.filter(p => p.is_active).length,
    availableForNew: therapyPrograms.filter(p => p.is_available_for_new_patients).length,
    requiresMedical: therapyPrograms.filter(p => p.requires_medical_clearance).length
  }

  const getCategoryBadgeVariant = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'aba': return 'default'
      case 'speech': return 'secondary'
      case 'occupational': return 'outline'
      case 'physical': return 'destructive'
      case 'behavioral': return 'default'
      default: return 'secondary'
    }
  }

  const getIntensityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-red-600'
      case 'moderate': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل البرامج العلاجية' : 'Error loading therapy programs'}
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
            {language === 'ar' ? 'البرامج العلاجية' : 'Therapy Programs'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة البرامج والبروتوكولات العلاجية' : 'Manage therapy programs and protocols'}
          </p>
        </div>
        <Button onClick={() => navigate('/therapy-programs/add')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة برنامج علاجي' : 'Add Therapy Program'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي البرامج' : 'Total Programs'}
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'البرامج النشطة' : 'Active Programs'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'متاحة للمرضى الجدد' : 'Available for New'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.availableForNew}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'تتطلب تصريح طبي' : 'Requires Medical'}
            </CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.requiresMedical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في البرامج...' : 'Search therapy programs...'}
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

      {/* Therapy Programs Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filteredPrograms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد برامج علاجية' : 'No therapy programs found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? program.name_ar : program.name_en || program.name_ar}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {program.program_code}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {program.category && (
                        <Badge variant={getCategoryBadgeVariant(program.category)}>
                          {program.category}
                        </Badge>
                      )}
                      {!program.is_active && (
                        <Badge variant="secondary">
                          {language === 'ar' ? 'غير نشط' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Description */}
                  {program.description_ar || program.description_en ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'ar' ? program.description_ar : program.description_en || program.description_ar}
                    </p>
                  ) : null}

                  {/* Key Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الكثافة:' : 'Intensity:'}
                      </span>
                      <div className={getIntensityColor(program.intensity_level || '')}>
                        {program.intensity_level || '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'العمر (شهر):' : 'Age (months):'}
                      </span>
                      <div>
                        {program.minimum_age_months && program.maximum_age_months 
                          ? `${program.minimum_age_months}-${program.maximum_age_months}`
                          : '-'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'جلسات/أسبوع:' : 'Sessions/week:'}
                      </span>
                      <div>
                        {program.default_sessions_per_week 
                          ? `${program.default_sessions_per_week}x`
                          : '-'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'المدة (أسبوع):' : 'Duration (weeks):'}
                      </span>
                      <div>
                        {program.typical_duration_weeks || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="space-y-2">
                    {program.is_available_for_new_patients && (
                      <Badge variant="outline" className="text-xs text-green-700 bg-green-50">
                        {language === 'ar' ? 'متاح للمرضى الجدد' : 'Available for New Patients'}
                      </Badge>
                    )}
                    {program.requires_medical_clearance && (
                      <Badge variant="outline" className="text-xs text-orange-700 bg-orange-50">
                        {language === 'ar' ? 'يتطلب تصريح طبي' : 'Medical Clearance Required'}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => navigate(`/therapy-programs/${program.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => navigate(`/therapy-programs/edit/${program.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}