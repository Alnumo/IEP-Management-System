// Medical Consultants Management Page
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, User, Eye, Edit, MoreHorizontal, Trash2, Phone, Mail, Stethoscope, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useMedicalConsultants, useDeleteMedicalConsultant } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'
import type { MedicalConsultantFilters } from '@/types/medical'

export const MedicalConsultantsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters] = useState<MedicalConsultantFilters>({})
  
  // Fetch medical consultants data
  const { data: consultants = [], isLoading, error } = useMedicalConsultants(filters)
  const deleteMedicalConsultant = useDeleteMedicalConsultant()

  const handleDelete = async (id: string) => {
    try {
      await deleteMedicalConsultant.mutateAsync(id)
      console.log('✅ Medical consultant deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete medical consultant:', error)
    }
  }
  
  // Filter consultants based on search term
  const filteredConsultants = consultants.filter((consultant) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      consultant.first_name_ar?.toLowerCase().includes(searchLower) ||
      consultant.last_name_ar?.toLowerCase().includes(searchLower) ||
      consultant.first_name_en?.toLowerCase().includes(searchLower) ||
      consultant.last_name_en?.toLowerCase().includes(searchLower) ||
      consultant.primary_specialization_ar?.toLowerCase().includes(searchLower) ||
      consultant.primary_specialization_en?.toLowerCase().includes(searchLower) ||
      consultant.license_number?.toLowerCase().includes(searchLower)
    )
  })
  
  // Calculate statistics
  const stats = {
    total: consultants.length,
    active: consultants.filter(c => c.status === 'active').length,
    fullTime: consultants.filter(c => c.contract_type === 'full_time').length,
    consultants: consultants.filter(c => c.contract_type === 'consultant').length
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'suspended': return 'destructive'
      case 'on_leave': return 'outline'
      case 'terminated': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      active: { ar: 'نشط', en: 'Active' },
      inactive: { ar: 'غير نشط', en: 'Inactive' },
      suspended: { ar: 'موقوف', en: 'Suspended' },
      on_leave: { ar: 'في إجازة', en: 'On Leave' },
      terminated: { ar: 'منتهي', en: 'Terminated' }
    }
    return language === 'ar' ? labels[status]?.ar || status : labels[status]?.en || status
  }

  const getSupervisionLevelLabel = (level: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      attending_physician: { ar: 'طبيب حاضر', en: 'Attending Physician' },
      consulting_physician: { ar: 'طبيب استشاري', en: 'Consulting Physician' },
      supervising_specialist: { ar: 'أخصائي مشرف', en: 'Supervising Specialist' },
      medical_director: { ar: 'مدير طبي', en: 'Medical Director' },
      clinical_consultant: { ar: 'استشاري إكلينيكي', en: 'Clinical Consultant' },
      external_consultant: { ar: 'استشاري خارجي', en: 'External Consultant' }
    }
    return language === 'ar' ? labels[level]?.ar || level : labels[level]?.en || level
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل الاستشاريين الطبيين' : 'Error loading medical consultants'}
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
            {language === 'ar' ? 'الاستشاريين الطبيين' : 'Medical Consultants'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة الاستشاريين الطبيين والمشرفين على العلاج' : 'Manage medical consultants and therapy supervisors'}
          </p>
        </div>
        <Button onClick={() => navigate('/medical-consultants/add')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة استشاري طبي' : 'Add Medical Consultant'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الاستشاريين' : 'Total Consultants'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'النشطون' : 'Active'}
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'دوام كامل' : 'Full Time'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.fullTime}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'استشاريين' : 'Consultants'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.consultants}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في الاستشاريين...' : 'Search consultants...'}
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

      {/* Medical Consultants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {language === 'ar' ? 'قائمة الاستشاريين الطبيين' : 'Medical Consultants List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filteredConsultants.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد استشاريين طبيين' : 'No medical consultants found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultants.map((consultant) => (
                <div key={consultant.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {consultant.title_ar && `${consultant.title_ar} `}
                          {language === 'ar' 
                            ? `${consultant.first_name_ar} ${consultant.last_name_ar}`
                            : consultant.first_name_en && consultant.last_name_en 
                              ? `${consultant.first_name_en} ${consultant.last_name_en}`
                              : `${consultant.first_name_ar} ${consultant.last_name_ar}`
                          }
                        </h3>
                        <Badge variant={getStatusBadgeVariant(consultant.status)}>
                          {getStatusLabel(consultant.status)}
                        </Badge>
                      </div>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' 
                          ? consultant.primary_specialization_ar
                          : consultant.primary_specialization_en || consultant.primary_specialization_ar
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getSupervisionLevelLabel(consultant.supervision_level)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'رقم الترخيص:' : 'License:'}
                      </span>
                      <div>{consultant.license_number}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'نوع التعاقد:' : 'Contract:'}
                      </span>
                      <div>
                        {language === 'ar'
                          ? (consultant.contract_type === 'full_time' ? 'دوام كامل' :
                             consultant.contract_type === 'part_time' ? 'دوام جزئي' :
                             consultant.contract_type === 'consultant' ? 'استشاري' :
                             consultant.contract_type === 'on_call' ? 'عند الطلب' : 'تعاقد')
                          : consultant.contract_type.replace('_', ' ')
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'سنوات الخبرة:' : 'Experience:'}
                      </span>
                      <div>{consultant.years_of_experience || '-'} {language === 'ar' ? 'سنة' : 'years'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'تاريخ البداية:' : 'Start Date:'}
                      </span>
                      <div>{formatDate(consultant.start_date)}</div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  {(consultant.primary_phone || consultant.email) && (
                    <div className="flex gap-4 text-sm">
                      {consultant.primary_phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {consultant.primary_phone}
                        </div>
                      )}
                      {consultant.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {consultant.email}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => navigate(`/medical-consultants/${consultant.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => navigate(`/medical-consultants/edit/${consultant.id}`)}
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
                        <DropdownMenuItem onClick={() => navigate(`/medical-consultants/${consultant.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/medical-consultants/edit/${consultant.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </DropdownMenuItem>
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
                                  ? 'هل أنت متأكد من حذف هذا الاستشاري الطبي؟ لا يمكن التراجع عن هذا الإجراء.'
                                  : 'Are you sure you want to delete this medical consultant? This action cannot be undone.'
                                }
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className={language === 'ar' ? 'font-arabic' : ''}>
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(consultant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteMedicalConsultant.isPending}
                              >
                                {deleteMedicalConsultant.isPending 
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

export default MedicalConsultantsPage