import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, FileText, Eye, Edit, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useMedicalRecords } from '@/hooks/useMedical'
import { formatDate } from '@/lib/utils'

export const MedicalRecordsPage = () => {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch medical records data
  const { data: medicalRecords = [], isLoading, error } = useMedicalRecords()
  
  // Filter medical records based on search term
  const filteredRecords = medicalRecords.filter((record) => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      record.medical_record_number?.toLowerCase().includes(searchLower) ||
      record.primary_diagnosis_code?.some((code: string) => code.toLowerCase().includes(searchLower))
    )
  })
  
  // Calculate statistics
  const stats = {
    total: medicalRecords.length,
    withAllergies: medicalRecords.filter(r => r.allergies && r.allergies.length > 0).length,
    withMedications: medicalRecords.filter(r => r.current_medications && Object.keys(r.current_medications).length > 0).length,
    emergencyProtocols: medicalRecords.filter(r => r.emergency_protocol).length
  }

  const getClassificationBadgeVariant = (classification: string) => {
    switch (classification) {
      case 'public': return 'default'
      case 'confidential': return 'secondary'
      case 'restricted': return 'destructive'
      default: return 'outline'
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              {language === 'ar' ? 'خطأ في تحميل السجلات الطبية' : 'Error loading medical records'}
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
            {language === 'ar' ? 'السجلات الطبية' : 'Medical Records'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة السجلات والبيانات الطبية للطلاب' : 'Manage student medical records and data'}
          </p>
        </div>
        <Button onClick={() => navigate('/medical-records/add')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ar' ? 'إضافة سجل طبي' : 'Add Medical Record'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي السجلات' : 'Total Records'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'سجلات بحساسيات' : 'With Allergies'}
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.withAllergies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'سجلات بأدوية' : 'With Medications'}
            </CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.withMedications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'بروتوكولات طوارئ' : 'Emergency Protocols'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.emergencyProtocols}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في السجلات...' : 'Search medical records...'}
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

      {/* Medical Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'قائمة السجلات الطبية' : 'Medical Records List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد سجلات طبية' : 'No medical records found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">
                        {language === 'ar' ? 'رقم السجل:' : 'Record #'} {record.medical_record_number}
                      </h3>
                      {record.primary_diagnosis_code && record.primary_diagnosis_code.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {record.primary_diagnosis_code.map((code, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant={getClassificationBadgeVariant(record.data_classification || 'public')}>
                      {record.data_classification || 'public'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'فصيلة الدم:' : 'Blood Type:'}
                      </span>
                      <div>{record.blood_type || '-'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'الحساسيات:' : 'Allergies:'}
                      </span>
                      <div>{record.allergies?.length || 0}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}
                      </span>
                      <div>{formatDate(record.created_at)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'آخر تحديث:' : 'Updated:'}
                      </span>
                      <div>{formatDate(record.updated_at)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
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