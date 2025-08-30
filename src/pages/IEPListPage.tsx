import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Eye, 
  Edit2, 
  FileText, 
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronDown,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIEPs, useSearchIEPs } from '@/hooks/useIEPs'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { SortDropdown } from '@/components/shared/SortDropdown'
import type { IEP, IEPFilters } from '@/types/iep'

type SortField = 'updated_at' | 'effective_date' | 'annual_review_date' | 'student_name'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'table' | 'cards'

interface IEPListFilters extends IEPFilters {
  view?: ViewMode
  sort_field?: SortField
  sort_direction?: SortDirection
}

export const IEPListPage = () => {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<IEPListFilters>({
    status: undefined,
    iep_type: undefined,
    academic_year: undefined,
    workflow_stage: undefined,
    view: 'table',
    sort_field: 'updated_at',
    sort_direction: 'desc'
  })
  const [selectedIEPs, setSelectedIEPs] = useState<string[]>([])

  // Data fetching
  const { data: allIEPs = [], isLoading, error } = useIEPs(filters)
  const { data: searchResults = [], isLoading: searchLoading } = useSearchIEPs(
    searchTerm, 
    filters
  )

  // Determine which data to display
  const ieps = searchTerm.trim() ? searchResults : allIEPs

  // Memoized filtering and sorting
  const filteredAndSortedIEPs = useMemo(() => {
    let result = [...ieps]

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[filters.sort_field || 'updated_at']
      let bValue: any = b[filters.sort_field || 'updated_at']

      // Special handling for student name sorting
      if (filters.sort_field === 'student_name') {
        aValue = language === 'ar' 
          ? `${a.student?.first_name_ar} ${a.student?.last_name_ar}`
          : `${a.student?.first_name_en || a.student?.first_name_ar} ${a.student?.last_name_en || a.student?.last_name_ar}`
        bValue = language === 'ar'
          ? `${b.student?.first_name_ar} ${b.student?.last_name_ar}`
          : `${b.student?.first_name_en || b.student?.first_name_ar} ${b.student?.last_name_en || b.student?.last_name_ar}`
      }

      // Convert to comparable format
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue.includes('-')) { // Date format
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } else {
          return filters.sort_direction === 'desc' 
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue)
        }
      }

      return filters.sort_direction === 'desc' ? bValue - aValue : aValue - bValue
    })

    return result
  }, [ieps, filters.sort_field, filters.sort_direction, language])

  // Status and priority helpers
  const getStatusBadge = (iep: IEP) => {
    const statusConfig = {
      draft: { variant: 'secondary', label_ar: 'مسودة', label_en: 'Draft' },
      active: { variant: 'default', label_ar: 'نشطة', label_en: 'Active' },
      review: { variant: 'outline', label_ar: 'مراجعة', label_en: 'Review' },
      expired: { variant: 'destructive', label_ar: 'منتهية', label_en: 'Expired' },
      archived: { variant: 'secondary', label_ar: 'مؤرشفة', label_en: 'Archived' }
    }

    const config = statusConfig[iep.status as keyof typeof statusConfig]
    return (
      <Badge variant={config?.variant as any}>
        {language === 'ar' ? config?.label_ar : config?.label_en}
      </Badge>
    )
  }

  const getComplianceStatus = (iep: IEP) => {
    if (!iep.compliance_check_passed) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">{language === 'ar' ? 'مشاكل' : 'Issues'}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-xs">{language === 'ar' ? 'متوافق' : 'Compliant'}</span>
      </div>
    )
  }

  const getDeadlineStatus = (reviewDate: string) => {
    const today = new Date()
    const deadline = new Date(reviewDate)
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          {language === 'ar' ? `متأخر ${Math.abs(diffDays)} يوم` : `${Math.abs(diffDays)} days overdue`}
        </Badge>
      )
    } else if (diffDays <= 30) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
          {language === 'ar' ? `${diffDays} يوم متبقي` : `${diffDays} days left`}
        </Badge>
      )
    }
    return null
  }

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIEPs.length === filteredAndSortedIEPs.length) {
      setSelectedIEPs([])
    } else {
      setSelectedIEPs(filteredAndSortedIEPs.map(iep => iep.id))
    }
  }

  const handleSelectIEP = (iepId: string) => {
    setSelectedIEPs(prev => 
      prev.includes(iepId) 
        ? prev.filter(id => id !== iepId)
        : [...prev, iepId]
    )
  }

  // Loading state
  if (isLoading && !searchTerm) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الخطط التعليمية الفردية' : 'Individual Education Programs'}
          </h1>
          <p className={`text-gray-600 mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? `إدارة ${filteredAndSortedIEPs.length} خطة تعليمية فردية`
              : `Manage ${filteredAndSortedIEPs.length} Individual Education Programs`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'استيراد' : 'Import'}
          </Button>
          <Button onClick={() => navigate('/ieps/create')}>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'خطة جديدة' : 'New IEP'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allIEPs.length}</p>
              <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'إجمالي الخطط' : 'Total IEPs'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {allIEPs.filter(iep => iep.status === 'active').length}
              </p>
              <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'نشطة' : 'Active'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {allIEPs.filter(iep => {
                  const reviewDate = new Date(iep.annual_review_date)
                  const thirtyDaysFromNow = new Date()
                  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
                  return reviewDate <= thirtyDaysFromNow
                }).length}
              </p>
              <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تحتاج مراجعة' : 'Need Review'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {allIEPs.filter(iep => !iep.compliance_check_passed).length}
              </p>
              <p className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'مشاكل امتثال' : 'Compliance Issues'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={language === 'ar' ? 'البحث في الخطط التعليمية...' : 'Search IEPs...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({...filters, status: value as any})}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="active">{language === 'ar' ? 'نشطة' : 'Active'}</SelectItem>
                <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
                <SelectItem value="review">{language === 'ar' ? 'مراجعة' : 'Review'}</SelectItem>
                <SelectItem value="expired">{language === 'ar' ? 'منتهية' : 'Expired'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Academic Year Filter */}
            <Select
              value={filters.academic_year}
              onValueChange={(value) => setFilters({...filters, academic_year: value})}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={language === 'ar' ? 'السنة الأكاديمية' : 'Academic Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'جميع السنوات' : 'All Years'}</SelectItem>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
                <SelectItem value="2023-2024">2023-2024</SelectItem>
                <SelectItem value="2022-2023">2022-2023</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {filters.sort_direction === 'desc' ? <SortDesc className="w-4 h-4 mr-2" /> : <SortAsc className="w-4 h-4 mr-2" />}
                  {language === 'ar' ? 'ترتيب' : 'Sort'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{language === 'ar' ? 'ترتيب حسب' : 'Sort by'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={filters.sort_field} 
                  onValueChange={(value) => setFilters({...filters, sort_field: value as SortField})}
                >
                  <DropdownMenuRadioItem value="updated_at">
                    {language === 'ar' ? 'آخر تحديث' : 'Last Updated'}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="effective_date">
                    {language === 'ar' ? 'تاريخ البدء' : 'Effective Date'}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="annual_review_date">
                    {language === 'ar' ? 'تاريخ المراجعة السنوية' : 'Annual Review Date'}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="student_name">
                    {language === 'ar' ? 'اسم الطالب' : 'Student Name'}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup 
                  value={filters.sort_direction} 
                  onValueChange={(value) => setFilters({...filters, sort_direction: value as SortDirection})}
                >
                  <DropdownMenuRadioItem value="desc">
                    {language === 'ar' ? 'تنازلي' : 'Descending'}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="asc">
                    {language === 'ar' ? 'تصاعدي' : 'Ascending'}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {filters.view === 'table' ? <FileText className="w-4 h-4 mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                  {language === 'ar' ? 'عرض' : 'View'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup 
                  value={filters.view} 
                  onValueChange={(value) => setFilters({...filters, view: value as ViewMode})}
                >
                  <DropdownMenuRadioItem value="table">
                    {language === 'ar' ? 'جدول' : 'Table View'}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cards">
                    {language === 'ar' ? 'بطاقات' : 'Card View'}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIEPs.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className={`text-sm ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? `تم تحديد ${selectedIEPs.length} خطة`
                  : `${selectedIEPs.length} IEPs selected`
                }
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تصدير المحدد' : 'Export Selected'}
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'جدولة اجتماعات' : 'Schedule Meetings'}
                </Button>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'فحص الامتثال' : 'Check Compliance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IEP List */}
      <Card>
        <CardContent className="p-0">
          {filters.view === 'table' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedIEPs.length === filteredAndSortedIEPs.length && filteredAndSortedIEPs.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الطالب' : 'Student'}
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'تاريخ البدء' : 'Effective Date'}
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المراجعة السنوية' : 'Annual Review'}
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'الامتثال' : 'Compliance'}
                    </TableHead>
                    <TableHead className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'آخر تحديث' : 'Last Updated'}
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedIEPs.map((iep) => (
                    <TableRow key={iep.id} className="hover:bg-gray-50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIEPs.includes(iep.id)}
                          onChange={() => handleSelectIEP(iep.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {language === 'ar'
                            ? `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`
                            : `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {iep.student?.registration_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(iep)}
                      </TableCell>
                      <TableCell>
                        {new Date(iep.effective_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <div>
                          {new Date(iep.annual_review_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          {getDeadlineStatus(iep.annual_review_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getComplianceStatus(iep)}
                      </TableCell>
                      <TableCell>
                        {new Date(iep.updated_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ieps/${iep.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ieps/${iep.id}/edit`)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {filteredAndSortedIEPs.map((iep) => (
                <Card key={iep.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={selectedIEPs.includes(iep.id)}
                        onChange={() => handleSelectIEP(iep.id)}
                        className="rounded border-gray-300"
                      />
                      {getStatusBadge(iep)}
                    </div>
                    <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar'
                        ? `${iep.student?.first_name_ar} ${iep.student?.last_name_ar}`
                        : `${iep.student?.first_name_en || iep.student?.first_name_ar} ${iep.student?.last_name_en || iep.student?.last_name_ar}`
                      }
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {iep.student?.registration_number}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'تاريخ البدء:' : 'Effective Date:'}
                        </span>
                        <span className="text-sm">
                          {new Date(iep.effective_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'المراجعة السنوية:' : 'Annual Review:'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {new Date(iep.annual_review_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                          {getDeadlineStatus(iep.annual_review_date)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm text-gray-600 ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {language === 'ar' ? 'الامتثال:' : 'Compliance:'}
                        </span>
                        {getComplianceStatus(iep)}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/ieps/${iep.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'عرض' : 'View'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/ieps/${iep.id}/edit`)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedIEPs.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'لا توجد خطط تعليمية' : 'No IEPs found'}
              </h3>
              <p className={`text-gray-600 mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? 'لا توجد خطط تعليمية تطابق المعايير المحددة'
                  : 'No IEPs match the selected criteria'
                }
              </p>
              <Button onClick={() => navigate('/ieps/create')}>
                <Plus className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'إنشاء خطة جديدة' : 'Create New IEP'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}