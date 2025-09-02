/**
 * IEP Advanced Search and Filtering Component
 * Advanced search interface with multiple criteria and saved searches
 * IDEA 2024 Compliant - Bilingual Support
 */

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Save, 
  BookmarkPlus,
  Calendar,
  User,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react'
import { format, subDays, subMonths, subYears } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { useStudents } from '@/hooks/useStudents'
import { useIEPs } from '@/hooks/useIEPs'
import type { 
  IEPFilters, 
  IEPStatus, 
  IEPType, 
  IEPWorkflowStage, 
  GoalDomain,
  AlertSeverity 
} from '@/types/iep'
import { cn } from '@/lib/utils'

// =============================================================================
// VALIDATION SCHEMAS & TYPES
// =============================================================================

const searchFormSchema = z.object({
  text_search: z.string().optional(),
  student_ids: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  iep_types: z.array(z.string()).optional(),
  workflow_stages: z.array(z.string()).optional(),
  academic_year: z.string().optional(),
  date_range_type: z.enum(['all', 'last_week', 'last_month', 'last_3_months', 'last_year', 'custom']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  has_compliance_issues: z.boolean().optional(),
  due_for_review: z.boolean().optional(),
  goal_domains: z.array(z.string()).optional(),
  created_by: z.string().optional()
})

type SearchFormData = z.infer<typeof searchFormSchema>

interface SavedSearch {
  id: string
  name: string
  filters: IEPFilters
  created_at: string
  use_count: number
}

interface IEPAdvancedSearchProps {
  onFiltersChange: (filters: IEPFilters) => void
  initialFilters?: IEPFilters
  showResults?: boolean
}

// =============================================================================
// PRESET FILTERS
// =============================================================================

const getPresetFilters = (language: 'ar' | 'en') => [
  {
    id: 'due_review',
    name_ar: 'مستحق للمراجعة',
    name_en: 'Due for Review',
    filters: { due_for_review: true },
    icon: <Clock className="w-4 h-4" />,
    color: 'text-yellow-600'
  },
  {
    id: 'compliance_issues',
    name_ar: 'مشاكل الامتثال',
    name_en: 'Compliance Issues',
    filters: { compliance_issues: true },
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-red-600'
  },
  {
    id: 'active_ieps',
    name_ar: 'البرامج النشطة',
    name_en: 'Active IEPs',
    filters: { status: 'active' as IEPStatus },
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600'
  },
  {
    id: 'draft_ieps',
    name_ar: 'مسودات',
    name_en: 'Draft IEPs',
    filters: { status: 'draft' as IEPStatus },
    icon: <Target className="w-4 h-4" />,
    color: 'text-blue-600'
  }
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function IEPAdvancedSearch({ 
  onFiltersChange, 
  initialFilters = {},
  showResults = true 
}: IEPAdvancedSearchProps) {
  const { language, isRTL } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeFilters, setActiveFilters] = useState<IEPFilters>(initialFilters)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchName, setSearchName] = useState('')

  const { data: students } = useStudents()
  const { data: ieps } = useIEPs(activeFilters)

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      text_search: initialFilters.search || '',
      student_ids: initialFilters.student_id ? [initialFilters.student_id] : [],
      statuses: initialFilters.status ? [initialFilters.status] : [],
      iep_types: initialFilters.iep_type ? [initialFilters.iep_type] : [],
      workflow_stages: initialFilters.workflow_stage ? [initialFilters.workflow_stage] : [],
      academic_year: initialFilters.academic_year || '',
      date_range_type: 'all',
      has_compliance_issues: initialFilters.compliance_issues || false,
      due_for_review: initialFilters.due_for_review || false,
      goal_domains: [],
      created_by: ''
    }
  })

  // Status options
  const statusOptions = [
    { value: 'draft', label_ar: 'مسودة', label_en: 'Draft' },
    { value: 'review', label_ar: 'قيد المراجعة', label_en: 'Under Review' },
    { value: 'approved', label_ar: 'معتمد', label_en: 'Approved' },
    { value: 'active', label_ar: 'نشط', label_en: 'Active' },
    { value: 'expired', label_ar: 'منتهي الصلاحية', label_en: 'Expired' },
    { value: 'archived', label_ar: 'مؤرشف', label_en: 'Archived' }
  ]

  const iepTypeOptions = [
    { value: 'initial', label_ar: 'برنامج أولي', label_en: 'Initial' },
    { value: 'annual', label_ar: 'مراجعة سنوية', label_en: 'Annual Review' },
    { value: 'triennial', label_ar: 'مراجعة ثلاثية', label_en: 'Triennial Review' },
    { value: 'amendment', label_ar: 'تعديل', label_en: 'Amendment' }
  ]

  const workflowStageOptions = [
    { value: 'drafting', label_ar: 'إعداد', label_en: 'Drafting' },
    { value: 'team_review', label_ar: 'مراجعة الفريق', label_en: 'Team Review' },
    { value: 'parent_review', label_ar: 'مراجعة الأهل', label_en: 'Parent Review' },
    { value: 'signatures_pending', label_ar: 'في انتظار التوقيع', label_en: 'Signatures Pending' },
    { value: 'approved', label_ar: 'معتمد', label_en: 'Approved' },
    { value: 'active', label_ar: 'نشط', label_en: 'Active' },
    { value: 'monitoring', label_ar: 'متابعة', label_en: 'Monitoring' },
    { value: 'expired', label_ar: 'منتهي الصلاحية', label_en: 'Expired' }
  ]

  const goalDomainOptions = [
    { value: 'academic_reading', label_ar: 'القراءة الأكاديمية', label_en: 'Academic Reading' },
    { value: 'academic_writing', label_ar: 'الكتابة الأكاديمية', label_en: 'Academic Writing' },
    { value: 'academic_math', label_ar: 'الرياضيات الأكاديمية', label_en: 'Academic Math' },
    { value: 'communication_expressive', label_ar: 'التواصل التعبيري', label_en: 'Expressive Communication' },
    { value: 'communication_receptive', label_ar: 'التواصل الاستقبالي', label_en: 'Receptive Communication' },
    { value: 'behavioral_social', label_ar: 'السلوك الاجتماعي', label_en: 'Social Behavior' },
    { value: 'functional_daily_living', label_ar: 'المهارات الحياتية', label_en: 'Daily Living Skills' },
    { value: 'motor_fine', label_ar: 'المهارات الحركية الدقيقة', label_en: 'Fine Motor Skills' },
    { value: 'motor_gross', label_ar: 'المهارات الحركية الكبيرة', label_en: 'Gross Motor Skills' }
  ]

  // Convert form data to filters
  const convertToFilters = (data: SearchFormData): IEPFilters => {
    const filters: IEPFilters = {}

    if (data.text_search?.trim()) {
      filters.search = data.text_search.trim()
    }

    if (data.student_ids && data.student_ids.length > 0) {
      filters.student_id = data.student_ids[0] // For now, support single student
    }

    if (data.statuses && data.statuses.length > 0) {
      filters.status = data.statuses[0] as IEPStatus
    }

    if (data.iep_types && data.iep_types.length > 0) {
      filters.iep_type = data.iep_types[0] as IEPType
    }

    if (data.workflow_stages && data.workflow_stages.length > 0) {
      filters.workflow_stage = data.workflow_stages[0] as IEPWorkflowStage
    }

    if (data.academic_year) {
      filters.academic_year = data.academic_year
    }

    if (data.has_compliance_issues) {
      filters.compliance_issues = true
    }

    if (data.due_for_review) {
      filters.due_for_review = true
    }

    return filters
  }

  // Apply search
  const applySearch = (data: SearchFormData) => {
    const filters = convertToFilters(data)
    setActiveFilters(filters)
    onFiltersChange(filters)
  }

  // Clear filters
  const clearFilters = () => {
    form.reset({
      text_search: '',
      student_ids: [],
      statuses: [],
      iep_types: [],
      workflow_stages: [],
      academic_year: '',
      date_range_type: 'all',
      date_from: '',
      date_to: '',
      has_compliance_issues: false,
      due_for_review: false,
      goal_domains: [],
      created_by: ''
    })
    setActiveFilters({})
    onFiltersChange({})
  }

  // Apply preset filter
  const applyPresetFilter = (preset: any) => {
    setActiveFilters(preset.filters)
    onFiltersChange(preset.filters)
  }

  // Get active filter count
  const activeFilterCount = Object.keys(activeFilters).length

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Quick Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className={cn(
                "absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground",
                isRTL ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={language === 'ar' ? 'البحث في البرامج التعليمية الفردية...' : 'Search IEPs...'}
                className={cn(isRTL ? "pr-10" : "pl-10")}
                value={form.watch('text_search') || ''}
                onChange={(e) => {
                  form.setValue('text_search', e.target.value)
                  if (e.target.value === '') {
                    applySearch(form.getValues())
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applySearch(form.getValues())
                  }
                }}
              />
            </div>

            <Button
              variant="default"
              onClick={() => applySearch(form.getValues())}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              {language === 'ar' ? 'بحث' : 'Search'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {language === 'ar' ? 'فلاتر متقدمة' : 'Advanced Filters'}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isExpanded ? "transform rotate-180" : ""
              )} />
            </Button>
          </div>

          {/* Preset Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {getPresetFilters(language).map(preset => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => applyPresetFilter(preset)}
                className={cn(
                  "gap-2 h-8",
                  preset.color
                )}
              >
                {preset.icon}
                {language === 'ar' ? preset.name_ar : preset.name_en}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <CardTitle className={cn("flex items-center justify-between", isRTL ? "font-arabic" : "")}>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  {language === 'ar' ? 'البحث المتقدم' : 'Advanced Search'}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-6">
                  {/* Student Selection */}
                  <div>
                    <Label className={isRTL ? "font-arabic" : ""}>
                      {language === 'ar' ? 'الطالب' : 'Student'}
                    </Label>
                    <FormField
                      control={form.control}
                      name="student_ids"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={(value) => field.onChange([value])}
                            value={field.value?.[0] || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select Student'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">
                                {language === 'ar' ? 'جميع الطلاب' : 'All Students'}
                              </SelectItem>
                              {students?.map(student => (
                                <SelectItem key={student.id} value={student.id}>
                                  {language === 'ar' 
                                    ? `${student.first_name_ar} ${student.last_name_ar}`
                                    : `${student.first_name_en || student.first_name_ar} ${student.last_name_en || student.last_name_ar}`
                                  }
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status and Type Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="statuses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'الحالة' : 'Status'}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange([value])}
                            value={field.value?.[0] || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'جميع الحالات' : 'All Statuses'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">
                                {language === 'ar' ? 'جميع الحالات' : 'All Statuses'}
                              </SelectItem>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {language === 'ar' ? option.label_ar : option.label_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="iep_types"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'النوع' : 'Type'}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange([value])}
                            value={field.value?.[0] || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'جميع الأنواع' : 'All Types'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">
                                {language === 'ar' ? 'جميع الأنواع' : 'All Types'}
                              </SelectItem>
                              {iepTypeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {language === 'ar' ? option.label_ar : option.label_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workflow_stages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'مرحلة العمل' : 'Workflow Stage'}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange([value])}
                            value={field.value?.[0] || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'ar' ? 'جميع المراحل' : 'All Stages'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">
                                {language === 'ar' ? 'جميع المراحل' : 'All Stages'}
                              </SelectItem>
                              {workflowStageOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {language === 'ar' ? option.label_ar : option.label_en}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Academic Year and Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="academic_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{language === 'ar' ? 'السنة الدراسية' : 'Academic Year'}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="2024-2025" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="has_compliance_issues"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                {language === 'ar' ? 'لديه مشاكل امتثال' : 'Has Compliance Issues'}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_for_review"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                {language === 'ar' ? 'مستحق للمراجعة' : 'Due for Review'}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Goal Domains */}
                  <FormField
                    control={form.control}
                    name="goal_domains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === 'ar' ? 'مجالات الأهداف' : 'Goal Domains'}</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {goalDomainOptions.map(domain => (
                            <FormItem
                              key={domain.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(domain.value)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || []
                                    if (checked) {
                                      field.onChange([...currentValues, domain.value])
                                    } else {
                                      field.onChange(currentValues.filter(v => v !== domain.value))
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm">
                                  {language === 'ar' ? domain.label_ar : domain.label_en}
                                </FormLabel>
                              </div>
                            </FormItem>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Action Buttons */}
                  <div className={cn(
                    "flex justify-between items-center pt-4 border-t",
                    isRTL ? "flex-row-reverse" : ""
                  )}>
                    <Button
                      type="button"
                      onClick={() => applySearch(form.getValues())}
                      className="gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {language === 'ar' ? 'تطبيق البحث' : 'Apply Search'}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearFilters}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        {language === 'ar' ? 'مسح' : 'Clear'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSaveDialog(true)}
                        className="gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {language === 'ar' ? 'حفظ البحث' : 'Save Search'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Summary */}
      {showResults && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1">
                  <Target className="w-3 h-3" />
                  {language === 'ar' 
                    ? `${ieps?.length || 0} نتيجة`
                    : `${ieps?.length || 0} results`
                  }
                </Badge>

                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الفلاتر النشطة:' : 'Active filters:'}
                    </span>
                    {Object.entries(activeFilters).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="gap-1">
                        {key}: {String(value)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => {
                            const newFilters = { ...activeFilters }
                            delete newFilters[key as keyof IEPFilters]
                            setActiveFilters(newFilters)
                            onFiltersChange(newFilters)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-3 h-3" />
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}